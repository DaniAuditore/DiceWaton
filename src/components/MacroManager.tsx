import { useState, useEffect } from 'react';
import { useMacroStore } from '../stores/useMacroStore';
import { formatRollBreakdown, parseAndRollDetailed } from '../utils/dice';
import { AlertBanner } from './ui/AlertBanner';
import { Button } from './ui/Button';
import { TextInput } from './ui/TextInput';
import { useUiStore } from '../stores/useUiStore';

type MacroManagerProps = {
  onRoll: (diceType: string, result: number, details?: string) => void;
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
  const setUiStatus = useUiStore((state) => state.setStatus);

  useEffect(() => {
    fetchMacros();
  }, [fetchMacros]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !expression.trim()) return;
    
    setLoading(true);
    setError(null);
    setUiStatus('macro-crud', 'loading', 'Guardando macro...');
    try {
      await addMacro(name, expression);
      setName('');
      setExpression('');
      setUiStatus('macro-crud', 'success', 'Macro creada.');
    } catch (err) {
      setError('No se pudo crear el macro. Probá nuevamente.');
      setUiStatus('macro-crud', 'error', 'No se pudo crear el macro.');
    } finally {
      setLoading(false);
    }
  };

  const handleRollMacro = (macroName: string, expr: string) => {
    const roll = parseAndRollDetailed(expr);
    // Use macro name + expression as the 'diceType' so everyone sees what was rolled
    onRoll(`${macroName} (${expr})`, roll.total, formatRollBreakdown(roll));
  };

  const beginEdit = (id: string, currentName: string, currentExpression: string) => {
    setEditingId(id);
    setEditingName(currentName);
    setEditingExpression(currentExpression);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName('');
    setEditingExpression('');
  };

  const saveEdit = async () => {
    if (!editingId || !editingName.trim() || !editingExpression.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await updateMacro(editingId, editingName.trim(), editingExpression.trim());
      cancelEdit();
      setUiStatus('macro-crud', 'success', 'Macro actualizada.');
    } catch (err) {
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
      <h3 className="text-lg font-semibold mb-3">My Macros</h3>
      {error ? <AlertBanner tone="error" title="Error de macros" message={error} /> : null}
      
      <div className="space-y-3 mb-4 max-h-48 overflow-y-auto pr-2">
        {macros.length === 0 ? (
          <p className="text-slate-500 text-sm italic">No macros saved yet.</p>
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
                  />
                  <TextInput
                    value={editingExpression}
                    onChange={(e) => setEditingExpression(e.target.value)}
                    className="px-2 py-1 text-sm font-mono"
                    maxLength={20}
                  />
                </div>
              ) : (
                <div>
                  <div className="font-bold text-slate-200">{macro.name}</div>
                  <div className="text-xs text-slate-400 font-mono">{macro.dice_expression}</div>
                </div>
              )}
              <div className="flex gap-2">
                {editingId === macro.id ? (
                  <>
                    <Button
                      onClick={saveEdit}
                      className="text-sm py-1 px-2"
                    >
                      Save
                    </Button>
                    <Button
                      onClick={cancelEdit}
                      variant="secondary"
                      className="text-sm py-1 px-2"
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={() => handleRollMacro(macro.name, macro.dice_expression)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-sm py-1 px-3"
                    >
                      Roll
                    </Button>
                    <Button
                      onClick={() => beginEdit(macro.id, macro.name, macro.dice_expression)}
                      className="bg-amber-700 hover:bg-amber-600 text-sm py-1 px-2"
                    >
                      Edit
                    </Button>
                  </>
                )}
                <Button onClick={() => handleDelete(macro.id)} variant="danger" className="text-sm py-1 px-2" aria-label="Delete Macro" title="Delete Macro">✕</Button>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleAdd} className="flex gap-2 border-t border-slate-700 pt-4">
        <TextInput
          type="text"
          placeholder="Name (e.g. Fireball)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          className="flex-1 bg-slate-800 px-3 py-2 text-sm"
        />
        <TextInput
          type="text"
          placeholder="Expr (e.g. 8d6)"
          value={expression}
          onChange={(e) => setExpression(e.target.value)}
          maxLength={20}
          className="w-24 bg-slate-800 px-3 py-2 text-sm"
        />
        <Button
          type="submit"
          disabled={loading || !name.trim() || !expression.trim()}
          loading={loading}
          className="py-2 px-3"
        >
          Add
        </Button>
      </form>
    </div>
  );
}
