import clsx from 'clsx';
import { useSimulation } from '@/store/simulation';
import { Info } from 'lucide-react';
import { STATE_HEX } from '@/lib/estado';
import { ModulationLadder } from '@/components/ModulationLadder';

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
  // Valores de link budget são teóricos; só há modulação/capacidade com o rádio ligado e alimentado
  const ptpEmServico = result.input.ptp_ativo && network.hcm_com_energia && network.guaxene_com_energia;

  return (
    <aside className="bg-white border-l border-gray-200 overflow-y-auto">
      {/* Estado geral */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div
          className="flex items-center justify-between rounded-lg px-3 py-2"
          style={{ backgroundColor: cor + '18', borderLeft: `3px solid ${cor}` }}
        >
          <span className="text-xs font-bold" style={{ color: cor }}>{estado}</span>
          <span className="text-xs text-gray-500 font-mono">T+{result.input.tempo_simulado_h.toFixed(0)} h</span>
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
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Enlace Rádio PtP</p>
        {!ptpEmServico ? (
          <div className="my-1 p-2 rounded bg-red-50 border border-red-200 text-xs text-red-700">
            {!result.input.ptp_ativo
              ? 'Rádio PtP em falha — sem modulação nem capacidade.'
              : 'Equipamento PtP sem energia num dos extremos.'}
            <span className="block text-red-500 mt-0.5">
              Tráfego local: {network.caminho_local === 'Nenhum' ? 'sem caminho' : `via ${network.caminho_local}`}
            </span>
          </div>
        ) : (
          <ModulationLadder />
        )}
        <Row label="P recebida" value={lb.p_r_dbm.toFixed(2)} unit=" dBm"
          onInfo={() => openCalcModal('p_r')} />
        <Row label="SNR" value={lb.snr_db.toFixed(2)} unit=" dB"
          onInfo={() => openCalcModal('snr')} />
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
