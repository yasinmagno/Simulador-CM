import { useState } from 'react';
import dynamic from 'next/dynamic';
import clsx from 'clsx';

const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-gray-100">
      <p className="text-sm text-gray-400">A carregar mapa…</p>
    </div>
  ),
});

const CesiumView = dynamic(() => import('./CesiumView'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-gray-900">
      <p className="text-sm text-gray-400">A carregar visualização 3D…</p>
    </div>
  ),
});

type MapMode = '2d' | '3d';

export function MapView() {
  const [mapMode, setMapMode] = useState<MapMode>('2d');

  return (
    <div className="h-full w-full relative">
      {/* Toggle 2D / 3D */}
      <div className="absolute top-2 right-2 z-[1000] flex gap-0.5 bg-white/90 rounded-md shadow-sm border border-gray-200 p-0.5">
        {(['2d', '3d'] as MapMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMapMode(m)}
            className={clsx(
              'px-2.5 py-0.5 rounded text-xs font-semibold transition-all',
              mapMode === m
                ? 'bg-blue-600 text-white shadow'
                : 'text-gray-500 hover:text-gray-800'
            )}
          >
            {m.toUpperCase()}
          </button>
        ))}
      </div>

      {mapMode === '2d' ? <LeafletMap /> : <CesiumView />}
    </div>
  );
}
