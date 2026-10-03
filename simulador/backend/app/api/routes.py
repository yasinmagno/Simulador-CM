"""Endpoints REST — Simulador HCM ↔ Guaxene."""

from __future__ import annotations
import json
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse

from app.models.schemas import (
    SimulationInput,
    LinkBudgetResult,
    FresnelResult,
    FresnelPoint,
    EnergyState,
    NetworkState,
    SimulationResult,
    SimulationEvent,
    ScenarioDefinition,
    EnergyPoint,
    TimelineRequest,
    TimelineFrame,
    TimelineResult,
    TIMELINE_CAMPOS,
)
from app.engine import rf_calculator as rf
from app.engine.state_machine import compute_network_state, generate_events

router = APIRouter()

# ---------------------------------------------------------------------------
# Configuração central (carregada uma vez)
# ---------------------------------------------------------------------------

CONFIG_PATH = Path(__file__).parent.parent / "config" / "project_config.json"

def _load_config() -> dict:
    with open(CONFIG_PATH, encoding="utf-8") as f:
        return json.load(f)

CFG = _load_config()

# ---------------------------------------------------------------------------
# Estado da simulação (em memória)
# ---------------------------------------------------------------------------

_sim_state: dict[str, Any] = {
    "input": SimulationInput(),
    "previous_network": None,
    "eventos": [],
    "current_mod": None,
    "tempo_h": 0.0,
}


def _default_input() -> SimulationInput:
    return SimulationInput()


# ---------------------------------------------------------------------------
# GET /api/config
# ---------------------------------------------------------------------------

@router.get("/config")
def get_config():
    """Retorna a configuração oficial do projeto."""
    return CFG


# ---------------------------------------------------------------------------
# POST /api/calculate/link-budget
# ---------------------------------------------------------------------------

@router.post("/calculate/link-budget", response_model=LinkBudgetResult)
def calculate_link_budget(inp: SimulationInput):
    """Calcula o link budget completo para os parâmetros fornecidos."""
    rf_cfg = CFG["rf"]
    geo = CFG["geography"]

    result = rf.compute_link_budget(
        distancia_km=rf_cfg["distancia_km"],
        freq_ghz=rf_cfg["frequencia_ghz"],
        canal_mhz=rf_cfg["canal_mhz"],
        p_tx_dbm=rf_cfg["p_tx_dbm"],
        g_tx_dbi=rf_cfg["g_tx_dbi"],
        l_tx_db=rf_cfg["l_tx_db"],
        g_rx_dbi=rf_cfg["g_rx_dbi"],
        l_rx_db=rf_cfg["l_rx_db"],
        l_misc_db=rf_cfg["l_misc_db"],
        l_ambiente_db=inp.l_ambiente_db,
        nf_db=rf_cfg["nf_db"],
        current_mod=_sim_state["current_mod"],
    )
    _sim_state["current_mod"] = result["modulacao_selecionada"]
    return LinkBudgetResult(**result)


# ---------------------------------------------------------------------------
# POST /api/calculate/fresnel
# ---------------------------------------------------------------------------

@router.post("/calculate/fresnel", response_model=FresnelResult)
def calculate_fresnel(inp: SimulationInput):
    """Calcula o perfil de Fresnel e LOS ao longo do percurso."""
    rf_cfg = CFG["rf"]
    geo = CFG["geography"]
    terrain = CFG["terrain"]["elevacoes_m"]

    h_a = geo["hcm"]["altitude_terreno_m"] + geo["hcm"]["altura_antena_m"]
    h_b = geo["guaxene"]["altitude_terreno_m"] + geo["guaxene"]["altura_antena_m"]

    profile = rf.los_clearance_profile(
        h_a_m=h_a,
        h_b_m=h_b,
        terrain_heights_m=terrain,
        freq_ghz=rf_cfg["frequencia_ghz"],
        d_total_km=rf_cfg["distancia_km"],
    )

    pontos = [FresnelPoint(**p) for p in profile]
    problematicos = [p for p in pontos if not p.fresnel_ok]

    ponto_critico = min(problematicos, key=lambda p: p.clearance_m) if problematicos else None

    return FresnelResult(
        pontos=pontos,
        todos_ok=len(problematicos) == 0,
        ponto_critico_distancia_m=ponto_critico.distancia_m if ponto_critico else None,
        ponto_critico_clearance_m=ponto_critico.clearance_m if ponto_critico else None,
    )


# ---------------------------------------------------------------------------
# POST /api/calculate/energy
# ---------------------------------------------------------------------------

@router.post("/calculate/energy", response_model=EnergyState)
def calculate_energy(inp: SimulationInput):
    """Calcula o estado energético atual."""
    ecfg_hcm = CFG["energy"]["hcm"]
    ecfg_g = CFG["energy"]["guaxene"]

    auto_hcm = rf.autonomy_hours(
        inp.bateria_hcm_wh, ecfg_hcm["dod"], ecfg_hcm["eficiencia"], ecfg_hcm["carga_w"]
    )
    auto_guaxene = rf.autonomy_hours(
        inp.bateria_guaxene_wh, ecfg_g["dod"], ecfg_g["eficiencia"], ecfg_g["carga_w"]
    )

    minimo_hcm = rf.battery_floor_wh(ecfg_hcm["bateria_wh"], ecfg_hcm["dod"])
    minimo_g = rf.battery_floor_wh(ecfg_g["bateria_wh"], ecfg_g["dod"])

    hcm_energia = inp.edm_hcm or (inp.bateria_hcm_wh > minimo_hcm)
    guaxene_energia = inp.edm_guaxene or (inp.bateria_guaxene_wh > minimo_g)

    return EnergyState(
        hcm_bateria_wh=round(inp.bateria_hcm_wh, 1),
        hcm_autonomia_h=round(auto_hcm, 2),
        hcm_com_energia=hcm_energia,
        guaxene_bateria_wh=round(inp.bateria_guaxene_wh, 1),
        guaxene_autonomia_h=round(auto_guaxene, 2),
        guaxene_com_energia=guaxene_energia,
        energia_nominal=inp.edm_hcm and inp.edm_guaxene,
    )


# ---------------------------------------------------------------------------
# GET /api/scenarios
# ---------------------------------------------------------------------------

SCENARIOS_DIR = Path(__file__).parent.parent / "scenarios"

@router.get("/scenarios")
def list_scenarios():
    """Lista todos os cenários predefinidos."""
    scenarios = []
    for f in sorted(SCENARIOS_DIR.glob("cenario_*.json")):
        with open(f, encoding="utf-8") as fh:
            scenarios.append(json.load(fh))
    return scenarios


# ---------------------------------------------------------------------------
# POST /api/scenarios/{id}/run
# ---------------------------------------------------------------------------

@router.post("/scenarios/{scenario_id}/run", response_model=SimulationResult)
def run_scenario(scenario_id: int):
    """Aplica um cenário predefinido e retorna o estado completo da simulação."""
    scenario_file = SCENARIOS_DIR / f"cenario_{scenario_id:02d}.json"
    if not scenario_file.exists():
        raise HTTPException(status_code=404, detail=f"Cenário {scenario_id} não encontrado.")

    with open(scenario_file, encoding="utf-8") as f:
        scenario = json.load(f)

    # Aplicar override ao input padrão
    base_input = _default_input().model_dump()
    base_input.update(scenario.get("input_override", {}))
    inp = SimulationInput(**base_input)

    return _simulate_stateless(inp)


# ---------------------------------------------------------------------------
# POST /api/simulation/reset
# ---------------------------------------------------------------------------

@router.post("/simulation/reset", response_model=SimulationResult)
def reset_simulation():
    """Reinicia a simulação com os valores oficiais do relatório."""
    _sim_state["current_mod"] = None
    _sim_state["previous_network"] = None
    _sim_state["eventos"] = []
    _sim_state["tempo_h"] = 0.0
    return _run_simulation(_default_input())


# ---------------------------------------------------------------------------
# GET /api/simulation/state
# ---------------------------------------------------------------------------

@router.get("/simulation/state", response_model=SimulationResult)
def get_simulation_state():
    """Retorna o estado atual da simulação sem o alterar."""
    return _run_simulation(_sim_state["input"])


# ---------------------------------------------------------------------------
# POST /api/simulation/advance  — avanço temporal
# ---------------------------------------------------------------------------

@router.post("/simulation/advance", response_model=SimulationResult)
def advance_simulation(dt_h: float = Query(default=1.0, ge=0.01, le=24.0)):
    """Avança a simulação dt_h horas: drena baterias quando EDM cortada."""
    ecfg_hcm = CFG["energy"]["hcm"]
    ecfg_g = CFG["energy"]["guaxene"]

    current: SimulationInput = _sim_state["input"]

    # Drenar bateria HCM se EDM cortada
    nova_hcm = rf.update_battery(
        bateria_wh=current.bateria_hcm_wh,
        carga_w=ecfg_hcm["carga_w"] if not current.edm_hcm else 0.0,
        solar_w=0.0,
        delta_h=dt_h,
        bateria_max_wh=ecfg_hcm["bateria_wh"],
        dod=ecfg_hcm["dod"],
    ) if not current.edm_hcm else current.bateria_hcm_wh

    # Drenar bateria Guaxene se EDM cortada
    nova_g = rf.update_battery(
        bateria_wh=current.bateria_guaxene_wh,
        carga_w=ecfg_g["carga_w"] if not current.edm_guaxene else 0.0,
        solar_w=0.0,
        delta_h=dt_h,
        bateria_max_wh=ecfg_g["bateria_wh"],
        dod=ecfg_g["dod"],
    ) if not current.edm_guaxene else current.bateria_guaxene_wh

    _sim_state["tempo_h"] = round(_sim_state["tempo_h"] + dt_h, 2)

    updated = current.model_copy(update={
        "bateria_hcm_wh": round(nova_hcm, 1),
        "bateria_guaxene_wh": round(nova_g, 1),
    })
    return _run_simulation(updated)


# ---------------------------------------------------------------------------
# Motor interno de simulação
# ---------------------------------------------------------------------------

def _compute(inp: SimulationInput, current_mod: str | None = None) -> tuple[
    LinkBudgetResult, FresnelResult, EnergyState, NetworkState
]:
    """Cálculo puro: o resultado depende apenas de `inp` (e da histerese opcional)."""
    rf_cfg = CFG["rf"]
    geo = CFG["geography"]
    terrain = CFG["terrain"]["elevacoes_m"]

    # Link budget
    lb_raw = rf.compute_link_budget(
        distancia_km=rf_cfg["distancia_km"],
        freq_ghz=rf_cfg["frequencia_ghz"],
        canal_mhz=rf_cfg["canal_mhz"],
        p_tx_dbm=rf_cfg["p_tx_dbm"],
        g_tx_dbi=rf_cfg["g_tx_dbi"],
        l_tx_db=rf_cfg["l_tx_db"],
        g_rx_dbi=rf_cfg["g_rx_dbi"],
        l_rx_db=rf_cfg["l_rx_db"],
        l_misc_db=rf_cfg["l_misc_db"],
        l_ambiente_db=inp.l_ambiente_db,
        nf_db=rf_cfg["nf_db"],
        current_mod=current_mod,
    )
    lb = LinkBudgetResult(**lb_raw)

    # Fresnel
    h_a = geo["hcm"]["altitude_terreno_m"] + geo["hcm"]["altura_antena_m"]
    h_b = geo["guaxene"]["altitude_terreno_m"] + geo["guaxene"]["altura_antena_m"]
    profile = rf.los_clearance_profile(h_a, h_b, terrain, rf_cfg["frequencia_ghz"], rf_cfg["distancia_km"])
    pontos = [FresnelPoint(**p) for p in profile]
    problematicos = [p for p in pontos if not p.fresnel_ok]
    ponto_critico = min(problematicos, key=lambda p: p.clearance_m) if problematicos else None
    fresnel = FresnelResult(
        pontos=pontos,
        todos_ok=not problematicos,
        ponto_critico_distancia_m=ponto_critico.distancia_m if ponto_critico else None,
        ponto_critico_clearance_m=ponto_critico.clearance_m if ponto_critico else None,
    )

    # Energia
    ecfg_hcm = CFG["energy"]["hcm"]
    ecfg_g = CFG["energy"]["guaxene"]
    auto_hcm = rf.remaining_autonomy_h(
        inp.bateria_hcm_wh, ecfg_hcm["bateria_wh"], ecfg_hcm["dod"], ecfg_hcm["eficiencia"], ecfg_hcm["carga_w"])
    auto_g = rf.remaining_autonomy_h(
        inp.bateria_guaxene_wh, ecfg_g["bateria_wh"], ecfg_g["dod"], ecfg_g["eficiencia"], ecfg_g["carga_w"])
    min_hcm = rf.battery_floor_wh(ecfg_hcm["bateria_wh"], ecfg_hcm["dod"])
    min_g = rf.battery_floor_wh(ecfg_g["bateria_wh"], ecfg_g["dod"])
    energy = EnergyState(
        hcm_bateria_wh=round(inp.bateria_hcm_wh, 1),
        hcm_autonomia_h=round(auto_hcm, 2),
        hcm_com_energia=inp.edm_hcm or (inp.bateria_hcm_wh > min_hcm),
        guaxene_bateria_wh=round(inp.bateria_guaxene_wh, 1),
        guaxene_autonomia_h=round(auto_g, 2),
        guaxene_com_energia=inp.edm_guaxene or (inp.bateria_guaxene_wh > min_g),
        energia_nominal=inp.edm_hcm and inp.edm_guaxene,
    )

    # Estado da rede
    fm_256 = lb.fade_margin_db.get("256QAM", -999.0)
    network = compute_network_state(inp, fm_256, lb.capacidade_mbps)

    return lb, fresnel, energy, network


def _run_simulation(inp: SimulationInput) -> SimulationResult:
    """Execução com estado (histerese e registo acumulado) — usada por /advance e /reset."""
    lb, fresnel, energy, network = _compute(inp, _sim_state["current_mod"])
    _sim_state["current_mod"] = lb.modulacao_selecionada

    prev: NetworkState | None = _sim_state["previous_network"]
    new_events = generate_events(prev, network, _sim_state["tempo_h"])
    _sim_state["eventos"].extend(new_events)
    _sim_state["previous_network"] = network
    _sim_state["input"] = inp

    return SimulationResult(
        input=inp,
        link_budget=lb,
        fresnel=fresnel,
        energy=energy,
        network=network,
        eventos=list(_sim_state["eventos"]),
    )


# ---------------------------------------------------------------------------
# POST /api/simulation/run  — simulação sem estado (qualquer combinação)
# ---------------------------------------------------------------------------

def _apply_outage(inp: SimulationInput) -> tuple[SimulationInput, float | None, float | None]:
    """Calcula as baterias após `tempo_simulado_h` horas sem EDM (partindo de cheias).

    Locais com EDM ativa mantêm a bateria cheia.
    """
    ecfg = CFG["energy"]
    rendimento = ecfg["solar_rendimento_kwh_kwp_dia"]
    hora_inicio = ecfg["hora_inicio_corte"]

    def site(nome: str, edm: bool, solar_ativo: bool) -> tuple[float, float | None]:
        c = ecfg[nome]
        if edm:
            return c["bateria_wh"], None
        return rf.battery_after_outage(
            horas=inp.tempo_simulado_h,
            bateria_max_wh=c["bateria_wh"],
            dod=c["dod"],
            eficiencia=c["eficiencia"],
            carga_w=c["carga_w"],
            solar_wp=c["solar_wp_min"] if solar_ativo else 0.0,
            rendimento_kwh_kwp_dia=rendimento,
            fator_meteo=inp.fator_solar,
            hora_inicio=hora_inicio,
        )

    bat_hcm, esg_hcm = site("hcm", inp.edm_hcm, inp.solar_hcm_ativo)
    bat_g, esg_g = site("guaxene", inp.edm_guaxene, inp.solar_guaxene_ativo)
    updated = inp.model_copy(update={
        "bateria_hcm_wh": round(bat_hcm, 1),
        "bateria_guaxene_wh": round(bat_g, 1),
    })
    return updated, esg_hcm, esg_g


def _describe_events(
    inp: SimulationInput,
    lb: LinkBudgetResult,
    network: NetworkState,
    energy: EnergyState,
) -> list[SimulationEvent]:
    """Explica o cenário comparando-o com a operação normal (cenário de referência)."""
    t = inp.tempo_simulado_h
    ref_lb, _, _, ref_network = _compute(SimulationInput())

    falhas = []
    if not inp.ptp_ativo: falhas.append("PtP")
    if not inp.g4_local_disponivel: falhas.append("4G/5G local")
    if not inp.g4_externo_disponivel: falhas.append("4G/5G externo")
    if not inp.isp_ativo: falhas.append("ISP/fibra")
    if not inp.satelite_ativo: falhas.append("Satélite")
    if not inp.edm_hcm: falhas.append("EDM HCM")
    if not inp.edm_guaxene: falhas.append("EDM Guaxene")

    events = [SimulationEvent(
        tempo_h=0.0,
        tipo="INFO",
        mensagem=("Falhas aplicadas: " + ", ".join(falhas)) if falhas else "Todos os componentes operacionais.",
        componente="Cenário",
    )]
    if inp.l_ambiente_db > 0:
        events.append(SimulationEvent(
            tempo_h=0.0, tipo="AVISO", componente="Enlace Rádio",
            mensagem=f"Atenuação adicional de {inp.l_ambiente_db:g} dB (chuva/interferência).",
        ))
    if lb.modulacao_selecionada != ref_lb.modulacao_selecionada:
        events.append(SimulationEvent(
            tempo_h=0.0,
            tipo="AVISO" if lb.modulacao_selecionada else "ERRO",
            componente="Enlace Rádio",
            mensagem=(f"Modulação adaptativa: {ref_lb.modulacao_selecionada} → {lb.modulacao_selecionada} "
                      f"({lb.capacidade_mbps:.2f} Mbps)") if lb.modulacao_selecionada
                     else "Fade margin insuficiente em todas as modulações — enlace PtP sem sinal.",
        ))

    # Eventos de energia na hora em que acontecem
    for nome, edm, esg in (("HCM", inp.edm_hcm, energy.hcm_esgotou_h),
                           ("Guaxene", inp.edm_guaxene, energy.guaxene_esgotou_h)):
        if edm:
            continue
        events.append(SimulationEvent(
            tempo_h=0.0, tipo="AVISO", componente=f"Energia {nome}",
            mensagem=f"{nome}: EDM cortada — a funcionar em bateria.",
        ))
        if esg is not None and esg <= t:
            events.append(SimulationEvent(
                tempo_h=round(esg, 1), tipo="ERRO", componente=f"Energia {nome}",
                mensagem=f"{nome}: bateria esgotada ao fim de {esg:.1f} h — equipamentos desligados.",
            ))

    # Transições de estado e failover face à operação normal
    for e in generate_events(ref_network, network, t):
        if e.componente in ("Energia HCM", "Energia Guaxene"):
            continue  # já descrito acima, com a hora certa
        events.append(e)

    return sorted(events, key=lambda e: e.tempo_h)


def _energy_series(inp: SimulationInput) -> list[EnergyPoint]:
    """Curva das baterias de 0 a max(120 h, tempo pedido), amostrada a cada hora."""
    ecfg = CFG["energy"]
    duracao = max(120.0, inp.tempo_simulado_h)

    def site(nome: str, edm: bool, solar_ativo: bool) -> list[dict]:
        c = ecfg[nome]
        if edm:
            return [{"bateria_wh": c["bateria_wh"], "solar_w": 0.0} for _ in range(int(duracao) + 1)]
        serie, _ = rf.battery_series(
            horas=duracao,
            bateria_max_wh=c["bateria_wh"],
            dod=c["dod"],
            eficiencia=c["eficiencia"],
            carga_w=c["carga_w"],
            solar_wp=c["solar_wp_min"] if solar_ativo else 0.0,
            rendimento_kwh_kwp_dia=ecfg["solar_rendimento_kwh_kwp_dia"],
            fator_meteo=inp.fator_solar,
            hora_inicio=ecfg["hora_inicio_corte"],
        )
        return serie

    hcm = site("hcm", inp.edm_hcm, inp.solar_hcm_ativo)
    gua = site("guaxene", inp.edm_guaxene, inp.solar_guaxene_ativo)
    return [
        EnergyPoint(
            tempo_h=float(i),
            hcm_bateria_wh=h["bateria_wh"],
            guaxene_bateria_wh=g["bateria_wh"],
            hcm_solar_w=h["solar_w"],
            guaxene_solar_w=g["solar_w"],
        )
        for i, (h, g) in enumerate(zip(hcm, gua))
    ]


def _simulate_stateless(inp: SimulationInput) -> SimulationResult:
    inp_eff, esg_hcm, esg_g = _apply_outage(inp)
    lb, fresnel, energy, network = _compute(inp_eff)
    energy = energy.model_copy(update={"hcm_esgotou_h": esg_hcm, "guaxene_esgotou_h": esg_g})
    return SimulationResult(
        input=inp_eff,
        link_budget=lb,
        fresnel=fresnel,
        energy=energy,
        network=network,
        eventos=_describe_events(inp_eff, lb, network, energy),
        energia_serie=_energy_series(inp_eff),
    )


@router.post("/simulation/run", response_model=SimulationResult)
def run_custom(inp: SimulationInput):
    """Simula qualquer combinação de falhas num instante `tempo_simulado_h` após o corte da EDM.

    Sem estado: o mesmo input dá sempre o mesmo resultado, por isso é possível
    saltar directamente para qualquer cenário ou hora.
    """
    return _simulate_stateless(inp)


# ---------------------------------------------------------------------------
# POST /api/simulation/timeline  — sequência de eventos calculada de uma vez
# ---------------------------------------------------------------------------

CAMPO_LABEL = {
    "ptp_ativo": "Rádio PtP",
    "g4_local_disponivel": "4G/5G local",
    "g4_externo_disponivel": "4G/5G externo",
    "isp_ativo": "ISP/fibra",
    "satelite_ativo": "Satélite",
    "edm_hcm": "EDM HCM",
    "edm_guaxene": "EDM Guaxene",
    "solar_hcm_ativo": "Solar HCM",
    "solar_guaxene_ativo": "Solar Guaxene",
    "l_ambiente_db": "Atenuação extra",
    "fator_solar": "Sol disponível",
}


def _describe_change(campo: str, valor: bool | float) -> str:
    nome = CAMPO_LABEL.get(campo, campo)
    if isinstance(valor, bool):
        return f"{nome} → {'operacional' if valor else 'em falha'}."
    if campo == "l_ambiente_db":
        return f"{nome}: {valor:g} dB."
    if campo == "fator_solar":
        return f"{nome}: {valor * 100:.0f}%."
    return f"{nome}: {valor}."


@router.post("/simulation/timeline", response_model=TimelineResult)
def run_timeline(req: TimelineRequest):
    """Aplica uma sequência de eventos ao longo do tempo e devolve o estado a cada passo.

    Todo o percurso é calculado de uma vez (não é tempo real): a interface pode
    depois avançar, recuar ou saltar para qualquer instante.
    """
    for ev in req.eventos:
        invalidos = set(ev.alteracoes) - TIMELINE_CAMPOS
        if invalidos:
            raise HTTPException(status_code=422, detail=f"Campos inválidos na linha temporal: {sorted(invalidos)}")

    ecfg = CFG["energy"]
    sites = {
        "hcm": {"cfg": ecfg["hcm"], "edm": "edm_hcm", "solar": "solar_hcm_ativo",
                "bat": "bateria_hcm_wh", "nome": "HCM"},
        "guaxene": {"cfg": ecfg["guaxene"], "edm": "edm_guaxene", "solar": "solar_guaxene_ativo",
                    "bat": "bateria_guaxene_wh", "nome": "Guaxene"},
    }
    rendimento = ecfg["solar_rendimento_kwh_kwp_dia"]
    hora_inicio = ecfg["hora_inicio_corte"]
    c_rate = ecfg["recarga_rede_c_rate"]

    pendentes = sorted(req.eventos, key=lambda e: e.tempo_h)
    estado = req.base.model_dump()
    for s in sites.values():
        estado[s["bat"]] = s["cfg"]["bateria_wh"]
    esgotou: dict[str, float | None] = {k: None for k in sites}

    frames: list[TimelineFrame] = []
    fresnel = None
    prev_network: NetworkState | None = None
    current_mod: str | None = None
    novos: list[SimulationEvent] = []

    def aplicar_ate(t: float) -> None:
        while pendentes and pendentes[0].tempo_h <= t + 1e-9:
            ev = pendentes.pop(0)
            for campo, valor in ev.alteracoes.items():
                estado[campo] = valor
                novos.append(SimulationEvent(
                    tempo_h=round(ev.tempo_h, 2), tipo="INFO",
                    mensagem=_describe_change(campo, valor), componente="Linha temporal",
                ))

    def frame(t: float) -> None:
        nonlocal fresnel, prev_network, current_mod
        inp = SimulationInput(**{**estado, "tempo_simulado_h": t})
        lb, fr, energy, network = _compute(inp, current_mod)
        current_mod = lb.modulacao_selecionada
        fresnel = fresnel or fr
        energy = energy.model_copy(update={
            "hcm_esgotou_h": esgotou["hcm"], "guaxene_esgotou_h": esgotou["guaxene"],
        })
        eventos = list(novos) + [
            e for e in generate_events(prev_network, network, round(t, 2))
            if e.componente not in ("Energia HCM", "Energia Guaxene")
        ]
        novos.clear()
        prev_network = network
        frames.append(TimelineFrame(
            tempo_h=round(t, 2), input=inp, link_budget=lb, energy=energy, network=network,
            eventos=sorted(eventos, key=lambda e: e.tempo_h),
        ))

    aplicar_ate(0.0)
    frame(0.0)

    passo_int = 0.1
    t = 0.0
    proximo_frame = req.passo_h
    while t < req.duracao_h - 1e-9:
        aplicar_ate(t)
        dt = min(passo_int, req.duracao_h - t)
        for chave, s in sites.items():
            c = s["cfg"]
            minimo = rf.battery_floor_wh(c["bateria_wh"], c["dod"])
            edm = bool(estado[s["edm"]])
            solar = 0.0
            if estado[s["solar"]] and not edm:
                solar = rf.solar_power_w(c["solar_wp_min"], hora_inicio + t, rendimento, float(estado["fator_solar"]))
            nova = rf.battery_step(
                estado[s["bat"]], dt, c["bateria_wh"], minimo, c["eficiencia"], c["carga_w"],
                solar_w=solar, rede_w=c["bateria_wh"] * c_rate if edm else 0.0,
            )
            if nova <= minimo and esgotou[chave] is None:
                esgotou[chave] = round(t + dt, 1)
                novos.append(SimulationEvent(
                    tempo_h=round(t + dt, 1), tipo="ERRO", componente=f"Energia {s['nome']}",
                    mensagem=f"{s['nome']}: bateria esgotada — equipamentos desligados.",
                ))
            elif nova > minimo and esgotou[chave] is not None:
                esgotou[chave] = None
                novos.append(SimulationEvent(
                    tempo_h=round(t + dt, 1), tipo="INFO", componente=f"Energia {s['nome']}",
                    mensagem=f"{s['nome']}: bateria a recuperar carga.",
                ))
            estado[s["bat"]] = round(nova, 3)
        t += dt
        if t >= proximo_frame - 1e-9:
            aplicar_ate(t)
            frame(t)
            proximo_frame += req.passo_h

    return TimelineResult(fresnel=fresnel, frames=frames)
