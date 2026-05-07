import { useState, useEffect } from 'react';
import { useMacroStore } from '../stores/useMacroStore';
import { formatRollBreakdown, parseAndRollDetailed } from '../utils/dice';

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

  useEffect(() => {
    fetchMacros();
  }, [fetchMacros]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !expression.trim()) return;
    
    setLoading(true);
    try {
      await addMacro(name, expression);
      setName('');
      setExpression('');
    } catch (err) {
      console.error(err);
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
    try {
      await updateMacro(editingId, editingName.trim(), editingExpression.trim());
      cancelEdit();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 p-4 rounded-lg mt-6">
      <h3 className="text-lg font-semibold mb-3">My Macros</h3>
      
      <div className="space-y-3 mb-4 max-h-48 overflow-y-auto pr-2">
        {macros.length === 0 ? (
          <p className="text-slate-500 text-sm italic">No macros saved yet.</p>
        ) : (
          macros.map((macro) => (
            <div key={macro.id} className="flex items-center justify-between bg-slate-800 p-2 rounded border border-slate-700">
              {editingId === macro.id ? (
                <div className="flex-1 grid grid-cols-2 gap-2 mr-2">
                  <input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"
                    maxLength={20}
                  />
                  <input
                    value={editingExpression}
                    onChange={(e) => setEditingExpression(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm font-mono"
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
                    <button
                      onClick={saveEdit}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold py-1 px-2 rounded transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold py-1 px-2 rounded transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleRollMacro(macro.name, macro.dice_expression)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold py-1 px-3 rounded transition-colors"
                    >
                      Roll
                    </button>
                    <button
                      onClick={() => beginEdit(macro.id, macro.name, macro.dice_expression)}
                      className="bg-amber-700 hover:bg-amber-600 text-white text-sm font-bold py-1 px-2 rounded transition-colors"
                    >
                      Edit
                    </button>
                  </>
                )}
                <button
                  onClick={() => deleteMacro(macro.id)}
                  className="bg-red-900 hover:bg-red-800 text-white text-sm font-bold py-1 px-2 rounded transition-colors"
                  title="Delete Macro"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleAdd} className="flex gap-2 border-t border-slate-700 pt-4">
        <input
          type="text"
          placeholder="Name (e.g. Fireball)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
        />
        <input
          type="text"
          placeholder="Expr (e.g. 8d6)"
          value={expression}
          onChange={(e) => setExpression(e.target.value)}
          maxLength={20}
          className="w-24 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={loading || !name.trim() || !expression.trim()}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-3 rounded transition-colors disabled:opacity-50"
        >
          Add
        </button>
      </form>
    </div>
  );
}
