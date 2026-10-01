"""Testes unitários do motor matemático — valores de referência do PROMPT_MESTRE.md §58."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from app.engine.rf_calculator import (
    haversine_km,
    wavelength_m,
    fspl_db,
    fresnel_radius_m,
    earth_bulge_m,
    eirp_dbm,
    received_power_dbm,
    noise_power_dbm,
    snr_db,
    fade_margin_db,
    all_fade_margins,
    select_modulation,
    capacity_mbps,
    autonomy_hours,
    compute_link_budget,
    SENSIBILIDADES_DBM,
    CAPACIDADE_MBPS,
)

# Tolerâncias (PROMPT_MESTRE §58)
TOL_DB  = 0.01   # dB
TOL_M   = 0.01   # metros
TOL_KM  = 0.02   # km
TOL_H   = 0.01   # horas


# ---------------------------------------------------------------------------
# Haversine
# ---------------------------------------------------------------------------

class TestHaversine:
    def test_distancia_referencia(self):
        d = haversine_km(-25.96897, 32.58889, -25.98556, 32.55694)
        assert abs(d - 3.69) < TOL_KM, f"Haversine={d:.4f} km, esperado ≈3.69 km"

    def test_distancia_zero(self):
        assert haversine_km(0, 0, 0, 0) == pytest.approx(0.0, abs=1e-9)

    def test_simetria(self):
        d1 = haversine_km(-25.96897, 32.58889, -25.98556, 32.55694)
        d2 = haversine_km(-25.98556, 32.55694, -25.96897, 32.58889)
        assert abs(d1 - d2) < 1e-9


# ---------------------------------------------------------------------------
# Comprimento de onda
# ---------------------------------------------------------------------------

class TestWavelength:
    def test_5_8_ghz(self):
        lam = wavelength_m(5.8)
        assert abs(lam - 0.0517) < 0.0005, f"λ={lam:.5f} m, esperado ≈0.0517 m"

    def test_valor_fisico(self):
        # λ = c/f → λ × f = c
        lam = wavelength_m(5.8)
        assert abs(lam * 5.8e9 - 299_792_458) < 1


# ---------------------------------------------------------------------------
# FSPL
# ---------------------------------------------------------------------------

class TestFSPL:
    def test_referencia(self):
        # d=3.69 km, f=5800 MHz → FSPL ≈ 119.05 dB
        result = fspl_db(3.69, 5800)
        assert abs(result - 119.05) < TOL_DB, f"FSPL={result:.4f} dB, esperado ≈119.05 dB"

    def test_aumenta_com_distancia(self):
        assert fspl_db(5.0, 5800) > fspl_db(3.69, 5800)

    def test_aumenta_com_frequencia(self):
        assert fspl_db(3.69, 6000) > fspl_db(3.69, 5800)


# ---------------------------------------------------------------------------
# Primeira zona de Fresnel
# ---------------------------------------------------------------------------

class TestFresnel:
    def test_raio_maximo_ponto_medio(self):
        # d_total = 3.69 km → d_mid = 1845 m; freq = 5.8 GHz → F1 ≈ 6.91 m
        r = fresnel_radius_m(1845, 1845, 5.8)
        assert abs(r - 6.91) < TOL_M, f"F1={r:.4f} m, esperado ≈6.91 m"

    def test_60_pct(self):
        r = fresnel_radius_m(1845, 1845, 5.8)
        pct60 = r * 0.6
        assert abs(pct60 - 4.14) < TOL_M, f"60%F1={pct60:.4f} m, esperado ≈4.14 m"

    def test_simetria(self):
        r1 = fresnel_radius_m(1000, 2690, 5.8)
        r2 = fresnel_radius_m(2690, 1000, 5.8)
        assert abs(r1 - r2) < 1e-9


# ---------------------------------------------------------------------------
# Curvatura terrestre
# ---------------------------------------------------------------------------

class TestEarthBulge:
    def test_ponto_medio(self):
        # d_total = 3.69 km → d_mid = 1845 m; bulge ≈ 0.20 m
        bulge = earth_bulge_m(1845, 1845)
        assert abs(bulge - 0.20) < TOL_M, f"Bulge={bulge:.4f} m, esperado ≈0.20 m"

    def test_extremos_zero(self):
        # No ponto do transmissor (d1=0), bulge deve ser 0
        bulge = earth_bulge_m(0, 3690)
        assert bulge == pytest.approx(0.0, abs=1e-6)


# ---------------------------------------------------------------------------
# EIRP
# ---------------------------------------------------------------------------

class TestEIRP:
    def test_referencia(self):
        # P_Tx=3, G_Tx=34, L_Tx=1 → EIRP=36 dBm
        result = eirp_dbm(3, 34, 1)
        assert abs(result - 36.0) < TOL_DB, f"EIRP={result:.4f} dBm, esperado=36.0 dBm"


# ---------------------------------------------------------------------------
# Potência recebida
# ---------------------------------------------------------------------------

class TestReceivedPower:
    def test_cenario_base(self):
        # EIRP=36, FSPL=119.05, G_R=34, L_R=1, L_misc=1, L_amb=0 → P_R ≈ -51.05 dBm
        p_r = received_power_dbm(36.0, 119.05, 34.0, 1.0, 1.0, 0.0)
        assert abs(p_r - (-51.05)) < TOL_DB, f"P_R={p_r:.4f} dBm, esperado≈-51.05 dBm"

    def test_l_ambiente_reduz_pr(self):
        p_r_base = received_power_dbm(36.0, 119.05, 34.0, 1.0, 1.0, 0.0)
        p_r_rain = received_power_dbm(36.0, 119.05, 34.0, 1.0, 1.0, 2.5)
        assert p_r_rain < p_r_base

    def test_l_ambiente_zero_cenario_01(self):
        # No cenário base, L_ambiente deve ser exactamente 0
        p_r_0 = received_power_dbm(36.0, 119.05, 34.0, 1.0, 1.0, 0.0)
        p_r_x = received_power_dbm(36.0, 119.05, 34.0, 1.0, 1.0, 5.0)
        assert p_r_0 > p_r_x


# ---------------------------------------------------------------------------
# Fade Margin
# ---------------------------------------------------------------------------

class TestFadeMargin:
    def test_qpsk(self):
        fm = fade_margin_db(-51.05, SENSIBILIDADES_DBM["QPSK_MIMO"])
        assert abs(fm - 33.95) < TOL_DB, f"FM(QPSK)={fm:.4f} dB, esperado≈33.95 dB"

    def test_16qam(self):
        fm = fade_margin_db(-51.05, SENSIBILIDADES_DBM["16QAM_MIMO"])
        assert abs(fm - 29.95) < TOL_DB

    def test_64qam(self):
        fm = fade_margin_db(-51.05, SENSIBILIDADES_DBM["64QAM"])
        assert abs(fm - 23.95) < TOL_DB

    def test_256qam(self):
        fm = fade_margin_db(-51.05, SENSIBILIDADES_DBM["256QAM"])
        assert abs(fm - 17.95) < TOL_DB

    def test_1024qam(self):
        fm = fade_margin_db(-51.05, SENSIBILIDADES_DBM["1024QAM"])
        assert abs(fm - 11.95) < TOL_DB


# ---------------------------------------------------------------------------
# Seleção de modulação (FM, não SNR)
# ---------------------------------------------------------------------------

class TestModulationSelection:
    def test_normal_conditions(self):
        # P_R = -51.05 → todas as FM >= 3 dB → deve selecionar 1024-QAM (mais alta)
        mod = select_modulation(-51.05)
        assert mod == "1024QAM"

    def test_link_failure(self):
        # P_R muito baixo → nenhuma modulação viável
        mod = select_modulation(-90.0)
        assert mod is None

    def test_qpsk_only(self):
        # P_R = -82 → FM(QPSK)=3, FM(16QAM)=-1 → apenas QPSK viável
        mod = select_modulation(-82.0)
        assert mod == "QPSK_MIMO"

    def test_hysteresis_prevents_upgrade(self):
        # Se já estamos em QPSK e P_R sobe muito ligeiramente (FM(1024QAM) < 4 dB), manter QPSK
        # FM(1024QAM) = P_R - (-63) → para FM < 4 → P_R < -59
        mod = select_modulation(-59.5, current_mod="QPSK_MIMO")
        # FM(1024QAM) = -59.5 - (-63) = 3.5 < MIN(3) + HYST(1) = 4 → manter QPSK
        assert mod == "QPSK_MIMO"

    def test_degradacao_cenario_07(self):
        # Cenário 7: L_amb=10 → P_R = -61.05 dBm
        # FM(256QAM) = -61.05 - (-69) = 7.95 dB >= 3 → deve selecionar 256QAM ou superior
        mod = select_modulation(-61.05)
        assert mod in ("64QAM", "256QAM", "1024QAM")


# ---------------------------------------------------------------------------
# Capacidade
# ---------------------------------------------------------------------------

class TestCapacity:
    def test_qpsk_referencia(self):
        cap = capacity_mbps("QPSK_MIMO")
        assert abs(cap - 24.32) < 0.01, f"Cap(QPSK)={cap} Mbps, esperado=24.32 Mbps"

    def test_capacidade_minima(self):
        # QPSK deve satisfazer o requisito de 15 Mbps
        cap = capacity_mbps("QPSK_MIMO")
        assert cap >= 15.0

    def test_none_retorna_zero(self):
        assert capacity_mbps(None) == 0.0

    def test_ordem_crescente(self):
        caps = [capacity_mbps(m) for m in ["QPSK_MIMO", "16QAM_MIMO", "64QAM", "256QAM", "1024QAM"]]
        assert caps == sorted(caps)


# ---------------------------------------------------------------------------
# Autonomia energética
# ---------------------------------------------------------------------------

class TestAutonomy:
    def test_hcm(self):
        # 12000 Wh × 0.8 × 0.9 / 100 W = 86.4 h
        auto = autonomy_hours(12000, 0.8, 0.9, 100)
        assert abs(auto - 86.4) < TOL_H, f"Autonomia HCM={auto:.3f} h, esperado=86.4 h"

    def test_guaxene(self):
        # 3600 Wh × 0.8 × 0.9 / 30 W = 86.4 h
        auto = autonomy_hours(3600, 0.8, 0.9, 30)
        assert abs(auto - 86.4) < TOL_H, f"Autonomia Guaxene={auto:.3f} h, esperado=86.4 h"

    def test_acima_minimo_72h(self):
        assert autonomy_hours(12000, 0.8, 0.9, 100) >= 72.0
        assert autonomy_hours(3600, 0.8, 0.9, 30) >= 72.0


# ---------------------------------------------------------------------------
# Função compute_link_budget (integração do motor)
# ---------------------------------------------------------------------------

class TestComputeLinkBudget:
    def setup_method(self):
        self.result = compute_link_budget(
            distancia_km=3.69,
            freq_ghz=5.8,
            canal_mhz=20,
            p_tx_dbm=3,
            g_tx_dbi=34,
            l_tx_db=1,
            g_rx_dbi=34,
            l_rx_db=1,
            l_misc_db=1,
            l_ambiente_db=0,
            nf_db=5.0,
        )

    def test_fspl(self):
        assert abs(self.result["fspl_db"] - 119.05) < TOL_DB

    def test_eirp(self):
        assert abs(self.result["eirp_dbm"] - 36.0) < TOL_DB

    def test_p_r(self):
        assert abs(self.result["p_r_dbm"] - (-51.05)) < TOL_DB

    def test_wavelength(self):
        assert abs(self.result["comprimento_onda_m"] - 0.0517) < 0.0005

    def test_fresnel_max(self):
        assert abs(self.result["fresnel_max_m"] - 6.91) < TOL_M

    def test_fresnel_60pct(self):
        assert abs(self.result["fresnel_60pct_m"] - 4.14) < TOL_M

    def test_earth_bulge(self):
        assert abs(self.result["earth_bulge_midpoint_m"] - 0.20) < TOL_M

    def test_fade_margin_qpsk(self):
        assert abs(self.result["fade_margin_db"]["QPSK_MIMO"] - 33.95) < TOL_DB

    def test_fade_margin_256qam(self):
        assert abs(self.result["fade_margin_db"]["256QAM"] - 17.95) < TOL_DB

    def test_capacidade_acima_minimo(self):
        assert self.result["capacidade_mbps"] >= 15.0
