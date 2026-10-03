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

// Pontos do perfil de terreno (50 amostras, lon interpolado)
const N_POINTS = 50;
function makeTerrainProfile(): { lon: number; lat: number; alt: number }[] {
  // Elevações ilustrativas do project_config.json
  const elevacoes = [
    20.0, 19.7, 19.2, 18.6, 18.0, 17.5, 17.2, 17.0, 16.8, 16.5,
    16.3, 16.2, 16.2, 16.3, 16.5, 16.8, 17.2, 17.8, 18.5, 19.0,
    19.3, 19.5, 19.4, 19.1, 18.7, 18.2, 17.8, 17.5, 17.3, 17.0,
    16.7, 16.4, 16.0, 15.6, 15.2, 14.8, 14.4, 14.0, 13.5, 13.0,
    12.4, 11.8, 11.2, 10.6, 10.0,  9.4,  8.7,  7.9,  6.8,  5.0,
  ];
  const pts = [];
  for (let i = 0; i < N_POINTS; i++) {
    const t = i / (N_POINTS - 1);
    pts.push({
      lon: HCM_LON + t * (GUA_LON - HCM_LON),
      lat: HCM_LAT + t * (GUA_LAT - HCM_LAT),
      alt: elevacoes[i] ?? 10,
    });
  }
  return pts;
}

const EXAGEROS = [1, 5, 10];

export default function CesiumView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<unknown>(null);
  const { result, mode } = useSimulation();
  const [exagero, setExagero] = useState(5);
  const exageroRef = useRef(exagero);
  exageroRef.current = exagero;

  // Inicializar viewer uma vez
  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    injectCesiumCss();
    // Definir base URL para assets
    (window as unknown as Record<string, unknown>)['CESIUM_BASE_URL'] = '/cesium';

    // Importar Cesium dinamicamente (já instalado)
    import('cesium').then((Cesium) => {
      // Sem token Ion — usar terreno elipsoide (offline)
      Cesium.Ion.defaultAccessToken = '';

      const viewer = new Cesium.Viewer(containerRef.current!, {
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

      // Base offline (NaturalEarth) e, por cima, OpenStreetMap quando há Internet
      viewer.imageryLayers.removeAll();
      // (no Cesium ≥1.104 o SingleTileImageryProvider cria-se com fromUrl)
      viewer.imageryLayers.add(Cesium.ImageryLayer.fromProviderAsync(
        Cesium.SingleTileImageryProvider.fromUrl('/cesium/Assets/Textures/NaturalEarthII/0/0/0.jpg', {
          rectangle: Cesium.Rectangle.fromDegrees(-180, -90, 180, 90),
        }),
        {},
      ));
      viewer.imageryLayers.addImageryProvider(
        new Cesium.OpenStreetMapImageryProvider({ url: 'https://tile.openstreetmap.org/' })
      );

      // Desligar créditos de ecrã
      (viewer.cesiumWidget.creditContainer as HTMLElement).style.display = 'none';

      viewerRef.current = viewer;
      drawScene(viewer, Cesium, useSimulation.getState().result, exageroRef.current);
      viewer.zoomTo(viewer.entities);
      // No modo apresentação, começa com um voo ao longo do enlace
      if (useSimulation.getState().mode === 'apresentacao') flyThrough(viewer, Cesium);
    }).catch((err) => {
      console.error('Cesium load error:', err?.message ?? err);
    });

    return () => {
      if (viewerRef.current) {
        (viewerRef.current as { destroy: () => void }).destroy();
        viewerRef.current = null;
      }
    };
  }, []);

  // Re-desenhar cena quando o resultado ou o exagero mudam (a câmara mantém-se)
  useEffect(() => {
    if (!viewerRef.current) return;
    import('cesium').then((Cesium) => {
      const viewer = viewerRef.current as { entities: { removeAll: () => void } };
      viewer.entities.removeAll();
      drawScene(viewer, Cesium, result, exagero);
    });
  }, [result, exagero]);

  const voar = () => {
    if (!viewerRef.current) return;
    import('cesium').then((Cesium) => flyThrough(viewerRef.current, Cesium));
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
  // 1) junto à antena do HCM, a olhar para Guaxene; 2) vista lateral de todo o enlace
  const headingCamera = Math.PI / 2 + HEADING_ENLACE; // heading da câmara é medido a partir de Norte
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(HCM_LON + 0.002, HCM_LAT + 0.001, 180),
    orientation: { heading: headingCamera, pitch: Cesium.Math.toRadians(-12), roll: 0 },
    duration: 2.5,
    complete: () => {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(GUA_LON - 0.004, GUA_LAT - 0.002, 260),
        orientation: { heading: headingCamera, pitch: Cesium.Math.toRadians(-20), roll: 0 },
        duration: 5,
        easingFunction: Cesium.EasingFunction.LINEAR_NONE,
        complete: () => {
          const mid = Cesium.Cartesian3.fromDegrees((HCM_LON + GUA_LON) / 2, (HCM_LAT + GUA_LAT) / 2, 0);
          viewer.camera.flyToBoundingSphere(new Cesium.BoundingSphere(mid, 2200), {
            offset: new Cesium.HeadingPitchRange(headingCamera + Math.PI / 2, Cesium.Math.toRadians(-25), 4200),
            duration: 3,
          });
        },
      });
    },
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
        verticalOrigin: Cesium.VerticalOrigin.TOP,
        pixelOffset: new Cesium.Cartesian2(0, 8),
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
  const terreno = makeTerrainProfile();
  const posTerrain: number[] = [];
  terreno.forEach((p) => posTerrain.push(p.lon, p.lat, p.alt * E));
  viewer.entities.add({
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
