import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Plane } from 'lucide-react';
import { useSimulation } from '@/store/simulation';
import { STATE_HEX as STATE_COLOR } from '@/lib/estado';

// Injectar CSS do Cesium uma vez
let cesiumCssInjected = false;
function injectCesiumCss() {
  if (cesiumCssInjected || typeof document === 'undefined') return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/cesium/Widgets/widgets.css';
  document.head.appendChild(link);
  cesiumCssInjected = true;
}

/*
 * O Cesium é carregado já compilado (/cesium/Cesium.js, copiado pelo postinstall) em vez de
 * passar pelo webpack: o 3D abre mais depressa e o servidor de desenvolvimento fica muito
 * mais leve. O pacote `cesium` continua a ser usado para os tipos e para copiar os ficheiros.
 */
type CesiumModule = typeof import('cesium');
let cesiumPromise: Promise<CesiumModule> | null = null;
function loadCesium(): Promise<CesiumModule> {
  if (cesiumPromise) return cesiumPromise;
  cesiumPromise = new Promise<CesiumModule>((resolve, reject) => {
    const w = window as unknown as { Cesium?: CesiumModule; CESIUM_BASE_URL?: string };
    if (w.Cesium) return resolve(w.Cesium);
    w.CESIUM_BASE_URL = '/cesium';
    const script = document.createElement('script');
    script.src = '/cesium/Cesium.js';
    script.async = true;
    script.onload = () => (w.Cesium ? resolve(w.Cesium) : reject(new Error('Cesium.js carregado sem a global Cesium')));
    script.onerror = () => {
      cesiumPromise = null; // permite tentar outra vez
      reject(new Error('Falha a carregar /cesium/Cesium.js — correr "npm install" no frontend'));
    };
    document.head.appendChild(script);
  });
  return cesiumPromise;
}

// Coordenadas em graus decimais
const HCM_LON =  32.58889;
const HCM_LAT = -25.96897;
const HCM_ALT =  35;        // antena: 20 m base + 15 m torre (ilustrativo)

const GUA_LON =  32.55694;
const GUA_LAT = -25.98556;
const GUA_ALT =  15;        // antena: 5 m base + 10 m torre (ilustrativo)

const BTS_LON = 32.573;     // estação-base 4G/5G (posição ilustrativa)
const BTS_LAT = -25.99;
const BTS_ALT = 30;

const LINK_M = 3690;

// Direcção do enlace no referencial local Este-Norte (para orientar o elipsóide de Fresnel)
const MID_LAT_RAD = ((HCM_LAT + GUA_LAT) / 2) * Math.PI / 180;
const D_ESTE  = (GUA_LON - HCM_LON) * 111_320 * Math.cos(MID_LAT_RAD);
const D_NORTE = (GUA_LAT - HCM_LAT) * 110_574;
// Heading do Cesium roda no sentido horário a partir de Este
const HEADING_ENLACE = -Math.atan2(D_NORTE, D_ESTE);
// Rumo da câmara (a partir de Norte, sentido horário) de HCM para Guaxene
const RUMO_ENLACE = Math.atan2(D_ESTE, D_NORTE);
const M_POR_GRAU_LON = 111_320 * Math.cos(MID_LAT_RAD);
const M_POR_GRAU_LAT = 110_574;

/**
 * Ponto ao longo do enlace: t = fracção do percurso (0 = HCM, 1 = Guaxene, <0 atrás do HCM),
 * lateral = metros para o lado da baía (à esquerda de quem vai do HCM para Guaxene).
 */
function pontoEnlace(t: number, lateral: number): [number, number] {
  const ux = D_ESTE / LINK_M, uy = D_NORTE / LINK_M;
  const este = t * D_ESTE - uy * lateral;
  const norte = t * D_NORTE + ux * lateral;
  return [HCM_LON + este / M_POR_GRAU_LON, HCM_LAT + norte / M_POR_GRAU_LAT];
}

/** Assinatura do que a cena 3D mostra: só se redesenha quando muda (não a cada hora da linha temporal). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function assinaturaCena(r: any, exagero: number): string {
  const inp = r?.input ?? {};
  const net = r?.network ?? {};
  const lb = r?.link_budget ?? {};
  return [
    exagero, net.estado, net.caminho_local, net.caminho_externo, net.hcm_com_energia, net.guaxene_com_energia,
    inp.ptp_ativo, inp.g4_local_disponivel, inp.satelite_ativo, lb.modulacao_selecionada, lb.capacidade_mbps,
    lb.fresnel_max_m, r?.fresnel?.todos_ok, r?.fresnel?.pontos?.length ?? 0,
  ].join('|');
}

// Perfil do terreno ao longo do enlace — usa as elevações devolvidas pelo backend
// (project_config.json), as mesmas do gráfico do perfil e do cálculo de Fresnel.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeTerrainProfile(result: any): { lon: number; lat: number; alt: number }[] {
  const pontos: { distancia_m: number; h_terreno_m: number }[] = result?.fresnel?.pontos ?? [];
  return pontos.map((p) => {
    const t = p.distancia_m / LINK_M;
    return {
      lon: HCM_LON + t * (GUA_LON - HCM_LON),
      lat: HCM_LAT + t * (GUA_LAT - HCM_LAT),
      alt: p.h_terreno_m,
    };
  });
}

const EXAGEROS = [1, 5, 10];

export default function CesiumView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<unknown>(null);
  const { result, mode } = useSimulation();
  const [exagero, setExagero] = useState(5);
  const exageroRef = useRef(exagero);
  exageroRef.current = exagero;

  const assinaturaRef = useRef('');

  // Inicializar viewer uma vez
  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;
    // O import é assíncrono: se o componente for desmontado antes (ou o React Strict Mode
    // repetir o efeito), não se cria o viewer — evita dois viewers no mesmo contentor.
    let cancelado = false;

    injectCesiumCss();

    // Carregar o Cesium (script pré-compilado, uma vez)
    loadCesium().then((Cesium) => {
      if (cancelado || !containerRef.current) return;
      // Sem token Ion — usar terreno elipsoide (offline)
      Cesium.Ion.defaultAccessToken = '';

      const viewer = new Cesium.Viewer(containerRef.current!, {
        // Sem camada base por omissão: a de origem é do Ion e pede token (erro 401)
        baseLayer: false,
        terrainProvider: new Cesium.EllipsoidTerrainProvider(),
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        animation: false,
        timeline: false,
        fullscreenButton: false,
        infoBox: false,
        selectionIndicator: false,
      });

      // Base offline (NaturalEarth) e, por cima, OpenStreetMap quando há Internet.
      // API Cesium ≥1.110: fromProviderAsync em vez de addImageryProvider (removido).
      viewer.imageryLayers.removeAll();
      viewer.imageryLayers.add(Cesium.ImageryLayer.fromProviderAsync(
        Cesium.SingleTileImageryProvider.fromUrl('/cesium/Assets/Textures/NaturalEarthII/0/0/0.jpg', {
          rectangle: Cesium.Rectangle.fromDegrees(-180, -90, 180, 90),
        }),
        {},
      ));
      viewer.imageryLayers.add(Cesium.ImageryLayer.fromProviderAsync(
        Cesium.OpenStreetMapImageryProvider.fromUrl('https://tile.openstreetmap.org/'),
        {},
      ));

      // Créditos do Cesium escondidos; a atribuição do OpenStreetMap (obrigatória) é mostrada à parte
      (viewer.cesiumWidget.creditContainer as HTMLElement).style.display = 'none';

      // 30 fps chegam para os pacotes animados e reduzem para metade o uso de GPU/CPU
      viewer.targetFrameRate = 30;

      viewerRef.current = viewer;
      const r0 = useSimulation.getState().result;
      drawScene(viewer, Cesium, r0, exageroRef.current);
      assinaturaRef.current = assinaturaCena(r0, exageroRef.current);
      // Começa já na vista lateral do enlace (zoomTo a todas as entidades incluía o satélite a 6 km)
      vistaGeral(viewer, Cesium, 0);
      // No modo apresentação, começa com um voo ao longo do enlace
      if (useSimulation.getState().mode === 'apresentacao') flyThrough(viewer, Cesium);
    }).catch((err) => {
      console.error('Cesium load error:', err?.message ?? err);
    });

    return () => {
      cancelado = true;
      if (viewerRef.current) {
        (viewerRef.current as { destroy: () => void }).destroy();
        viewerRef.current = null;
      }
    };
  }, []);

  // Re-desenhar a cena só quando muda algo visível (a câmara mantém-se). Na linha temporal o
  // resultado muda a cada hora (baterias), mas a cena 3D quase sempre fica igual.
  useEffect(() => {
    if (!viewerRef.current) return;
    const assinatura = assinaturaCena(result, exagero);
    if (assinatura === assinaturaRef.current) return;
    assinaturaRef.current = assinatura;
    loadCesium().then((Cesium) => {
      const viewer = viewerRef.current as { entities: { removeAll: () => void }; isDestroyed: () => boolean } | null;
      if (!viewer || viewer.isDestroyed()) return;
      viewer.entities.removeAll();
      drawScene(viewer, Cesium, result, exagero);
    });
  }, [result, exagero]);

  const voar = () => {
    if (!viewerRef.current) return;
    loadCesium().then((Cesium) => flyThrough(viewerRef.current, Cesium));
  };

  return (
    <div className="h-full w-full relative overflow-hidden">
      <div ref={containerRef} className="absolute inset-0 bg-gray-900" />
      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
        <button
          onClick={voar}
          className="flex items-center gap-1 bg-white/90 rounded-md shadow-sm border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-700 hover:text-blue-700"
        >
          <Plane className="w-3 h-3" /> Voar pelo enlace
        </button>
        <div className="bg-white/90 rounded-md shadow-sm border border-gray-200 px-2 py-1 text-[10px] text-gray-600">
          <span className="block mb-0.5">Exagero vertical</span>
          <div className="flex gap-0.5">
            {EXAGEROS.map((e) => (
              <button key={e} onClick={() => setExagero(e)}
                className={clsx('px-1.5 py-0.5 rounded font-semibold',
                  exagero === e ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100')}>
                ×{e}
              </button>
            ))}
          </div>
          {mode === 'engenharia' && exagero > 1 && (
            <span className="block mt-0.5 text-amber-600">alturas e Fresnel ×{exagero} (só visual)</span>
          )}
        </div>
      </div>
      <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer"
        className="absolute bottom-1 right-1 z-10 bg-white/80 rounded px-1.5 py-0.5 text-[10px] text-gray-600 hover:text-blue-700">
        © OpenStreetMap
      </a>
    </div>
  );
}

// Posição ao longo de uma polilinha (fracção 0..1), para animar pacotes
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function lerpPath(Cesium: any, pts: any[], f: number) {
  const segs = pts.length - 1;
  const x = Math.min(Math.max(f, 0), 0.9999) * segs;
  const i = Math.floor(x);
  return Cesium.Cartesian3.lerp(pts[i], pts[i + 1], x - i, new Cesium.Cartesian3());
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addPackets(viewer: any, Cesium: any, id: string, pts: any[], color: any, durS: number, n: number) {
  for (let k = 0; k < n; k++) {
    for (const dir of [1, -1]) {
      viewer.entities.add({
        id: `${id}-pkt-${k}-${dir}`,
        position: new Cesium.CallbackProperty(() => {
          const f = ((Date.now() / 1000 / durS) + k / n + (dir < 0 ? 0.5 / n : 0)) % 1;
          return lerpPath(Cesium, pts, dir > 0 ? f : 1 - f);
        }, false),
        point: {
          pixelSize: dir > 0 ? 9 : 7,
          color: dir > 0 ? color : Cesium.Color.WHITE,
          outlineColor: dir > 0 ? Cesium.Color.WHITE : color,
          outlineWidth: 2,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function flyThrough(viewer: any, Cesium: any) {
  // 1) acima e ao lado do HCM, a olhar para Guaxene (a zona de Fresnel vê-se de lado, não por dentro);
  // 2) desliza ao longo do enlace até perto de Guaxene, com a EPC sempre à frente;
  // 3) termina na vista lateral de todo o enlace.
  viewer.camera.cancelFlight();
  const rumo = RUMO_ENLACE + 0.15; // ligeiramente virado para o enlace, que fica à direita da câmara
  const [lon1, lat1] = pontoEnlace(-0.15, 350);
  const [lon2, lat2] = pontoEnlace(0.62, 350);
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(lon1, lat1, 420),
    orientation: { heading: rumo, pitch: Cesium.Math.toRadians(-14), roll: 0 },
    duration: 2.5,
    complete: () => {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(lon2, lat2, 380),
        orientation: { heading: rumo + 0.1, pitch: Cesium.Math.toRadians(-20), roll: 0 },
        duration: 5,
        easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT,
        complete: () => vistaGeral(viewer, Cesium, 3),
      });
    },
  });
}

/** Vista lateral de todo o enlace, a partir da baía (HCM à direita, Guaxene à esquerda). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function vistaGeral(viewer: any, Cesium: any, duracao: number) {
  const mid = Cesium.Cartesian3.fromDegrees((HCM_LON + GUA_LON) / 2, (HCM_LAT + GUA_LAT) / 2, 0);
  viewer.camera.flyToBoundingSphere(new Cesium.BoundingSphere(mid, 2200), {
    offset: new Cesium.HeadingPitchRange(RUMO_ENLACE + Math.PI / 2, Cesium.Math.toRadians(-28), 5600),
    duration: duracao,
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function drawScene(viewer: any, Cesium: any, result: any, exagero: number) {
  const estado = result?.network?.estado ?? 'NORMAL';
  const cor = STATE_COLOR[estado] ?? '#22c55e';
  const cesiumColor = Cesium.Color.fromCssColorString(cor);
  const caminhoLocal = result?.network?.caminho_local ?? 'PtP';
  const caminhoExterno = result?.network?.caminho_externo ?? 'ISP/fibra';
  const inp = result?.input ?? {};
  const E = exagero;

  const hcmPos = Cesium.Cartesian3.fromDegrees(HCM_LON, HCM_LAT, HCM_ALT * E);
  const guaPos = Cesium.Cartesian3.fromDegrees(GUA_LON, GUA_LAT, GUA_ALT * E);
  const btsPos = Cesium.Cartesian3.fromDegrees(BTS_LON, BTS_LAT, BTS_ALT * E);

  // A legenda fica por cima do marcador, com fundo, para não tapar a linha nem ser cortada nas margens
  const marcador = (id: string, pos: unknown, texto: string, bg: string, legenda: string, comEnergia: boolean) =>
    viewer.entities.add({
      id,
      position: pos,
      billboard: {
        image: buildLabel(texto, comEnergia ? bg : '#475569'),
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: {
        text: comEnergia ? legenda : `${legenda} — SEM ENERGIA`,
        font: '12px sans-serif',
        fillColor: comEnergia ? Cesium.Color.WHITE : Cesium.Color.fromCssColorString('#fca5a5'),
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        showBackground: true,
        backgroundColor: Cesium.Color.fromCssColorString('#0f172a').withAlpha(0.65),
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -32),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });

  marcador('hcm', hcmPos, 'HCM', '#1d4ed8', 'Hospital Central de Maputo', result?.network?.hcm_com_energia ?? true);
  marcador('guaxene', guaPos, 'EPC', '#15803d', 'EPC Guaxene — KaTembe', result?.network?.guaxene_com_energia ?? true);

  // Mastros
  for (const [id, lon, lat, alt] of [['m-hcm', HCM_LON, HCM_LAT, HCM_ALT], ['m-gua', GUA_LON, GUA_LAT, GUA_ALT]] as const) {
    viewer.entities.add({
      id,
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArrayHeights([lon, lat, 0, lon, lat, alt * E]),
        width: 3,
        material: Cesium.Color.fromCssColorString('#475569'),
      },
    });
  }

  // ── Linha LOS / enlace PtP ──
  const ptpAtivo = inp.ptp_ativo ?? true;
  const ptpEmUso = caminhoLocal === 'PtP';
  viewer.entities.add({
    id: 'los',
    polyline: {
      positions: [hcmPos, guaPos],
      width: ptpEmUso ? 5 : 2,
      material: ptpEmUso
        ? new Cesium.PolylineGlowMaterialProperty({ color: cesiumColor, glowPower: 0.25 })
        : new Cesium.PolylineDashMaterialProperty({
            color: ptpAtivo ? Cesium.Color.GRAY.withAlpha(0.6) : Cesium.Color.RED.withAlpha(0.7),
            dashLength: 16,
          }),
    },
  });
  if (ptpEmUso) {
    const mod = result?.link_budget?.modulacao_selecionada;
    const n = mod ? ['QPSK_MIMO', '16QAM_MIMO', '64QAM', '256QAM', '1024QAM'].indexOf(mod) + 2 : 2;
    const cap = Math.max(result?.link_budget?.capacidade_mbps ?? 121.6, 1);
    addPackets(viewer, Cesium, 'ptp', [hcmPos, guaPos], cesiumColor, 2.5 * Math.sqrt(121.6 / cap), n);
  }

  // ── Estação-base 4G/5G e caminho local alternativo ──
  const g4Ok = inp.g4_local_disponivel ?? true;
  viewer.entities.add({
    id: 'bts',
    position: btsPos,
    billboard: {
      image: buildLabel(g4Ok ? '4G' : '✕', g4Ok ? '#475569' : '#ef4444'),
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  });
  viewer.entities.add({
    id: 'g4-local',
    polyline: {
      positions: [hcmPos, btsPos, guaPos],
      width: caminhoLocal === '4G/5G' ? 4 : 1.5,
      material: caminhoLocal === '4G/5G'
        ? new Cesium.PolylineGlowMaterialProperty({ color: cesiumColor, glowPower: 0.2 })
        : new Cesium.PolylineDashMaterialProperty({
            color: g4Ok ? Cesium.Color.GRAY.withAlpha(0.4) : Cesium.Color.RED.withAlpha(0.6),
            dashLength: 12,
          }),
    },
  });
  if (caminhoLocal === '4G/5G') addPackets(viewer, Cesium, 'g4', [hcmPos, btsPos, guaPos], cesiumColor, 3.5, 3);

  // ── Satélite de contingência (posição estilizada acima do HCM) ──
  if (inp.satelite_ativo !== false) {
    const satPos = Cesium.Cartesian3.fromDegrees(HCM_LON + 0.03, HCM_LAT + 0.02, 6000);
    const satEmUso = caminhoExterno === 'Satélite';
    viewer.entities.add({
      id: 'sat',
      position: satPos,
      billboard: {
        image: buildLabel('SAT', satEmUso ? cor : '#64748b'),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });
    viewer.entities.add({
      id: 'sat-link',
      polyline: {
        positions: [hcmPos, satPos],
        width: satEmUso ? 3 : 1,
        material: satEmUso
          ? new Cesium.PolylineGlowMaterialProperty({ color: cesiumColor, glowPower: 0.2 })
          : new Cesium.PolylineDashMaterialProperty({ color: Cesium.Color.GRAY.withAlpha(0.35), dashLength: 20 }),
      },
    });
    if (satEmUso) addPackets(viewer, Cesium, 'sat', [hcmPos, satPos], cesiumColor, 5, 2);
  }

  // ── Perfil do terreno ──
  const terreno = makeTerrainProfile(result);
  const posTerrain: number[] = [];
  terreno.forEach((p) => posTerrain.push(p.lon, p.lat, p.alt * E));
  if (terreno.length > 1) viewer.entities.add({
    id: 'terrain-profile',
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArrayHeights(posTerrain),
      width: 3,
      material: Cesium.Color.fromCssColorString('#6b7280').withAlpha(0.7),
    },
  });

  // ── Primeira zona de Fresnel: elipsóide orientado ao longo do enlace ──
  const fresnelR = result?.link_budget?.fresnel_max_m ?? 6.91;
  const fresnelOk = result?.fresnel?.todos_ok ?? true;
  const corFresnel = fresnelOk ? '#3b82f6' : '#ef4444';
  const centro = Cesium.Cartesian3.fromDegrees(
    (HCM_LON + GUA_LON) / 2, (HCM_LAT + GUA_LAT) / 2, ((HCM_ALT + GUA_ALT) / 2) * E,
  );
  const inclinacao = Math.atan2((GUA_ALT - HCM_ALT) * E, LINK_M);
  viewer.entities.add({
    id: 'fresnel-zone',
    position: centro,
    orientation: Cesium.Transforms.headingPitchRollQuaternion(
      centro, new Cesium.HeadingPitchRoll(HEADING_ENLACE, inclinacao, 0),
    ),
    ellipsoid: {
      radii: new Cesium.Cartesian3(LINK_M / 2, fresnelR * E, fresnelR * E),
      material: Cesium.Color.fromCssColorString(corFresnel).withAlpha(ptpEmUso ? 0.18 : 0.07),
      outline: true,
      outlineColor: Cesium.Color.fromCssColorString(corFresnel).withAlpha(0.35),
      slicePartitions: 24,
      stackPartitions: 12,
    },
  });
}

// Helper: gerar canvas PNG com label para billboard
function buildLabel(text: string, bg: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 48;
  canvas.height = 28;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(0, 0, 48, 28, 6);
  ctx.fill();
  ctx.fillStyle = 'white';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 24, 14);
  return canvas;
}
