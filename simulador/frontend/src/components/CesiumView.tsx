import { useEffect, useRef } from 'react';
import { useSimulation } from '@/store/simulation';

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

const STATE_COLOR: Record<string, string> = {
  'NORMAL':     '#22c55e',
  'DEGRADADO':  '#eab308',
  'EMERGÊNCIA': '#f97316',
  'CRÍTICO':    '#ef4444',
  'FALHA':      '#991b1b',
};

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

export default function CesiumView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<unknown>(null);
  const { result } = useSimulation();

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

      // imageryProvider não faz parte de ViewerOptions no Cesium ≥1.104 — usar ImageryLayerCollection após init
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

      // Substituir camada base por tile offline
      viewer.imageryLayers.removeAll();
      viewer.imageryLayers.addImageryProvider(
        new Cesium.SingleTileImageryProvider({
          url: '/cesium/Assets/Textures/NaturalEarthII/0/0/0.jpg',
          rectangle: Cesium.Rectangle.fromDegrees(-180, -90, 180, 90),
        })
      );

      // Desligar créditos de ecrã
      (viewer.cesiumWidget.creditContainer as HTMLElement).style.display = 'none';

      viewerRef.current = viewer;
      drawScene(viewer, Cesium, result);
    }).catch((err) => {
      console.error('Cesium load error:', err);
    });

    return () => {
      if (viewerRef.current) {
        (viewerRef.current as { destroy: () => void }).destroy();
        viewerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-desenhar cena quando result muda
  useEffect(() => {
    if (!viewerRef.current) return;
    import('cesium').then((Cesium) => {
      const viewer = viewerRef.current as { entities: { removeAll: () => void }; zoomTo: (e: unknown) => void };
      viewer.entities.removeAll();
      drawScene(viewer as unknown, Cesium, result);
    });
  }, [result]);

  return (
    <div ref={containerRef} className="h-full w-full bg-gray-900" />
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function drawScene(viewer: any, Cesium: any, result: any) {
  const estado = result?.network?.estado ?? 'NORMAL';
  const cor = STATE_COLOR[estado] ?? '#22c55e';
  const cesiumColor = Cesium.Color.fromCssColorString(cor);

  // ── Marcador HCM ──
  viewer.entities.add({
    id: 'hcm',
    position: Cesium.Cartesian3.fromDegrees(HCM_LON, HCM_LAT, HCM_ALT),
    billboard: {
      image: buildLabel('HCM', '#1d4ed8'),
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      heightReference: Cesium.HeightReference.NONE,
      scale: 1.0,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
    label: {
      text: 'Hospital Central de Maputo',
      font: '12px sans-serif',
      fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 2,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: Cesium.VerticalOrigin.TOP,
      pixelOffset: new Cesium.Cartesian2(0, 8),
      heightReference: Cesium.HeightReference.NONE,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  });

  // ── Marcador Guaxene ──
  viewer.entities.add({
    id: 'guaxene',
    position: Cesium.Cartesian3.fromDegrees(GUA_LON, GUA_LAT, GUA_ALT),
    billboard: {
      image: buildLabel('EPC', '#15803d'),
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      heightReference: Cesium.HeightReference.NONE,
      scale: 1.0,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
    label: {
      text: 'EPC Guaxene — KaTembe',
      font: '12px sans-serif',
      fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 2,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: Cesium.VerticalOrigin.TOP,
      pixelOffset: new Cesium.Cartesian2(0, 8),
      heightReference: Cesium.HeightReference.NONE,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  });

  // ── Linha LOS ──
  const ptpAtivo = result?.input?.ptp_ativo ?? true;
  viewer.entities.add({
    id: 'los',
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArrayHeights([
        HCM_LON, HCM_LAT, HCM_ALT,
        GUA_LON, GUA_LAT, GUA_ALT,
      ]),
      width: ptpAtivo ? 4 : 2,
      material: new Cesium.PolylineOutlineMaterialProperty({
        color: ptpAtivo ? cesiumColor : Cesium.Color.RED.withAlpha(0.5),
        outlineColor: Cesium.Color.BLACK.withAlpha(0.3),
        outlineWidth: 1,
      }),
      clampToGround: false,
    },
  });

  // ── Perfil do terreno ──
  const terreno = makeTerrainProfile();
  // Extrude paredes de terreno
  const posCorredor: number[] = [];
  terreno.forEach((p) => posCorredor.push(p.lon, p.lat, 0, p.lon, p.lat, p.alt));

  // Linha do terreno (polilinha a nível do terreno)
  const posTerrain: number[] = [];
  terreno.forEach((p) => posTerrain.push(p.lon, p.lat, p.alt));
  viewer.entities.add({
    id: 'terrain-profile',
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArrayHeights(posTerrain),
      width: 3,
      material: Cesium.Color.fromCssColorString('#6b7280').withAlpha(0.7),
      clampToGround: false,
    },
  });

  // ── Zona de Fresnel (cilindro elipsoide simplificado — 6.91 m de raio máx.) ──
  const fresnelR = result?.link_budget?.fresnel_max_m ?? 6.91;
  const fresnelOk = result?.fresnel?.todos_ok ?? true;
  const fresnelColor = fresnelOk
    ? Cesium.Color.fromCssColorString('#3b82f6').withAlpha(0.15)
    : Cesium.Color.fromCssColorString('#ef4444').withAlpha(0.15);

  // Aproximação: esferoide achatado ao longo do eixo LOS
  const midLon = (HCM_LON + GUA_LON) / 2;
  const midLat = (HCM_LAT + GUA_LAT) / 2;
  const midAlt = (HCM_ALT + GUA_ALT) / 2;

  viewer.entities.add({
    id: 'fresnel-zone',
    position: Cesium.Cartesian3.fromDegrees(midLon, midLat, midAlt),
    ellipsoid: {
      radii: new Cesium.Cartesian3(
        3690 / 2,          // semi-eixo ao longo do enlace (metade da distância)
        fresnelR,          // semi-eixo transversal
        fresnelR,          // semi-eixo vertical
      ),
      material: fresnelColor,
      outline: true,
      outlineColor: Cesium.Color.fromCssColorString('#3b82f6').withAlpha(0.3),
      outlineWidth: 1,
    },
  });

  // ── Câmera: zoom ao corredor do enlace ──
  viewer.zoomTo(viewer.entities);
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
