import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { useSimulation } from '@/store/simulation';

const BAT = { hcm: 12000, guaxene: 3600 };
const DOD = 0.8;
const util = (wh: number, max: number) => Math.max(0, ((wh - max * (1 - DOD)) / (max * DOD)) * 100);

/**
 * Carga útil das baterias ao longo do corte (estilo PVGIS/HOMER), com a linha
 * do requisito de 72 h e o instante actual. Clicar no gráfico salta para essa hora.
 */
export function EnergyChart({ altura = 150 }: { altura?: number }) {
  const { result, simMode, setDraft, setFrame, timeline } = useSimulation();
  if (!result || result.energia_serie.length === 0) return null;

  const temSolar = simMode === 'instantaneo' && result.energia_serie.some((p) => p.hcm_solar_w + p.guaxene_solar_w > 0);
  const data = result.energia_serie.map((p) => ({
    t: p.tempo_h,
    hcm: +util(p.hcm_bateria_wh, BAT.hcm).toFixed(1),
    guaxene: +util(p.guaxene_bateria_wh, BAT.guaxene).toFixed(1),
    solar: +(p.hcm_solar_w + p.guaxene_solar_w).toFixed(0),
  }));
  const agora = result.input.tempo_simulado_h;

  const saltar = (t: number) => {
    if (simMode === 'linha') {
      const i = timeline?.frames.findIndex((f) => f.tempo_h >= t) ?? -1;
      if (i >= 0) setFrame(i);
    } else {
      setDraft({ tempo_simulado_h: Math.round(t) });
    }
  };

  return (
    <div className="px-4 py-2">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Baterias — carga útil ao longo do tempo
        </h3>
        <span className="text-[11px] text-gray-500">
          Autonomia restante: <b>HCM {result.energy.hcm_autonomia_h.toFixed(1)} h</b> ·{' '}
          <b>Guaxene {result.energy.guaxene_autonomia_h.toFixed(1)} h</b>
        </span>
      </div>
      <ResponsiveContainer width="100%" height={altura}>
        <ComposedChart
          data={data}
          margin={{ top: 4, right: temSolar ? 4 : 12, left: 0, bottom: 0 }}
          onClick={(e) => { if (e?.activeLabel !== undefined) saltar(Number(e.activeLabel)); }}
          style={{ cursor: 'pointer' }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="t" type="number" domain={[0, 'dataMax']} tick={{ fontSize: 10 }}
            ticks={[0, 24, 48, 72, 96, 120, 144, 168, 192, 216, 240].filter((x) => x <= data[data.length - 1].t)}
            label={{ value: 'Horas', position: 'insideBottomRight', offset: -2, fontSize: 10 }} />
          <YAxis yAxisId="pct" domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" width={38} />
          {temSolar && (
            <YAxis yAxisId="w" orientation="right" tick={{ fontSize: 10 }} unit=" W" width={44} />
          )}
          <Tooltip
            contentStyle={{ fontSize: 11 }}
            labelFormatter={(l) => `T+${l} h`}
            formatter={(v: number, name: string) => [name === 'Solar' ? `${v} W` : `${v}%`, name]}
          />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          {temSolar && (
            <Area yAxisId="w" type="monotone" dataKey="solar" name="Solar"
              fill="#fde68a" stroke="#f59e0b" strokeWidth={1} fillOpacity={0.5} isAnimationActive={false} />
          )}
          <Line yAxisId="pct" type="monotone" dataKey="hcm" name="HCM" stroke="#1d4ed8" strokeWidth={2} dot={false} />
          <Line yAxisId="pct" type="monotone" dataKey="guaxene" name="Guaxene" stroke="#15803d" strokeWidth={2} dot={false} />
          <ReferenceLine yAxisId="pct" x={72} stroke="#f97316" strokeDasharray="4 3"
            label={{ value: 'requisito 72 h', fontSize: 9, fill: '#f97316', position: 'insideTopLeft' }} />
          <ReferenceLine yAxisId="pct" x={agora} stroke="#111827" strokeWidth={1.5}
            label={{ value: `agora T+${agora.toFixed(0)}h`, fontSize: 9, fill: '#111827', position: 'insideTopRight' }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
