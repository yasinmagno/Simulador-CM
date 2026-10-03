import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { useSimulation } from '@/store/simulation';
import { STATE_ORDER, STATE_HEX, STATE_DESC } from '@/lib/estado';

const pos = (i: number) => ((i + 0.5) / STATE_ORDER.length) * 100;

/**
 * Máquina de estados animada: o estado actual pulsa e, quando muda,
 * um marcador viaja do estado anterior para o novo com a causa da transição.
 */
export function StateMachineDiagram() {
  const { result, mode } = useSimulation();
  const estado = result?.network.estado ?? 'NORMAL';
  const idx = Math.max(0, STATE_ORDER.indexOf(estado as typeof STATE_ORDER[number]));
  const cor = STATE_HEX[estado] ?? '#6b7280';

  const prevIdxRef = useRef(idx);
  const [dot, setDot] = useState({ left: pos(idx), animate: false });
  const [transicao, setTransicao] = useState<{ de: string; para: string; seq: number } | null>(null);

  useEffect(() => {
    const prevIdx = prevIdxRef.current;
    if (prevIdx === idx) return;
    // Começa no estado anterior (sem transição) e desliza até ao novo
    setDot({ left: pos(prevIdx), animate: false });
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => setDot({ left: pos(idx), animate: true }))
    );
    setTransicao((t) => ({ de: STATE_ORDER[prevIdx], para: STATE_ORDER[idx], seq: (t?.seq ?? 0) + 1 }));
    prevIdxRef.current = idx;
    return () => cancelAnimationFrame(raf);
  }, [idx]);

  // Causa: o aviso/erro mais recente que não seja a própria mudança de estado
  const causa = [...(result?.eventos ?? [])]
    .reverse()
    .find((e) => e.tipo !== 'INFO' && !e.mensagem.startsWith('Estado alterado'))?.mensagem;

  const compacto = mode === 'engenharia';

  return (
    <div className={clsx('bg-white border-b border-gray-200 px-4', compacto ? 'pt-2 pb-1.5' : 'pt-3 pb-2')}>
      <div className="relative" style={{ height: compacto ? 44 : 54 }}>
        {/* Trilho com setas entre estados */}
        <div className="absolute left-[10%] right-[10%] top-[14px] h-0.5 bg-gray-200" />
        {STATE_ORDER.slice(0, -1).map((s, i) => (
          <span
            key={s}
            className="absolute top-[7px] text-gray-300 text-xs -translate-x-1/2 select-none"
            style={{ left: `${(pos(i) + pos(i + 1)) / 2}%` }}
          >
            ⇄
          </span>
        ))}

        {/* Marcador que viaja entre estados */}
        <span
          className="absolute top-[9px] w-3 h-3 rounded-full -translate-x-1/2 shadow z-10"
          style={{
            left: `${dot.left}%`,
            background: cor,
            transition: dot.animate ? 'left 900ms cubic-bezier(.4,0,.2,1), background 900ms' : 'none',
            boxShadow: `0 0 0 4px ${cor}33`,
          }}
        />

        {STATE_ORDER.map((s, i) => {
          const ativo = i === idx;
          const c = STATE_HEX[s];
          return (
            <div
              key={s}
              className="absolute top-0 -translate-x-1/2 flex flex-col items-center"
              style={{ left: `${pos(i)}%` }}
              title={STATE_DESC[s]}
            >
              <span
                className={clsx('relative rounded-full border-2 transition-all duration-500', ativo ? 'w-8 h-8' : 'w-5 h-5 mt-1.5')}
                style={{
                  borderColor: c,
                  background: ativo ? c : 'white',
                  opacity: ativo ? 1 : 0.55,
                }}
              >
                {ativo && <span className="state-ping absolute inset-0 rounded-full" style={{ background: c }} />}
              </span>
              <span
                className={clsx('mt-1 whitespace-nowrap font-semibold transition-all', ativo ? 'text-[11px]' : 'text-[10px] text-gray-400')}
                style={ativo ? { color: c } : undefined}
              >
                {s}
              </span>
            </div>
          );
        })}
      </div>

      {/* Causa da transição — reaparece com animação a cada mudança */}
      <div className="h-4 text-center">
        {transicao && transicao.de !== transicao.para ? (
          <p key={transicao.seq} className="fade-slide-in text-[11px] text-gray-600 truncate">
            <span className="font-semibold" style={{ color: STATE_HEX[transicao.de] }}>{transicao.de}</span>
            {' → '}
            <span className="font-semibold" style={{ color: STATE_HEX[transicao.para] }}>{transicao.para}</span>
            {causa && <span className="text-gray-500"> · {causa}</span>}
          </p>
        ) : (
          <p className="text-[11px] text-gray-400 truncate">{STATE_DESC[estado]}</p>
        )}
      </div>
    </div>
  );
}
