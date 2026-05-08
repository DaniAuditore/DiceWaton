import { useState, useEffect, useCallback, useRef } from 'react';
import { useMacroStore } from '../stores/useMacroStore';
import { formatRollBreakdown, parseAndRollDetailed, validateDiceExpression } from '../utils/dice';
import { AlertBanner } from './ui/AlertBanner';
import { Button } from './ui/Button';
import { TextInput } from './ui/TextInput';
import { useUiStore } from '../stores/useUiStore';
import { FormField } from './ui/FormField';

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
  const macroErrorTimerRef = useRef<number | null>(null);

  useEffect(() => {
    fetchMacros();
  }, [fetchMacros]);

  useEffect(() => {
    if (!macroRollError) {
      if (macroErrorTimerRef.current !== null) {
        window.clearTimeout(macroErrorTimerRef.current);
        macroErrorTimerRef.current = null;
      }
      return;
    }

    if (macroErrorTimerRef.current !== null) {
      window.clearTimeout(macroErrorTimerRef.current);
    }

    macroErrorTimerRef.current = window.setTimeout(() => {
      setMacroRollError(null);
      macroErrorTimerRef.current = null;
    }, 5000);

    return () => {
      if (macroErrorTimerRef.current !== null) {
        window.clearTimeout(macroErrorTimerRef.current);
      }
    };
  }, [macroRollError]);

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

  const handleRollMacro = useCallback(
    async (macroName: string, expr: string) => {
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
    },
    [onRoll, setUiStatus],
  );

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
    <section className="surface-panel surface-panel--compact panel-stack" aria-labelledby="macro-manager-title">
      <header className="surface-panel__header">
        <div>
          <p className="screen-kicker">Macros</p>
          <h3 id="macro-manager-title" className="surface-panel__title">
            Mis macros
          </h3>
        </div>
      </header>

      {error ? (
        <AlertBanner
          tone="error"
          title="Error de macros"
          message={error}
          onRetry={lastFailedRoll ? () => void handleRollMacro(lastFailedRoll.macroName, lastFailedRoll.expr) : undefined}
          onDismiss={() => setError(null)}
        />
      ) : null}

      <div className="macro-list">
        {macros.length === 0 ? (
          <p className="log-entry__empty">Todavía no tenés macros guardadas.</p>
        ) : (
          macros.map((macro) => (
            <article key={macro.id} className="macro-item">
              {editingId === macro.id ? (
                <div className="macro-form__fields">
                  <TextInput
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="ui-input--compact"
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
                      className="ui-input--compact ui-input--mono"
                      maxLength={20}
                      invalid={Boolean(editExpressionError)}
                      aria-label="Expresión del macro"
                      aria-describedby={editExpressionError ? `macro-edit-error-${macro.id}` : 'macro-expression-help'}
                    />
                    {editExpressionError ? (
                      <p id={`macro-edit-error-${macro.id}`} role="alert" className="field-stack__hint" style={{ color: 'rgb(252 165 165)' }}>
                        {editExpressionError}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="macro-item__shell">
                  <p className="macro-item__title">{macro.name}</p>
                  <p className="macro-item__expression">{macro.dice_expression}</p>
                  {macroRollError?.id === `${macro.name}-${macro.dice_expression}` ? (
                    <div role="alert" className="field-stack__hint" style={{ color: 'rgb(252 165 165)' }}>
                      {macroRollError.message}
                    </div>
                  ) : null}
                </div>
              )}

              <div className="macro-item__actions">
                {editingId === macro.id ? (
                  <>
                    <Button onClick={saveEdit} className="ui-button--small">
                      Guardar
                    </Button>
                    <Button onClick={cancelEdit} variant="secondary" className="ui-button--small">
                      Cancelar
                    </Button>
                  </>
                ) : (
                  <>
                    <Button onClick={() => void handleRollMacro(macro.name, macro.dice_expression)} className="ui-button--small">
                      Tirar
                    </Button>
                    <Button onClick={() => beginEdit(macro.id, macro.name, macro.dice_expression)} variant="secondary" className="ui-button--small">
                      Editar
                    </Button>
                  </>
                )}
                <Button onClick={() => handleDelete(macro.id)} variant="danger" className="ui-button--small" aria-label="Eliminar macro">
                  Eliminar
                </Button>
              </div>
            </article>
          ))
        )}
      </div>

      <form onSubmit={handleAdd} className="macro-form" noValidate>
        <div className="macro-form__fields">
          <FormField id="macro-name" label="Nombre del macro">
            <TextInput
              id="macro-name"
              type="text"
              placeholder="Nombre (ej: Bola de fuego)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              className="ui-input--compact"
              aria-label="Nombre del nuevo macro"
            />
          </FormField>

          <FormField id="macro-expression" label="Expresión" error={addExpressionError ?? undefined}>
            <TextInput
              ref={addExpressionRef}
              id="macro-expression"
              type="text"
              placeholder="Expresión (ej: 8d6)"
              value={expression}
              onChange={(e) => {
                setExpression(e.target.value);
                setAddExpressionError(null);
              }}
              maxLength={20}
              invalid={Boolean(addExpressionError)}
              className="ui-input--compact ui-input--mono"
              aria-label="Expresión del nuevo macro"
              aria-describedby={addExpressionError ? 'macro-expression-error' : 'macro-expression-help'}
            />
            {addExpressionError ? (
              <p id="macro-expression-error" role="alert" className="field-stack__hint" style={{ color: 'rgb(252 165 165)' }}>
                {addExpressionError}
              </p>
            ) : null}
          </FormField>
        </div>

        <Button type="submit" disabled={loading || !name.trim()} loading={loading} className="macro-form__submit ui-button--small">
          Agregar
        </Button>
      </form>

      <p id="macro-expression-help" className="field-stack__hint">
        Sintaxis aceptada: 1d20+5, d6, 8d6 o modificadores como 2d6-1.
      </p>
    </section>
  );
}
