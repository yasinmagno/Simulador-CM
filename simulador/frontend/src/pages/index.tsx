import { useEffect, useState } from 'react';
import Head from 'next/head';
import clsx from 'clsx';
import { useSimulation } from '@/store/simulation';
import { Header } from '@/components/Header';
import { MapView } from '@/components/MapView';
import { SidePanel } from '@/components/SidePanel';
import { ControlPanel } from '@/components/ControlPanel';
import { EnlaceProfile } from '@/components/EnlaceProfile';
import { EventLog } from '@/components/EventLog';
import { CalculationModal } from '@/components/CalculationModal'
import { ScenarioBuilder } from '@/components/ScenarioBuilder';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { StateMachineDiagram } from '@/components/StateMachineDiagram';
import { EnergyChart } from '@/components/EnergyChart';
import { TimelineBar } from '@/components/Timeline';

type BottomTab = 'perfil' | 'energia' | 'eventos';
const TABS: [BottomTab, string][] = [['perfil', 'Perfil do enlace'], ['energia', 'Energia'], ['eventos', 'Eventos']];

export default function Home() {
  const { reset, result, error, mode, simMode } = useSimulation();
  const [builderOpen, setBuilderOpen] = useState(true);
  const [tab, setTab] = useState<BottomTab>('perfil');
  const semEdm = result ? !result.input.edm_hcm || !result.input.edm_guaxene : false;

  /* Carregar estado inicial ao abrir a aplicação */
  useEffect(() => { reset(); }, []);

  const isPresentacao = mode === 'apresentacao';

  return (
    <>
      <Head>
        <title>Simulador HCM ↔ Guaxene</title>
        <meta name="description" content="Simulador de Comunicação Resiliente — Comunicação Móvel, ISCTEM" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
        {/* ── Cabeçalho ── */}
        <Header />

        {/* ── Erro de ligação ao backend ── */}
        {error && (
          <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-xs text-red-700 flex items-center gap-2">
            <span>⚠</span>
            <span>Sem ligação ao servidor. Inicie o backend: <code className="bg-red-100 px-1 rounded">uvicorn app.main:app --reload</code></span>
          </div>
        )}

        {/* ── Área principal ── */}
        <div className="flex flex-1 overflow-hidden">
          {/* Construtor de cenários — qualquer combinação de falhas, sem tempo real */}
          {builderOpen && (
            <div className="w-60 flex-shrink-0 border-r border-gray-200">
              <ScenarioBuilder />
            </div>
          )}
          <button
            onClick={() => setBuilderOpen((o) => !o)}
            className="flex-shrink-0 w-5 flex items-start justify-center pt-2 bg-gray-50 border-r border-gray-200 text-gray-400 hover:text-blue-600"
            title={builderOpen ? 'Esconder construtor' : 'Construir cenário'}
          >
            {builderOpen ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeftOpen className="w-3.5 h-3.5" />}
          </button>

          {/* Coluna central: máquina de estados + mapa + painéis inferiores */}
          <div className="flex flex-col flex-1 min-w-0">
            {result && <StateMachineDiagram />}

            {/* Mapa / esquema — elemento dominante */}
            <div className={clsx('flex-1 min-h-0 relative overflow-hidden', isPresentacao ? 'h-full' : '')}>
              <MapView />
            </div>

            {/* Apresentação: gráfico das baterias só quando há corte de EDM */}
            {isPresentacao && result && semEdm && (
              <div className="relative z-10 bg-white border-t border-gray-200"><EnergyChart altura={110} /></div>
            )}

            {/* Engenharia: separadores Perfil / Energia / Eventos */}
            {!isPresentacao && result && (
              <div className="relative z-10 bg-white border-t border-gray-200">
                <div className="flex gap-1 px-3 pt-1.5 border-b border-gray-100">
                  {TABS.map(([k, label]) => (
                    <button
                      key={k}
                      onClick={() => setTab(k)}
                      className={clsx(
                        'text-[11px] px-2.5 py-1 rounded-t border-b-2 -mb-px transition-colors',
                        tab === k ? 'border-blue-600 text-blue-700 font-semibold' : 'border-transparent text-gray-500 hover:text-gray-700'
                      )}
                    >
                      {label}
                      {k === 'eventos' && <span className="ml-1 text-gray-400">({result.eventos.length})</span>}
                    </button>
                  ))}
                </div>
                {tab === 'perfil' && <EnlaceProfile />}
                {tab === 'energia' && <EnergyChart />}
                {tab === 'eventos' && <EventLog />}
              </div>
            )}
          </div>

          {/* Coluna direita: Painel de indicadores */}
          <div className={clsx(
            'border-l border-gray-200 overflow-y-auto flex-shrink-0',
            isPresentacao ? 'w-64' : 'w-72'
          )}>
            <SidePanel />
          </div>
        </div>

        {/* ── Barra da linha temporal (modo sequência) ou de cenários ── */}
        {simMode === 'linha' ? <TimelineBar /> : <ControlPanel />}
      </div>

      {/* Modal "Ver Cálculo" */}
      <CalculationModal />
    </>
  );
}
