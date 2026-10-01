import clsx from 'clsx';
import { useSimulation } from '@/store/simulation';
import { Info, Zap, Radio, Wifi, Satellite, Battery } from 'lucide-react';

const STATE_HEX: Record<string, string> = {
  'NORMAL':     '#22c55e',
  'DEGRADADO':  '#eab308',
  'EMERGÊNCIA': '#f97316',
  'CRÍTICO':    '#ef4444',
  'FALHA':      '#991b1b',
};

function Row({ label, value, unit, ok, onInfo }: {
  label: string; value: string | number; unit?: string;
  ok?: boolean; onInfo?: () => void;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-500">{label}</span>
        {onInfo && (
          <button onClick={onInfo} className="text-gray-300 hover:text-blue-500 transition-colors">
            <Info className="w-3 h-3" />
          </button>
        )}
      </div>
      <div className="flex items-center gap-1">
        {ok !== undefined && (
          <span className={clsx('w-2 h-2 rounded-full', ok ? 'bg-green-500' : 'bg-red-500')} />
        )}
        <span className="text-xs font-semibold text-gray-800">
          {value}{unit && <span className="text-gray-400 font-normal ml-0.5">{unit}</span>}
        </span>
      </div>
    </div>
  );
}

export function SidePanel() {
  const { result, mode, openCalcModal } = useSimulation();
  if (!result) {
    return (
      <aside className="bg-white border-l border-gray-200 p-4 flex items-center justify-center">
        <p className="text-xs text-gray-400">A aguardar dados…</p>
      </aside>
    );
  }

  const { network, link_budget: lb, energy, fresnel } = result;
  const estado = network.estado;
  const cor = STATE_HEX[estado] ?? '#6b7280';

  return (
    <aside className="bg-white border-l border-gray-200 overflow-y-auto">
      {/* Estado geral */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div
          className="flex items-center justify-between rounded-lg px-3 py-2"
          style={{ backgroundColor: cor + '18', borderLeft: `3px solid ${cor}` }}
        >
          <span className="text-xs font-bold" style={{ color: cor }}>{estado}</span>
          <span className="text-xs text-gray-500">{new Date().toLocaleTimeString('pt-PT')}</span>
        </div>
      </div>

      {/* Caminhos */}
      <div className="px-4 py-2 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Caminhos Ativos</p>
        <Row label="Local" value={network.caminho_local} />
        <Row label="Externo" value={network.caminho_externo} />
      </div>

      {/* RF */}
      <div className="px-4 py-2 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Enlace Rádio</p>
        <Row label="P recebida" value={lb.p_r_dbm.toFixed(2)} unit=" dBm"
          onInfo={() => openCalcModal('p_r')} />
        <Row label="SNR" value={lb.snr_db.toFixed(2)} unit=" dB"
          onInfo={() => openCalcModal('snr')} />
        <Row label="Modulação" value={lb.modulacao_selecionada ?? '—'} />
        <Row label="Capacidade" value={lb.capacidade_mbps.toFixed(2)} unit=" Mbps" ok={lb.capacidade_mbps >= 15} />
        <Row label="FSPL" value={lb.fspl_db.toFixed(2)} unit=" dB"
          onInfo={() => openCalcModal('fspl')} />
        {mode === 'engenharia' && (
          <>
            <Row label="FM QPSK" value={(lb.fade_margin_db['QPSK_MIMO'] ?? 0).toFixed(2)} unit=" dB"
              onInfo={() => openCalcModal('fm')} />
            <Row label="FM 256-QAM" value={(lb.fade_margin_db['256QAM'] ?? 0).toFixed(2)} unit=" dB" />
            <Row label="EIRP" value={lb.eirp_dbm.toFixed(1)} unit=" dBm" />
            <Row label="λ" value={(lb.comprimento_onda_m * 100).toFixed(2)} unit=" cm" />
          </>
        )}
      </div>

      {/* Fresnel */}
      <div className="px-4 py-2 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Fresnel / LOS</p>
        <Row label="LOS" value={fresnel.todos_ok ? 'Livre' : 'Obstruída'} ok={fresnel.todos_ok}
          onInfo={() => openCalcModal('fresnel')} />
        <Row label="Raio máx. (F₁)" value={lb.fresnel_max_m.toFixed(2)} unit=" m" />
        <Row label="Folga 60%" value={lb.fresnel_60pct_m.toFixed(2)} unit=" m" />
        {mode === 'engenharia' && (
          <Row label="Curvatura" value={lb.earth_bulge_midpoint_m.toFixed(3)} unit=" m" />
        )}
      </div>

      {/* Energia */}
      <div className="px-4 py-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Energia</p>
        <Row label="HCM EDM" value={result.input.edm_hcm ? 'Ativa' : 'Cortada'} ok={result.input.edm_hcm} />
        <Row label="Auto. HCM" value={energy.hcm_autonomia_h.toFixed(1)} unit=" h"
          ok={energy.hcm_autonomia_h >= 72} onInfo={() => openCalcModal('energia')} />
        <Row label="Guaxene EDM" value={result.input.edm_guaxene ? 'Ativa' : 'Cortada'} ok={result.input.edm_guaxene} />
        <Row label="Auto. Guaxene" value={energy.guaxene_autonomia_h.toFixed(1)} unit=" h"
          ok={energy.guaxene_autonomia_h >= 72} />
        {mode === 'engenharia' && (
          <>
            <Row label="Bat. HCM" value={(energy.hcm_bateria_wh / 1000).toFixed(1)} unit=" kWh" />
            <Row label="Bat. Guaxene" value={(energy.guaxene_bateria_wh / 1000).toFixed(1)} unit=" kWh" />
          </>
        )}
      </div>

      {/* Aviso dados ilustrativos */}
      {lb.aviso_dados_ilustrativos && mode === 'engenharia' && (
        <div className="mx-4 mb-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
          ⚠ Alturas de antena ilustrativas. Substituir pelos valores do relatório técnico.
        </div>
      )}
    </aside>
  );
}
