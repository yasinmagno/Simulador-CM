import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { X, Sigma } from 'lucide-react';
import { useSimulation } from '@/store/simulation';
import { api } from '@/lib/api';
import { STATE_HEX, STATE_DESC } from '@/lib/estado';
import type { SimulationResult } from '@/types/simulation';

/*
 * Secção "Fórmulas": todas as equações usadas pelo motor (backend/app/engine),
 * com a substituição feita com os valores do cenário actual.
 * Os parâmetros vêm de GET /api/config (project_config.json) — a mesma fonte do backend.
 */

// ---------------------------------------------------------------------------
// Configuração (valores de project_config.json; usados só até /api/config responder)
// ---------------------------------------------------------------------------

interface SiteEnergy { carga_w: number; bateria_wh: number; dod: number; eficiencia: number; solar_wp_min: number; autonomia_minima_h: number }
interface Cfg {
  rf: {
    distancia_km: number; frequencia_ghz: number; canal_mhz: number; p_tx_dbm: number; g_tx_dbi: number;
    l_tx_db: number; g_rx_dbi: number; l_rx_db: number; l_misc_db: number; nf_db: number;
    sensibilidades_dbm: Record<string, number>; capacidade_referencia_mbps: Record<string, number>;
    capacidade_minima_mbps: number; min_fm_threshold_db: number;
  };
  geography: {
    hcm: { latitude: number; longitude: number; altitude_terreno_m: number; altura_antena_m: number };
    guaxene: { latitude: number; longitude: number; altitude_terreno_m: number; altura_antena_m: number };
  };
  energy: {
    hcm: SiteEnergy; guaxene: SiteEnergy;
    solar_rendimento_kwh_kwp_dia: number; hora_inicio_corte: number; recarga_rede_c_rate: number;
  };
}

const CFG_DEFAULT: Cfg = {
  rf: {
    distancia_km: 3.69, frequencia_ghz: 5.8, canal_mhz: 20, p_tx_dbm: 3, g_tx_dbi: 34, l_tx_db: 1,
    g_rx_dbi: 34, l_rx_db: 1, l_misc_db: 1, nf_db: 5,
    sensibilidades_dbm: { QPSK_MIMO: -85, '16QAM_MIMO': -81, '64QAM': -75, '256QAM': -69, '1024QAM': -63 },
    capacidade_referencia_mbps: { QPSK_MIMO: 24.32, '16QAM_MIMO': 48.64, '64QAM': 72.96, '256QAM': 97.28, '1024QAM': 121.6 },
    capacidade_minima_mbps: 15, min_fm_threshold_db: 3,
  },
  geography: {
    hcm: { latitude: -25.96897, longitude: 32.58889, altitude_terreno_m: 20, altura_antena_m: 15 },
    guaxene: { latitude: -25.98556, longitude: 32.55694, altitude_terreno_m: 5, altura_antena_m: 10 },
  },
  energy: {
    hcm: { carga_w: 100, bateria_wh: 12000, dod: 0.8, eficiencia: 0.9, solar_wp_min: 800, autonomia_minima_h: 72 },
    guaxene: { carga_w: 30, bateria_wh: 3600, dod: 0.8, eficiencia: 0.9, solar_wp_min: 300, autonomia_minima_h: 72 },
    solar_rendimento_kwh_kwp_dia: 4.36, hora_inicio_corte: 18, recarga_rede_c_rate: 0.1,
  },
};

// Constantes do motor (rf_calculator.py / state_machine.py)
const C_MS = 299_792_458;
const R_TERRA = 6_371_000;
const K = 4 / 3;
const HISTERESE_DB = 1;
const FM_NORMAL_DB = 17.95;
const MODS = ['QPSK_MIMO', '16QAM_MIMO', '64QAM', '256QAM', '1024QAM'];
const MOD_LABEL: Record<string, string> = {
  QPSK_MIMO: 'QPSK (MIMO)', '16QAM_MIMO': '16-QAM (MIMO)', '64QAM': '64-QAM', '256QAM': '256-QAM', '1024QAM': '1024-QAM',
};
const BITS: Record<string, number> = { QPSK_MIMO: 2, '16QAM_MIMO': 4, '64QAM': 6, '256QAM': 8, '1024QAM': 10 };

/** Número em português (vírgula decimal). */
const n = (v: number, d = 2) => v.toLocaleString('pt-PT', { minimumFractionDigits: d, maximumFractionDigits: d });
/** Número com sinal, entre parênteses se negativo (para substituições). */
const ns = (v: number, d = 2) => (v < 0 ? `(${n(v, d)})` : n(v, d));

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const r = (x: number) => (x * Math.PI) / 180;
  const a = Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lon2 - lon1) / 2) ** 2;
  return 2 * (R_TERRA / 1000) * Math.asin(Math.sqrt(a));
}

// ---------------------------------------------------------------------------
// Blocos de apresentação
// ---------------------------------------------------------------------------

type Tag = 'relatorio' | 'premissa' | 'ilustrativo' | 'fisica';
const TAG: Record<Tag, { label: string; cls: string }> = {
  relatorio:   { label: 'Relatório técnico', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  premissa:    { label: 'Premissa académica', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  ilustrativo: { label: 'Dados ilustrativos', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  fisica:      { label: 'Física / ITU-R', cls: 'bg-gray-50 text-gray-600 border-gray-200' },
};

function Card({ id, titulo, tags = [], formula, vars, sub, res, nota, ativo, children }: {
  id: string; titulo: string; tags?: Tag[]; formula: string | string[];
  vars?: [string, string][]; sub?: string | string[]; res?: string; nota?: string;
  ativo?: boolean; children?: React.ReactNode;
}) {
  const linhas = (x: string | string[]) => (Array.isArray(x) ? x : [x]);
  return (
    <section id={`f-${id}`}
      className={clsx('scroll-mt-4 rounded-lg border bg-white p-4 transition-shadow duration-700',
        ativo ? 'border-blue-400 ring-2 ring-blue-200' : 'border-gray-200')}>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <h3 className="text-sm font-bold text-gray-800">{titulo}</h3>
        {tags.map((t) => (
          <span key={t} className={clsx('text-[10px] px-1.5 py-0.5 rounded border', TAG[t].cls)}>{TAG[t].label}</span>
        ))}
      </div>
      <div className="font-mono text-[13px] bg-gray-50 border border-gray-200 rounded px-3 py-2 text-gray-800 space-y-0.5 overflow-x-auto">
        {linhas(formula).map((l, i) => <p key={i} className="whitespace-pre">{l}</p>)}
      </div>
      {vars && (
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
          {vars.map(([s, d]) => (
            <div key={s} className="contents">
              <dt className="font-mono text-gray-700">{s}</dt>
              <dd className="text-gray-500">{d}</dd>
            </div>
          ))}
        </dl>
      )}
      {sub && (
        <div className="mt-2 font-mono text-[12px] bg-blue-50 border border-blue-100 rounded px-3 py-2 text-blue-900 space-y-0.5 overflow-x-auto">
          {linhas(sub).map((l, i) => <p key={i} className="whitespace-pre">{l}</p>)}
        </div>
      )}
      {res && (
        <p className="mt-2 text-xs font-bold bg-green-50 border border-green-100 rounded px-3 py-1.5 text-green-800">{res}</p>
      )}
      {children}
      {nota && <p className="mt-2 text-xs text-gray-500 italic">{nota}</p>}
    </section>
  );
}

function Tabela({ cab, linhas, destaque }: { cab: string[]; linhas: (string | number)[][]; destaque?: (i: number) => boolean }) {
  return (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>{cab.map((c) => <th key={c} className="text-left font-semibold text-gray-500 border-b border-gray-200 px-2 py-1">{c}</th>)}</tr>
        </thead>
        <tbody>
          {linhas.map((l, i) => (
            <tr key={i} className={destaque?.(i) ? 'bg-green-50 font-semibold text-green-900' : 'text-gray-700'}>
              {l.map((c, j) => <td key={j} className="border-b border-gray-100 px-2 py-1 font-mono">{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Secções
// ---------------------------------------------------------------------------

const SECCOES: { id: string; titulo: string; itens: [string, string][] }[] = [
  { id: 'radio', titulo: 'Enlace rádio', itens: [
    ['lambda', 'Comprimento de onda'], ['fspl', 'Perda em espaço livre'], ['eirp', 'EIRP'],
    ['p_r', 'Potência recebida'], ['snr', 'Ruído e SNR'], ['fm', 'Margem de desvanecimento'],
    ['modulacao', 'Modulação adaptativa'], ['capacidade', 'Capacidade'],
  ] },
  { id: 'geo', titulo: 'Percurso e Fresnel', itens: [
    ['distancia', 'Distância (Haversine)'], ['fresnel', '1.ª zona de Fresnel'],
    ['curvatura', 'Curvatura da Terra'], ['los', 'Linha de visada e folga'],
  ] },
  { id: 'energia', titulo: 'Energia', itens: [
    ['emin', 'Energia mínima (DoD)'], ['energia', 'Autonomia'], ['solar', 'Produção solar'], ['bateria', 'Balanço da bateria'],
  ] },
  { id: 'estados', titulo: 'Resiliência', itens: [['caminhos', 'Escolha de caminhos'], ['estados', 'Estados da rede']] },
];

function Conteudo({ r, cfg, alvo }: { r: SimulationResult; cfg: Cfg; alvo: string | null }) {
  const { rf, geography: geo, energy: en } = cfg;
  const lb = r.link_budget;
  const inp = r.input;
  const fMhz = rf.frequencia_ghz * 1000;
  const lAmb = inp.l_ambiente_db;
  const dM = rf.distancia_km * 1000;
  const dMid = dM / 2;
  const hA = geo.hcm.altitude_terreno_m + geo.hcm.altura_antena_m;
  const hB = geo.guaxene.altitude_terreno_m + geo.guaxene.altura_antena_m;
  const dHav = haversineKm(geo.hcm.latitude, geo.hcm.longitude, geo.guaxene.latitude, geo.guaxene.longitude);
  const fm = lb.fade_margin_db;
  const modSel = lb.modulacao_selecionada;

  // Ponto do percurso com menor folga face ao critério de 60 % de F₁ (exclui extremos, onde F₁ = 0)
  const interiores = r.fresnel.pontos.filter((p) => p.fresnel_r_m > 0);
  const pior = interiores.reduce((a, p) => (p.clearance_m - p.fresnel_60pct_m < a.clearance_m - a.fresnel_60pct_m ? p : a), interiores[0]);

  const sites = [
    { nome: 'HCM', c: en.hcm, bat: r.energy.hcm_bateria_wh, auto: r.energy.hcm_autonomia_h },
    { nome: 'Guaxene', c: en.guaxene, bat: r.energy.guaxene_bateria_wh, auto: r.energy.guaxene_autonomia_h },
  ];
  const Y = en.solar_rendimento_kwh_kwp_dia;
  const pico = (wp: number) => (wp * Y) / (24 / Math.PI);

  const estadoRegras: [string, string][] = [
    ['NORMAL', `caminho local = PtP  ∧  FM(256-QAM) ≥ ${n(FM_NORMAL_DB)} dB  ∧  C ≥ ${n(rf.capacidade_minima_mbps, 0)} Mbps  ∧  EDM nos dois locais  ∧  ISP activo`],
    ['EMERGÊNCIA', 'caminho local = PtP  ∧  ( EDM cortada num local  ∨  (sem ISP ∧ sem 4G/5G externo) )'],
    ['DEGRADADO', 'caminho local = PtP sem cumprir NORMAL (ex.: FM(256-QAM) abaixo do limiar)  ∨  caminho local = 4G/5G'],
    ['CRÍTICO', 'sem caminho local (Guaxene isolada)  ∧  o HCM ainda tem caminho externo'],
    ['FALHA', 'sem caminho local  ∧  sem caminho externo'],
  ];

  const a = (id: string) => alvo === id;

  return (
    <div className="space-y-6">
      {/* ── Enlace rádio ── */}
      <div id="f-radio" className="space-y-3 scroll-mt-4">
        <h2 className="text-xs font-bold uppercase tracking-wide text-gray-400">Enlace rádio PtP — 5,8 GHz</h2>

        <Card id="lambda" ativo={a('lambda')} titulo="Comprimento de onda (λ)" tags={['fisica']}
          formula="λ = c / f"
          vars={[['c', 'velocidade da luz = 299 792 458 m/s'], ['f', `frequência = ${n(rf.frequencia_ghz, 1)} GHz`]]}
          sub={`λ = 299 792 458 / (${n(rf.frequencia_ghz, 1)} × 10⁹)`}
          res={`λ = ${n(lb.comprimento_onda_m, 4)} m  (${n(lb.comprimento_onda_m * 100, 2)} cm)`}
          nota="Usado no raio da zona de Fresnel." />

        <Card id="fspl" ativo={a('fspl')} titulo="Perda em espaço livre (FSPL)" tags={['fisica']}
          formula="FSPL (dB) = 32,44 + 20·log₁₀(d [km]) + 20·log₁₀(f [MHz])"
          vars={[['d', `distância do enlace = ${n(rf.distancia_km)} km`], ['f', `frequência = ${n(fMhz, 0)} MHz`]]}
          sub={[
            `FSPL = 32,44 + 20·log₁₀(${n(rf.distancia_km)}) + 20·log₁₀(${n(fMhz, 0)})`,
            `     = 32,44 + ${n(20 * Math.log10(rf.distancia_km))} + ${n(20 * Math.log10(fMhz))}`,
          ]}
          res={`FSPL = ${n(lb.fspl_db)} dB`} />

        <Card id="eirp" ativo={a('eirp')} titulo="Potência isotrópica radiada equivalente (EIRP)" tags={['relatorio']}
          formula="EIRP = P_Tx + G_Tx − L_Tx"
          vars={[['P_Tx', 'potência do transmissor (dBm)'], ['G_Tx', 'ganho da antena de emissão (dBi)'], ['L_Tx', 'perdas em cabos/conectores (dB)']]}
          sub={`EIRP = ${n(rf.p_tx_dbm, 0)} + ${n(rf.g_tx_dbi, 0)} − ${n(rf.l_tx_db, 0)}`}
          res={`EIRP = ${n(lb.eirp_dbm, 0)} dBm`}
          nota="P_Tx = 3 dBm resulta do dimensionamento inverso do relatório (EIRP de 36 dBm com antenas de 34 dBi)." />

        <Card id="p_r" ativo={a('p_r')} titulo="Potência recebida (P_R)" tags={['relatorio']}
          formula="P_R = EIRP − FSPL + G_Rx − L_Rx − L_misc − L_ambiente"
          vars={[
            ['G_Rx', `ganho da antena de receção = ${n(rf.g_rx_dbi, 0)} dBi`], ['L_Rx', `perdas na receção = ${n(rf.l_rx_db, 0)} dB`],
            ['L_misc', `perdas diversas = ${n(rf.l_misc_db, 0)} dB`], ['L_ambiente', 'atenuação extra (chuva/interferência) — controlo "Atenuação extra"'],
          ]}
          sub={`P_R = ${n(lb.eirp_dbm, 0)} − ${n(lb.fspl_db)} + ${n(rf.g_rx_dbi, 0)} − ${n(rf.l_rx_db, 0)} − ${n(rf.l_misc_db, 0)} − ${n(lAmb, 1)}`}
          res={`P_R = ${n(lb.p_r_dbm)} dBm`}
          nota={lAmb > 0 ? `Inclui ${n(lAmb, 1)} dB de atenuação extra do cenário actual.` : 'Cenário base: L_ambiente = 0 dB.'} />

        <Card id="snr" ativo={a('snr')} titulo="Ruído térmico e relação sinal-ruído (SNR)" tags={['fisica', 'premissa']}
          formula={['P_N = −174 + 10·log₁₀(B) + NF', 'SNR = P_R − P_N']}
          vars={[['−174', 'densidade de ruído térmico a 290 K (dBm/Hz)'], ['B', `largura de canal = ${n(rf.canal_mhz, 0)} MHz`], ['NF', `figura de ruído = ${n(rf.nf_db, 1)} dB (premissa)`]]}
          sub={[
            `P_N = −174 + 10·log₁₀(${n(rf.canal_mhz, 0)} × 10⁶) + ${n(rf.nf_db, 1)} = ${n(lb.p_n_dbm)} dBm`,
            `SNR = ${ns(lb.p_r_dbm)} − ${ns(lb.p_n_dbm)}`,
          ]}
          res={`SNR = ${n(lb.snr_db)} dB`}
          nota="O SNR é apenas informativo: a escolha da modulação usa a margem de desvanecimento (FM)." />

        <Card id="fm" ativo={a('fm')} titulo="Margem de desvanecimento (FM)" tags={['relatorio']}
          formula="FM = P_R − S"
          vars={[['S', 'sensibilidade do rádio AF-5XHD para cada modulação (canal de 20 MHz)']]}
          sub={`FM(QPSK) = ${ns(lb.p_r_dbm)} − (${n(rf.sensibilidades_dbm.QPSK_MIMO, 0)})`}
          res={`FM(QPSK) = ${n(fm.QPSK_MIMO)} dB`}>
          <Tabela cab={['Modulação', 'S (dBm)', 'FM = P_R − S (dB)']}
            linhas={MODS.map((m) => [MOD_LABEL[m], n(rf.sensibilidades_dbm[m], 0), n(fm[m])])} />
        </Card>

        <Card id="modulacao" ativo={a('modulacao')} titulo="Modulação adaptativa" tags={['premissa']}
          formula={[
            `modulação = a mais alta com FM ≥ ${n(rf.min_fm_threshold_db, 1)} dB`,
            `subir de modulação exige FM ≥ ${n(rf.min_fm_threshold_db, 1)} + ${n(HISTERESE_DB, 1)} dB (histerese)`,
            'nenhuma com FM ≥ limiar  →  enlace sem sinal',
          ]}
          res={modSel ? `Modulação seleccionada: ${MOD_LABEL[modSel]} (FM = ${n(fm[modSel])} dB)` : 'Nenhuma modulação viável — enlace PtP sem sinal'}
          nota="Limiar de 3 dB e histerese de 1 dB são premissas académicas, não especificações do fabricante. A histerese evita que a modulação oscile na linha temporal.">
          <Tabela cab={['Modulação', 'FM (dB)', `FM ≥ ${n(rf.min_fm_threshold_db, 0)} dB?`]}
            linhas={MODS.map((m) => [MOD_LABEL[m], n(fm[m]), fm[m] >= rf.min_fm_threshold_db ? 'sim' : 'não'])}
            destaque={(i) => MODS[i] === modSel} />
        </Card>

        <Card id="capacidade" ativo={a('capacidade')} titulo="Capacidade de referência" tags={['premissa']}
          formula="C(mod) = 24,32 Mbps × (bits por símbolo / 2)"
          vars={[['24,32 Mbps', 'capacidade de QPSK (2 bits/símbolo) no canal de 20 MHz']]}
          sub={modSel ? `C = 24,32 × ${BITS[modSel]} / 2` : 'sem modulação → C = 0'}
          res={`C = ${n(lb.capacidade_mbps)} Mbps  (requisito: ≥ ${n(rf.capacidade_minima_mbps, 0)} Mbps)`}>
          <Tabela cab={['Modulação', 'bits/símbolo', 'C (Mbps)']}
            linhas={MODS.map((m) => [MOD_LABEL[m], BITS[m], n(rf.capacidade_referencia_mbps[m])])}
            destaque={(i) => MODS[i] === modSel} />
        </Card>
      </div>

      {/* ── Percurso e Fresnel ── */}
      <div id="f-geo" className="space-y-3 scroll-mt-4">
        <h2 className="text-xs font-bold uppercase tracking-wide text-gray-400">Percurso, Fresnel e linha de visada</h2>

        <Card id="distancia" ativo={a('distancia')} titulo="Distância geodésica (Haversine)" tags={['fisica']}
          formula={['a = sin²(Δφ/2) + cos φ₁ · cos φ₂ · sin²(Δλ/2)', 'd = 2 · R · asin(√a)']}
          vars={[['φ, λ', 'latitude e longitude (radianos)'], ['R', 'raio médio da Terra = 6 371 km']]}
          sub={`HCM (${n(geo.hcm.latitude, 5)}; ${n(geo.hcm.longitude, 5)})  →  Guaxene (${n(geo.guaxene.latitude, 5)}; ${n(geo.guaxene.longitude, 5)})`}
          res={`d = ${n(dHav, 3)} km  →  adoptado no relatório: ${n(rf.distancia_km)} km`} />

        <Card id="fresnel" ativo={a('fresnel')} titulo="Raio da 1.ª zona de Fresnel" tags={['fisica']}
          formula="F₁(x) = √( λ · d₁ · d₂ / (d₁ + d₂) )"
          vars={[['d₁, d₂', 'distâncias do ponto a cada extremo (m)'], ['λ', `${n(lb.comprimento_onda_m, 4)} m`]]}
          sub={`No ponto médio: F₁ = √( ${n(lb.comprimento_onda_m, 4)} × ${n(dMid, 0)} × ${n(dMid, 0)} / ${n(dM, 0)} )`}
          res={`F₁,máx = ${n(lb.fresnel_max_m)} m   ·   60 % de F₁ = ${n(lb.fresnel_60pct_m)} m`} />

        <Card id="curvatura" ativo={a('curvatura')} titulo="Saliência da curvatura terrestre" tags={['fisica']}
          formula="h_c(x) = d₁ · d₂ / (2 · k · R)"
          vars={[['k', 'factor de raio terrestre efectivo = 4/3 (atmosfera padrão)'], ['R', '6 371 000 m']]}
          sub={`No ponto médio: h_c = ${n(dMid, 0)} × ${n(dMid, 0)} / (2 × 4/3 × 6 371 000)`}
          res={`h_c = ${n(lb.earth_bulge_midpoint_m, 3)} m`} />

        <Card id="los" ativo={a('los')} titulo="Linha de visada e critério de desobstrução" tags={['ilustrativo']}
          formula={[
            'h_LOS(x) = h_A + (x / d) · (h_B − h_A)',
            'folga(x) = h_LOS(x) − ( h_terreno(x) + h_c(x) )',
            'critério:  folga(x) ≥ 0,6 · F₁(x)   em todo o percurso',
          ]}
          vars={[
            ['h_A', `HCM: ${n(geo.hcm.altitude_terreno_m, 0)} m de terreno + ${n(geo.hcm.altura_antena_m, 0)} m de mastro = ${n(hA, 0)} m`],
            ['h_B', `Guaxene: ${n(geo.guaxene.altitude_terreno_m, 0)} m + ${n(geo.guaxene.altura_antena_m, 0)} m = ${n(hB, 0)} m`],
          ]}
          sub={pior ? [
            `Ponto mais desfavorável: x = ${n(pior.distancia_m / 1000, 3)} km`,
            `folga = ${n(pior.h_los_m)} − (${n(pior.h_terreno_m)} + ${n(pior.h_bulge_m, 3)}) = ${n(pior.clearance_m)} m`,
            `0,6 · F₁ = ${n(pior.fresnel_60pct_m)} m`,
          ] : undefined}
          res={r.fresnel.todos_ok ? 'LOS desobstruída — critério de 60 % cumprido nos 50 pontos do perfil' : 'Obstrução — critério de 60 % falha em pelo menos um ponto'}
          nota="As alturas das antenas e o perfil do terreno são ilustrativos; devem ser substituídos pelos valores do relatório e por um perfil SRTM/Copernicus." />
      </div>

      {/* ── Energia ── */}
      <div id="f-energia" className="space-y-3 scroll-mt-4">
        <h2 className="text-xs font-bold uppercase tracking-wide text-gray-400">Energia e autonomia</h2>

        <Card id="emin" ativo={a('emin')} titulo="Energia mínima da bateria (profundidade de descarga)" tags={['relatorio']}
          formula="E_min = E_max · (1 − DoD)"
          vars={[['E_max', 'capacidade da bateria (Wh)'], ['DoD', `profundidade de descarga = ${n(en.hcm.dod * 100, 0)} %`]]}
          sub={sites.map((s) => `${s.nome}: E_min = ${n(s.c.bateria_wh, 0)} × (1 − ${n(s.c.dod, 1)}) = ${n(s.c.bateria_wh * (1 - s.c.dod), 0)} Wh`)}
          nota="Abaixo de E_min o equipamento desliga-se (bateria esgotada)." />

        <Card id="energia" ativo={a('energia')} titulo="Autonomia" tags={['relatorio']}
          formula={['Autonomia (bateria cheia) = E_max · DoD · η / P_carga', 'Autonomia restante = (E_bat − E_min) · η / P_carga']}
          vars={[['η', `eficiência do sistema = ${n(en.hcm.eficiencia, 1)}`], ['P_carga', `consumo: HCM ${n(en.hcm.carga_w, 0)} W, Guaxene ${n(en.guaxene.carga_w, 0)} W`]]}
          sub={[
            ...sites.map((s) => `${s.nome} (cheia): ${n(s.c.bateria_wh, 0)} × ${n(s.c.dod, 1)} × ${n(s.c.eficiencia, 1)} / ${n(s.c.carga_w, 0)} = ${n(s.c.bateria_wh * s.c.dod * s.c.eficiencia / s.c.carga_w, 1)} h`),
            ...sites.map((s) => `${s.nome} (agora): (${n(s.bat, 0)} − ${n(s.c.bateria_wh * (1 - s.c.dod), 0)}) × ${n(s.c.eficiencia, 1)} / ${n(s.c.carga_w, 0)} = ${n(s.auto, 1)} h`),
          ]}
          res={`Requisito mínimo: ${n(en.hcm.autonomia_minima_h, 0)} h  ·  HCM ${n(r.energy.hcm_autonomia_h, 1)} h  ·  Guaxene ${n(r.energy.guaxene_autonomia_h, 1)} h`}
          nota="Autonomia restante sem contar com o solar." />

        <Card id="solar" ativo={a('solar')} titulo="Produção solar (perfil diário)" tags={['relatorio']}
          formula={[
            'P_solar(h) = P_pico · sin( π · (h − 6) / 12 ) · f_meteo    para 6 h < h < 18 h  (0 à noite)',
            'P_pico = P_Wp · Y / (24 / π)',
          ]}
          vars={[
            ['Y', `rendimento PVGIS para Maputo = ${n(Y)} kWh/kWp/dia (já inclui perdas)`],
            ['P_Wp', `potência instalada: HCM ${n(en.hcm.solar_wp_min, 0)} Wp, Guaxene ${n(en.guaxene.solar_wp_min, 0)} Wp (valor mínimo, conservador)`],
            ['f_meteo', `sol disponível = ${n(inp.fator_solar * 100, 0)} % (controlo "Sol disponível")`],
            ['24/π', 'integral do seno em 12 h → a energia diária é P_Wp · Y'],
          ]}
          sub={sites.map((s) => `${s.nome}: P_pico = ${n(s.c.solar_wp_min, 0)} × ${n(Y)} / ${n(24 / Math.PI, 3)} = ${n(pico(s.c.solar_wp_min), 1)} W  ·  energia/dia = ${n(s.c.solar_wp_min * Y, 0)} Wh vs consumo ${n(s.c.carga_w * 24, 0)} Wh`)}
          nota={`O corte de EDM começa às ${n(en.hora_inicio_corte, 0)} h (pior caso: começa pela noite).`} />

        <Card id="bateria" ativo={a('bateria')} titulo="Balanço da bateria ao longo do tempo" tags={['relatorio']}
          formula={[
            'sem EDM, P_solar ≥ P_carga:  E ← E + (P_solar − P_carga) · Δt · η',
            'sem EDM, P_solar < P_carga:  E ← E − (P_carga − P_solar) · Δt / η',
            'com EDM (linha temporal):     E ← E + P_rede · Δt · η,   P_rede = C/10 = 0,1 · E_max por hora',
            'E limitada a [E_min, E_max];  Δt = 0,1 h',
          ]}
          sub={sites.map((s) => `${s.nome}: sem sol, ${n(s.c.carga_w, 0)} W / ${n(s.c.eficiencia, 1)} = ${n(s.c.carga_w / s.c.eficiencia, 1)} W retirados → ${n(s.c.bateria_wh * s.c.dod, 0)} Wh úteis duram ${n(s.c.bateria_wh * s.c.dod * s.c.eficiencia / s.c.carga_w, 1)} h`)}
          nota="O solar serve primeiro a carga; só o défice sai da bateria (a dividir por η) e só o excedente a carrega (a multiplicar por η). O cálculo é feito por integração numérica em passos de 0,1 h." />
      </div>

      {/* ── Resiliência ── */}
      <div id="f-estados" className="space-y-3 scroll-mt-4">
        <h2 className="text-xs font-bold uppercase tracking-wide text-gray-400">Lógica de resiliência</h2>

        <Card id="caminhos" ativo={a('caminhos')} titulo="Escolha dos caminhos (failover)" tags={['relatorio']}
          formula={[
            'local (HCM ↔ Guaxene):   PtP  →  4G/5G local  →  nenhum',
            'externo (HCM → Internet): ISP/fibra  →  4G/5G externo  →  satélite  →  nenhum',
            'local com energia  ⇔  EDM activa  ∨  E_bat > E_min',
          ]}
          res={`Agora: local = ${r.network.caminho_local}  ·  externo = ${r.network.caminho_externo}`}
          nota="Escolhe-se o primeiro caminho disponível. Os caminhos locais precisam de energia nos dois locais; os externos só no HCM. O satélite existe apenas no HCM, por isso não liga a Guaxene." />

        <Card id="estados" ativo={a('estados')} titulo="Estados da rede" tags={['relatorio']}
          formula="Avaliados por ordem: o primeiro critério verdadeiro define o estado"
          res={`Estado actual: ${r.network.estado} — ${STATE_DESC[r.network.estado]}`}
          nota={`O limiar ${n(FM_NORMAL_DB)} dB é a FM(256-QAM) do cenário base (P_R = −51,05 dBm; S = −69 dBm). Qualquer atenuação extra, mesmo pequena, passa o estado a DEGRADADO.`}>
          <div className="mt-2 space-y-1">
            {estadoRegras.map(([e, regra]) => (
              <div key={e} className={clsx('flex flex-col sm:flex-row gap-1 sm:gap-3 rounded px-2 py-1.5 text-xs',
                e === r.network.estado ? 'bg-gray-100' : '')}>
                <span className="font-bold w-24 flex-shrink-0" style={{ color: STATE_HEX[e] }}>{e}</span>
                <span className="font-mono text-gray-700">{regra}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Painel
// ---------------------------------------------------------------------------

let cfgCache: Cfg | null = null;

export function FormulasPanel() {
  const { formulasOpen, formulasSection, closeFormulas, result } = useSimulation();
  const [cfg, setCfg] = useState<Cfg>(cfgCache ?? CFG_DEFAULT);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Parâmetros oficiais (uma vez)
  useEffect(() => {
    if (!formulasOpen || cfgCache) return;
    api.config().then((c) => { cfgCache = c as Cfg; setCfg(cfgCache); }).catch(() => {});
  }, [formulasOpen]);

  // Saltar para a fórmula pedida (ex.: botão ⓘ)
  useEffect(() => {
    if (!formulasOpen) return;
    const id = formulasSection ? `f-${formulasSection}` : null;
    requestAnimationFrame(() => {
      if (id) document.getElementById(id)?.scrollIntoView({ block: 'start' });
      else scrollRef.current?.scrollTo({ top: 0 });
    });
  }, [formulasOpen, formulasSection]);

  useEffect(() => {
    if (!formulasOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeFormulas(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [formulasOpen, closeFormulas]);

  if (!formulasOpen) return null;

  const ir = (id: string) => document.getElementById(`f-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" onClick={closeFormulas}>
      <div className="h-full w-full max-w-5xl bg-gray-50 shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-3 px-5 py-3 bg-white border-b border-gray-200">
          <div>
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-gray-800">
              <Sigma className="w-4 h-4 text-blue-700" /> Fórmulas usadas nos cálculos
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Substituições com os valores do cenário actual
              {result && <> — estado <span className="font-semibold" style={{ color: STATE_HEX[result.network.estado] }}>{result.network.estado}</span>, T+{n(result.input.tempo_simulado_h, 0)} h</>}.
              Fonte: <code className="text-[11px]">backend/app/engine</code> e <code className="text-[11px]">project_config.json</code>.
            </p>
          </div>
          <button onClick={closeFormulas} className="p-1 text-gray-400 hover:text-gray-700" title="Fechar (Esc)">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navegação em ecrã pequeno */}
        <div className="md:hidden flex gap-1 overflow-x-auto px-3 py-2 bg-white border-b border-gray-200">
          {SECCOES.map((s) => (
            <button key={s.id} onClick={() => ir(s.id)}
              className="whitespace-nowrap text-xs px-2.5 py-1 rounded-full border border-gray-200 text-gray-600">
              {s.titulo}
            </button>
          ))}
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Índice */}
          <nav className="hidden md:block w-52 flex-shrink-0 overflow-y-auto border-r border-gray-200 bg-white px-3 py-3">
            {SECCOES.map((s) => (
              <div key={s.id} className="mb-3">
                <button onClick={() => ir(s.id)} className="text-[11px] font-bold uppercase tracking-wide text-gray-400 hover:text-blue-700">
                  {s.titulo}
                </button>
                <ul className="mt-1 space-y-0.5">
                  {s.itens.map(([id, label]) => (
                    <li key={id}>
                      <button onClick={() => ir(id)}
                        className={clsx('w-full text-left text-xs px-2 py-0.5 rounded hover:bg-blue-50 hover:text-blue-700',
                          formulasSection === id ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600')}>
                        {label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          {/* Conteúdo */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-6 py-4">
            {result
              ? <Conteudo r={result} cfg={cfg} alvo={formulasSection} />
              : <p className="text-xs text-gray-400">A aguardar dados do simulador…</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
