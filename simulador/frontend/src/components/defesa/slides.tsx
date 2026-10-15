import type { ComponentType, ReactNode } from 'react';
import dynamic from 'next/dynamic';
import clsx from 'clsx';
import { useSimulation } from '@/store/simulation';
import { STATE_HEX } from '@/lib/estado';
import { SCENARIOS } from '@/components/ControlPanel';
import { MapView } from '@/components/MapView';
import { EnlaceProfile } from '@/components/EnlaceProfile';
import { EnergyChart } from '@/components/EnergyChart';
import { ModulationLadder } from '@/components/ModulationLadder';
import { StateMachineDiagram } from '@/components/StateMachineDiagram';
import { SimulatorApp } from '@/components/SimulatorApp';

const NetworkSchematic = dynamic(
  () => import('@/components/NetworkSchematic').then((m) => m.NetworkSchematic),
  { ssr: false },
);

/**
 * Um slide da defesa. Os slides "vivos" usam os mesmos componentes e o mesmo
 * motor (backend) do simulador; `cenario` é carregado ao entrar no slide.
 */
export interface Slide {
  id: string;
  /** Título curto — aparece na janela do orador */
  titulo: string;
  cenario?: number;
  /** Teclas 1–9 carregam os cenários predefinidos neste slide */
  atalhosCenario?: boolean;
  /** Ocupa o ecrã todo, sem margens (simulador completo, 3D) */
  ecraCheio?: boolean;
  notas: string;
  /** O conteúdo do slide, renderizado como componente */
  render: ComponentType;
}

/* Valores do relatório — usados se o backend não responder, para os slides nunca ficarem vazios */
const REL = {
  lambda: 0.0517, fspl: 119.05, eirp: 36, pr: -51.05, f1: 6.91, f60: 4.14, bulge: 0.2,
  fm: { QPSK_MIMO: 33.95, '16QAM_MIMO': 29.95, '64QAM': 23.95, '256QAM': 17.95, '1024QAM': 11.95 } as Record<string, number>,
};

const MODS = [
  { key: 'QPSK_MIMO', label: 'QPSK MIMO', sens: -85, nota: 'Modo robusto / emergência' },
  { key: '16QAM_MIMO', label: '16-QAM MIMO', sens: -81, nota: 'Boa margem' },
  { key: '64QAM', label: '64-QAM', sens: -75, nota: 'Operação normal favorável' },
  { key: '256QAM', label: '256-QAM', sens: -69, nota: 'Menor margem' },
  { key: '1024QAM', label: '1024-QAM', sens: -63, nota: 'Não exigido no projecto' },
];

/** Participantes do grupo — nome e número de estudante */
const AUTORES: [string, string][] = [
  ['Tatyana Ibrahim', '20240229'],
  ['Yannis Chilundo', '20220156'],
  ['Yasin Magno', '20240260'],
];

const fmt = (n: number, d = 2) =>
  n.toLocaleString('pt-PT', { minimumFractionDigits: d, maximumFractionDigits: d });

/* ── Peças de layout ─────────────────────────────────────────────────────── */

function Moldura({ eyebrow, titulo, children, escuro = false }: {
  eyebrow: string; titulo: ReactNode; children: ReactNode; escuro?: boolean;
}) {
  return (
    <div className={clsx('h-full relative flex flex-col deck-pad deck-gap', escuro ? 'bg-[#0f1e33] text-[#f6f4ee]' : 'bg-[#f6f4ee]')}>
      <FundoSubtil cor={escuro ? '#7aa2d7' : '#1a2f52'} />
      <div className="relative z-10 flex flex-col gap-1">
        <p className="deck-eyebrow" style={escuro ? { color: '#e8b23a' } : undefined}>{eyebrow}</p>
        <h2 className="deck-titulo" style={escuro ? { color: '#f6f4ee' } : undefined}>{titulo}</h2>
      </div>
      <div className="relative z-10 flex-1 min-h-0">{children}</div>
    </div>
  );
}

function Vivo() {
  return (
    <span className="inline-flex items-center gap-1.5 deck-peq font-semibold text-emerald-700">
      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> calculado ao vivo pelo simulador
    </span>
  );
}

function Num({ valor, unidade, legenda, cor = '#0f1e33', grande = false }: {
  valor: string; unidade?: string; legenda: string; cor?: string; grande?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className={grande ? 'deck-num-g' : 'deck-num'} style={{ color: cor }}>
        {valor}{unidade && <span className="deck-lead font-semibold"> {unidade}</span>}
      </p>
      <p className="deck-peq text-gray-600">{legenda}</p>
    </div>
  );
}

function BotoesCenario({ ids }: { ids: number[] }) {
  const { selectedScenario, custom, runScenario, loading } = useSimulation();
  return (
    <div className="flex flex-wrap gap-2">
      {ids.map((id) => {
        const s = SCENARIOS.find((x) => x.id === id)!;
        const ativo = !custom && selectedScenario === id;
        return (
          <button
            key={id}
            onClick={() => runScenario(id)}
            disabled={loading}
            className={clsx(
              'deck-peq font-semibold rounded-full px-4 py-1.5 border transition-colors',
              ativo ? 'bg-[#0f1e33] text-white border-[#0f1e33]' : 'bg-white text-gray-700 border-gray-300 hover:border-[#0f1e33]',
            )}
          >
            {s.label.replace(' — ', ' · ')}
          </button>
        );
      })}
    </div>
  );
}

/* ── Slides ──────────────────────────────────────────────────────────────── */

/** Ondas de rádio concêntricas a expandir a partir de uma antena. */
function Ondas({ cx, cy, cor, atraso = 0, op = 0.5, rMax = 210 }: {
  cx: number; cy: number; cor: string; atraso?: number; op?: number; rMax?: number;
}) {
  const dur = 3.2;
  return (
    <g fill="none" stroke={cor}>
      {[0, 1, 2].map((i) => {
        const begin = `${-(atraso + i * (dur / 3))}s`;
        return (
          <circle key={i} cx={cx} cy={cy} r={12}>
            <animate attributeName="r" values={`12;${rMax}`} dur={`${dur}s`} begin={begin} repeatCount="indefinite" />
            <animate attributeName="opacity" values={`${op};0`} dur={`${dur}s`} begin={begin} repeatCount="indefinite" />
            <animate attributeName="stroke-width" values="2.5;0.3" dur={`${dur}s`} begin={begin} repeatCount="indefinite" />
          </circle>
        );
      })}
    </g>
  );
}

/** Motivo discreto de telecomunicações para os slides de conteúdo (ondas nos cantos
 *  e um enlace ténue a correr em baixo). Fica atrás do conteúdo e não intercepta cliques. */
function FundoSubtil({ cor = '#1a2f52', acento = '#b45309' }: { cor?: string; acento?: string }) {
  const linha = 'M-20 846 Q800 812 1620 846';
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full">
        <Ondas cx={70} cy={880} cor={cor} op={0.14} rMax={260} atraso={0} />
        <Ondas cx={1540} cy={40} cor={cor} op={0.12} rMax={240} atraso={1.5} />
        <path d={linha} fill="none" stroke={cor} strokeWidth={1.5} strokeDasharray="10 12" strokeLinecap="round" opacity={0.16}>
          <animate attributeName="stroke-dashoffset" values="0;-44" dur="1s" repeatCount="indefinite" />
        </path>
        <circle r={3.5} fill={acento} opacity={0.45}>
          <animateMotion path={linha} dur="6s" begin="-1s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  );
}

/** Torre/antena com emissor a irradiar sinal. */
function Torre({ x, y, atraso }: { x: number; y: number; atraso: number }) {
  return (
    <g>
      <g stroke="#7aa2d7" strokeWidth={2.5} fill="none" opacity={0.5} strokeLinecap="round">
        <line x1={x} y1={y + 150} x2={x} y2={y} />
        <path d={`M${x} ${y + 150} L${x - 22} ${y + 70} M${x} ${y + 150} L${x + 22} ${y + 70}`} />
        <line x1={x - 13} y1={y + 55} x2={x + 13} y2={y + 55} />
        <line x1={x - 9} y1={y + 95} x2={x + 9} y2={y + 95} />
      </g>
      <circle cx={x} cy={y - 4} r={6} fill="#e8b23a" />
      <Ondas cx={x} cy={y - 4} cor="#e8b23a" atraso={atraso} />
    </g>
  );
}

/** Fundo animado de telecomunicações: enlace PtP, ondas de rádio e satélite. */
function TelecomFundo() {
  const TX = { x: 175, y: 596 };
  const RX = { x: 1425, y: 596 };
  const beam = `M${TX.x + 8} ${TX.y - 4} Q800 648 ${RX.x - 8} ${RX.y - 4}`;
  return (
    <svg
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      className="absolute inset-0 w-full h-full"
      style={{ pointerEvents: 'none' }}
    >
      <defs>
        <filter id="capa-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Órbita e ligação descendente do satélite (contingência) */}
      <path d="M320 180 Q800 70 1280 180" fill="none" stroke="#7aa2d7" strokeWidth={1.5} strokeDasharray="2 11" opacity={0.3} />
      <g stroke="#7aa2d7" strokeWidth={1.6} fill="none" strokeDasharray="9 11" strokeLinecap="round" opacity={0.24}>
        <line x1={800} y1={150} x2={TX.x} y2={TX.y - 4}>
          <animate attributeName="stroke-dashoffset" values="0;-40" dur="1.1s" repeatCount="indefinite" />
        </line>
        <line x1={800} y1={150} x2={RX.x} y2={RX.y - 4}>
          <animate attributeName="stroke-dashoffset" values="0;-40" dur="1.1s" repeatCount="indefinite" />
        </line>
      </g>

      {/* Satélite a flutuar */}
      <g filter="url(#capa-glow)">
        <animateTransform attributeName="transform" type="translate" values="800 142;800 160;800 142" dur="5.5s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.4 0 0.6 1;0.4 0 0.6 1" />
        <g stroke="#e8b23a" strokeWidth={2} fill="none">
          <rect x={-15} y={-9} width={30} height={18} rx={4} fill="#13284a" />
          <rect x={-42} y={-5} width={23} height={10} rx={2} fill="#7aa2d7" stroke="none" opacity={0.75} />
          <rect x={19} y={-5} width={23} height={10} rx={2} fill="#7aa2d7" stroke="none" opacity={0.75} />
          <line x1={0} y1={-9} x2={0} y2={-22} />
        </g>
        <circle cx={0} cy={-24} r={3} fill="#e8b23a" stroke="none" />
      </g>

      {/* Torres nos dois extremos (HCM ↔ Guaxene) */}
      <Torre x={TX.x} y={TX.y} atraso={0} />
      <Torre x={RX.x} y={RX.y} atraso={1.6} />

      {/* Enlace principal: feixe rádio PtP com tracejado a correr */}
      <path d={beam} fill="none" stroke="#e8b23a" strokeWidth={3} strokeDasharray="14 14" strokeLinecap="round" opacity={0.7}>
        <animate attributeName="stroke-dashoffset" values="0;-56" dur="0.9s" repeatCount="indefinite" />
      </path>
      {/* Pacotes de dados a viajar no enlace */}
      {[0, 1.35, 2.7].map((b, i) => (
        <circle key={`r${i}`} r={5} fill="#fff" opacity={0.9}>
          <animateMotion path={beam} dur="4s" begin={`${-b}s`} repeatCount="indefinite" />
        </circle>
      ))}
      <circle r={4} fill="#e8b23a" opacity={0.85}>
        <animateMotion path={`M${RX.x - 8} ${RX.y - 4} Q800 648 ${TX.x + 8} ${TX.y - 4}`} dur="4s" begin="-2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

function Capa() {
  const chips = ['Rádio PtP 5,8 GHz', '3,69 km', '4G / 5G', 'Satélite'];
  return (
    <div className="h-full relative overflow-hidden flex flex-col justify-between deck-pad capa-fundo text-[#f6f4ee]">
      <div className="capa-grelha absolute inset-0" />
      <TelecomFundo />

      <div className="relative z-10 flex items-center gap-5">
        <div className="capa-logo flex-none" style={{ padding: 'calc(var(--u) * 0.9)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/isctem.png" alt="ISCTEM" style={{ width: 'calc(var(--u) * 9.5)', height: 'calc(var(--u) * 9.5)' }} className="object-contain" />
        </div>
        <div>
          <p className="deck-texto font-semibold">ISCTEM · Licenciatura em Engenharia Informática</p>
          <p className="deck-peq text-[#b9c4d3]">Comunicação Móvel · Projecto Final · 3.º Ano, Turma A</p>
        </div>
      </div>

      <div className="relative z-10 flex flex-col deck-gap">
        <p className="deck-eyebrow" style={{ color: '#e8b23a' }}>Dimensionamento de uma rede resiliente</p>
        <h1 className="deck-capa" style={{ textShadow: '0 2px 20px rgba(10,21,39,0.7)' }}>
          Hospital Central de Maputo <span className="text-[#e8b23a]">↔</span> Guaxene
        </h1>
        <div className="flex flex-wrap deck-gap pt-1">
          {chips.map((c) => (
            <span key={c} className="capa-chip"><span className="capa-chip-ponto" />{c}</span>
          ))}
        </div>
      </div>

      <div className="relative z-10 flex items-end justify-between gap-4 border-t border-[#2b3d57] pt-4">
        <div className="flex flex-wrap deck-gap">
          {AUTORES.map(([nome, num]) => (
            <div key={num} className="flex flex-col rounded-lg border border-[#2b3d57] bg-[#15294a]/70 px-4 py-2">
              <span className="deck-texto font-semibold text-white">{nome}</span>
              <span className="deck-peq font-mono tracking-wider text-[#e8b23a]">Nº {num}</span>
            </div>
          ))}
        </div>
        <span className="deck-peq text-[#b9c4d3] whitespace-nowrap self-end pb-1">Docente: Roxan Cadir · Maputo, 2026</span>
      </div>
    </div>
  );
}

function Contexto() {
  const causas = [
    ['Cortes de energia', 'Estações-base sem alimentação deixam de servir a zona.'],
    ['Transmissão danificada', 'Danos nas ligações de backhaul isolam os sites.'],
    ['Acesso difícil', 'Cheias impedem as equipas de manutenção de chegar.'],
  ];
  return (
    <Moldura eyebrow="Contexto e motivação" titulo="Quando a rede pública falha, os serviços críticos ficam sem voz">
      <div className="h-full flex flex-col justify-between deck-gap">
        <p className="deck-lead">
          Em <b>janeiro de 2026</b>, o INCM reportou <b className="text-[#b45309]">centenas de estações-base fora de serviço</b> a
          nível nacional, durante a época chuvosa. O INCM activou satélite em centros de emergência e de acomodação.
        </p>
        <div className="grid grid-cols-3 deck-gap">
          {causas.map(([t, d]) => (
            <div key={t} className="deck-card flex flex-col gap-2">
              <h3 className="deck-lead font-semibold">{t}</h3>
              <p className="deck-texto text-gray-600">{d}</p>
            </div>
          ))}
        </div>
        <p className="deck-peq text-gray-500">Fonte: INCM, 28 jan. 2026</p>
      </div>
    </Moldura>
  );
}

function Cenario() {
  return (
    <Moldura eyebrow="Cenário" titulo="Dois pontos críticos separados pela Baía de Maputo">
      <div className="h-full grid grid-cols-[1.6fr_1fr] deck-gap">
        <div className="relative rounded-xl overflow-hidden border border-gray-300 isolate">
          <MapView initialMode="2d" />
        </div>
        <div className="flex flex-col justify-center deck-gap">
          <div className="border-l-4 border-blue-700 pl-4">
            <p className="deck-peq font-bold text-blue-700 uppercase tracking-wider">Ponto A</p>
            <p className="deck-lead font-semibold">Hospital Central de Maputo</p>
          </div>
          <div className="border-l-4 border-green-700 pl-4">
            <p className="deck-peq font-bold text-green-700 uppercase tracking-wider">Ponto B</p>
            <p className="deck-lead font-semibold">EP Completa de Guaxene, KaTembe</p>
            <p className="deck-peq text-gray-600">Centro de acomodação em jan. 2026</p>
          </div>
          <Num valor="3,69" unidade="km" legenda="Distância rádio em linha recta. A estrada tem ≈ 13 km, mas a onda segue o trajecto directo." />
        </div>
      </div>
    </Moldura>
  );
}

function Objectivos() {
  const obj = [
    'Caracterizar o enlace e o tráfego entre os dois pontos',
    'Comparar celular, satélite e rádio PtP e justificar a escolha',
    'Dimensionar frequência, antenas, EIRP, perdas e margem',
    'Analisar a linha de visada e a 1.ª zona de Fresnel',
    'Garantir pelo menos 72 h de autonomia energética',
    'Definir redundância, failover, segurança e QoS',
  ];
  return (
    <Moldura eyebrow="Objectivos" titulo="Manter os serviços críticos em operação normal e em falha">
      <div className="grid grid-cols-3 grid-rows-2 deck-gap h-full">
        {obj.map((o, i) => (
          <div key={o} className="deck-card flex flex-col gap-2">
            <p className="deck-num text-[#b45309]">{String(i + 1).padStart(2, '0')}</p>
            <p className="deck-lead">{o}</p>
          </div>
        ))}
      </div>
    </Moldura>
  );
}

function Tecnologia() {
  const t = [
    { nome: 'Rádio PtP', papel: 'Principal', mais: 'Ligação directa, baixa latência, controlo próprio e alta capacidade', menos: 'Exige linha de visada, Fresnel livre e alinhamento', destaque: true },
    { nome: '4G / 5G', papel: 'Redundância', mais: 'Infra-estrutura já disponível; activação rápida', menos: 'Depende das BTS, da energia e do backhaul da operadora' },
    { nome: 'Satélite', papel: 'Contingência externa', mais: 'Independente da infra-estrutura terrestre', menos: 'Maior custo, consumo e latência' },
  ];
  return (
    <Moldura eyebrow="Selecção da tecnologia" titulo="Três meios, três papéis diferentes">
      <div className="h-full flex flex-col deck-gap">
        <div className="grid grid-cols-3 deck-gap flex-1">
          {t.map((x) => (
            <div key={x.nome} className={clsx('rounded-xl flex flex-col gap-3', x.destaque ? 'bg-[#0f1e33] text-[#f6f4ee]' : 'deck-card')}
              style={x.destaque ? { padding: 'calc(var(--u) * 1.6)' } : undefined}>
              <span className={clsx('deck-peq font-bold self-start rounded-full px-3 py-1', x.destaque ? 'bg-[#e8b23a] text-[#0f1e33]' : 'bg-gray-100 text-gray-700')}>{x.papel}</span>
              <h3 className="deck-titulo">{x.nome}</h3>
              <p className="deck-texto"><b>+</b> {x.mais}</p>
              <p className="deck-texto opacity-80"><b>−</b> {x.menos}</p>
            </div>
          ))}
        </div>
        <p className="deck-lead text-gray-700">O PtP liberta a ligação HCM ↔ Guaxene das estações-base das operadoras. O satélite fica centralizado no HCM.</p>
      </div>
    </Moldura>
  );
}

function Capacidade() {
  const linhas: [string, string][] = [
    ['Voz / VoIP', '0,4'], ['Vídeo / telecoordenação', '3,0'], ['Dados e ficheiros', '5,0'],
    ['Alertas / sinalização', '0,5'], ['Crescimento / overhead', '≈ 4,1'],
  ];
  return (
    <Moldura eyebrow="Dimensionamento · capacidade" titulo="15 Mbps garantem o serviço crítico">
      <div className="h-full grid grid-cols-[1.4fr_1fr] deck-gap items-center">
        <table className="w-full deck-lead">
          <thead><tr className="bg-[#0f1e33] text-white"><th className="text-left px-4 py-2">Componente</th><th className="text-right px-4 py-2">Reserva (Mbps)</th></tr></thead>
          <tbody>
            {linhas.map(([c, v]) => (
              <tr key={c} className="border-b border-gray-300"><td className="px-4 py-2">{c}</td><td className="px-4 py-2 text-right font-mono">{v}</td></tr>
            ))}
            <tr className="bg-[#f1e3c2] font-bold"><td className="px-4 py-2">Requisito mínimo</td><td className="px-4 py-2 text-right font-mono">15</td></tr>
          </tbody>
        </table>
        <div className="flex flex-col deck-gap">
          <Num grande valor="15" unidade="Mbps" legenda="Limiar de serviço crítico" cor="#b45309" />
          <Num grande valor="≥ 50" unidade="Mbps" legenda="Meta em operação normal" cor="#1d4ed8" />
        </div>
      </div>
    </Moldura>
  );
}

function Orcamento() {
  const lb = useSimulation((s) => s.result?.link_budget);
  const cartoes = [
    { t: 'Comprimento de onda', f: 'λ = c / f', v: `${fmt((lb?.comprimento_onda_m ?? REL.lambda) * 100)} cm` },
    { t: 'Perda em espaço livre', f: '32,44 + 20·log d + 20·log f', v: `${fmt(lb?.fspl_db ?? REL.fspl)} dB` },
    { t: 'EIRP', f: 'Pₜ + Gₜ − Lₜ = 3 + 34 − 1', v: `${fmt(lb?.eirp_dbm ?? REL.eirp, 0)} dBm` },
    { t: 'Potência recebida', f: 'EIRP − FSPL + Gᵣ − Lᵣ', v: `${fmt(lb?.p_r_dbm ?? REL.pr)} dBm`, destaque: true },
  ];
  return (
    <Moldura eyebrow="Dimensionamento · orçamento do enlace" titulo="A 5,8 GHz chegam −51 dBm ao receptor">
      <div className="h-full flex flex-col justify-between deck-gap">
        <div className="grid grid-cols-4 deck-gap">
          {cartoes.map((c) => (
            <div key={c.t} className={clsx('rounded-xl flex flex-col gap-3', c.destaque ? 'bg-[#0f1e33] text-[#f6f4ee]' : 'deck-card')}
              style={c.destaque ? { padding: 'calc(var(--u) * 1.6)' } : undefined}>
              <p className={clsx('deck-peq font-bold uppercase tracking-wider', c.destaque ? 'text-[#e8b23a]' : 'text-gray-500')}>{c.t}</p>
              <p className="deck-peq font-mono opacity-80">{c.f}</p>
              <p className="deck-num">{c.v}</p>
            </div>
          ))}
        </div>
        <CadeiaEnlace />
        <div className="grid grid-cols-2 deck-gap deck-lead text-gray-700">
          <p>Canal de <b className="text-[#0f1e33]">20 MHz</b>: robustez antes de capacidade máxima.</p>
          <p>Antenas direccionais de <b className="text-[#0f1e33]">34 dBi</b> nos dois extremos (ref. AF-5XHD).</p>
        </div>
        <Vivo />
      </div>
    </Moldura>
  );
}

/** O orçamento do enlace como uma cadeia de ganhos e perdas, do transmissor ao receptor. */
function CadeiaEnlace() {
  const lb = useSimulation((s) => s.result?.link_budget);
  const eirp = lb?.eirp_dbm ?? REL.eirp;
  const fspl = lb?.fspl_db ?? REL.fspl;
  const pr = lb?.p_r_dbm ?? REL.pr;
  const passos: { rotulo: string; valor: string; tipo: 'nivel' | 'ganho' | 'perda' }[] = [
    { rotulo: 'Transmissor', valor: '3 dBm', tipo: 'nivel' },
    { rotulo: 'Antena Tx', valor: '+34 dBi', tipo: 'ganho' },
    { rotulo: 'Cabos Tx', valor: '−1 dB', tipo: 'perda' },
    { rotulo: 'EIRP', valor: `${fmt(eirp, 0)} dBm`, tipo: 'nivel' },
    { rotulo: '3,69 km no ar', valor: `−${fmt(fspl)} dB`, tipo: 'perda' },
    { rotulo: 'Antena Rx', valor: '+34 dBi', tipo: 'ganho' },
    { rotulo: 'Perdas Rx', valor: '−2 dB', tipo: 'perda' },
    { rotulo: 'Recebido', valor: `${fmt(pr)} dBm`, tipo: 'nivel' },
  ];
  const cor = { nivel: 'bg-[#0f1e33] text-white', ganho: 'bg-emerald-50 text-emerald-800 border border-emerald-300', perda: 'bg-red-50 text-red-700 border border-red-300' };
  return (
    <div className="flex items-stretch gap-1">
      {passos.map((p, i) => (
        <div key={p.rotulo} className="flex items-center gap-1 flex-1 min-w-0">
          <div className={clsx('flex-1 rounded-lg px-2 py-3 text-center', cor[p.tipo])}>
            <p className="deck-peq opacity-80">{p.rotulo}</p>
            <p className="deck-texto font-bold font-mono whitespace-nowrap">{p.valor}</p>
          </div>
          {i < passos.length - 1 && <span className="deck-texto text-gray-400">›</span>}
        </div>
      ))}
    </div>
  );
}

function Fresnel() {
  const r = useSimulation((s) => s.result);
  const lb = r?.link_budget;
  return (
    <Moldura eyebrow="Dimensionamento · geometria" titulo="Linha de visada com 60% da zona de Fresnel livre">
      <div className="h-full grid grid-cols-[1.9fr_1fr] deck-gap">
        <div className="deck-card flex flex-col min-h-0 !p-2">
          <div className="flex-1 min-h-0" style={{ zoom: 1.35 }}>
            <EnlaceProfile altura={400} />
          </div>
        </div>
        <div className="flex flex-col justify-center deck-gap">
          <Num valor={`${fmt(lb?.fresnel_max_m ?? REL.f1)} m`} legenda="Raio máximo de F₁ no ponto médio" />
          <Num valor={`${fmt(lb?.fresnel_60pct_m ?? REL.f60)} m`} legenda="Folga mínima exigida (60% de F₁)" cor="#b45309" />
          <Num valor={`${fmt(lb?.earth_bulge_midpoint_m ?? REL.bulge)} m`} legenda="Saliência da Terra a meio, k = 4/3" />
          {r && (
            <p className={clsx('deck-texto font-semibold', r.fresnel.todos_ok ? 'text-emerald-700' : 'text-red-600')}>
              {r.fresnel.todos_ok ? '✓ Folga cumprida em todo o percurso' : '⚠ Obstrução no perfil'}
            </p>
          )}
          <Vivo />
        </div>
      </div>
    </Moldura>
  );
}

function Modulacao() {
  const lb = useSimulation((s) => s.result?.link_budget);
  return (
    <Moldura eyebrow="Dimensionamento · margem" titulo="Mesmo em QPSK sobram 34 dB de margem">
      <div className="h-full grid grid-cols-[1.5fr_1fr] deck-gap">
        <div className="flex flex-col deck-gap">
          <table className="w-full deck-texto">
            <thead>
              <tr className="bg-[#0f1e33] text-white">
                <th className="text-left px-3 py-2">Modulação</th><th className="text-right px-3 py-2">Sensibilidade</th>
                <th className="text-right px-3 py-2">Margem</th><th className="text-left px-3 py-2">Interpretação</th>
              </tr>
            </thead>
            <tbody>
              {MODS.map((m) => {
                const fm = lb?.fade_margin_db[m.key] ?? REL.fm[m.key];
                const emUso = lb?.modulacao_selecionada === m.key;
                return (
                  <tr key={m.key} className={clsx('border-b border-gray-300', emUso && 'bg-[#f1e3c2] font-bold')}>
                    <td className="px-3 py-2">{m.label}{emUso && ' ◀ em uso'}</td>
                    <td className="px-3 py-2 text-right font-mono">{m.sens} dBm</td>
                    <td className={clsx('px-3 py-2 text-right font-mono', fm < 3 && 'text-red-600')}>{fmt(fm)} dB</td>
                    <td className="px-3 py-2">{m.nota}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="deck-texto text-gray-700">
            Em QPSK / 20 MHz o rádio entrega <b>≈ 24,32 Mbps</b> por direcção, acima dos 15 Mbps críticos.
            A capacidade cai antes de a comunicação desaparecer.
          </p>
        </div>
        <div className="flex flex-col deck-gap">
          <div className="deck-card"><div style={{ zoom: 2.1 }}><ModulationLadder /></div></div>
          <p className="deck-peq font-semibold text-gray-500 uppercase tracking-wider">Experimente</p>
          <BotoesCenario ids={[1, 6, 7]} />
          <Vivo />
        </div>
      </div>
    </Moldura>
  );
}

function Arquitectura() {
  return (
    <Moldura eyebrow="Arquitectura" titulo="Uma solução híbrida em três camadas">
      <div className="h-full grid grid-cols-[2.4fr_1fr] deck-gap">
        <div className="rounded-xl overflow-hidden border border-gray-300 relative isolate">
          <NetworkSchematic />
        </div>
        <div className="flex flex-col justify-center deck-gap deck-texto">
          <p><b className="text-[#b45309]">Rádio PtP 5,8 GHz</b> — caminho preferido entre HCM e Guaxene, com AES-256 + VPN.</p>
          <p><b className="text-blue-700">4G/5G</b> — redundância entre os mesmos dois pontos.</p>
          <p><b>Fibra → 4G/5G → satélite</b> — saída externa do HCM, por esta ordem.</p>
          <p><b>EDM + bateria + solar</b> em cada local.</p>
          <p className="text-gray-600">A comunicação local continua mesmo sem Internet externa.</p>
          <Vivo />
        </div>
      </div>
    </Moldura>
  );
}

function Energia() {
  const r = useSimulation((s) => s.result);
  const setDraft = useSimulation((s) => s.setDraft);
  const agora = r?.input.tempo_simulado_h ?? 0;
  return (
    <Moldura eyebrow="Energia e continuidade" titulo="72 horas sem a rede eléctrica pública">
      <div className="h-full grid grid-cols-[1fr_1.7fr] deck-gap">
        <div className="flex flex-col deck-gap">
          <Num grande valor="72 h" legenda="Autonomia mínima exigida" cor="#b45309" />
          <table className="w-full deck-texto">
            <thead><tr className="bg-[#0f1e33] text-white"><th className="text-left px-3 py-1.5">Local</th><th className="text-right px-3 py-1.5">Carga</th><th className="text-right px-3 py-1.5">Bateria</th><th className="text-right px-3 py-1.5">Solar</th></tr></thead>
            <tbody>
              <tr className="border-b border-gray-300"><td className="px-3 py-1.5 font-bold">HCM</td><td className="px-3 py-1.5 text-right">≈ 100 W</td><td className="px-3 py-1.5 text-right">12 kWh</td><td className="px-3 py-1.5 text-right">0,8–1,0 kWp</td></tr>
              <tr className="border-b border-gray-300"><td className="px-3 py-1.5 font-bold">Guaxene</td><td className="px-3 py-1.5 text-right">≈ 30 W</td><td className="px-3 py-1.5 text-right">3,6 kWh</td><td className="px-3 py-1.5 text-right">0,3–0,4 kWp</td></tr>
            </tbody>
          </table>
          <p className="deck-texto text-gray-700">A bateria garante a autonomia; o solar estende-a e recarrega, sem depender de sol em tempestade. <span className="font-mono">E = P × t</span></p>
        </div>
        <div className="deck-card flex flex-col deck-gap min-h-0">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="deck-peq font-semibold text-gray-500 uppercase tracking-wider">Horas desde o corte da EDM</p>
            <div className="flex gap-1.5">
              {[0, 24, 48, 72, 96].map((h) => (
                <button key={h} onClick={() => setDraft({ tempo_simulado_h: h })}
                  className={clsx('deck-peq font-semibold rounded-full px-3 py-1 border',
                    Math.round(agora) === h ? 'bg-[#0f1e33] text-white border-[#0f1e33]' : 'bg-white border-gray-300 hover:border-[#0f1e33]')}>
                  {h} h
                </button>
              ))}
            </div>
          </div>
          <div style={{ zoom: 1.3 }}><EnergyChart altura={220} /></div>
          {r && (
            <div className="grid grid-cols-2 deck-gap">
              <Num valor={`${fmt(r.energy.hcm_autonomia_h, 1)} h`} legenda="Autonomia restante · HCM" />
              <Num valor={`${fmt(r.energy.guaxene_autonomia_h, 1)} h`} legenda="Autonomia restante · Guaxene" />
            </div>
          )}
          <Vivo />
        </div>
      </div>
    </Moldura>
  );
}

function Seguranca() {
  const vlans = [['VLAN 10', 'Emergência e alertas', 'Muito alta'], ['VLAN 20', 'Dados de saúde', 'Alta'], ['VLAN 30', 'Administração', 'Média'], ['VLAN 40', 'Internet geral', 'Baixa']];
  const qos = ['Voz / Alertas', 'Dados de saúde', 'Vídeo', 'Internet'];
  return (
    <Moldura eyebrow="Segurança e QoS" titulo="A informação crítica passa primeiro">
      <div className="h-full grid grid-cols-[1fr_1.8fr] deck-gap">
        <div className="flex flex-col deck-gap">
          <div className="deck-card"><h3 className="deck-lead font-semibold">AES-256 no rádio</h3><p className="deck-texto text-gray-600">Cifra nativa do enlace PtP.</p></div>
          <div className="deck-card"><h3 className="deck-lead font-semibold">VPN entre routers</h3><p className="deck-texto text-gray-600">Protege os dados também quando o tráfego migra para 4G/5G.</p></div>
        </div>
        <div className="flex flex-col deck-gap">
          <table className="w-full deck-lead">
            <thead><tr className="bg-[#0f1e33] text-white"><th className="text-left px-4 py-2">VLAN</th><th className="text-left px-4 py-2">Função</th><th className="text-left px-4 py-2">Prioridade</th></tr></thead>
            <tbody>{vlans.map((v) => <tr key={v[0]} className="border-b border-gray-300">{v.map((c) => <td key={c} className="px-4 py-2">{c}</td>)}</tr>)}</tbody>
          </table>
          <p className="deck-peq font-semibold text-gray-500 uppercase tracking-wider">Ordem de QoS em degradação</p>
          <div className="flex flex-wrap items-center gap-2">
            {qos.map((q, i) => (
              <span key={q} className="flex items-center gap-2">
                <span className="deck-texto font-semibold rounded-full px-4 py-1.5"
                  style={{ background: ['#0f1e33', '#2b3d57', '#d5dde8', '#e5e1d8'][i], color: i < 2 ? '#fff' : '#0f1e33' }}>{q}</span>
                {i < qos.length - 1 && <span className="deck-texto text-gray-400">›</span>}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Moldura>
  );
}

function Resiliencia() {
  const r = useSimulation((s) => s.result);
  const { selectedScenario, custom } = useSimulation();
  const desc = SCENARIOS.find((s) => s.id === selectedScenario)?.desc;
  return (
    <Moldura eyebrow="Estudo de resiliência · ao vivo" titulo="Uma falha simples nunca corta a ligação">
      <div className="h-full flex flex-col gap-3">
        <div className="rounded-xl overflow-hidden border border-gray-300" style={{ zoom: 1.45 }}><StateMachineDiagram /></div>
        <div className="flex-1 min-h-0 grid grid-cols-[2.4fr_1fr] deck-gap">
          <div className="rounded-xl overflow-hidden border border-gray-300 relative isolate"><NetworkSchematic /></div>
          <div className="flex flex-col deck-gap">
            {r && (
              <div className="deck-card flex flex-col gap-2">
                <p className="deck-peq text-gray-500 uppercase tracking-wider font-semibold">Estado</p>
                <p className="deck-num" style={{ color: STATE_HEX[r.network.estado] }}>{r.network.estado}</p>
                <p className="deck-texto">Caminho local: <b>{r.network.caminho_local}</b></p>
                <p className="deck-texto">Saída externa: <b>{r.network.caminho_externo}</b></p>
              </div>
            )}
            <p className="deck-texto text-gray-700">{custom ? 'Cenário personalizado.' : desc}</p>
          </div>
        </div>
        <BotoesCenario ids={[1, 2, 3, 4, 5, 6, 7, 8, 9]} />
      </div>
    </Moldura>
  );
}

function Vista3D() {
  return (
    <div className="h-full relative isolate bg-gray-900">
      <MapView initialMode="3d" />
      <div className="absolute left-6 bottom-6 z-[1100] pointer-events-none max-w-[60%]">
        <p className="deck-eyebrow" style={{ color: '#e8b23a' }}>Vista 3D · ao vivo</p>
        <h2 className="deck-titulo text-white drop-shadow">O enlace sobre a baía e a 1.ª zona de Fresnel</h2>
      </div>
    </div>
  );
}

function SimuladorCompleto() {
  return <div className="h-full"><SimulatorApp embedded /></div>;
}

function Custos() {
  const c = [
    ['Par de rádios PtP + antenas', '1 500 – 2 500'], ['Routers, switches, protecção, cabos', '800 – 1 300'],
    ['Energia HCM (bateria + solar)', '3 000 – 4 500'], ['Energia Guaxene', '1 000 – 1 600'],
    ['Terminal satélite de contingência', '1 000 – 2 500'], ['Mastros, instalação, aterramento', '1 200 – 2 000'],
  ];
  return (
    <Moldura eyebrow="Viabilidade e custos" titulo="Implementável com componentes comerciais">
      <div className="h-full grid grid-cols-[1.6fr_1fr] deck-gap items-center">
        <table className="w-full deck-lead">
          <thead><tr className="bg-[#0f1e33] text-white"><th className="text-left px-4 py-2">Componente</th><th className="text-right px-4 py-2">USD</th></tr></thead>
          <tbody>{c.map(([a, b]) => <tr key={a} className="border-b border-gray-300"><td className="px-4 py-2">{a}</td><td className="px-4 py-2 text-right font-mono">{b}</td></tr>)}</tbody>
        </table>
        <div className="flex flex-col deck-gap">
          <Num valor="8 500 – 14 400" unidade="USD" legenda="Faixa total académica — não é cotação comercial" cor="#b45309" />
          <p className="deck-texto text-gray-700">Replicável noutras unidades de saúde, escolas e centros de acomodação.</p>
        </div>
      </div>
    </Moldura>
  );
}

function Conclusao() {
  const n = [['−51 dBm', 'Potência recebida a 3,69 km e 5,8 GHz'], ['34 dB', 'Margem em QPSK, o modo mais robusto'], ['24 Mbps', 'Em QPSK, acima dos 15 Mbps críticos'], ['72 h', 'De autonomia sem a rede eléctrica']];
  return (
    <div className="h-full relative flex flex-col justify-between deck-pad bg-[#e8b23a]">
      <FundoSubtil cor="#0f1e33" acento="#0f1e33" />
      <div className="relative z-10 flex flex-col gap-1">
        <p className="deck-eyebrow" style={{ color: '#0f1e33' }}>Conclusão</p>
        <h2 className="deck-titulo">Propagação, capacidade, energia e resiliência batem certo</h2>
      </div>
      <div className="relative z-10 grid grid-cols-4 deck-gap">
        {n.map(([v, l]) => (
          <div key={v} className="border-t-4 border-[#0f1e33] pt-4 flex flex-col gap-2">
            <p className="deck-num">{v}</p><p className="deck-texto">{l}</p>
          </div>
        ))}
      </div>
      <p className="relative z-10 deck-lead">
        PtP como ligação principal, 4G/5G como redundância e satélite como contingência, com failover, VLANs, QoS e cifra:
        <b> pelo menos um caminho sobrevive a qualquer falha simples.</b>
      </p>
    </div>
  );
}

function Fim() {
  return (
    <div className="h-full relative overflow-hidden flex flex-col items-center justify-center deck-gap capa-fundo text-[#f6f4ee]">
      <div className="capa-grelha absolute inset-0" />
      <TelecomFundo />
      <div className="relative z-10 flex flex-col items-center deck-gap">
        <div className="capa-logo flex-none" style={{ padding: 'calc(var(--u) * 1)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/isctem.png" alt="ISCTEM" style={{ width: 'calc(var(--u) * 11)', height: 'calc(var(--u) * 11)' }} className="object-contain" />
        </div>
        <h1 className="deck-capa" style={{ textShadow: '0 2px 20px rgba(10,21,39,0.7)' }}>Obrigado</h1>
        <p className="deck-titulo text-[#e8b23a]">Perguntas?</p>
        <div className="flex flex-wrap items-center justify-center deck-gap pt-2">
          {AUTORES.map(([nome, num]) => (
            <div key={num} className="flex items-center gap-2 rounded-full border border-[#2b3d57] bg-[#15294a]/70 px-5 py-2">
              <span className="deck-lead font-semibold text-white">{nome}</span>
              <span className="deck-peq font-mono tracking-wider text-[#e8b23a]">Nº {num}</span>
            </div>
          ))}
        </div>
        <p className="deck-peq text-[#b9c4d3]">Comunicação Móvel · ISCTEM 2026</p>
      </div>
    </div>
  );
}

export const SLIDES: Slide[] = [
  { id: 'capa', titulo: 'Capa', cenario: 1, render: Capa,
    notas: 'Bom dia, Professor Roxan Cadir. Apresentar o grupo e o tema: uma rede que continua a funcionar quando as redes públicas ou a energia falham, entre o HCM e a Escola de Guaxene. Pergunta-guia: se a rede pública falhar, como é que um hospital continua a falar com um centro de acolhimento?' },
  { id: 'contexto', titulo: 'Contexto', render: Contexto,
    notas: 'Janeiro de 2026: o INCM reportou centenas de estações-base fora de serviço — cortes de energia, transmissão danificada e acesso difícil. O próprio INCM activou satélite em centros de acomodação. Quando mais precisávamos de comunicar, as redes públicas estavam em baixo.' },
  { id: 'cenario', titulo: 'Cenário (mapa ao vivo)', cenario: 1, render: Cenario,
    notas: 'Apontar no mapa: HCM, Guaxene e o enlace. 3,69 km em linha recta através da baía; a estrada tem 13 km, mas o rádio segue a linha recta. A emergência é a motivação; o objectivo é uma solução permanente.' },
  { id: 'objectivos', titulo: 'Objectivos', render: Objectivos,
    notas: 'Objectivo geral: manter voz, dados, alertas e coordenação em operação normal e em falha. Ler os seis objectivos específicos. Passagem para o Yannis: tecnologia e dimensionamento.' },
  { id: 'tecnologia', titulo: 'Tecnologia', render: Tecnologia,
    notas: '4G/5G depende das BTS — foi o que falhou em janeiro — fica como redundância. Satélite: caro, consome e tem latência — contingência externa no HCM. PtP: directo, baixa latência, controlo nosso — meio principal.' },
  { id: 'capacidade', titulo: 'Capacidade', render: Capacidade,
    notas: 'Tráfego crítico: voz, vídeo de telecoordenação, dados e alertas, mais margem = 15 Mbps. Abaixo disso não garantimos o serviço. Em operação normal a meta é mais de 50 Mbps.' },
  { id: 'orcamento', titulo: 'Orçamento do enlace (ao vivo)', cenario: 1, render: Orcamento,
    notas: 'Os números deste slide vêm do motor do simulador, não estão escritos à mão. λ = 5,17 cm; FSPL ≈ 119 dB; EIRP 36 dBm (3 + 34 − 1); potência recebida −51 dBm. Canal de 20 MHz por robustez.' },
  { id: 'fresnel', titulo: 'Zona de Fresnel (ao vivo)', cenario: 1, render: Fresnel,
    notas: 'O sinal ocupa uma elipse à volta da linha recta. Raio máximo de F1 = 6,91 m; exigimos 60% livre = 4,14 m. Curvatura da Terra só 0,20 m. O perfil de terreno do simulador é ilustrativo; a altura real sai do levantamento.' },
  { id: 'modulacao', titulo: 'Modulação (ao vivo)', cenario: 1, atalhosCenario: true, render: Modulacao,
    notas: 'Margem = potência recebida menos sensibilidade. Clicar "Chuva intensa" e depois "Degradação RF": a linha em uso desce na tabela e na escada, mas a capacidade fica acima de 15 Mbps. Voltar a "Operação normal". Passagem para o Yasin.' },
  { id: 'arquitectura', titulo: 'Arquitectura (esquema ao vivo)', cenario: 1, render: Arquitectura,
    notas: 'Este é o esquema real do simulador. Ao centro o PtP, por baixo o 4G/5G, em cima a saída externa do HCM (fibra, 4G/5G, satélite). Energia própria em cada local. A comunicação local continua sem Internet externa.' },
  { id: 'energia', titulo: 'Energia (ao vivo, cenário 5)', cenario: 5, render: Energia,
    notas: 'Requisito 72 h sem EDM. Guaxene: 30 W × 72 h = 2,16 kWh → 3,6 kWh com descarga, eficiência e margem. HCM: 100 W com satélite → 12 kWh. Clicar 24, 48, 72, 96 h e mostrar as baterias a descer; autonomia útil total 86,4 h.' },
  { id: 'seguranca', titulo: 'Segurança e QoS', render: Seguranca,
    notas: 'Duas camadas: AES-256 no rádio e VPN entre routers (protege também no 4G/5G). Quatro VLANs. Em degradação: voz e alertas, depois saúde, vídeo e Internet.' },
  { id: 'resiliencia', titulo: 'Resiliência — demonstração', cenario: 1, atalhosCenario: true, render: Resiliencia,
    notas: 'Demonstração ao vivo (teclas 1 a 9 ou botões). Sugestão: 2 (PtP cai → 4G/5G, Degradado), 5 (EDM cai → baterias, Emergência), 7 (degradação RF), 8 (PtP e 4G em falha → Guaxene isolada, Crítico), 9 (recuperação). Mensagem: nenhuma falha simples corta a comunicação.' },
  { id: '3d', titulo: 'Vista 3D', cenario: 1, ecraCheio: true, render: Vista3D,
    notas: 'O voo pelo enlace começa sozinho. Mostrar a zona de Fresnel como elipsóide à volta da linha de visada. O exagero vertical é só visual; os cálculos usam a geometria real.' },
  { id: 'simulador', titulo: 'Simulador completo', ecraCheio: true, render: SimuladorCompleto,
    notas: 'O simulador inteiro, dentro da apresentação: construtor de cenários, linha temporal, fórmulas (Σ), modo Engenharia. Usar para responder ao júri. Backend Python/FastAPI com 79 testes; frontend Next.js. As setas continuam a mudar de slide (excepto dentro de campos).' },
  { id: 'custos', titulo: 'Custos', render: Custos,
    notas: 'Componentes comerciais; faixa académica 8 500 a 14 400 USD, não é cotação. O grosso é energia, satélite e mastros. Replicável noutras estruturas críticas.' },
  { id: 'conclusao', titulo: 'Conclusão', render: Conclusao,
    notas: 'Quatro números: −51 dBm, 34 dB de margem em QPSK, 24 Mbps acima dos 15 críticos, 72 h de autonomia. Pelo menos um caminho sobrevive a qualquer falha simples.' },
  { id: 'fim', titulo: 'Obrigado / Perguntas', cenario: 1, render: Fim,
    notas: 'Agradecer e abrir para perguntas. Para responder com demonstrações, voltar ao slide "Simulador completo" (tecla End e depois ←) ou ao de Resiliência.' },
];
