import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Play, Pause, SkipBack, Plus, Trash2, RotateCcw } from 'lucide-react';
import { useSimulation, DEFAULT_TIMELINE } from '@/store/simulation';
import { STATE_HEX } from '@/lib/estado';
import type { TimelineChange, TimelineField } from '@/types/simulation';

const CAMPOS: { key: TimelineField; label: string; tipo: 'bool' | 'db' | 'pct' }[] = [
  { key: 'ptp_ativo',             label: 'Rádio PtP',      tipo: 'bool' },
  { key: 'g4_local_disponivel',   label: '4G/5G local',    tipo: 'bool' },
  { key: 'g4_externo_disponivel', label: '4G/5G externo',  tipo: 'bool' },
  { key: 'isp_ativo',             label: 'ISP / fibra',    tipo: 'bool' },
  { key: 'satelite_ativo',        label: 'Satélite',       tipo: 'bool' },
  { key: 'edm_hcm',               label: 'EDM HCM',        tipo: 'bool' },
  { key: 'edm_guaxene',           label: 'EDM Guaxene',    tipo: 'bool' },
  { key: 'solar_hcm_ativo',       label: 'Solar HCM',      tipo: 'bool' },
  { key: 'solar_guaxene_ativo',   label: 'Solar Guaxene',  tipo: 'bool' },
  { key: 'l_ambiente_db',         label: 'Atenuação (dB)', tipo: 'db' },
  { key: 'fator_solar',           label: 'Sol (%)',        tipo: 'pct' },
];
const DURACOES = [48, 72, 120, 168, 240];

interface Linha { tempo_h: number; campo: TimelineField; valor: boolean | number }

const paraLinhas = (ev: TimelineChange[]): Linha[] =>
  ev.flatMap((e) => Object.entries(e.alteracoes).map(([campo, valor]) => ({
    tempo_h: e.tempo_h, campo: campo as TimelineField, valor: valor as boolean | number,
  })));

const paraEventos = (linhas: Linha[]): TimelineChange[] =>
  linhas.map((l) => ({ tempo_h: l.tempo_h, alteracoes: { [l.campo]: l.valor } }));

/** Editor da sequência de eventos (painel esquerdo, modo "Linha temporal"). */
export function TimelineEditor() {
  const { timelineEvents, setTimelineEvents, timelineDuracao, setTimelineDuracao } = useSimulation();
  const linhas = paraLinhas(timelineEvents);

  const atualizar = (i: number, patch: Partial<Linha>) => {
    const novas = linhas.map((l, j) => (j === i ? { ...l, ...patch } : l));
    setTimelineEvents(paraEventos(novas));
  };
  const remover = (i: number) => setTimelineEvents(paraEventos(linhas.filter((_, j) => j !== i)));
  const adicionar = () => {
    const ultimo = linhas.length ? linhas[linhas.length - 1].tempo_h : 0;
    setTimelineEvents(paraEventos([
      ...linhas, { tempo_h: Math.min(ultimo + 6, timelineDuracao), campo: 'ptp_ativo', valor: false },
    ]));
  };

  return (
    <div className="px-4 py-2">
      <p className="text-[11px] text-gray-500 leading-snug mb-2">
        Defina quando cada componente falha ou recupera. Todo o percurso é calculado de uma vez —
        depois pode avançar, recuar ou saltar para qualquer hora na barra inferior.
      </p>

      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-600">Duração</span>
        <select
          value={timelineDuracao}
          onChange={(e) => setTimelineDuracao(Number(e.target.value))}
          className="text-xs border border-gray-300 rounded px-1.5 py-0.5"
        >
          {DURACOES.map((d) => <option key={d} value={d}>{d} h</option>)}
        </select>
      </div>

      <div className="space-y-1.5">
        {linhas.map((l, i) => {
          const def = CAMPOS.find((c) => c.key === l.campo)!;
          return (
            <div key={i} className="flex items-center gap-1 bg-gray-50 rounded p-1">
              <input
                type="number" min={0} max={timelineDuracao} step={1} value={l.tempo_h}
                onChange={(e) => atualizar(i, { tempo_h: Math.max(0, Number(e.target.value)) })}
                className="w-11 text-[11px] font-mono border border-gray-200 rounded px-1 py-0.5"
                title="Hora do evento"
              />
              <span className="text-[10px] text-gray-400">h</span>
              <select
                value={l.campo}
                onChange={(e) => {
                  const campo = e.target.value as TimelineField;
                  const tipo = CAMPOS.find((c) => c.key === campo)!.tipo;
                  atualizar(i, { campo, valor: tipo === 'bool' ? false : tipo === 'db' ? 10 : 0.2 });
                }}
                className="flex-1 min-w-0 text-[11px] border border-gray-200 rounded px-0.5 py-0.5"
              >
                {CAMPOS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
              {def.tipo === 'bool' ? (
                <button
                  onClick={() => atualizar(i, { valor: !l.valor })}
                  className={clsx('text-[10px] font-semibold rounded px-1.5 py-0.5 w-10',
                    l.valor ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}
                >
                  {l.valor ? 'ON' : 'OFF'}
                </button>
              ) : (
                <input
                  type="number" min={0} max={def.tipo === 'db' ? 40 : 100} step={def.tipo === 'db' ? 0.5 : 5}
                  value={def.tipo === 'pct' ? Math.round(Number(l.valor) * 100) : Number(l.valor)}
                  onChange={(e) => atualizar(i, {
                    valor: def.tipo === 'pct' ? Number(e.target.value) / 100 : Number(e.target.value),
                  })}
                  className="w-10 text-[11px] font-mono border border-gray-200 rounded px-1 py-0.5"
                />
              )}
              <button onClick={() => remover(i)} className="text-gray-300 hover:text-red-500" title="Remover">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex gap-1.5 mt-2">
        <button onClick={adicionar}
          className="flex-1 flex items-center justify-center gap-1 text-xs py-1 rounded border border-dashed border-blue-300 text-blue-600 hover:bg-blue-50">
          <Plus className="w-3 h-3" /> Evento
        </button>
        <button onClick={() => setTimelineEvents(DEFAULT_TIMELINE)}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-50"
          title="Repor a história de exemplo">
          <RotateCcw className="w-3 h-3" /> Exemplo
        </button>
      </div>
    </div>
  );
}

const VELOCIDADES = [
  { label: '1×', ms: 400 },
  { label: '4×', ms: 100 },
  { label: '10×', ms: 40 },
];

/**
 * Barra de reprodução da linha temporal: faixa colorida com o estado em cada hora,
 * marcas dos eventos, e cursor que se pode arrastar para qualquer instante.
 * A reprodução apenas percorre resultados já calculados.
 */
export function TimelineBar() {
  const { timeline, frameIdx, setFrame, timelineEvents } = useSimulation();
  const [playing, setPlaying] = useState(false);
  const [vel, setVel] = useState(1);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const n = timeline?.frames.length ?? 0;

  useEffect(() => {
    if (!playing) return;
    timer.current = setInterval(() => {
      const { frameIdx: i, timeline: tl } = useSimulation.getState();
      if (!tl || i >= tl.frames.length - 1) { setPlaying(false); return; }
      useSimulation.getState().setFrame(i + 1);
    }, VELOCIDADES[vel].ms);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [playing, vel]);

  if (!timeline || n === 0) return null;
  const frame = timeline.frames[frameIdx];
  const tMax = timeline.frames[n - 1].tempo_h;

  return (
    <div className="bg-white border-t border-gray-200 px-4 py-2 flex items-center gap-3">
      <button
        onClick={() => { if (frameIdx >= n - 1) setFrame(0); setPlaying((p) => !p); }}
        className="p-1.5 rounded-full bg-blue-600 text-white hover:bg-blue-700"
        title={playing ? 'Pausa' : 'Reproduzir'}
      >
        {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
      </button>
      <button onClick={() => { setPlaying(false); setFrame(0); }}
        className="p-1 text-gray-400 hover:text-gray-700" title="Voltar ao início">
        <SkipBack className="w-3.5 h-3.5" />
      </button>
      <div className="flex gap-0.5">
        {VELOCIDADES.map((v, i) => (
          <button key={v.label} onClick={() => setVel(i)}
            className={clsx('text-[10px] px-1.5 py-0.5 rounded', vel === i ? 'bg-gray-800 text-white' : 'text-gray-500 hover:bg-gray-100')}>
            {v.label}
          </button>
        ))}
      </div>

      <span className="font-mono text-xs text-gray-700 w-16 text-right">T+{frame.tempo_h.toFixed(0)} h</span>

      <div className="flex-1 relative">
        {/* Faixa de estados */}
        <div className="flex h-2.5 rounded overflow-hidden">
          {timeline.frames.map((f, i) => (
            <div key={i} className="flex-1" style={{ background: STATE_HEX[f.network.estado] ?? '#9ca3af' }}
              title={`T+${f.tempo_h}h · ${f.network.estado}`} />
          ))}
        </div>
        {/* Marcas dos eventos */}
        {timelineEvents.map((e, i) => (
          <span key={i} className="absolute -top-1 w-0.5 h-4 bg-gray-800/60"
            style={{ left: `${(e.tempo_h / tMax) * 100}%` }} />
        ))}
        <input
          type="range" min={0} max={n - 1} step={1} value={frameIdx}
          onChange={(e) => { setPlaying(false); setFrame(Number(e.target.value)); }}
          className="absolute inset-x-0 -top-1 w-full h-4 opacity-0 cursor-pointer"
          aria-label="Instante da linha temporal"
        />
        {/* Cursor */}
        <span className="pointer-events-none absolute -top-1.5 w-1 h-5 rounded bg-gray-900 -translate-x-1/2 transition-[left] duration-100"
          style={{ left: `${(frameIdx / (n - 1)) * 100}%` }} />
        <div className="flex justify-between text-[9px] text-gray-400 mt-1">
          <span>0 h</span><span>{(tMax / 2).toFixed(0)} h</span><span>{tMax.toFixed(0)} h</span>
        </div>
      </div>
    </div>
  );
}
