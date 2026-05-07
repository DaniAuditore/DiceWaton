import { memo, useMemo } from 'react';
export type RollEvent = {
  id: string;
  playerName: string;
  diceType: string;
  result: number;
  timestamp: number;
  details?: string;
};

export const DiceLog = memo(function DiceLog({ logs, error }: { logs: RollEvent[]; error?: string | null }) {
  const renderedLogs = useMemo(
    () =>
      logs.map((log) => (
        <div key={log.id} className="bg-slate-800 p-3 rounded flex justify-between items-center animate-fade-in-down">
          <div>
            <span className="font-bold text-indigo-400">{log.playerName}</span>
            <span className="text-slate-400 text-sm ml-2">tiró {log.diceType}</span>
            {log.details ? <div className="text-xs text-slate-500 font-mono mt-1">{log.details}</div> : null}
          </div>
          <div className="text-2xl font-bold text-emerald-400">{log.result}</div>
        </div>
      )),
    [logs],
  );

  return (
    <div
      className="surface-panel surface-panel--compact h-64 overflow-y-auto flex flex-col gap-2"
      role="log"
      aria-live="polite"
      aria-relevant="additions text"
      aria-label="Registro de tiradas"
    >
      <h3 className="surface-panel__sticky-title text-lg font-semibold pb-2">Últimas tiradas</h3>
      {error ? <div role="alert" className="text-sm text-red-300">{error}</div> : null}
      {logs.length === 0 ? (
        <div className="text-slate-500 text-sm italic text-center mt-4">
          Las tiradas aparecerán acá cuando alguien use la bandeja o un macro.
        </div>
      ) : renderedLogs}
    </div>
  );
});
