"""Motor matemático — Simulador de Comunicação Resiliente HCM ↔ Guaxene.

Todos os cálculos intermédios são feitos sem arredondamento.
SNR é informativo — a seleção de modulação usa exclusivamente Fade Margin (FM).
"""

from math import log10, sqrt, asin, sin, cos, radians

# ---------------------------------------------------------------------------
# Constantes físicas
# ---------------------------------------------------------------------------
C_MS = 299_792_458          # velocidade da luz (m/s)
EARTH_RADIUS_M = 6_371_000  # raio médio da Terra (m)
K_FACTOR = 4 / 3            # fator de raio terrestre efetivo (k = 4/3)

# ---------------------------------------------------------------------------
# Tabelas AF-5XHD — canal 20 MHz
# ---------------------------------------------------------------------------
SENSIBILIDADES_DBM: dict[str, float] = {
    "QPSK_MIMO":  -85.0,
    "16QAM_MIMO": -81.0,
    "64QAM":      -75.0,
    "256QAM":     -69.0,
    "1024QAM":    -63.0,
}

# Capacidade escalada a partir de QPSK_MIMO = 24.32 Mbps (premissa académica)
_QPSK_REF = 24.32
CAPACIDADE_MBPS: dict[str, float] = {
    "QPSK_MIMO":  _QPSK_REF,
    "16QAM_MIMO": round(_QPSK_REF * (4 / 2), 2),   # 48.64
    "64QAM":      round(_QPSK_REF * (6 / 2), 2),   # 72.96
    "256QAM":     round(_QPSK_REF * (8 / 2), 2),   # 97.28
    "1024QAM":    round(_QPSK_REF * (10 / 2), 2),  # 121.60
}

# Ordem crescente de robustez (QPSK = mais robusto, 1024QAM = mais sensível)
MODULATION_ORDER: list[str] = [
    "QPSK_MIMO", "16QAM_MIMO", "64QAM", "256QAM", "1024QAM"
]

# Limiar mínimo de FM para operação estável (premissa académica)
MIN_FM_THRESHOLD_DB = 3.0
# Histerese: margem adicional para subir de modulação
FM_HYSTERESIS_DB = 1.0


# ---------------------------------------------------------------------------
# Funções geográficas
# ---------------------------------------------------------------------------

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distância geodésica em km (fórmula de Haversine)."""
    r_km = EARTH_RADIUS_M / 1000
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    return 2 * r_km * asin(sqrt(a))


# ---------------------------------------------------------------------------
# Funções RF
# ---------------------------------------------------------------------------

def wavelength_m(freq_ghz: float) -> float:
    """Comprimento de onda em metros."""
    return C_MS / (freq_ghz * 1e9)


def fspl_db(d_km: float, f_mhz: float) -> float:
    """Perda em espaço livre (FSPL) em dB. d em km, f em MHz."""
    return 32.44 + 20 * log10(d_km) + 20 * log10(f_mhz)


def fresnel_radius_m(d1_m: float, d2_m: float, freq_ghz: float) -> float:
    """Raio da 1ª zona de Fresnel num ponto a d1 do Tx e d2 do Rx (metros)."""
    lam = wavelength_m(freq_ghz)
    return sqrt(lam * d1_m * d2_m / (d1_m + d2_m))


def earth_bulge_m(d1_m: float, d2_m: float) -> float:
    """Saliência da curvatura terrestre (k=4/3) num ponto do percurso (metros)."""
    return (d1_m * d2_m) / (2 * K_FACTOR * EARTH_RADIUS_M)


def eirp_dbm(p_tx_dbm: float, g_tx_dbi: float, l_tx_db: float) -> float:
    """EIRP em dBm."""
    return p_tx_dbm + g_tx_dbi - l_tx_db


def received_power_dbm(
    eirp_dbm_val: float,
    fspl_db_val: float,
    g_rx_dbi: float,
    l_rx_db: float,
    l_misc_db: float,
    l_ambiente_db: float = 0.0,
) -> float:
    """Potência recebida em dBm.

    P_R = EIRP - FSPL + G_R - L_R - L_misc - L_ambiente
    L_ambiente = 0 no cenário base; modificado por chuva/obstáculos.
    """
    return eirp_dbm_val - fspl_db_val + g_rx_dbi - l_rx_db - l_misc_db - l_ambiente_db


def noise_power_dbm(bandwidth_hz: float, nf_db: float) -> float:
    """Potência de ruído térmico em dBm: P_N = -174 + 10·log10(B) + NF.

    Nota: SNR = P_R - P_N é calculado para fins informativos.
    Não controla a seleção de modulação (que usa FM).
    """
    return -174.0 + 10 * log10(bandwidth_hz) + nf_db


def snr_db(p_r_dbm: float, p_n_dbm: float) -> float:
    """Relação sinal-ruído em dB (informativa — não controla modulação)."""
    return p_r_dbm - p_n_dbm


def fade_margin_db(p_r_dbm: float, sensitivity_dbm: float) -> float:
    """Margem de desvanecimento em dB: FM = P_R - S."""
    return p_r_dbm - sensitivity_dbm


def all_fade_margins(p_r_dbm: float) -> dict[str, float]:
    """FM para todas as modulações da tabela AF-5XHD."""
    return {
        mod: fade_margin_db(p_r_dbm, SENSIBILIDADES_DBM[mod])
        for mod in MODULATION_ORDER
    }


# ---------------------------------------------------------------------------
# Seleção de modulação (baseada em FM, com histerese)
# ---------------------------------------------------------------------------

def select_modulation(
    p_r_dbm: float,
    current_mod: str | None = None,
) -> str | None:
    """Seleciona a modulação mais alta onde FM >= MIN_FM_THRESHOLD_DB.

    Histerese: para subir de modulação, FM deve exceder
    MIN_FM_THRESHOLD_DB + FM_HYSTERESIS_DB da modulação candidata.
    Retorna None se nenhuma modulação for viável (enlace em falha).
    Critério: FM, não SNR (premissa académica).
    """
    # Encontrar o melhor modo disponível sem histerese
    best: str | None = None
    for mod in MODULATION_ORDER:
        fm = fade_margin_db(p_r_dbm, SENSIBILIDADES_DBM[mod])
        if fm >= MIN_FM_THRESHOLD_DB:
            best = mod

    if best is None:
        return None

    # Aplicar histerese ao subir de modulação
    if current_mod is not None and current_mod in MODULATION_ORDER:
        curr_idx = MODULATION_ORDER.index(current_mod)
        best_idx = MODULATION_ORDER.index(best)
        if best_idx > curr_idx:
            fm_best = fade_margin_db(p_r_dbm, SENSIBILIDADES_DBM[best])
            if fm_best < MIN_FM_THRESHOLD_DB + FM_HYSTERESIS_DB:
                return current_mod

    return best


def capacity_mbps(modulation: str | None) -> float:
    """Capacidade de referência em Mbps para a modulação selecionada."""
    if modulation is None:
        return 0.0
    return CAPACIDADE_MBPS.get(modulation, 0.0)


# ---------------------------------------------------------------------------
# Energia e autonomia
# ---------------------------------------------------------------------------

def autonomy_hours(
    bateria_wh: float,
    dod: float,
    eficiencia: float,
    carga_w: float,
) -> float:
    """Autonomia em horas: E_bat × DoD × η / P_carga."""
    if carga_w <= 0:
        return float("inf")
    return (bateria_wh * dod * eficiencia) / carga_w


def battery_floor_wh(bateria_max_wh: float, dod: float) -> float:
    """Energia mínima na bateria: E_max × (1 − DoD), arredondada para evitar
    erros de vírgula flutuante (12000 × 0.2 = 2399.9999…)."""
    return round(bateria_max_wh * (1 - dod), 6)


def update_battery(
    bateria_wh: float,
    carga_w: float,
    solar_w: float,
    delta_h: float,
    bateria_max_wh: float,
    dod: float,
) -> float:
    """Atualiza nível da bateria após delta_h horas.

    Energia consumida = (carga_w - solar_w) * delta_h.
    Não desce abaixo de bateria_max_wh * (1 - dod).
    """
    consumo = (carga_w - solar_w) * delta_h
    nova = bateria_wh - consumo
    minimo = battery_floor_wh(bateria_max_wh, dod)
    return max(nova, minimo)


def remaining_autonomy_h(
    bateria_wh: float,
    bateria_max_wh: float,
    dod: float,
    eficiencia: float,
    carga_w: float,
) -> float:
    """Autonomia restante sem sol: (E_bat - E_min) × η / P_carga.

    Com a bateria cheia coincide com autonomy_hours (E_max × DoD × η / P).
    """
    if carga_w <= 0:
        return float("inf")
    minimo = battery_floor_wh(bateria_max_wh, dod)
    return max(bateria_wh - minimo, 0.0) * eficiencia / carga_w


def solar_power_w(
    potencia_wp: float,
    hora_do_dia: float,
    rendimento_kwh_kwp_dia: float,
    fator_meteo: float = 1.0,
) -> float:
    """Potência solar instantânea (W) com perfil diário sinusoidal (06h–18h).

    O pico é escalado para que a energia diária seja
    potencia_wp × rendimento_kwh_kwp_dia (já inclui perdas do sistema).
    Integral de sin em 12 h = 24/π h.
    fator_meteo: 1 = céu limpo médio, ~0.2 = tempestade.
    """
    h = hora_do_dia % 24
    if h <= 6 or h >= 18:
        return 0.0
    pico_w = potencia_wp * rendimento_kwh_kwp_dia / (24 / 3.141592653589793)
    return pico_w * sin(3.141592653589793 * (h - 6) / 12) * fator_meteo


def battery_after_outage(
    horas: float,
    bateria_max_wh: float,
    dod: float,
    eficiencia: float,
    carga_w: float,
    solar_wp: float = 0.0,
    rendimento_kwh_kwp_dia: float = 0.0,
    fator_meteo: float = 1.0,
    hora_inicio: float = 18.0,
    passo_h: float = 0.1,
) -> tuple[float, float | None]:
    """Nível da bateria após `horas` sem EDM, partindo de bateria cheia.

    Cálculo directo (não depende de chamadas anteriores): integra em passos
    de passo_h. A carga é servida primeiro pelo solar; o défice sai da
    bateria (÷η) e o excedente carrega-a (×η), entre E_min e E_max.

    Retorna (bateria_wh, hora_em_que_esgotou ou None).
    """
    serie, esgotou_em = battery_series(
        horas, bateria_max_wh, dod, eficiencia, carga_w,
        solar_wp, rendimento_kwh_kwp_dia, fator_meteo, hora_inicio, passo_h,
        amostra_h=None,
    )
    return serie[-1]["bateria_wh"], esgotou_em


def battery_step(
    bateria_wh: float,
    dt_h: float,
    bateria_max_wh: float,
    minimo_wh: float,
    eficiencia: float,
    carga_w: float,
    solar_w: float = 0.0,
    rede_w: float = 0.0,
) -> float:
    """Um passo do balanço energético da bateria.

    Com EDM (rede_w > 0) a rede alimenta a carga e recarrega a bateria a rede_w.
    Sem EDM a carga é servida primeiro pelo solar; o défice sai da bateria (÷η)
    e o excedente carrega-a (×η), sempre entre E_min e E_max.
    """
    if rede_w > 0:
        return min(bateria_wh + rede_w * dt_h * eficiencia, bateria_max_wh)
    if solar_w >= carga_w:
        return min(bateria_wh + (solar_w - carga_w) * dt_h * eficiencia, bateria_max_wh)
    return max(bateria_wh - (carga_w - solar_w) * dt_h / eficiencia, minimo_wh)


def battery_series(
    horas: float,
    bateria_max_wh: float,
    dod: float,
    eficiencia: float,
    carga_w: float,
    solar_wp: float = 0.0,
    rendimento_kwh_kwp_dia: float = 0.0,
    fator_meteo: float = 1.0,
    hora_inicio: float = 18.0,
    passo_h: float = 0.1,
    amostra_h: float | None = 1.0,
) -> tuple[list[dict], float | None]:
    """Evolução da bateria sem EDM, de 0 a `horas`, partindo de cheia.

    Retorna ([{tempo_h, bateria_wh, solar_w}, ...], hora_em_que_esgotou ou None).
    Com amostra_h=None devolve apenas o ponto final.
    """
    minimo = battery_floor_wh(bateria_max_wh, dod)
    bateria = bateria_max_wh
    esgotou_em: float | None = None

    def solar_em(t: float) -> float:
        if not solar_wp:
            return 0.0
        return solar_power_w(solar_wp, hora_inicio + t, rendimento_kwh_kwp_dia, fator_meteo)

    serie = [{"tempo_h": 0.0, "bateria_wh": bateria, "solar_w": round(solar_em(0.0), 1)}] if amostra_h else []
    proxima_amostra = amostra_h or 0.0
    t = 0.0
    while t < horas - 1e-9:
        dt = min(passo_h, horas - t)
        bateria = battery_step(bateria, dt, bateria_max_wh, minimo, eficiencia, carga_w, solar_em(t))
        t += dt
        if bateria <= minimo and esgotou_em is None:
            esgotou_em = t
        if amostra_h and t >= proxima_amostra - 1e-9:
            serie.append({"tempo_h": round(t, 2), "bateria_wh": round(bateria, 1), "solar_w": round(solar_em(t), 1)})
            proxima_amostra += amostra_h
    if not amostra_h:
        serie.append({"tempo_h": round(t, 2), "bateria_wh": bateria, "solar_w": round(solar_em(t), 1)})
    return serie, esgotou_em


# ---------------------------------------------------------------------------
# Perfil do enlace — LOS e Fresnel ao longo do percurso
# ---------------------------------------------------------------------------

def los_clearance_profile(
    h_a_m: float,
    h_b_m: float,
    terrain_heights_m: list[float],
    freq_ghz: float,
    d_total_km: float,
) -> list[dict]:
    """Calcula clearance de Fresnel ao longo do percurso.

    h_a_m, h_b_m: altitude total das antenas (terreno + mastro) em metros.
    terrain_heights_m: lista de alturas do terreno (inclui ponto inicial e final).
    Retorna lista de dicionários com dados por ponto do percurso.
    """
    n = len(terrain_heights_m)
    d_total_m = d_total_km * 1000
    results = []

    for i, h_terrain in enumerate(terrain_heights_m):
        x = i / (n - 1) * d_total_m if n > 1 else 0.0
        d1 = x
        d2 = d_total_m - x

        h_los = h_a_m + (x / d_total_m) * (h_b_m - h_a_m)
        h_bulge = earth_bulge_m(d1, d2) if (d1 > 0 and d2 > 0) else 0.0
        h_efetivo = h_terrain + h_bulge
        f1 = fresnel_radius_m(d1, d2, freq_ghz) if (d1 > 0 and d2 > 0) else 0.0
        clearance = h_los - h_efetivo

        results.append({
            "distancia_m": round(x, 1),
            "h_los_m": round(h_los, 3),
            "h_terreno_m": round(h_terrain, 3),
            "h_bulge_m": round(h_bulge, 4),
            "h_efetivo_m": round(h_efetivo, 3),
            "fresnel_r_m": round(f1, 3),
            "fresnel_60pct_m": round(f1 * 0.6, 3),
            "clearance_m": round(clearance, 3),
            "fresnel_ok": clearance >= f1 * 0.6,
        })

    return results


# ---------------------------------------------------------------------------
# Cálculo completo do link budget (ponto de entrada principal)
# ---------------------------------------------------------------------------

def compute_link_budget(
    distancia_km: float,
    freq_ghz: float,
    canal_mhz: float,
    p_tx_dbm: float,
    g_tx_dbi: float,
    l_tx_db: float,
    g_rx_dbi: float,
    l_rx_db: float,
    l_misc_db: float,
    l_ambiente_db: float,
    nf_db: float,
    current_mod: str | None = None,
) -> dict:
    """Calcula o link budget completo e retorna todos os resultados."""
    f_mhz = freq_ghz * 1000

    lam = wavelength_m(freq_ghz)
    fspl = fspl_db(distancia_km, f_mhz)
    eirp = eirp_dbm(p_tx_dbm, g_tx_dbi, l_tx_db)
    p_r = received_power_dbm(eirp, fspl, g_rx_dbi, l_rx_db, l_misc_db, l_ambiente_db)
    bw_hz = canal_mhz * 1e6
    p_n = noise_power_dbm(bw_hz, nf_db)
    snr = snr_db(p_r, p_n)
    fms = all_fade_margins(p_r)
    mod = select_modulation(p_r, current_mod)
    cap = capacity_mbps(mod)

    # Fresnel no ponto médio
    d_mid = distancia_km * 1000 / 2
    f1_max = fresnel_radius_m(d_mid, d_mid, freq_ghz)
    bulge_mid = earth_bulge_m(d_mid, d_mid)

    return {
        "distancia_km": distancia_km,
        "frequencia_ghz": freq_ghz,
        "comprimento_onda_m": round(lam, 6),
        "fspl_db": round(fspl, 4),
        "eirp_dbm": round(eirp, 4),
        "p_r_dbm": round(p_r, 4),
        "p_n_dbm": round(p_n, 4),
        "snr_db": round(snr, 4),
        "fade_margin_db": {k: round(v, 4) for k, v in fms.items()},
        "modulacao_selecionada": mod,
        "capacidade_mbps": cap,
        "fresnel_max_m": round(f1_max, 4),
        "fresnel_60pct_m": round(f1_max * 0.6, 4),
        "earth_bulge_midpoint_m": round(bulge_mid, 4),
        "aviso_dados_ilustrativos": True,
    }
