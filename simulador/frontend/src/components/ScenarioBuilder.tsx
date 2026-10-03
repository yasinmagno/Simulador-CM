import clsx from 'clsx';
import { Radio, Wifi, Globe, Satellite, Zap, Sun, CloudRain, Clock, SlidersHorizontal } from 'lucide-react';
import type { ComponentType } from 'react';
import { useSimulation } from '@/store/simulation';
import type { SimulationInput, SimMode } from '@/types/simulation';
import { TimelineEditor } from '@/components/Timeline';

type BoolKey = {
  [K in keyof SimulationInput]: SimulationInput[K] extends boolean ? K : never
}[keyof SimulationInput];

const REDE: { key: BoolKey; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { key: 'ptp_ativo',             label: 'Rádio PtP 5,8 GHz', icon: Radio },
  { key: 'g4_local_disponivel',   label: '4G/5G local',       icon: Wifi },
  { key: 'g4_externo_disponivel', label: '4G/5G externo',     icon: Wifi },
  { key: 'isp_ativo',             label: 'ISP / fibra',       icon: Globe },
  { key: 'satelite_ativo',        label: 'Satélite (HCM)',    icon: Satellite },
];

const ENERGIA: { key: BoolKey; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { key: 'edm_hcm',             label: 'EDM HCM',       icon: Zap },
  { key: 'edm_guaxene',         label: 'EDM Guaxene',   icon: Zap },
  { key: 'solar_hcm_ativo',     label: 'Solar HCM',     icon: Sun },
  { key: 'solar_guaxene_ativo', label: 'Solar Guaxene', icon: Sun },
];

const SALTOS_H = [0, 24, 48, 72, 96, 120];

const BAT_MAX = { hcm: 12000, guaxene: 3600 };
const BAT_MIN_FRAC = 0.2; // 1 − DoD

function Toggle({ label, icon: Icon, on, onChange }: {
  label: string; icon: ComponentType<{ className?: string }>; on: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!on)}
      className="w-full flex items-center justify-between py-1 group"
    >
      <span className="flex items-center gap-1.5 text-xs text-gray-600">
        <Icon className={clsx('w-3.5 h-3.5', on ? 'text-blue-600' : 'text-gray-300')} />
        <span className={clsx(!on && 'line-through text-gray-400')}>{label}</span>
      </span>
      <span className={clsx(
        'relative inline-flex h-4 w-7 rounded-full transition-colors',
        on ? 'bg-green-500' : 'bg-red-400'
      )}>
        <span className={clsx(
          'absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform',
          on ? 'translate-x-3.5' : 'translate-x-0.5'
        )} />
      </span>
    </button>
  );
}

function Slider({ label, icon: Icon, value, min, max, step, unit, disabled, hint, onChange }: {
  label: string; icon: ComponentType<{ className?: string }>; value: number; min: number; max: number;
  step: number; unit: string; disabled?: boolean; hint?: string; onChange: (v: number) => void;
}) {
  return (
    <div className={clsx('py-1.5', disabled && 'opacity-40')}>
      <div className="flex items-center justify-between mb-1">
        <span className="flex items-center gap-1.5 text-xs text-gray-600">
          <Icon className="w-3.5 h-3.5 text-blue-600" />
          {label}
        </span>
        <span className="text-xs font-semibold text-gray-800 font-mono">{value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value} disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 accent-blue-600 cursor-pointer disabled:cursor-not-allowed"
      />
      {hint && <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{hint}</p>}
    </div>
  );
}

function BatteryBar({ nome, wh, max, esgotou }: { nome: string; wh: number; max: number; esgotou: number | null }) {
  const pct = Math.round((wh / max) * 100);
  const uteis = Math.max(0, Math.round(((wh - max * BAT_MIN_FRAC) / (max * (1 - BAT_MIN_FRAC))) * 100));
  const cor = uteis > 50 ? 'bg-green-500' : uteis > 20 ? 'bg-yellow-400' : 'bg-red-500';
  return (
    <div className="py-1">
      <div className="flex justify-between text-[11px] text-gray-500 mb-0.5">
        <span>{nome}</span>
        <span className="font-mono">{(wh / 1000).toFixed(1)} kWh · {uteis}% útil</span>
      </div>
      <div className="relative h-2 bg-gray-100 rounded overflow-hidden">
        <div className={clsx('h-full transition-all duration-300', cor)} style={{ width: `${pct}%` }} />
        {/* Limite de descarga (DoD 80%) */}
        <div className="absolute top-0 h-full w-px bg-gray-500" style={{ left: `${BAT_MIN_FRAC * 100}%` }} />
      </div>
      {esgotou !== null && (
        <p className="text-[10px] text-red-600 mt-0.5">Esgotou ao fim de {esgotou.toFixed(1)} h</p>
      )}
    </div>
  );
}

export function ScenarioBuilder() {
  const { draft, setDraft, result, custom, selectedScenario, simMode, setSimMode } = useSimulation();
  const semEdm = !draft.edm_hcm || !draft.edm_guaxene;
  const comSolar = draft.solar_hcm_ativo || draft.solar_guaxene_ativo;

  return (
    <aside className="bg-white h-full overflow-y-auto">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
          <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
          Construir cenário
        </span>
        <span className={clsx(
          'text-[10px] px-1.5 py-0.5 rounded font-semibold',
          custom ? 'bg-purple-100 text-purple-700' : 'bg-blue-50 text-blue-700'
        )}>
          {simMode === 'linha' ? 'Sequência' : custom ? 'Personalizado' : `Predefinido ${selectedScenario}`}
        </span>
      </div>

      {/* Instantâneo: uma situação; Linha temporal: sequência de eventos */}
      <div className="px-4 pt-2">
        <div className="flex bg-gray-100 rounded-md p-0.5">
          {([['instantaneo', 'Instantâneo'], ['linha', 'Linha temporal']] as [SimMode, string][]).map(([m, label]) => (
            <button
              key={m}
              onClick={() => simMode !== m && setSimMode(m)}
              className={clsx(
                'flex-1 text-[11px] py-1 rounded transition-all',
                simMode === m ? 'bg-white shadow-sm font-semibold text-blue-700' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {simMode === 'linha' ? <TimelineEditor /> : (<>

      <div className="px-4 py-2 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Rede</p>
        {REDE.map((t) => (
          <Toggle key={t.key} label={t.label} icon={t.icon} on={draft[t.key]}
            onChange={(v) => setDraft({ [t.key]: v })} />
        ))}
      </div>

      <div className="px-4 py-2 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Energia</p>
        {ENERGIA.map((t) => (
          <Toggle key={t.key} label={t.label} icon={t.icon} on={draft[t.key]}
            onChange={(v) => setDraft({ [t.key]: v })} />
        ))}
      </div>

      <div className="px-4 py-2 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Condições</p>
        <Slider
          label="Atenuação extra" icon={CloudRain} unit=" dB"
          value={draft.l_ambiente_db} min={0} max={40} step={0.5}
          hint="Chuva intensa ≈ 2,5 dB · degradação RF ≈ 10 dB"
          onChange={(v) => setDraft({ l_ambiente_db: v })}
        />
        <Slider
          label="Tempo sem EDM" icon={Clock} unit=" h"
          value={draft.tempo_simulado_h} min={0} max={120} step={1}
          disabled={!semEdm}
          hint={semEdm ? 'Salta directamente para qualquer hora após o corte (início às 18h).' : 'Desligue a EDM num dos locais para usar.'}
          onChange={(v) => setDraft({ tempo_simulado_h: v })}
        />
        {semEdm && (
          <div className="flex gap-1 mb-1">
            {SALTOS_H.map((h) => (
              <button
                key={h}
                onClick={() => setDraft({ tempo_simulado_h: h })}
                className={clsx(
                  'flex-1 text-[10px] py-0.5 rounded border transition-colors',
                  draft.tempo_simulado_h === h
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50',
                  h === 72 && draft.tempo_simulado_h !== h && 'border-blue-300 text-blue-600'
                )}
              >
                {h}h
              </button>
            ))}
          </div>
        )}
        <Slider
          label="Sol disponível" icon={Sun} unit="%"
          value={Math.round(draft.fator_solar * 100)} min={0} max={100} step={5}
          disabled={!semEdm || !comSolar}
          hint="100% = céu limpo médio (PVGIS Maputo) · 20% = tempestade"
          onChange={(v) => setDraft({ fator_solar: v / 100 })}
        />
      </div>

      {result && semEdm && (
        <div className="px-4 py-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
            Baterias às {draft.tempo_simulado_h} h
          </p>
          <BatteryBar nome="HCM" wh={result.energy.hcm_bateria_wh} max={BAT_MAX.hcm}
            esgotou={result.energy.hcm_esgotou_h} />
          <BatteryBar nome="Guaxene" wh={result.energy.guaxene_bateria_wh} max={BAT_MAX.guaxene}
            esgotou={result.energy.guaxene_esgotou_h} />
        </div>
      )}
      </>)}
    </aside>
  );
}
