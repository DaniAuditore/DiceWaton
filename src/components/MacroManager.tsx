import { useState, useEffect, useCallback, useRef } from 'react';
import { useMacroStore } from '../stores/useMacroStore';
import { formatRollBreakdown, parseAndRollDetailed, validateDiceExpression } from '../utils/dice';
import { AlertBanner } from './ui/AlertBanner';
import { Button } from './ui/Button';
import { TextInput } from './ui/TextInput';
import { useUiStore } from '../stores/useUiStore';

type MacroManagerProps = {
  onRoll: (diceType: string, result: number, details?: string) => void | Promise<void>;
};

export function MacroManager({ onRoll }: MacroManagerProps) {
  const { macros, fetchMacros, addMacro, updateMacro, deleteMacro } = useMacroStore();
  const [name, setName] = useState('');
  const [expression, setExpression] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingExpression, setEditingExpression] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [addExpressionError, setAddExpressionError] = useState<string | null>(null);
  const [editExpressionError, setEditExpressionError] = useState<string | null>(null);
  const [macroRollError, setMacroRollError] = useState<{ id: string; message: string } | null>(null);
  const [lastFailedRoll, setLastFailedRoll] = useState<{ macroName: string; expr: string } | null>(null);
  const setUiStatus = useUiStore((state) => state.setStatus);
  const addExpressionRef = useRef<HTMLInputElement>(null);
  const editExpressionRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMacros();
  }, [fetchMacros]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const validation = validateDiceExpression(expression);
    if (!validation.ok) {
      setAddExpressionError(validation.message);
      setError(null);
      setUiStatus('macro-crud', 'error', validation.message);
      addExpressionRef.current?.focus();
      return;
    }

    setLoading(true);
    setError(null);
    setAddExpressionError(null);
    setUiStatus('macro-crud', 'loading', 'Guardando macro...');
    try {
      await addMacro(name.trim(), validation.normalizedExpression);
      setName('');
      setExpression('');
      setUiStatus('macro-crud', 'success', 'Macro creada.');
    } catch {
      setError('No se pudo crear el macro. Probá nuevamente.');
      setUiStatus('macro-crud', 'error', 'No se pudo crear el macro.');
    } finally {
      setLoading(false);
    }
  };

  const handleRollMacro = useCallback(async (macroName: string, expr: string) => {
    setError(null);
    setMacroRollError(null);
    setLastFailedRoll({ macroName, expr });

    const validation = validateDiceExpression(expr);
    if (!validation.ok) {
      const message = `No se tiró "${macroName}": ${validation.message}`;
      setMacroRollError({ id: `${macroName}-${expr}`, message });
      setUiStatus('macro-roll', 'error', message);
      return;
    }

    try {
      const roll = parseAndRollDetailed(validation.normalizedExpression);
      await onRoll(`${macroName} (${validation.normalizedExpression})`, roll.total, formatRollBreakdown(roll));
      setUiStatus('macro-roll', 'success', `Macro "${macroName}" ejecutada.`);
    } catch {
      const message = 'No pudimos ejecutar el macro. Reintentá sin perder el contexto actual.';
      setError(message);
      setUiStatus('macro-roll', 'error', message);
    }
  }, [onRoll, setUiStatus]);

  const beginEdit = (id: string, currentName: string, currentExpression: string) => {
    setEditingId(id);
    setEditingName(currentName);
    setEditingExpression(currentExpression);
    setEditExpressionError(null);
    setMacroRollError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName('');
    setEditingExpression('');
    setEditExpressionError(null);
  };

  const saveEdit = async () => {
    if (!editingId || !editingName.trim()) return;

    const validation = validateDiceExpression(editingExpression);
    if (!validation.ok) {
      setEditExpressionError(validation.message);
      setError(null);
      setUiStatus('macro-crud', 'error', validation.message);
      editExpressionRef.current?.focus();
      return;
    }

    setLoading(true);
    setError(null);
    setEditExpressionError(null);
    try {
      await updateMacro(editingId, editingName.trim(), validation.normalizedExpression);
      cancelEdit();
      setUiStatus('macro-crud', 'success', 'Macro actualizada.');
    } catch {
      setError('No se pudo actualizar el macro.');
      setUiStatus('macro-crud', 'error', 'No se pudo actualizar el macro.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      await deleteMacro(id);
      setUiStatus('macro-crud', 'success', 'Macro eliminada.');
    } catch {
      setError('No se pudo eliminar el macro.');
      setUiStatus('macro-crud', 'error', 'No se pudo eliminar el macro.');
    }
  };

  return (
    <div className="bg-slate-900 p-4 rounded-lg mt-6">
      <h3 className="text-lg font-semibold mb-3">Mis macros</h3>
      {error ? (
        <AlertBanner
          tone="error"
          title="Error de macros"
          message={error}
          onRetry={lastFailedRoll ? () => void handleRollMacro(lastFailedRoll.macroName, lastFailedRoll.expr) : undefined}
        />
      ) : null}
      
      <div className="space-y-3 mb-4 max-h-48 overflow-y-auto pr-2">
        {macros.length === 0 ? (
          <p className="text-slate-500 text-sm italic">Todavía no tenés macros guardadas.</p>
        ) : (
          macros.map((macro) => (
            <div key={macro.id} className="flex items-center justify-between bg-slate-800 p-2 rounded border border-slate-700">
              {editingId === macro.id ? (
                <div className="flex-1 grid grid-cols-2 gap-2 mr-2">
                  <TextInput
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="px-2 py-1 text-sm"
                    maxLength={20}
                    aria-label="Nombre del macro"
                  />
                  <div>
                    <TextInput
                      ref={editExpressionRef}
                      value={editingExpression}
                      onChange={(e) => {
                        setEditingExpression(e.target.value);
                        setEditExpressionError(null);
                      }}
                      className="px-2 py-1 text-sm font-mono"
                      maxLength={20}
                      invalid={Boolean(editExpressionError)}
                      aria-label="Expresión del macro"
                      aria-describedby={editExpressionError ? `macro-edit-error-${macro.id}` : 'macro-expression-help'}
                    />
                    {editExpressionError ? (
                      <p id={`macro-edit-error-${macro.id}`} role="alert" className="mt-1 text-xs text-red-300">
                        {editExpressionError}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="font-bold text-slate-200">{macro.name}</div>
                  <div className="text-xs text-slate-400 font-mono">{macro.dice_expression}</div>
                  {macroRollError?.id === `${macro.name}-${macro.dice_expression}` ? (
                    <p role="alert" className="mt-1 text-xs text-red-300">
                      {macroRollError.message}
                    </p>
                  ) : null}
                </div>
              )}
              <div className="flex gap-2">
                {editingId === macro.id ? (
                  <>
                    <Button
                      onClick={saveEdit}
                      className="text-sm py-1 px-2"
                    >
                      Guardar
                    </Button>
                    <Button
                      onClick={cancelEdit}
                      variant="secondary"
                      className="text-sm py-1 px-2"
                    >
                      Cancelar
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={() => void handleRollMacro(macro.name, macro.dice_expression)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-sm py-1 px-3"
                    >
                      Tirar
                    </Button>
                    <Button
                      onClick={() => beginEdit(macro.id, macro.name, macro.dice_expression)}
                      className="bg-amber-700 hover:bg-amber-600 text-sm py-1 px-2"
                    >
                      Editar
                    </Button>
                  </>
                )}
                <Button onClick={() => handleDelete(macro.id)} variant="danger" className="text-sm py-1 px-2" aria-label="Eliminar macro" title="Eliminar macro">✕</Button>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleAdd} className="flex gap-2 border-t border-slate-700 pt-4">
        <TextInput
          type="text"
          placeholder="Nombre (ej: Bola de fuego)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          className="flex-1 bg-slate-800 px-3 py-2 text-sm"
          aria-label="Nombre del nuevo macro"
        />
        <div className="w-36">
          <TextInput
            ref={addExpressionRef}
            type="text"
            placeholder="Expresión (ej: 8d6)"
            value={expression}
            onChange={(e) => {
              setExpression(e.target.value);
              setAddExpressionError(null);
            }}
            maxLength={20}
            invalid={Boolean(addExpressionError)}
            className="bg-slate-800 px-3 py-2 text-sm font-mono"
            aria-label="Expresión del nuevo macro"
            aria-describedby={addExpressionError ? 'macro-expression-error' : 'macro-expression-help'}
          />
          {addExpressionError ? (
            <p id="macro-expression-error" role="alert" className="mt-1 text-xs text-red-300">
              {addExpressionError}
            </p>
          ) : null}
        </div>
        <Button
          type="submit"
          disabled={loading || !name.trim()}
          loading={loading}
          className="py-2 px-3"
        >
          Agregar
        </Button>
      </form>
      <p id="macro-expression-help" className="mt-2 text-xs text-slate-400">
        Sintaxis aceptada: 1d20+5, d6, 8d6 o modificadores como 2d6-1.
      </p>
    </div>
  );
}
