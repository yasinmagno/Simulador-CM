import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
// LeafletMap type not used at runtime — removed to avoid name conflict
import { useSimulation } from '@/store/simulation';

const HCM_POS:    [number, number] = [-25.96897, 32.58889];
const GUAXENE_POS:[number, number] = [-25.98556, 32.55694];
const CENTER:     [number, number] = [-25.977, 32.573];

const STATE_COLOR: Record<string, string> = {
  'NORMAL':     '#22c55e',
  'DEGRADADO':  '#eab308',
  'EMERGÊNCIA': '#f97316',
  'CRÍTICO':    '#ef4444',
  'FALHA':      '#991b1b',
};

/* Camada de overlays imperativa — sem hooks de ciclo de vida extra */
function MapOverlays() {
  const L = (typeof window !== 'undefined') ? require('leaflet') : null;
  const map = useMap();
  const layersRef = useRef<ReturnType<typeof L.layerGroup> | null>(null);
  const { result } = useSimulation();

  useEffect(() => {
    if (!L) return;

    if (layersRef.current) {
      layersRef.current.clearLayers();
    } else {
      layersRef.current = L.layerGroup().addTo(map);
    }

    const lg = layersRef.current;
    const estado = result?.network?.estado ?? 'NORMAL';
    const caminho = result?.network?.caminho_local ?? 'PtP';
    const ptpAtivo = result?.input?.ptp_ativo ?? true;
    const g4Ativo  = result?.input?.g4_local_disponivel ?? true;
    const cor      = STATE_COLOR[estado] ?? '#22c55e';

    // — Marcador HCM —
    const hcmIcon = L.divIcon({
      className: '',
      html: `<div class="marker-hcm" title="Hospital Central de Maputo">HCM</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
    L.marker(HCM_POS, { icon: hcmIcon })
      .bindPopup('<b>Hospital Central de Maputo</b><br>Lat: -25.96897 | Lon: 32.58889')
      .addTo(lg);

    // — Marcador Guaxene —
    const gIcon = L.divIcon({
      className: '',
      html: `<div class="marker-guaxene" title="EPC Guaxene">EPC</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
    L.marker(GUAXENE_POS, { icon: gIcon })
      .bindPopup('<b>EPC Guaxene — KaTembe</b><br>Lat: -25.98556 | Lon: 32.55694')
      .addTo(lg);

    // — Enlace PtP —
    if (ptpAtivo) {
      L.polyline([HCM_POS, GUAXENE_POS], {
        color: cor,
        weight: caminho === 'PtP' ? 4 : 2,
        opacity: caminho === 'PtP' ? 0.9 : 0.4,
        dashArray: caminho === 'PtP' ? undefined : '6 4',
      })
        .bindTooltip(`PtP — ${estado}${caminho === 'PtP' ? ' (ativo)' : ''}`, { sticky: true })
        .addTo(lg);
    } else {
      // PtP inativo — linha a vermelho a tracejado
      L.polyline([HCM_POS, GUAXENE_POS], {
        color: '#ef4444', weight: 2, opacity: 0.5, dashArray: '4 6',
      }).bindTooltip('PtP — Inativo').addTo(lg);
    }

    // — Caminho 4G/5G (linha auxiliar ligeiramente curvada visualmente) —
    if (g4Ativo) {
      // ponto intermédio desviado para sul para criar aparência de caminho diferente
      const mid: [number, number] = [-25.99, 32.573];
      L.polyline([HCM_POS, mid, GUAXENE_POS], {
        color: caminho === '4G/5G' ? cor : '#6b7280',
        weight: caminho === '4G/5G' ? 3 : 1.5,
        opacity: caminho === '4G/5G' ? 0.85 : 0.3,
        dashArray: '8 5',
      })
        .bindTooltip(`4G/5G${caminho === '4G/5G' ? ' (ativo)' : ''}`, { sticky: true })
        .addTo(lg);
    }

    // — Legenda simples —
    const legend = L.control({ position: 'bottomleft' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div', '');
      div.style.cssText = 'background:white;padding:6px 10px;border-radius:6px;font-size:11px;box-shadow:0 1px 4px rgba(0,0,0,.2);line-height:1.8';
      div.innerHTML = `
        <div style="font-weight:700;margin-bottom:2px;color:#374151">Estado: <span style="color:${cor}">${estado}</span></div>
        <div>🔵 HCM · 🟢 Guaxene</div>
        <div>━ PtP &nbsp; ╌ 4G/5G</div>
      `;
      return div;
    };
    legend.addTo(map);

    return () => { legend.remove(); };
  }, [result, map, L]);

  return null;
}

export default function LeafletMap() {
  return (
    <MapContainer
      center={CENTER}
      zoom={13}
      className="h-full w-full"
      zoomControl={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        // fallback sem internet: tiles não carregam mas o mapa permanece funcional
      />
      <MapOverlays />
    </MapContainer>
  );
}
