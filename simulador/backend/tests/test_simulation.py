"""Testes da simulação sem estado (/api/simulation/run) e do modelo de energia."""

import sys
import os
import json
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from app.engine.rf_calculator import (
    remaining_autonomy_h,
    solar_power_w,
    battery_after_outage,
)
from app.models.schemas import SimulationInput
from app.api.routes import run_custom, run_scenario, SCENARIOS_DIR


# ---------------------------------------------------------------------------
# Energia
# ---------------------------------------------------------------------------

class TestAutonomia:
    def test_hcm_cheia_86_4h(self):
        assert remaining_autonomy_h(12000, 12000, 0.8, 0.9, 100) == pytest.approx(86.4)

    def test_guaxene_cheia_86_4h(self):
        assert remaining_autonomy_h(3600, 3600, 0.8, 0.9, 30) == pytest.approx(86.4)

    def test_no_minimo_zero(self):
        assert remaining_autonomy_h(2400, 12000, 0.8, 0.9, 100) == 0.0


class TestSolar:
    def test_noite_zero(self):
        assert solar_power_w(800, 2, 4.36) == 0.0
        assert solar_power_w(800, 20, 4.36) == 0.0

    def test_energia_diaria(self):
        # Integral num dia deve dar Wp × rendimento
        e = sum(solar_power_w(1000, h / 100, 4.36) for h in range(2400)) / 100
        assert e == pytest.approx(4360, rel=1e-3)

    def test_fator_meteo(self):
        assert solar_power_w(800, 12, 4.36, 0.2) == pytest.approx(0.2 * solar_power_w(800, 12, 4.36))


class TestBateriaAposCorte:
    def test_sem_solar_esgota_em_86_4h(self):
        _, esgotou = battery_after_outage(120, 12000, 0.8, 0.9, 100)
        assert esgotou == pytest.approx(86.4, abs=0.1)

    def test_72h_sem_solar_acima_minimo(self):
        bat, esgotou = battery_after_outage(72, 12000, 0.8, 0.9, 100)
        assert esgotou is None
        assert bat == pytest.approx(12000 - 72 * 100 / 0.9)

    def test_solar_prolonga_autonomia(self):
        sem, _ = battery_after_outage(72, 12000, 0.8, 0.9, 100)
        com, esg = battery_after_outage(72, 12000, 0.8, 0.9, 100, solar_wp=800, rendimento_kwh_kwp_dia=4.36)
        assert com > sem
        assert esg is None

    def test_nao_ultrapassa_capacidade(self):
        bat, _ = battery_after_outage(48, 3600, 0.8, 0.9, 30, solar_wp=300, rendimento_kwh_kwp_dia=4.36)
        assert bat <= 3600


# ---------------------------------------------------------------------------
# Simulação sem estado
# ---------------------------------------------------------------------------

class TestSimulacaoSemEstado:
    def test_deterministica(self):
        inp = SimulationInput(ptp_ativo=False, l_ambiente_db=5)
        a, b = run_custom(inp), run_custom(inp)
        assert a.model_dump() == b.model_dump()

    def test_salto_directo_para_100h(self):
        r = run_custom(SimulationInput(edm_hcm=False, edm_guaxene=False, tempo_simulado_h=100))
        assert not r.energy.hcm_com_energia
        assert r.energy.hcm_esgotou_h == pytest.approx(86.4, abs=0.1)
        assert r.network.estado == "FALHA"
        assert any(e.tipo == "ERRO" and "esgotada" in e.mensagem for e in r.eventos)

    def test_corte_so_guaxene(self):
        r = run_custom(SimulationInput(edm_guaxene=False, tempo_simulado_h=24))
        assert r.input.bateria_hcm_wh == 12000
        assert r.input.bateria_guaxene_wh < 3600
        assert r.network.estado == "EMERGÊNCIA"

    def test_atenuacao_extrema_sem_modulacao(self):
        r = run_custom(SimulationInput(l_ambiente_db=40))
        assert r.link_budget.modulacao_selecionada is None


@pytest.mark.parametrize("cenario", sorted(SCENARIOS_DIR.glob("cenario_*.json")))
def test_cenarios_predefinidos(cenario):
    esperado = json.loads(cenario.read_text(encoding="utf-8"))
    r = run_scenario(esperado["id"])
    assert r.network.estado == esperado["estado_esperado"]
    assert r.network.caminho_local == esperado["caminho_local_esperado"]
    if "caminho_externo_esperado" in esperado:
        assert r.network.caminho_externo == esperado["caminho_externo_esperado"]


# ---------------------------------------------------------------------------
# Série de energia e linha temporal
# ---------------------------------------------------------------------------

from app.api.routes import run_timeline
from app.models.schemas import TimelineRequest


class TestSerieEnergia:
    def test_serie_horaria_ate_120h(self):
        s = run_custom(SimulationInput(edm_hcm=False)).energia_serie
        assert len(s) == 121
        assert s[0].hcm_bateria_wh == 12000
        assert s[120].hcm_bateria_wh == pytest.approx(2400)
        assert all(p.guaxene_bateria_wh == 3600 for p in s)  # Guaxene com EDM


class TestLinhaTemporal:
    def _req(self, eventos, duracao=110):
        return TimelineRequest(eventos=eventos, duracao_h=duracao)

    def test_um_frame_por_hora(self):
        r = run_timeline(self._req([], duracao=24))
        assert [f.tempo_h for f in r.frames] == [float(h) for h in range(25)]

    def test_failover_na_hora_certa(self):
        r = run_timeline(self._req([{"tempo_h": 6, "alteracoes": {"ptp_ativo": False}}], 12))
        assert r.frames[5].network.caminho_local == "PtP"
        assert r.frames[6].network.caminho_local == "4G/5G"

    def test_bateria_esgota_86_4h_apos_corte(self):
        r = run_timeline(self._req([{"tempo_h": 10, "alteracoes": {"edm_guaxene": False}}]))
        assert r.frames[96].energy.guaxene_esgotou_h is None
        assert r.frames[97].energy.guaxene_esgotou_h == pytest.approx(96.4, abs=0.1)
        assert not r.frames[97].network.guaxene_com_energia

    def test_edm_restaurada_recarrega(self):
        r = run_timeline(self._req([
            {"tempo_h": 0, "alteracoes": {"edm_hcm": False}},
            {"tempo_h": 24, "alteracoes": {"edm_hcm": True}},
        ], 40))
        assert r.frames[24].input.bateria_hcm_wh < r.frames[30].input.bateria_hcm_wh

    def test_campo_invalido(self):
        from fastapi import HTTPException
        with pytest.raises(HTTPException):
            run_timeline(self._req([{"tempo_h": 1, "alteracoes": {"p_tx_dbm": 30}}]))
