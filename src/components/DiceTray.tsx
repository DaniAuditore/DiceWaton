import { useEffect, useRef, useState } from 'react';
import { AlertBanner } from './ui/AlertBanner';
import { Button } from './ui/Button';

type DiceTrayProps = {
  onRoll: (diceType: string, result: number) => void | Promise<void>;
  disabled?: boolean;
  disabledMessage?: string;
};

const DICE_TYPES = [4, 6, 8, 10, 12, 20, 100];

const rollDie = (sides: number) => {
  const roll = crypto.getRandomValues(new Uint32Array(1))[0];
  return (roll % sides) + 1;
};

export function DiceTray({ onRoll, disabled, disabledMessage }: DiceTrayProps) {
  const [localRoll, setLocalRoll] = useState<{ type: string; result: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastAttempt, setLastAttempt] = useState<{ type: string; result: number } | null>(null);
  const rollTimerRef = useRef<number | null>(null);
  const errorTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (rollTimerRef.current !== null) {
        window.clearTimeout(rollTimerRef.current);
      }
      if (errorTimerRef.current !== null) {
        window.clearTimeout(errorTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!error) {
      if (errorTimerRef.current !== null) {
        window.clearTimeout(errorTimerRef.current);
        errorTimerRef.current = null;
      }
      return;
    }

    if (errorTimerRef.current !== null) {
      window.clearTimeout(errorTimerRef.current);
    }

    errorTimerRef.current = window.setTimeout(() => {
      setError(null);
      errorTimerRef.current = null;
    }, 5000);

    return () => {
      if (errorTimerRef.current !== null) {
        window.clearTimeout(errorTimerRef.current);
      }
    };
  }, [error]);

  const sendRoll = async (type: string, result: number) => {
    setError(null);
    setLastAttempt({ type, result });
    setLocalRoll({ type, result });

    try {
      await onRoll(type, result);
    } catch {
      setError('No pudimos registrar la tirada. Reintentá sin perder tu contexto.');
    }

    if (rollTimerRef.current !== null) {
      window.clearTimeout(rollTimerRef.current);
    }

    rollTimerRef.current = window.setTimeout(() => {
      setLocalRoll((prev) => (prev?.type === type && prev?.result === result ? null : prev));
    }, 3000);
  };

  const handleRoll = (sides: number) => {
    const result = rollDie(sides);
    const type = `d${sides}`;
    void sendRoll(type, result);
  };

  return (
    <section className="surface-panel surface-panel--compact panel-stack" aria-labelledby="dice-tray-title">
      <header className="surface-panel__header">
        <div>
          <p className="screen-kicker">Tiradas</p>
          <h3 id="dice-tray-title" className="surface-panel__title">
            Bandeja de dados
          </h3>
        </div>
      </header>

      {disabled && disabledMessage ? <AlertBanner tone="warning" title="No se pueden tirar dados todavía" message={disabledMessage} /> : null}

      {error ? (
        <AlertBanner
          tone="error"
          title="No pudimos registrar la tirada"
          message={error}
          onRetry={lastAttempt ? () => void sendRoll(lastAttempt.type, lastAttempt.result) : undefined}
          onDismiss={() => setError(null)}
        />
      ) : null}

      <div className="dice-tray-grid" role="group" aria-label="Dados disponibles">
        {DICE_TYPES.map((sides) => (
          <Button
            key={sides}
            type="button"
            variant="secondary"
            disabled={disabled}
            onClick={() => handleRoll(sides)}
            className="ui-button--small"
          >
            d{sides}
          </Button>
        ))}
      </div>

      {localRoll ? (
        <div className="dice-tray-result" aria-live="polite">
          <span className="dice-tray-result__label">Tiraste {localRoll.type}:</span>
          <span className="dice-tray-result__value">{localRoll.result}</span>
        </div>
      ) : null}
    </section>
  );
}
