"""Máquina de estados da rede — Simulador HCM ↔ Guaxene.

Estados: NORMAL → DEGRADADO → EMERGÊNCIA → CRÍTICO → FALHA
Critérios de transição definidos no PROMPT_MESTRE.md, Parte VII §35.
"""

from app.models.schemas import SimulationInput, NetworkState, SimulationEvent

# FM mínima para o estado NORMAL (256-QAM possível)
FM_NORMAL_THRESHOLD = 17.95
CAPACIDADE_MINIMA_MBPS = 15.0


def compute_energy_state(
    inp: SimulationInput,
    bateria_max_hcm: float = 12000.0,
    bateria_max_guaxene: float = 3600.0,
    dod: float = 0.8,
) -> tuple[bool, bool]:
    """Retorna (hcm_com_energia, guaxene_com_energia)."""
    minimo_hcm = bateria_max_hcm * (1 - dod)
    minimo_guaxene = bateria_max_guaxene * (1 - dod)

    hcm_energia = inp.edm_hcm or (inp.bateria_hcm_wh > minimo_hcm)
    guaxene_energia = inp.edm_guaxene or (inp.bateria_guaxene_wh > minimo_guaxene)
    return hcm_energia, guaxene_energia


def compute_network_state(
    inp: SimulationInput,
    fm_256qam: float,
    capacidade_mbps: float,
) -> NetworkState:
    """Calcula o estado da rede e os caminhos ativos.

    fm_256qam: fade margin para 256-QAM (critério de NORMAL vs DEGRADADO).
    capacidade_mbps: capacidade do modo atual.
    """
    hcm_energia, guaxene_energia = compute_energy_state(inp)
    energia_nominal = inp.edm_hcm and inp.edm_guaxene

    # --- Caminho local HCM ↔ Guaxene ---
    if inp.ptp_ativo and hcm_energia and guaxene_energia:
        caminho_local = "PtP"
    elif inp.g4_local_disponivel and hcm_energia and guaxene_energia:
        caminho_local = "4G/5G"
    else:
        caminho_local = None

    # --- Caminho externo HCM → Internet ---
    if inp.isp_ativo and hcm_energia:
        caminho_externo = "ISP/fibra"
    elif inp.g4_externo_disponivel and hcm_energia:
        caminho_externo = "4G/5G"
    elif inp.satelite_ativo and hcm_energia:
        caminho_externo = "Satélite"
    else:
        caminho_externo = None

    # --- Determinação do estado ---
    if (
        caminho_local == "PtP"
        and fm_256qam >= FM_NORMAL_THRESHOLD
        and capacidade_mbps >= CAPACIDADE_MINIMA_MBPS
        and energia_nominal
        and inp.isp_ativo
    ):
        estado = "NORMAL"

    elif caminho_local == "PtP":
        # PtP funciona mas algo está degradado
        if not energia_nominal:
            # EDM falhou; a funcionar em bateria
            estado = "EMERGÊNCIA"
        elif not inp.isp_ativo and not inp.g4_externo_disponivel:
            # Internet externa cortada; satélite é a contingência
            estado = "EMERGÊNCIA"
        elif fm_256qam < FM_NORMAL_THRESHOLD:
            # Modulação degradada (chuva/interferência)
            estado = "DEGRADADO"
        else:
            # PtP estável mas 4G/5G ou ISP parcialmente degradados
            estado = "DEGRADADO"

    elif caminho_local == "4G/5G":
        # PtP falhou; móvel cobre a ligação local
        estado = "DEGRADADO"

    elif caminho_externo is not None:
        # Sem caminho local; HCM tem internet mas Guaxene está isolada
        estado = "CRÍTICO"

    else:
        estado = "FALHA"

    return NetworkState(
        estado=estado,
        caminho_local=caminho_local or "Nenhum",
        caminho_externo=caminho_externo or "Nenhum",
        hcm_com_energia=hcm_energia,
        guaxene_com_energia=guaxene_energia,
    )


def generate_events(
    prev_state: NetworkState | None,
    new_state: NetworkState,
    tempo_h: float,
) -> list[SimulationEvent]:
    """Gera eventos técnicos quando o estado da rede muda."""
    events: list[SimulationEvent] = []

    if prev_state is None:
        events.append(SimulationEvent(
            tempo_h=tempo_h,
            tipo="INFO",
            mensagem="Simulação iniciada.",
            componente="Sistema",
        ))
        events.append(SimulationEvent(
            tempo_h=tempo_h,
            tipo="INFO",
            mensagem=f"Estado inicial: {new_state.estado} | Caminho local: {new_state.caminho_local} | Externo: {new_state.caminho_externo}",
            componente="Rede",
        ))
        return events

    if new_state.estado != prev_state.estado:
        events.append(SimulationEvent(
            tempo_h=tempo_h,
            tipo="AVISO" if new_state.estado != "NORMAL" else "INFO",
            mensagem=f"Estado alterado: {prev_state.estado} → {new_state.estado}",
            componente="Rede",
        ))

    if new_state.caminho_local != prev_state.caminho_local:
        events.append(SimulationEvent(
            tempo_h=tempo_h,
            tipo="AVISO",
            mensagem=f"Failover: caminho local alterado de '{prev_state.caminho_local}' para '{new_state.caminho_local}'",
            componente="Caminho Local",
        ))

    if new_state.caminho_externo != prev_state.caminho_externo:
        events.append(SimulationEvent(
            tempo_h=tempo_h,
            tipo="AVISO",
            mensagem=f"Caminho externo alterado: '{prev_state.caminho_externo}' → '{new_state.caminho_externo}'",
            componente="Caminho Externo",
        ))

    if new_state.hcm_com_energia != prev_state.hcm_com_energia:
        msg = "HCM: EDM restaurada." if new_state.hcm_com_energia else "HCM: EDM cortada — a funcionar em bateria."
        events.append(SimulationEvent(
            tempo_h=tempo_h,
            tipo="AVISO",
            mensagem=msg,
            componente="Energia HCM",
        ))

    if new_state.guaxene_com_energia != prev_state.guaxene_com_energia:
        msg = "Guaxene: EDM restaurada." if new_state.guaxene_com_energia else "Guaxene: EDM cortada — a funcionar em bateria."
        events.append(SimulationEvent(
            tempo_h=tempo_h,
            tipo="AVISO",
            mensagem=msg,
            componente="Energia Guaxene",
        ))

    return events
