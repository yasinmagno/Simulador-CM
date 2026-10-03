import { X } from 'lucide-react';
import { useSimulation } from '@/store/simulation';
import type { SimulationResult } from '@/types/simulation';

type MaybeResult = SimulationResult | null;

interface CalcEntry {
  titulo: string;
  formula: string;
  substituicao: (r: MaybeResult) => string;
  resultado: (r: MaybeResult) => string;
  interpretacao: (r: MaybeResult) => string;
}

const CALCS: Record<string, CalcEntry> = {
  fspl: {
    titulo: 'Perda em Espaço Livre (FSPL)',
    formula: 'FSPL(dB) = 32,44 + 20·log₁₀(d km) + 20·log₁₀(f MHz)',
    substituicao: (r) => r ? `= 32,44 + 20·log₁₀(${r.link_budget.distancia_km}) + 20·log₁₀(${r.link_budget.frequencia_ghz * 1000})` : '—',
    resultado:    (r) => r ? `${r.link_budget.fspl_db.toFixed(4)} dB` : '—',
    interpretacao: (r) => r ? `Atenuação de propagação em espaço livre para ${r.link_budget.distancia_km} km a ${r.link_budget.frequencia_ghz} GHz.` : '—',
  },
  p_r: {
    titulo: 'Potência Recebida (P_R)',
    formula: 'P_R = EIRP − FSPL + G_R − L_R − L_misc − L_ambiente',
    substituicao: (r) => r ? `= ${r.link_budget.eirp_dbm} − ${r.link_budget.fspl_db.toFixed(2)} + 34 − 1 − 1 − ${r.input.l_ambiente_db}` : '—',
    resultado:    (r) => r ? `${r.link_budget.p_r_dbm.toFixed(4)} dBm` : '—',
    interpretacao: (r) => r ? `Potência no recetor após perdas totais. ${r.link_budget.p_r_dbm > -70 ? 'Nível adequado para ligação estável.' : 'Nível baixo — verificar condições.'}` : '—',
  },
  snr: {
    titulo: 'Relação Sinal-Ruído (SNR) — Informativa',
    formula: 'SNR = P_R − P_N  |  P_N = −174 + 10·log₁₀(B) + NF',
    substituicao: (r) => r ? `P_N = −174 + 10·log₁₀(20×10⁶) + 5 = ${r.link_budget.p_n_dbm.toFixed(2)} dBm` : '—',
    resultado:    (r) => r ? `SNR = ${r.link_budget.snr_db.toFixed(4)} dB` : '—',
    interpretacao: () => 'SNR é calculado para fins informativos. A seleção de modulação usa a Fade Margin (FM = P_R − Sensibilidade), não o SNR.',
  },
  fm: {
    titulo: 'Margem de Desvanecimento (FM)',
    formula: 'FM = P_R − S (sensibilidade do modo)',
    substituicao: (r) => r ? `FM(QPSK) = ${r.link_budget.p_r_dbm.toFixed(2)} − (−85) = ${(r.link_budget.fade_margin_db['QPSK_MIMO'] ?? 0).toFixed(2)} dB` : '—',
    resultado:    (r) => r ? `FM(QPSK) = ${(r.link_budget.fade_margin_db['QPSK_MIMO'] ?? 0).toFixed(2)} dB` : '—',
    interpretacao: (r) => {
      if (!r) return '—';
      const fm = r.link_budget.fade_margin_db['QPSK_MIMO'] ?? 0;
      if (fm > 30) return `Margem de ${fm.toFixed(1)} dB — enlace muito robusto.`;
      if (fm > 15) return `Margem de ${fm.toFixed(1)} dB — enlace estável.`;
      return `Margem de ${fm.toFixed(1)} dB — margem reduzida.`;
    },
  },
  fresnel: {
    titulo: 'Primeira Zona de Fresnel',
    formula: 'F₁ = √(λ · d₁ · d₂ / (d₁ + d₂))  |  Critério: Clearance ≥ 0,6 · F₁',
    substituicao: (r) => r ? `No ponto médio: F₁ = √(${(r.link_budget.comprimento_onda_m).toFixed(4)} · 1845 · 1845 / 3690)` : '—',
    resultado:    (r) => r ? `F₁,max = ${r.link_budget.fresnel_max_m.toFixed(2)} m  |  60% = ${r.link_budget.fresnel_60pct_m.toFixed(2)} m` : '—',
    interpretacao: (r) => r ? (r.fresnel.todos_ok ? 'LOS desobstruída — critério de 60% cumprido em todo o percurso.' : '⚠ Obstrução detetada — clearance insuficiente num ou mais pontos.') : '—',
  },
  energia: {
    titulo: 'Autonomia Energética',
    formula: 'Autonomia restante = (E_bat − E_min) × η / P_carga  |  E_min = E_max × (1 − DoD)',
    substituicao: (r) => r
      ? `HCM: (${r.energy.hcm_bateria_wh.toFixed(0)} − 2 400) × 0,9 / 100  |  Guaxene: (${r.energy.guaxene_bateria_wh.toFixed(0)} − 720) × 0,9 / 30`
      + '  ·  Cheia: 12 000 × 0,8 × 0,9 / 100 = 86,4 h'
      : '—',
    resultado:    (r) => r ? `HCM: ${r.energy.hcm_autonomia_h.toFixed(1)} h  |  Guaxene: ${r.energy.guaxene_autonomia_h.toFixed(1)} h` : '—',
    interpretacao: (r) => r ? `Requisito mínimo: 72 h. Calculado: 86,4 h (com margem de dimensionamento). ${r.energy.energia_nominal ? 'EDM disponível.' : 'A funcionar em bateria.'}` : '—',
  },
};

export function CalculationModal() {
  const { calcModalOpen, calcModalKey, closeCalcModal, result } = useSimulation();
  if (!calcModalOpen || !calcModalKey) return null;

  const entry = CALCS[calcModalKey];
  if (!entry) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={closeCalcModal}>
      <div
        className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-sm font-bold text-gray-800">{entry.titulo}</h2>
          <button onClick={closeCalcModal} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Fórmula</p>
            <p className="text-sm font-mono bg-gray-50 p-2 rounded border text-gray-700">{entry.formula}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Substituição</p>
            <p className="text-sm font-mono bg-blue-50 p-2 rounded border border-blue-100 text-blue-800">{entry.substituicao(result)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Resultado</p>
            <p className="text-sm font-bold bg-green-50 p-2 rounded border border-green-100 text-green-800">{entry.resultado(result)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Interpretação</p>
            <p className="text-sm text-gray-600 italic">{entry.interpretacao(result)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
