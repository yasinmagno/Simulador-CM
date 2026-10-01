import { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import clsx from 'clsx';
import { api } from '@/lib/api';
import { useSimulation } from '@/store/simulation';

const SPEEDS = [
  { label: '1×', dt_h: 1,  interval_ms: 1000 },
  { label: '5×', dt_h: 5,  interval_ms: 1000 },
  { label: '10×',dt_h: 10, interval_ms: 1000 },
  { label: '24×',dt_h: 24, interval_ms: 1000 },
];

export function TimeControl() {
  const { result, runScenario } = useSimulation();
  const [playing, setPlaying] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(0);
  const [simHours, setSimHours] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { result: storeResult } = useSimulation();

  // Parar se bateria chegou ao mínimo
  const hcmOk = (result?.energy.hcm_autonomia_h ?? 99) > 0.1;
  const guaOk = (result?.energy.guaxene_autonomia_h ?? 99) > 0.1;
  const canPlay = hcmOk && guaOk;

  const stop = () => {
    setPlaying(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const tick = async (dt_h: number) => {
    try {
      const r = await api.advance(dt_h);
      useSimulation.setState({ result: r });
      setSimHours((h) => +(h + dt_h).toFixed(1));
    } catch {
      stop();
    }
  };

  const togglePlay = () => {
    if (!canPlay) return;
    if (playing) { stop(); return; }
    setPlaying(true);
    const { dt_h, interval_ms } = SPEEDS[speedIdx];
    timerRef.current = setInterval(() => tick(dt_h), interval_ms);
  };

  // Reconstruir interval quando speedIdx muda
  useEffect(() => {
    if (!playing) return;
    if (timerRef.current) clearInterval(timerRef.current);
    const { dt_h, interval_ms } = SPEEDS[speedIdx];
    timerRef.current = setInterval(() => tick(dt_h), interval_ms);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speedIdx, playing]);

  // Parar se energia esgotada
  useEffect(() => {
    if (!canPlay && playing) stop();
  }, [canPlay, playing]);

  // Cleanup no unmount
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const hcmWh   = result?.energy.hcm_bateria_wh ?? 12000;
  const hcmMax  = 12000;
  const guaWh   = result?.energy.guaxene_bateria_wh ?? 3600;
  const guaMax  = 3600;
  const hcmPct  = Math.round((hcmWh / hcmMax) * 100);
  const guaPct  = Math.round((guaWh / guaMax) * 100);

  const batColor = (pct: number) =>
    pct > 50 ? '#22c55e' : pct > 25 ? '#eab308' : '#ef4444';

  // Só mostrar se EDM está cortada em algum local
  const edm_hcm = result?.input?.edm_hcm ?? true;
  const edm_gua = result?.input?.edm_guaxene ?? true;
  if (edm_hcm && edm_gua) return null;

  return (
    <div className="bg-white border-t border-gray-200 px-4 py-2 flex items-center gap-4 text-xs">
      {/* Tempo simulado */}
      <div className="flex items-center gap-1.5 font-mono text-gray-700 min-w-[80px]">
        <span className="text-gray-400">T+</span>
        <span className="font-bold">{simHours.toFixed(1)} h</span>
      </div>

      {/* Play/Pause */}
      <button
        onClick={togglePlay}
        disabled={!canPlay}
        className={clsx(
          'flex items-center gap-1 px-2.5 py-1 rounded text-white text-xs font-semibold transition-all',
          canPlay
            ? playing ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-600 hover:bg-green-700'
            : 'bg-gray-300 cursor-not-allowed'
        )}
      >
        {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
        {playing ? 'Pausar' : 'Play'}
      </button>

      {/* Velocidade */}
      <div className="flex items-center gap-0.5 bg-gray-100 rounded p-0.5">
        {SPEEDS.map((s, i) => (
          <button
            key={s.label}
            onClick={() => setSpeedIdx(i)}
            className={clsx(
              'px-1.5 py-0.5 rounded text-xs font-medium transition-all',
              speedIdx === i ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Baterias */}
      <div className="flex items-center gap-3 flex-1">
        {!edm_hcm && (
          <div className="flex items-center gap-1.5 min-w-[120px]">
            <span className="text-gray-500 w-8">HCM</span>
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${hcmPct}%`, backgroundColor: batColor(hcmPct) }}
              />
            </div>
            <span className="font-semibold w-8 text-right" style={{ color: batColor(hcmPct) }}>
              {hcmPct}%
            </span>
          </div>
        )}
        {!edm_gua && (
          <div className="flex items-center gap-1.5 min-w-[120px]">
            <span className="text-gray-500 w-14">Guaxene</span>
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${guaPct}%`, backgroundColor: batColor(guaPct) }}
              />
            </div>
            <span className="font-semibold w-8 text-right" style={{ color: batColor(guaPct) }}>
              {guaPct}%
            </span>
          </div>
        )}
      </div>

      {/* Reset tempo */}
      <button
        onClick={() => { stop(); setSimHours(0); }}
        className="text-gray-400 hover:text-gray-600 transition-colors"
        title="Resetar cronómetro"
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
