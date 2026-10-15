import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceDot, ResponsiveContainer,
} from 'recharts';
import { useSimulation } from '@/store/simulation';

export function EnlaceProfile({ altura = 160 }: { altura?: number }) {
  const { result } = useSimulation();
  if (!result) return null;

  const pontos = result.fresnel.pontos;
  if (!pontos || pontos.length === 0) return null;

  const data = pontos.map((p) => ({
    dist_km: +(p.distancia_m / 1000).toFixed(3),
    terreno: +p.h_terreno_m.toFixed(2),
    los:     +p.h_los_m.toFixed(2),
    fresnel_sup: +(p.h_los_m + p.fresnel_r_m).toFixed(2),
    fresnel_inf: +(p.h_los_m - p.fresnel_r_m).toFixed(2),
    limite_60:   +(p.h_terreno_m + p.h_bulge_m + p.fresnel_60pct_m).toFixed(2),
    ok: p.fresnel_ok,
  }));

  const allOk = result.fresnel.todos_ok;
  const distKm = data[data.length - 1].dist_km;
  // Marcas a cada 0,5 km e no fim do percurso (eixo numérico, não por amostra)
  const ticks = [...Array.from({ length: Math.floor(distKm / 0.5) + 1 }, (_, i) => i * 0.5), distKm]
    .filter((t, i, a) => i === a.length - 1 || distKm - t > 0.15);
  const critico = pontos.find((p) => p.distancia_m === result.fresnel.ponto_critico_distancia_m);

  return (
    <div className="bg-white border-t border-gray-200 px-4 py-3">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        Perfil do Enlace — LOS e Zona de Fresnel
        {!allOk && <span className="ml-2 text-red-500">⚠ Obstrução detetada</span>}
      </h3>
      <ResponsiveContainer width="100%" height={altura}>
        <ComposedChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="dist_km"
            type="number"
            domain={[0, distKm]}
            ticks={ticks}
            tickFormatter={(v: number) => v.toLocaleString('pt-PT', { maximumFractionDigits: 2 })}
            tick={{ fontSize: 10 }}
            label={{ value: 'Distância (km)', position: 'insideBottomRight', offset: -4, fontSize: 10 }}
          />
          <YAxis
            tick={{ fontSize: 10 }}
            label={{ value: 'Alt. (m)', angle: -90, position: 'insideLeft', fontSize: 10 }}
          />
          <Tooltip
            contentStyle={{ fontSize: 11 }}
            formatter={(v: number, name: string) => [`${v.toFixed(2)} m`, name]}
            labelFormatter={(l) => `Dist: ${l} km`}
          />
          <Legend wrapperStyle={{ fontSize: 10 }} />

          {/* Terreno */}
          <Area
            type="monotone" dataKey="terreno" name="Terreno"
            fill="#d1d5db" stroke="#9ca3af" strokeWidth={1} fillOpacity={0.8}
          />
          {/* Zona de Fresnel (F1 acima e abaixo da LOS) */}
          <Area
            type="monotone" dataKey="fresnel_sup" name="F₁ sup."
            fill="#dbeafe" stroke="#93c5fd" strokeWidth={0.5}
            fillOpacity={0.35} dot={false}
          />
          <Area
            type="monotone" dataKey="fresnel_inf" name="F₁ inf."
            fill="#ffffff" stroke="#93c5fd" strokeWidth={0.5}
            fillOpacity={0} dot={false}
          />
          {/* Limite 60% Fresnel (critério mínimo) */}
          <Line
            type="monotone" dataKey="limite_60" name="60% F₁ (crítico)"
            stroke="#f97316" strokeWidth={1} strokeDasharray="4 2" dot={false}
          />
          {/* LOS */}
          <Line
            type="monotone" dataKey="los" name="LOS"
            stroke={allOk ? '#16a34a' : '#dc2626'}
            strokeWidth={2} dot={false}
          />
          {/* Ponto crítico */}
          {critico && (
            <ReferenceDot
              x={+(critico.distancia_m / 1000).toFixed(3)}
              y={+(critico.h_terreno_m + critico.h_bulge_m).toFixed(2)}
              r={4} fill="#dc2626" stroke="white"
              label={{ value: '⚠', fontSize: 12 }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
