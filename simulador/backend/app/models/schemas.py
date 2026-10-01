"""Modelos de dados Pydantic do Simulador HCM ↔ Guaxene."""

from __future__ import annotations
from typing import Optional
from pydantic import BaseModel, Field


class GeographicPoint(BaseModel):
    nome: str
    latitude: float
    longitude: float
    altitude_terreno_m: float
    altura_antena_m: float
    altitude_fonte: str = "ilustrativo"
    altura_antena_fonte: str = "ilustrativo"

    @property
    def altitude_total_m(self) -> float:
        return self.altitude_terreno_m + self.altura_antena_m


class RadioConfiguration(BaseModel):
    distancia_km: float = 3.69
    frequencia_ghz: float = 5.8
    canal_mhz: float = 20.0
    p_tx_dbm: float = 3.0
    g_tx_dbi: float = 34.0
    l_tx_db: float = 1.0
    eirp_dbm: float = 36.0
    g_rx_dbi: float = 34.0
    l_rx_db: float = 1.0
    l_misc_db: float = 1.0
    l_ambiente_db: float = 0.0
    nf_db: float = 5.0


class EnergyConfig(BaseModel):
    carga_w: float
    bateria_wh: float
    dod: float = 0.8
    eficiencia: float = 0.9
    solar_wp_min: float = 0.0
    solar_wp_max: float = 0.0
    autonomia_minima_h: float = 72.0


class SimulationInput(BaseModel):
    ptp_ativo: bool = True
    g4_local_disponivel: bool = True
    g4_externo_disponivel: bool = True
    isp_ativo: bool = True
    satelite_ativo: bool = True
    edm_hcm: bool = True
    edm_guaxene: bool = True
    bateria_hcm_wh: float = 12000.0
    bateria_guaxene_wh: float = 3600.0
    solar_hcm_ativo: bool = False
    solar_guaxene_ativo: bool = False
    l_ambiente_db: float = 0.0
    tempo_simulado_h: float = 0.0


class LinkBudgetResult(BaseModel):
    distancia_km: float
    frequencia_ghz: float
    comprimento_onda_m: float
    fspl_db: float
    eirp_dbm: float
    p_r_dbm: float
    p_n_dbm: float
    snr_db: float
    fade_margin_db: dict[str, float]
    modulacao_selecionada: Optional[str]
    capacidade_mbps: float
    fresnel_max_m: float
    fresnel_60pct_m: float
    earth_bulge_midpoint_m: float
    aviso_dados_ilustrativos: bool = True


class FresnelPoint(BaseModel):
    distancia_m: float
    h_los_m: float
    h_terreno_m: float
    h_bulge_m: float
    h_efetivo_m: float
    fresnel_r_m: float
    fresnel_60pct_m: float
    clearance_m: float
    fresnel_ok: bool


class FresnelResult(BaseModel):
    pontos: list[FresnelPoint]
    todos_ok: bool
    ponto_critico_distancia_m: Optional[float]
    ponto_critico_clearance_m: Optional[float]


class EnergyState(BaseModel):
    hcm_bateria_wh: float
    hcm_autonomia_h: float
    hcm_com_energia: bool
    guaxene_bateria_wh: float
    guaxene_autonomia_h: float
    guaxene_com_energia: bool
    energia_nominal: bool


class NetworkState(BaseModel):
    estado: str
    caminho_local: str
    caminho_externo: str
    hcm_com_energia: bool
    guaxene_com_energia: bool


class SimulationEvent(BaseModel):
    tempo_h: float
    tipo: str
    mensagem: str
    componente: Optional[str] = None


class SimulationResult(BaseModel):
    input: SimulationInput
    link_budget: LinkBudgetResult
    fresnel: FresnelResult
    energy: EnergyState
    network: NetworkState
    eventos: list[SimulationEvent]


class ScenarioDefinition(BaseModel):
    id: int
    nome: str
    descricao: str
    input_override: dict
    estado_esperado: str
    caminho_local_esperado: str
    nota: str = ""
