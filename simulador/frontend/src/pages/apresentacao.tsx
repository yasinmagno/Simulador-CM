import { useCallback, useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight, Maximize, NotebookPen, Radio } from 'lucide-react';
import { useSimulation } from '@/store/simulation';
import { STATE_HEX } from '@/lib/estado';
import { SLIDES } from '@/components/defesa/slides';

/**
 * Modo defesa: os slides da apresentação e o simulador na mesma página.
 *
 *  ← → / PageUp PageDown / Espaço  mudar de slide (funciona com apresentadores USB)
 *  1–9   carregar um cenário nos slides de demonstração
 *  F     ecrã inteiro       S  janela do orador (notas, slide seguinte, cronómetro)
 *
 * A janela do orador (?orador=1) e a apresentação mantêm-se sincronizadas
 * por BroadcastChannel: mudar de slide numa muda na outra.
 */
const CANAL = 'simulador-defesa';
const TOTAL = SLIDES.length;

/** Teclas que não devem mudar de slide: o foco está num campo ou num mapa. */
function ignorarTecla(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null;
  if (!t || e.ctrlKey || e.metaKey || e.altKey) return true;
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(t.tagName) || t.isContentEditable) return true;
  return !!t.closest('.leaflet-container, .cesium-widget');
}

export default function Apresentacao() {
  const [pronto, setPronto] = useState(false);
  const [orador, setOrador] = useState(false);
  const [idx, setIdx] = useState(0);
  const canal = useRef<BroadcastChannel | null>(null);
  const idxRef = useRef(idx);
  idxRef.current = idx;

  const { runScenario, reset, result } = useSimulation();

  /* Arranque: modo (apresentação ou orador) e slide inicial a partir do endereço (#5) */
  useEffect(() => {
    setOrador(new URLSearchParams(window.location.search).get('orador') === '1');
    const n = parseInt(window.location.hash.slice(1), 10);
    if (n >= 1 && n <= TOTAL) setIdx(n - 1);
    setPronto(true);
  }, []);

  const irPara = useCallback((n: number, propagar = true) => {
    const i = Math.max(0, Math.min(TOTAL - 1, n));
    setIdx(i);
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${i + 1}`);
    if (propagar) canal.current?.postMessage({ tipo: 'slide', idx: i });
  }, []);

  /* Sincronização entre a apresentação e a janela do orador */
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const bc = new BroadcastChannel(CANAL);
    canal.current = bc;
    bc.onmessage = (ev) => {
      const m = ev.data;
      if (m?.tipo === 'slide') irPara(m.idx, false);
      if (m?.tipo === 'cenario' && !orador) runScenario(m.id);
      // A janela do orador pede o slide actual quando abre
      if (m?.tipo === 'ola' && !orador) bc.postMessage({ tipo: 'slide', idx: idxRef.current });
    };
    if (orador) bc.postMessage({ tipo: 'ola' });
    return () => bc.close();
  }, [orador, irPara, runScenario]);

  /* Ao entrar num slide: carregar o seu cenário (só na janela da apresentação) */
  useEffect(() => {
    if (!pronto || orador) return;
    const c = SLIDES[idx].cenario;
    if (c) runScenario(c);
    else if (!result) reset();
  }, [idx, pronto, orador]);

  /* Teclado */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (ignorarTecla(e)) return;
      const k = e.key;
      if (['ArrowRight', 'PageDown', ' '].includes(k)) { e.preventDefault(); irPara(idxRef.current + 1); }
      else if (['ArrowLeft', 'PageUp'].includes(k)) { e.preventDefault(); irPara(idxRef.current - 1); }
      else if (k === 'Home') irPara(0);
      else if (k === 'End') irPara(TOTAL - 1);
      else if (k === 'f' || k === 'F') ecraInteiro();
      else if (k === 's' || k === 'S') abrirOrador();
      else if (/^[1-9]$/.test(k) && SLIDES[idxRef.current].atalhosCenario) {
        if (orador) canal.current?.postMessage({ tipo: 'cenario', id: Number(k) });
        else runScenario(Number(k));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [irPara, orador, runScenario]);

  if (!pronto) return null;

  return (
    <>
      <Head>
        <title>{orador ? 'Orador — ' : ''}Defesa · Rede Resiliente HCM ↔ Guaxene</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </Head>
      {orador ? <VistaOrador idx={idx} irPara={irPara} canal={canal} /> : <VistaSlides idx={idx} irPara={irPara} />}
    </>
  );
}

function ecraInteiro() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.();
}

function abrirOrador() {
  window.open(`${window.location.pathname}?orador=1`, 'orador-defesa', 'width=1100,height=720');
}

/* ── Janela da apresentação (projector) ──────────────────────────────────── */

function VistaSlides({ idx, irPara }: { idx: number; irPara: (n: number) => void }) {
  const slide = SLIDES[idx];
  // Cada slide é um componente (com os seus próprios hooks), não uma função chamada aqui dentro
  const Conteudo = slide.render;
  const { result, error } = useSimulation();
  const estado = result?.network.estado;

  return (
    <div className="deck fixed inset-0 overflow-hidden bg-[#f6f4ee]">
      {/* Nos slides de ecrã cheio fica uma faixa em baixo para os controlos não taparem o simulador */}
      <div key={slide.id} className={clsx('deck-entrar absolute inset-x-0 top-0', slide.ecraCheio ? 'bottom-9' : 'bottom-0')}><Conteudo /></div>

      {error && (
        <div className="absolute top-0 inset-x-0 z-[2000] bg-red-600 text-white text-center text-sm py-1">
          Sem ligação ao backend (porta 8000) — os slides mostram os valores do relatório.
        </div>
      )}

      {/* Barra de progresso */}
      <div className="absolute bottom-0 left-0 h-1 bg-[#e8b23a] z-[1500] transition-all duration-300" style={{ width: `${((idx + 1) / TOTAL) * 100}%` }} />

      {/* Controlos discretos: aparecem ao passar o rato */}
      <div className="absolute bottom-2 right-3 z-[1500] flex items-center gap-1 opacity-30 hover:opacity-100 transition-opacity bg-white/90 rounded-full border border-gray-200 shadow-sm px-2 py-1 text-gray-600 text-xs">
        {estado && !slide.ecraCheio && (
          <span className="flex items-center gap-1 px-2 font-semibold" style={{ color: STATE_HEX[estado] }}>
            <span className="w-2 h-2 rounded-full" style={{ background: STATE_HEX[estado] }} />{estado}
          </span>
        )}
        <button onClick={() => irPara(idx - 1)} className="p-1 hover:text-black" title="Anterior (←)"><ChevronLeft className="w-4 h-4" /></button>
        <span className="tabular-nums w-12 text-center">{idx + 1} / {TOTAL}</span>
        <button onClick={() => irPara(idx + 1)} className="p-1 hover:text-black" title="Seguinte (→)"><ChevronRight className="w-4 h-4" /></button>
        <button onClick={abrirOrador} className="p-1 hover:text-black" title="Janela do orador (S)"><NotebookPen className="w-4 h-4" /></button>
        <button onClick={ecraInteiro} className="p-1 hover:text-black" title="Ecrã inteiro (F)"><Maximize className="w-4 h-4" /></button>
        <Link href="/" className="p-1 hover:text-black" title="Sair para o simulador"><Radio className="w-4 h-4" /></Link>
      </div>
    </div>
  );
}

/* ── Janela do orador (portátil) ─────────────────────────────────────────── */

function VistaOrador({ idx, irPara, canal }: {
  idx: number; irPara: (n: number) => void; canal: MutableRefObject<BroadcastChannel | null>;
}) {
  const slide = SLIDES[idx];
  const seguinte = SLIDES[idx + 1];
  const [inicio, setInicio] = useState(() => Date.now());
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setAgora(Date.now()), 1000); return () => clearInterval(t); }, []);
  const seg = Math.floor((agora - inicio) / 1000);
  const relogio = `${String(Math.floor(seg / 60)).padStart(2, '0')}:${String(seg % 60).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 bg-[#0f1e33] text-[#f6f4ee] flex flex-col p-6 gap-5 font-sans">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#b9c4d3]">Slide <b className="text-white text-lg">{idx + 1}</b> de {TOTAL}</p>
        <div className="flex items-center gap-3">
          <span className="font-mono text-3xl tabular-nums">{relogio}</span>
          <button onClick={() => { setInicio(Date.now()); setAgora(Date.now()); }} className="text-xs border border-[#2b3d57] rounded px-2 py-1 hover:bg-[#1d2e4a]">Reiniciar</button>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-[2fr_1fr] gap-5">
        <div className="flex flex-col gap-3 min-h-0">
          <h1 className="text-3xl font-bold text-[#e8b23a]">{slide.titulo}</h1>
          <p className="text-2xl leading-relaxed overflow-y-auto">{slide.notas}</p>
          {slide.atalhosCenario && (
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="text-sm text-[#b9c4d3] self-center">Cenário:</span>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((id) => (
                <button key={id} onClick={() => canal.current?.postMessage({ tipo: 'cenario', id })}
                  className="w-10 h-10 rounded-full border border-[#2b3d57] hover:bg-[#e8b23a] hover:text-[#0f1e33] font-bold">{id}</button>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-3 bg-[#1d2e4a] rounded-xl p-5">
          <p className="text-xs uppercase tracking-widest text-[#b9c4d3]">A seguir</p>
          <p className="text-2xl font-semibold">{seguinte ? seguinte.titulo : '— fim —'}</p>
          <div className="flex-1" />
          <p className="text-xs text-[#b9c4d3] leading-relaxed">
            ← → mudar de slide · 1–9 cenário (nos slides de demonstração) · F ecrã inteiro na janela da apresentação
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={() => irPara(idx - 1)} disabled={idx === 0}
          className="flex-1 py-4 rounded-xl border border-[#2b3d57] text-xl hover:bg-[#1d2e4a] disabled:opacity-30">← Anterior</button>
        <button onClick={() => irPara(idx + 1)} disabled={idx === TOTAL - 1}
          className="flex-[2] py-4 rounded-xl bg-[#e8b23a] text-[#0f1e33] text-xl font-bold hover:brightness-105 disabled:opacity-30">Seguinte →</button>
      </div>
    </div>
  );
}
