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
        <article key={log.id} className="log-entry">
          <div className="log-entry__meta">
            <div>
              <span className="log-entry__player">{log.playerName}</span>
              <span className="log-entry__dice"> tiró {log.diceType}</span>
            </div>
            {log.details ? <div className="log-entry__details">{log.details}</div> : null}
          </div>
          <div className="log-entry__result">{log.result}</div>
        </article>
      )),
    [logs],
  );

  return (
    <section className="surface-panel surface-panel--compact log-panel panel-stack" role="log" aria-live="polite" aria-relevant="additions text" aria-label="Registro de tiradas">
      <header className="surface-panel__header">
        <div>
          <p className="screen-kicker">Actividad</p>
          <h3 className="surface-panel__title">Últimas tiradas</h3>
        </div>
      </header>

      {error ? <div role="alert" className="surface-panel__copy">{error}</div> : null}

      {logs.length === 0 ? <p className="log-entry__empty">Las tiradas aparecerán acá cuando alguien use la bandeja o un macro.</p> : <div className="log-list">{renderedLogs}</div>}
    </section>
  );
});
