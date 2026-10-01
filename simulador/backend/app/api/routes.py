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

    minimo_hcm = ecfg_hcm["bateria_wh"] * (1 - ecfg_hcm["dod"])
    minimo_g = ecfg_g["bateria_wh"] * (1 - ecfg_g["dod"])

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

    return _run_simulation(inp)


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

def _run_simulation(inp: SimulationInput) -> SimulationResult:
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
        current_mod=_sim_state["current_mod"],
    )
    lb = LinkBudgetResult(**lb_raw)
    _sim_state["current_mod"] = lb.modulacao_selecionada

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
    auto_hcm = rf.autonomy_hours(inp.bateria_hcm_wh, ecfg_hcm["dod"], ecfg_hcm["eficiencia"], ecfg_hcm["carga_w"])
    auto_g = rf.autonomy_hours(inp.bateria_guaxene_wh, ecfg_g["dod"], ecfg_g["eficiencia"], ecfg_g["carga_w"])
    min_hcm = ecfg_hcm["bateria_wh"] * (1 - ecfg_hcm["dod"])
    min_g = ecfg_g["bateria_wh"] * (1 - ecfg_g["dod"])
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

    # Eventos
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
