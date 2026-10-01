import clsx from 'clsx';
import { Radio, Zap } from 'lucide-react';
import { useSimulation } from '@/store/simulation';
import type { AppMode } from '@/types/simulation';

const STATE_CONFIG = {
  'NORMAL':    { label: 'NORMAL',     color: 'bg-green-500',  text: 'text-green-700'  },
  'DEGRADADO': { label: 'DEGRADADO',  color: 'bg-yellow-400', text: 'text-yellow-700' },
  'EMERGÊNCIA':{ label: 'EMERGÊNCIA', color: 'bg-orange-500', text: 'text-orange-700' },
  'CRÍTICO':   { label: 'CRÍTICO',    color: 'bg-red-500',    text: 'text-red-700'    },
  'FALHA':     { label: 'FALHA',      color: 'bg-red-800',    text: 'text-red-900'    },
};

export function Header() {
  const { result, mode, setMode, loading } = useSimulation();
  const estado = result?.network?.estado ?? 'NORMAL';
  const cfg = STATE_CONFIG[estado as keyof typeof STATE_CONFIG] ?? STATE_CONFIG['NORMAL'];

  return (
    <header className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 shadow-sm">
      {/* Título */}
      <div className="flex items-center gap-2">
        <Radio className="w-5 h-5 text-blue-700" />
        <div>
          <h1 className="text-sm font-bold text-gray-800 leading-tight">
            Simulador de Comunicação Resiliente
          </h1>
          <p className="text-xs text-gray-500">HCM ↔ Guaxene · 5,8 GHz · 3,69 km</p>
        </div>
      </div>

      {/* Estado da rede */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Estado:</span>
        <span className={clsx(
          'flex items-center gap-1.5 rounded-full font-semibold text-white',
          cfg.color,
          mode === 'apresentacao' ? 'px-4 py-1.5 text-sm' : 'px-2.5 py-1 text-xs'
        )}>
          <span className={clsx('rounded-full bg-white opacity-80', mode === 'apresentacao' ? 'w-2 h-2' : 'w-1.5 h-1.5')} />
          {cfg.label}
          {loading && <span className="ml-1 opacity-70">…</span>}
        </span>
      </div>

      {/* Modo toggle */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
        {(['apresentacao', 'engenharia'] as AppMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={clsx(
              'px-3 py-1 rounded-md text-xs font-medium transition-all',
              mode === m
                ? 'bg-white text-blue-700 shadow-sm font-semibold'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {m === 'apresentacao' ? 'Apresentação' : 'Engenharia'}
          </button>
        ))}
      </div>
    </header>
  );
}
