export interface SimulationInput {
  ptp_ativo: boolean;
  g4_local_disponivel: boolean;
  g4_externo_disponivel: boolean;
  isp_ativo: boolean;
  satelite_ativo: boolean;
  edm_hcm: boolean;
  edm_guaxene: boolean;
  bateria_hcm_wh: number;
  bateria_guaxene_wh: number;
  solar_hcm_ativo: boolean;
  solar_guaxene_ativo: boolean;
  l_ambiente_db: number;
  tempo_simulado_h: number;
}

export interface LinkBudgetResult {
  distancia_km: number;
  frequencia_ghz: number;
  comprimento_onda_m: number;
  fspl_db: number;
  eirp_dbm: number;
  p_r_dbm: number;
  p_n_dbm: number;
  snr_db: number;
  fade_margin_db: Record<string, number>;
  modulacao_selecionada: string | null;
  capacidade_mbps: number;
  fresnel_max_m: number;
  fresnel_60pct_m: number;
  earth_bulge_midpoint_m: number;
  aviso_dados_ilustrativos: boolean;
}

export interface FresnelPoint {
  distancia_m: number;
  h_los_m: number;
  h_terreno_m: number;
  h_bulge_m: number;
  h_efetivo_m: number;
  fresnel_r_m: number;
  fresnel_60pct_m: number;
  clearance_m: number;
  fresnel_ok: boolean;
}

export interface FresnelResult {
  pontos: FresnelPoint[];
  todos_ok: boolean;
  ponto_critico_distancia_m: number | null;
  ponto_critico_clearance_m: number | null;
}

export interface EnergyState {
  hcm_bateria_wh: number;
  hcm_autonomia_h: number;
  hcm_com_energia: boolean;
  guaxene_bateria_wh: number;
  guaxene_autonomia_h: number;
  guaxene_com_energia: boolean;
  energia_nominal: boolean;
}

export interface NetworkState {
  estado: 'NORMAL' | 'DEGRADADO' | 'EMERGÊNCIA' | 'CRÍTICO' | 'FALHA';
  caminho_local: string;
  caminho_externo: string;
  hcm_com_energia: boolean;
  guaxene_com_energia: boolean;
}

export interface SimulationEvent {
  tempo_h: number;
  tipo: 'INFO' | 'AVISO' | 'ERRO';
  mensagem: string;
  componente?: string;
}

export interface SimulationResult {
  input: SimulationInput;
  link_budget: LinkBudgetResult;
  fresnel: FresnelResult;
  energy: EnergyState;
  network: NetworkState;
  eventos: SimulationEvent[];
}

export type AppMode = 'apresentacao' | 'engenharia';
