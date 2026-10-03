import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
// LeafletMap type not used at runtime — removed to avoid name conflict
import { useSimulation } from '@/store/simulation';
import { STATE_HEX as STATE_COLOR } from '@/lib/estado';

const HCM_POS:    [number, number] = [-25.96897, 32.58889];
const GUAXENE_POS:[number, number] = [-25.98556, 32.55694];
const CENTER:     [number, number] = [-25.977, 32.573];

const BTS_POS:    [number, number] = [-25.99, 32.573];

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

    // — Enlace PtP (tracejado a correr quando é o caminho em uso) —
    if (ptpAtivo) {
      L.polyline([HCM_POS, GUAXENE_POS], {
        color: cor,
        weight: caminho === 'PtP' ? 5 : 2,
        opacity: caminho === 'PtP' ? 0.95 : 0.4,
        dashArray: caminho === 'PtP' ? '12 12' : '6 4',
        className: caminho === 'PtP' ? 'leaflet-link-ativo' : undefined,
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
      L.polyline([HCM_POS, BTS_POS, GUAXENE_POS], {
        color: caminho === '4G/5G' ? cor : '#6b7280',
        weight: caminho === '4G/5G' ? 4 : 1.5,
        opacity: caminho === '4G/5G' ? 0.9 : 0.3,
        dashArray: caminho === '4G/5G' ? '12 12' : '8 5',
        className: caminho === '4G/5G' ? 'leaflet-link-ativo' : undefined,
      })
        .bindTooltip(`4G/5G${caminho === '4G/5G' ? ' (ativo)' : ''}`, { sticky: true })
        .addTo(lg);
    }

    // — Estação-base 4G/5G (ilustrativa) —
    const btsOk = g4Ativo || (result?.input?.g4_externo_disponivel ?? true);
    L.marker(BTS_POS, {
      icon: L.divIcon({
        className: '',
        html: `<div class="marker-bts${btsOk ? '' : ' falha'}" title="BTS 4G/5G">${btsOk ? '4G' : '✕'}</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      }),
    }).bindTooltip(`BTS 4G/5G (posição ilustrativa) — ${btsOk ? 'operacional' : 'em falha'}`).addTo(lg);

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
