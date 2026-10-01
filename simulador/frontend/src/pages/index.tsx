import { useEffect } from 'react';
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
import { TimeControl } from '@/components/TimeControl';

export default function Home() {
  const { reset, result, error, mode } = useSimulation();

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
          {/* Coluna esquerda: Mapa + perfil + eventos */}
          <div className="flex flex-col flex-1 min-w-0">
            {/* Mapa — elemento dominante */}
            <div className={clsx('flex-1 min-h-0', isPresentacao ? 'h-full' : '')}>
              <MapView />
            </div>

            {/* Perfil do enlace — oculto no modo apresentação */}
            {!isPresentacao && result && (
              <EnlaceProfile />
            )}

            {/* Registo de eventos — oculto no modo apresentação */}
            {!isPresentacao && result && (
              <EventLog />
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

        {/* ── Controlo temporal (só visível com EDM cortada) ── */}
        <TimeControl />

        {/* ── Barra de controlo ── */}
        <ControlPanel />
      </div>

      {/* Modal "Ver Cálculo" */}
      <CalculationModal />
    </>
  );
}
