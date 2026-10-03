import clsx from 'clsx';
import { useSimulation } from '@/store/simulation';
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';
import { STATE_HEX } from '@/lib/estado';

const MODS = [
  { key: 'QPSK_MIMO',  label: 'QPSK',  cap: 24.32 },
  { key: '16QAM_MIMO', label: '16QAM', cap: 48.64 },
  { key: '64QAM',      label: '64QAM', cap: 72.96 },
  { key: '256QAM',     label: '256QAM', cap: 97.28 },
  { key: '1024QAM',    label: '1024',  cap: 121.6 },
];
const FM_MIN_DB = 3; // limiar académico de FM para operação estável
const CAP_MINIMA = 15;

/**
 * Escada de modulação adaptativa: o degrau aceso é a modulação em uso;
 * os degraus apagados não têm fade margin suficiente. A capacidade
 * acompanha em contagem animada.
 */
export function ModulationLadder() {
  const { result } = useSimulation();
  const lb = result?.link_budget;
  const cap = useAnimatedNumber(lb?.capacidade_mbps ?? 0);
  if (!lb || !result) return null;

  const cor = STATE_HEX[result.network.estado] ?? '#22c55e';
  const atual = lb.modulacao_selecionada;

  return (
    <div className="py-2">
      <div className="flex items-end justify-between gap-1 h-16">
        {MODS.map((m, i) => {
          const fm = lb.fade_margin_db[m.key] ?? -99;
          const viavel = fm >= FM_MIN_DB;
          const emUso = m.key === atual;
          return (
            <div key={m.key} className="flex-1 flex flex-col items-center gap-0.5" title={`FM = ${fm.toFixed(2)} dB`}>
              <span className={clsx('text-[9px] font-mono', viavel ? 'text-gray-500' : 'text-red-400')}>
                {fm.toFixed(0)}dB
              </span>
              <div
                className="w-full rounded-t transition-all duration-500"
                style={{
                  height: 10 + i * 8,
                  background: emUso ? cor : viavel ? `${cor}40` : '#f1f5f9',
                  border: viavel ? 'none' : '1px dashed #fca5a5',
                  boxShadow: emUso ? `0 0 0 2px ${cor}55` : undefined,
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between gap-1 mt-0.5">
        {MODS.map((m) => (
          <span key={m.key}
            className={clsx('flex-1 text-center text-[9px]', m.key === atual ? 'font-bold text-gray-800' : 'text-gray-400')}>
            {m.label}
          </span>
        ))}
      </div>
      <div className="flex items-baseline justify-between mt-1.5">
        <span className="text-[11px] text-gray-500">Capacidade</span>
        <span className={clsx('font-mono font-bold text-sm', cap >= CAP_MINIMA ? 'text-gray-800' : 'text-red-600')}>
          {cap.toFixed(1)} <span className="text-[10px] font-normal text-gray-400">Mbps</span>
        </span>
      </div>
      <div className="relative h-1.5 bg-gray-100 rounded mt-1 overflow-hidden">
        <div className="h-full rounded transition-all duration-500"
          style={{ width: `${Math.min(100, (cap / 121.6) * 100)}%`, background: cor }} />
        {/* Requisito crítico de 15 Mbps */}
        <div className="absolute top-0 h-full w-0.5 bg-gray-700" style={{ left: `${(CAP_MINIMA / 121.6) * 100}%` }}
          title="Requisito crítico: 15 Mbps" />
      </div>
      <p className="text-[9px] text-gray-400 mt-0.5">▏ requisito crítico 15 Mbps</p>
    </div>
  );
}
