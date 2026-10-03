import { useSimulation } from '@/store/simulation';
import { Play, RotateCcw, ChevronRight, ChevronLeft } from 'lucide-react';
import clsx from 'clsx';

const SCENARIOS = [
  { id: 1, label: '1 — Operação Normal',         desc: 'Todos os sistemas operacionais. PtP ativo, EDM disponível, ISP conectado.' },
  { id: 2, label: '2 — Falha do PtP',            desc: 'Enlace PtP inoperacional. Tráfego local comuta para rede 4G/5G.' },
  { id: 3, label: '3 — Falha da Rede Móvel',     desc: 'Rede 4G/5G local indisponível. PtP é o único caminho local.' },
  { id: 4, label: '4 — Falha da Internet Externa',desc: 'ISP e 4G externo cortados. PtP local opera; satélite é contingência externa.' },
  { id: 5, label: '5 — Corte de Energia (EDM)',  desc: 'EDM cortada nos dois locais. Equipamentos funcionam a bateria (autonomia 86,4 h). Use "Tempo sem EDM" para avançar as horas.' },
  { id: 6, label: '6 — Chuva Intensa',           desc: 'Atenuação por chuva de 2,5 dB adicional. Enlace mantém-se com modulação adaptativa.' },
  { id: 7, label: '7 — Degradação RF',           desc: 'Perturbação RF grave (+10 dB). Modulação regride a 256-QAM para manter o enlace.' },
  { id: 8, label: '8 — Situação Crítica',        desc: 'PtP inoperacional e 4G/5G indisponível. Sem caminho local — estado CRÍTICO.' },
  { id: 9, label: '9 — Recuperação',             desc: 'Todos os sistemas restaurados. Enlace retoma operação normal.' },
];

export function ControlPanel() {
  const { selectedScenario, setSelectedScenario, runScenario, reset, loading, mode, custom } = useSimulation();
  const isPresentacao = mode === 'apresentacao';

  const goNext = () => {
    const next = Math.min(selectedScenario + 1, 9);
    setSelectedScenario(next);
    runScenario(next);
  };
  const goPrev = () => {
    const prev = Math.max(selectedScenario - 1, 1);
    setSelectedScenario(prev);
    runScenario(prev);
  };

  const currentDesc = SCENARIOS.find((s) => s.id === selectedScenario)?.desc ?? '';

  if (isPresentacao) {
    return (
      <div className="bg-white border-t border-gray-200 shadow-sm">
        {/* Descrição do cenário */}
        <div className="px-4 pt-2 pb-1">
          <p className="text-xs text-gray-600 leading-snug">
            {custom ? (
              <>
                <span className="font-semibold text-purple-700">Cenário personalizado:</span>{' '}
                combinação definida no painel "Construir cenário". Escolha um predefinido para voltar à sequência.
              </>
            ) : (
              <>
                <span className="font-semibold text-blue-700">
                  {SCENARIOS.find((s) => s.id === selectedScenario)?.label}:
                </span>{' '}
                {currentDesc}
              </>
            )}
          </p>
        </div>

        {/* Controlos */}
        <div className="flex items-center gap-2 px-4 py-2">
          {/* Prev / scenario select / Next */}
          <button
            onClick={goPrev}
            disabled={loading || selectedScenario <= 1}
            className="p-1.5 rounded border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            title="Cenário anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <select
            value={selectedScenario}
            onChange={(e) => setSelectedScenario(Number(e.target.value))}
            className="flex-1 text-xs border border-gray-300 rounded-md px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {SCENARIOS.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>

          <button
            onClick={() => runScenario(selectedScenario)}
            disabled={loading}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap',
              loading ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'
            )}
          >
            <Play className="w-3 h-3" />
            Executar
          </button>

          <button
            onClick={goNext}
            disabled={loading || selectedScenario >= 9}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap',
              loading || selectedScenario >= 9
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            )}
            title="Executar cenário seguinte"
          >
            Próximo
            <ChevronRight className="w-3 h-3" />
          </button>

          <button
            onClick={() => reset()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 transition-all"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        </div>
      </div>
    );
  }

  // Modo engenharia — barra simples
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 border-t border-gray-200">
      <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">Cenário:</span>

      <select
        value={selectedScenario}
        onChange={(e) => setSelectedScenario(Number(e.target.value))}
        className="flex-1 max-w-xs text-xs border border-gray-300 rounded-md px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        {SCENARIOS.map((s) => (
          <option key={s.id} value={s.id}>{s.label}</option>
        ))}
      </select>

      <button
        onClick={() => runScenario(selectedScenario)}
        disabled={loading}
        className={clsx(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
          loading ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
        )}
      >
        <Play className="w-3 h-3" />
        Executar
      </button>

      <button
        onClick={() => reset()}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 transition-all"
      >
        <RotateCcw className="w-3 h-3" />
        Reset
      </button>
    </div>
  );
}
