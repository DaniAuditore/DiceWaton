

export type RollEvent = {
  id: string;
  playerName: string;
  diceType: string;
  result: number;
  timestamp: number;
  details?: string;
};

export function DiceLog({ logs, error }: { logs: RollEvent[]; error?: string | null }) {
  return (
    <div
      className="bg-slate-900 p-4 rounded-lg mt-6 h-64 overflow-y-auto flex flex-col gap-2"
      role="log"
      aria-live="polite"
      aria-relevant="additions text"
      aria-label="Registro de tiradas"
    >
      <h3 className="text-lg font-semibold sticky top-0 bg-slate-900 pb-2 border-b border-slate-700">Recent Rolls</h3>
      {error ? <div role="alert" className="text-sm text-red-300">{error}</div> : null}
      {logs.length === 0 ? (
        <div className="text-slate-500 text-sm italic text-center mt-4">No hay tiradas todavía.</div>
      ) : (
        logs.map(log => (
          <div key={log.id} className="bg-slate-800 p-3 rounded flex justify-between items-center animate-fade-in-down">
            <div>
              <span className="font-bold text-indigo-400">{log.playerName}</span>
              <span className="text-slate-400 text-sm ml-2">rolled {log.diceType}</span>
              {log.details ? (
                <div className="text-xs text-slate-500 font-mono mt-1">{log.details}</div>
              ) : null}
            </div>
            <div className="text-2xl font-bold text-emerald-400">
              {log.result}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
