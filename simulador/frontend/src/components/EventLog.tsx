import clsx from 'clsx';
import { useSimulation } from '@/store/simulation';

const TIPO_COLOR: Record<string, string> = {
  INFO:  'text-blue-600 bg-blue-50',
  AVISO: 'text-orange-600 bg-orange-50',
  ERRO:  'text-red-600 bg-red-50',
};

export function EventLog() {
  const { result } = useSimulation();
  const eventos = result?.eventos ?? [];

  return (
    <div className="bg-white border-t border-gray-200 overflow-hidden flex flex-col">
      <div className="px-4 py-2 border-b border-gray-100">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Registo de Eventos
          {eventos.length > 0 && (
            <span className="ml-2 text-gray-400 font-normal">({eventos.length})</span>
          )}
        </h3>
      </div>
      <div className="overflow-y-auto flex-1 max-h-28">
        {eventos.length === 0 ? (
          <p className="px-4 py-3 text-xs text-gray-400">Sem eventos. Execute um cenário.</p>
        ) : (
          <table className="w-full text-xs">
            <tbody>
              {[...eventos].reverse().map((ev, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-3 py-1 text-gray-400 whitespace-nowrap w-16">
                    t={ev.tempo_h.toFixed(1)}h
                  </td>
                  <td className="px-2 py-1 w-16">
                    <span className={clsx('px-1.5 py-0.5 rounded text-xs font-medium', TIPO_COLOR[ev.tipo] ?? 'text-gray-600 bg-gray-100')}>
                      {ev.tipo}
                    </span>
                  </td>
                  <td className="px-2 py-1 text-gray-700">{ev.mensagem}</td>
                  <td className="px-3 py-1 text-gray-400 whitespace-nowrap">{ev.componente ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
