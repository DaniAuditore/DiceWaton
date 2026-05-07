import { useState } from 'react';
import { AlertBanner } from './ui/AlertBanner';

type DiceTrayProps = {
  onRoll: (diceType: string, result: number) => void | Promise<void>;
  disabled?: boolean;
};

const DICE_TYPES = [4, 6, 8, 10, 12, 20, 100];

export function DiceTray({ onRoll, disabled }: DiceTrayProps) {
  const [localRoll, setLocalRoll] = useState<{type: string, result: number} | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastAttempt, setLastAttempt] = useState<{ type: string; result: number } | null>(null);

  const sendRoll = async (type: string, result: number) => {
    setError(null);
    setLastAttempt({ type, result });
    setLocalRoll({ type, result });

    try {
      await onRoll(type, result);
    } catch {
      setError('No pudimos registrar la tirada. Reintentá sin perder tu contexto.');
    }

    // Clear optimistic UI after a delay
    setTimeout(() => {
      setLocalRoll(prev => prev?.type === type && prev?.result === result ? null : prev);
    }, 3000);
  };

  const handleRoll = (sides: number) => {
    const result = Math.floor(Math.random() * sides) + 1;
    const type = `d${sides}`;
    void sendRoll(type, result);
  };

  return (
    <div className="bg-slate-900 p-4 rounded-lg">
      <h3 className="text-lg font-semibold mb-3">Bandeja de dados</h3>
      {error ? (
        <div className="mb-3">
          <AlertBanner
            tone="error"
            title="No pudimos registrar la tirada"
            message={error}
            onRetry={lastAttempt ? () => void sendRoll(lastAttempt.type, lastAttempt.result) : undefined}
          />
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2 justify-center">
        {DICE_TYPES.map(sides => (
          <button
            key={sides}
            onClick={() => handleRoll(sides)}
            disabled={disabled}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            d{sides}
          </button>
        ))}
      </div>
      {localRoll && (
        <div className="mt-4 p-3 bg-slate-800 rounded text-center">
          <span className="text-slate-400">Tiraste {localRoll.type}: </span>
          <span className="text-2xl font-bold text-emerald-400 animate-pulse">{localRoll.result}</span>
        </div>
      )}
    </div>
  );
}
