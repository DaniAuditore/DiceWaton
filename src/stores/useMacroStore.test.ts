import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { useMacroStore } from './useMacroStore';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => {
  const mockSelect = vi.fn().mockReturnThis();
  const mockInsert = vi.fn().mockReturnThis();
  const mockUpdate = vi.fn().mockReturnThis();
  const mockDelete = vi.fn().mockReturnThis();
  const mockOrder = vi.fn().mockReturnThis();
  const mockEq = vi.fn().mockReturnThis();
  const mockSingle = vi.fn().mockResolvedValue({ data: null, error: null });

  return {
    supabase: {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } }),
      },
      from: vi.fn(() => ({
        select: mockSelect,
        insert: mockInsert,
        update: mockUpdate,
        delete: mockDelete,
        order: mockOrder,
        eq: mockEq,
        single: mockSingle,
      })),
    },
  };
});

describe('useMacroStore', () => {
  beforeEach(() => {
    useMacroStore.setState({ macros: [], loading: false });
    vi.clearAllMocks();
  });

  it('initializes with default state', () => {
    const state = useMacroStore.getState();
    expect(state.macros).toEqual([]);
    expect(state.loading).toBe(false);
  });

  it('fetchMacros updates macros list', async () => {
    const mockData = [{ id: '1', name: 'Magic Missile', dice_expression: '3d4+3', user_id: 'user-123' }];
    
    const mockOrder = vi.fn().mockResolvedValue({ data: mockData, error: null });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
    (supabase.from as Mock).mockReturnValue({ select: mockSelect });

    await useMacroStore.getState().fetchMacros();
    expect(useMacroStore.getState().macros).toEqual(mockData);
  });

  it('addMacro prepends new macro', async () => {
    const newMacro = { id: 'm-1', name: 'Fireball', dice_expression: '8d6', user_id: 'user-123' };
    
    const mockSingle = vi.fn().mockResolvedValue({ data: newMacro, error: null });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
    (supabase.from as Mock).mockReturnValue({ insert: mockInsert });

    await useMacroStore.getState().addMacro('Fireball', '8d6');
    expect(useMacroStore.getState().macros).toEqual([newMacro]);
  });

  it('deleteMacro removes a macro', async () => {
    useMacroStore.setState({
      macros: [
        { id: '1', name: 'Spell', dice_expression: '1d20', user_id: 'u' },
        { id: '2', name: 'Attack', dice_expression: '1d8', user_id: 'u' },
      ],
    });

    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });
    (supabase.from as Mock).mockReturnValue({ delete: mockDelete });

    await useMacroStore.getState().deleteMacro('1');
    expect(useMacroStore.getState().macros).toHaveLength(1);
    expect(useMacroStore.getState().macros[0].id).toBe('2');
  });

  it('updateMacro replaces the macro in state', async () => {
    useMacroStore.setState({
      macros: [{ id: '1', name: 'Old', dice_expression: '1d4', user_id: 'u' }],
    });

    const updated = { id: '1', name: 'Updated', dice_expression: '2d6+1', user_id: 'u' };
    const mockSingle = vi.fn().mockResolvedValue({ data: updated, error: null });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    (supabase.from as Mock).mockReturnValue({ update: mockUpdate });

    await useMacroStore.getState().updateMacro('1', 'Updated', '2d6+1');

    expect(useMacroStore.getState().macros).toEqual([updated]);
  });
});
