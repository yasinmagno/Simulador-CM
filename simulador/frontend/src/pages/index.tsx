import Head from 'next/head';
import { SimulatorApp } from '@/components/SimulatorApp';

export default function Home() {
  return (
    <>
      <Head>
        <title>Simulador HCM ↔ Guaxene</title>
        <meta name="description" content="Simulador de Comunicação Resiliente — Comunicação Móvel, ISCTEM" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </Head>
      <SimulatorApp />
    </>
  );
}
