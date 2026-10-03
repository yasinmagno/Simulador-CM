import { useSimulation } from '@/store/simulation';
import { STATE_HEX } from '@/lib/estado';

/*
 * Esquema animado da arquitectura híbrida (relatório §7):
 * pacotes circulam apenas nos caminhos ativos, componentes em falha ficam
 * a vermelho com ✕, edifícios apagam-se sem energia, a bateria esvazia,
 * o sol carrega e a chuva aparece quando há atenuação extra.
 */

// Geometria (viewBox 1000 × 560)
const P = {
  hcm: { x: 170, y: 330 },
  gua: { x: 830, y: 330 },
  antHcm: { x: 238, y: 214 },
  antGua: { x: 762, y: 232 },
  torre: { x: 500, y: 430 },
  nuvem: { x: 150, y: 92 },
  sat: { x: 500, y: 78 },
};

const PATHS = {
  ptp: `M${P.antHcm.x},${P.antHcm.y} L${P.antGua.x},${P.antGua.y}`,
  g4Local: `M215,372 Q500,530 785,372`,
  isp: `M150,282 L150,128`,
  g4Ext: `M215,380 Q360,450 488,410 Q360,250 182,112`,
  sat: `M${P.antHcm.x},${P.antHcm.y - 8} Q330,92 486,84 Q330,30 190,86`,
};

const CAP_MAX = 121.6;
const MOD_LABEL: Record<string, string> = {
  QPSK_MIMO: 'QPSK', '16QAM_MIMO': '16-QAM', '64QAM': '64-QAM', '256QAM': '256-QAM', '1024QAM': '1024-QAM',
};
const MOD_ORDER = ['QPSK_MIMO', '16QAM_MIMO', '64QAM', '256QAM', '1024QAM'];

type LinkStatus = 'ativo' | 'espera' | 'falha';

function Link({ id, d, status, cor, dur, pacotes, bidirecional, label, labelPos }: {
  id: string; d: string; status: LinkStatus; cor: string; dur: number; pacotes: number;
  bidirecional?: boolean; label: string; labelPos: { x: number; y: number };
}) {
  const stroke = status === 'ativo' ? cor : status === 'falha' ? '#ef4444' : '#cbd5e1';
  return (
    <g>
      <path id={id} d={d} fill="none" stroke="transparent" />
      {status === 'ativo' && (
        <path d={d} fill="none" stroke={cor} strokeWidth={10} strokeOpacity={0.15} strokeLinecap="round" />
      )}
      <path
        d={d} fill="none" stroke={stroke}
        strokeWidth={status === 'ativo' ? 3 : 2}
        strokeDasharray={status === 'falha' ? '6 6' : status === 'espera' ? '2 6' : undefined}
        className={status === 'ativo' ? 'link-flow' : undefined}
        strokeLinecap="round"
      />
      {status === 'ativo' && Array.from({ length: pacotes }).map((_, i) => (
        <g key={`f${i}`}>
          <circle r={4.5} fill={cor} stroke="white" strokeWidth={1.5}>
            <animateMotion dur={`${dur}s`} repeatCount="indefinite" begin={`${(i * dur) / pacotes}s`}>
              <mpath href={`#${id}`} />
            </animateMotion>
          </circle>
          {bidirecional && (
            <circle r={3.5} fill="white" stroke={cor} strokeWidth={1.5}>
              <animateMotion dur={`${dur}s`} repeatCount="indefinite" begin={`${(i * dur) / pacotes + dur / (2 * pacotes)}s`}
                keyPoints="1;0" keyTimes="0;1" calcMode="linear">
                <mpath href={`#${id}`} />
              </animateMotion>
            </circle>
          )}
        </g>
      ))}
      <g transform={`translate(${labelPos.x},${labelPos.y})`}>
        <text textAnchor="middle" fontSize={13} fontWeight={600}
          fill={status === 'ativo' ? '#1f2937' : status === 'falha' ? '#dc2626' : '#94a3b8'}>
          {status === 'falha' ? '✕ ' : ''}{label}
        </text>
        <text y={15} textAnchor="middle" fontSize={10}
          fill={status === 'ativo' ? cor : status === 'falha' ? '#dc2626' : '#94a3b8'}>
          {status === 'ativo' ? 'em uso' : status === 'falha' ? 'em falha' : 'em espera'}
        </text>
      </g>
    </g>
  );
}

function Edificio({ x, y, nome, sub, energia, tipo }: {
  x: number; y: number; nome: string; sub: string; energia: boolean; tipo: 'hospital' | 'escola';
}) {
  const janela = energia ? '#fde68a' : '#334155';
  const w = tipo === 'hospital' ? 120 : 110;
  const h = tipo === 'hospital' ? 96 : 70;
  return (
    <g transform={`translate(${x - w / 2},${y - h / 2 + 20})`} className={energia ? undefined : 'apagado'}>
      {tipo === 'escola' && <polygon points={`-6,0 ${w / 2},-28 ${w + 6},0`} fill="#15803d" />}
      <rect width={w} height={h} rx={4} fill={tipo === 'hospital' ? '#1d4ed8' : '#16a34a'} />
      {tipo === 'hospital' && (
        <g transform={`translate(${w / 2 - 10},8)`}>
          <rect x={6} width={8} height={20} fill="white" />
          <rect y={6} width={20} height={8} fill="white" />
        </g>
      )}
      {Array.from({ length: tipo === 'hospital' ? 6 : 4 }).map((_, i) => (
        <rect key={i}
          x={12 + (i % 3) * (w - 24) / 3 + (tipo === 'escola' ? 6 : 0)}
          y={(tipo === 'hospital' ? 40 : 14) + Math.floor(i / 3) * 24}
          width={18} height={14} rx={2} fill={janela}
          style={{ transition: 'fill 600ms' }} />
      ))}
      <text x={w / 2} y={h + 18} textAnchor="middle" fontSize={14} fontWeight={700} fill="#1f2937">{nome}</text>
      <text x={w / 2} y={h + 33} textAnchor="middle" fontSize={10} fill="#64748b">{sub}</text>
    </g>
  );
}

function Antena({ x, y, base, ondas, cor, direita }: {
  x: number; y: number; base: number; ondas: number; cor: string; direita: boolean;
}) {
  const s = direita ? 1 : -1;
  return (
    <g>
      <line x1={x} y1={y} x2={x} y2={base} stroke="#475569" strokeWidth={3} />
      <rect x={x - 6} y={y - 10} width={12} height={20} rx={3} fill="#e2e8f0" stroke="#475569" />
      {Array.from({ length: ondas }).map((_, i) => (
        <path key={i}
          d={`M${x + s * (12 + i * 8)},${y - 10 - i * 4} q${s * (6 + i * 3)},${10 + i * 4} 0,${20 + i * 8}`}
          fill="none" stroke={cor} strokeWidth={2} className="onda"
          style={{ animationDelay: `${i * 0.25}s` }} />
      ))}
    </g>
  );
}

function Energia({ x, y, edm, bateriaPct, solar, solarAtivo, esgotada }: {
  x: number; y: number; edm: boolean; bateriaPct: number; solar: boolean; solarAtivo: boolean; esgotada: boolean;
}) {
  const corBat = esgotada ? '#ef4444' : bateriaPct > 50 ? '#22c55e' : bateriaPct > 25 ? '#eab308' : '#ef4444';
  return (
    <g transform={`translate(${x},${y})`}>
      {/* EDM */}
      <g>
        <circle r={14} fill={edm ? '#fef3c7' : '#f1f5f9'} stroke={edm ? '#f59e0b' : '#94a3b8'} />
        <path d="M2,-9 L-5,1 L0,1 L-2,9 L5,-1 L0,-1 Z" fill={edm ? '#f59e0b' : '#94a3b8'} />
        {!edm && <path d="M-11,-11 L11,11" stroke="#ef4444" strokeWidth={2.5} />}
        <text y={28} textAnchor="middle" fontSize={9} fill="#64748b">EDM</text>
      </g>
      {/* Bateria */}
      <g transform="translate(34,-16)">
        <rect width={18} height={32} rx={3} fill="white" stroke="#475569" />
        <rect x={6} y={-3} width={6} height={3} fill="#475569" />
        <rect x={2} y={2 + 28 * (1 - bateriaPct / 100)} width={14} height={28 * bateriaPct / 100} rx={1.5}
          fill={corBat} style={{ transition: 'all 600ms' }}
          className={!edm && !esgotada ? 'bateria-descarga' : undefined} />
        <text x={9} y={44} textAnchor="middle" fontSize={9} fill="#64748b">{Math.round(bateriaPct)}%</text>
      </g>
      {/* Solar */}
      {solar && (
        <g transform="translate(76,-6)">
          {solarAtivo && (
            <g className="sol-rodar" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
              <circle cx={12} cy={-16} r={6} fill="#facc15" />
              {Array.from({ length: 8 }).map((_, i) => (
                <line key={i} x1={12} y1={-26} x2={12} y2={-30} stroke="#facc15" strokeWidth={2}
                  transform={`rotate(${i * 45} 12 -16)`} />
              ))}
            </g>
          )}
          <polygon points="0,14 24,14 30,0 6,0" fill="#1e3a8a" stroke="#93c5fd" />
          <text x={15} y={28} textAnchor="middle" fontSize={9} fill="#64748b">Solar</text>
        </g>
      )}
    </g>
  );
}

export function NetworkSchematic() {
  const { result } = useSimulation();
  if (!result) return null;

  const { input: inp, network, link_budget: lb, energy } = result;
  const cor = STATE_HEX[network.estado] ?? '#22c55e';
  const local = network.caminho_local;
  const externo = network.caminho_externo;

  const status = (ativo: boolean, emUso: boolean): LinkStatus => (!ativo ? 'falha' : emUso ? 'ativo' : 'espera');
  const ptpSemSinal = inp.ptp_ativo && !lb.modulacao_selecionada;

  const modIdx = lb.modulacao_selecionada ? MOD_ORDER.indexOf(lb.modulacao_selecionada) : -1;
  const ptpDur = 2.2 * Math.sqrt(CAP_MAX / Math.max(lb.capacidade_mbps, 1));
  const ondas = local === 'PtP' ? Math.max(1, modIdx + 1) : 0;

  const batPct = (wh: number, max: number) => Math.max(0, Math.min(100, ((wh - max * 0.2) / (max * 0.8)) * 100));
  const chuva = Math.min(inp.l_ambiente_db / 12, 1);
  const solarComSol = inp.fator_solar > 0;

  return (
    <div className="h-full w-full bg-gradient-to-b from-sky-50 to-slate-100 relative overflow-hidden">
      <svg viewBox="0 0 1000 560" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
        {/* Solo e estuário */}
        <rect x={0} y={470} width={1000} height={90} fill="#e2e8f0" />
        <path d="M380,470 Q500,450 620,470 L620,560 L380,560 Z" fill="#bfdbfe" opacity={0.7} />
        <text x={500} y={545} textAnchor="middle" fontSize={11} fill="#3b82f6" opacity={0.8}>Baía de Maputo · 3,69 km</text>

        {/* Internet e satélite */}
        <g transform={`translate(${P.nuvem.x},${P.nuvem.y})`}>
          <path d="M-46,10 a20,20 0 0 1 12,-30 a26,26 0 0 1 48,-6 a18,18 0 0 1 26,16 a16,16 0 0 1 -4,30 h-74 a16,16 0 0 1 -8,-10 z"
            fill="white" stroke="#94a3b8" />
          <text y={8} textAnchor="middle" fontSize={13} fontWeight={600} fill="#475569">Internet</text>
        </g>
        <g transform={`translate(${P.sat.x},${P.sat.y})`} className={inp.satelite_ativo ? 'sat-flutuar' : undefined}>
          <rect x={-34} y={-6} width={22} height={12} fill="#1e40af" />
          <rect x={12} y={-6} width={22} height={12} fill="#1e40af" />
          <rect x={-10} y={-10} width={20} height={20} rx={3} fill={inp.satelite_ativo ? '#e2e8f0' : '#fecaca'} stroke="#475569" />
          {!inp.satelite_ativo && <text y={6} textAnchor="middle" fontSize={16} fill="#dc2626">✕</text>}
        </g>

        {/* Torre 4G/5G */}
        <g transform={`translate(${P.torre.x},${P.torre.y})`}>
          <path d="M-14,40 L0,-30 L14,40 M-9,15 L9,15 M-5,-5 L5,-5" fill="none"
            stroke={inp.g4_local_disponivel || inp.g4_externo_disponivel ? '#475569' : '#ef4444'} strokeWidth={3} />
          <circle cy={-34} r={5} fill={inp.g4_local_disponivel || inp.g4_externo_disponivel ? '#475569' : '#ef4444'} />
          <text y={58} textAnchor="middle" fontSize={11} fontWeight={600} fill="#475569">BTS 4G/5G</text>
        </g>

        {/* Caminhos externos (HCM → Internet) */}
        <Link id="ns-isp" d={PATHS.isp} status={status(inp.isp_ativo, externo === 'ISP/fibra')}
          cor={cor} dur={1.6} pacotes={3} bidirecional label="ISP / fibra" labelPos={{ x: 80, y: 205 }} />
        <Link id="ns-g4ext" d={PATHS.g4Ext} status={status(inp.g4_externo_disponivel, externo === '4G/5G')}
          cor={cor} dur={2.8} pacotes={3} bidirecional label="4G/5G externo" labelPos={{ x: 330, y: 300 }} />
        <Link id="ns-sat" d={PATHS.sat} status={status(inp.satelite_ativo, externo === 'Satélite')}
          cor={cor} dur={5} pacotes={2} bidirecional label="Satélite (contingência)" labelPos={{ x: 360, y: 40 }} />

        {/* Caminhos locais (HCM ↔ Guaxene) */}
        <Link id="ns-g4" d={PATHS.g4Local} status={status(inp.g4_local_disponivel, local === '4G/5G')}
          cor={cor} dur={3} pacotes={4} bidirecional label="4G/5G local (redundância)" labelPos={{ x: 650, y: 505 }} />
        <Link id="ns-ptp" d={PATHS.ptp}
          status={ptpSemSinal ? 'falha' : status(inp.ptp_ativo, local === 'PtP')}
          cor={cor} dur={ptpDur} pacotes={Math.max(2, modIdx + 2)} bidirecional
          label={`Rádio PtP 5,8 GHz${local === 'PtP' && lb.modulacao_selecionada
            ? ` · ${MOD_LABEL[lb.modulacao_selecionada]} · ${lb.capacidade_mbps.toFixed(1)} Mbps` : ''}`}
          labelPos={{ x: 500, y: 196 }} />

        {/* Chuva sobre o enlace */}
        {chuva > 0 && (
          <g opacity={0.35 + chuva * 0.5}>
            {Array.from({ length: Math.round(10 + chuva * 30) }).map((_, i) => (
              <line key={i} x1={300 + ((i * 53) % 420)} y1={120} x2={292 + ((i * 53) % 420)} y2={136}
                stroke="#3b82f6" strokeWidth={1.5} className="gota"
                style={{ animationDelay: `${(i % 7) * 0.13}s` }} />
            ))}
            <text x={500} y={150} textAnchor="middle" fontSize={11} fill="#1d4ed8">
              Atenuação +{inp.l_ambiente_db} dB
            </text>
          </g>
        )}

        {/* Antenas e edifícios */}
        <Antena x={P.antHcm.x} y={P.antHcm.y} base={P.hcm.y - 10} ondas={ondas} cor={cor} direita />
        <Antena x={P.antGua.x} y={P.antGua.y} base={P.gua.y + 6} ondas={ondas} cor={cor} direita={false} />
        <Edificio x={P.hcm.x} y={P.hcm.y} nome="HCM" sub="Hospital Central de Maputo"
          energia={network.hcm_com_energia} tipo="hospital" />
        <Edificio x={P.gua.x} y={P.gua.y} nome="Guaxene" sub="Centro de acomodação · KaTembe"
          energia={network.guaxene_com_energia} tipo="escola" />

        <Energia x={60} y={470} edm={inp.edm_hcm}
          bateriaPct={batPct(energy.hcm_bateria_wh, 12000)} esgotada={!network.hcm_com_energia}
          solar={inp.solar_hcm_ativo} solarAtivo={inp.solar_hcm_ativo && !inp.edm_hcm && solarComSol} />
        <Energia x={830} y={470} edm={inp.edm_guaxene}
          bateriaPct={batPct(energy.guaxene_bateria_wh, 3600)} esgotada={!network.guaxene_com_energia}
          solar={inp.solar_guaxene_ativo} solarAtivo={inp.solar_guaxene_ativo && !inp.edm_guaxene && solarComSol} />

        {/* Guaxene isolada */}
        {local === 'Nenhum' && (
          <g transform={`translate(${P.gua.x},${P.gua.y - 120})`} className="alerta-piscar">
            <rect x={-70} y={-16} width={140} height={26} rx={13} fill="#ef4444" />
            <text y={2} textAnchor="middle" fontSize={12} fontWeight={700} fill="white">GUAXENE ISOLADA</text>
          </g>
        )}
        {!network.hcm_com_energia && (
          <g transform={`translate(${P.hcm.x},${P.hcm.y - 130})`} className="alerta-piscar">
            <rect x={-60} y={-16} width={120} height={26} rx={13} fill="#991b1b" />
            <text y={2} textAnchor="middle" fontSize={12} fontWeight={700} fill="white">HCM SEM ENERGIA</text>
          </g>
        )}
      </svg>

      {/* Legenda */}
      <div className="absolute bottom-2 right-3 bg-white/90 rounded-md shadow-sm px-2.5 py-1.5 text-[10px] text-gray-600 flex gap-3">
        <span className="flex items-center gap-1"><span className="w-4 h-0.5" style={{ background: cor }} /> em uso</span>
        <span className="flex items-center gap-1"><span className="w-4 border-t-2 border-dotted border-slate-300" /> em espera</span>
        <span className="flex items-center gap-1"><span className="w-4 border-t-2 border-dashed border-red-500" /> em falha</span>
      </div>
    </div>
  );
}
