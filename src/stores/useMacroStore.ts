import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface Macro {
  id: string;
  user_id: string;
  name: string;
  dice_expression: string;
}

interface MacroState {
  macros: Macro[];
  loading: boolean;
  fetchMacros: () => Promise<void>;
  addMacro: (name: string, expression: string) => Promise<void>;
  updateMacro: (id: string, name: string, expression: string) => Promise<void>;
  deleteMacro: (id: string) => Promise<void>;
}

export const useMacroStore = create<MacroState>((set) => ({
  macros: [],
  loading: false,

  fetchMacros: async () => {
    set({ loading: true });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('macros')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ macros: data || [] });
    } catch (error) {
      console.error('Error fetching macros:', error);
    } finally {
      set({ loading: false });
    }
  },

  addMacro: async (name: string, expression: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('macros')
        .insert([{ user_id: user.id, name, dice_expression: expression }])
        .select()
        .single();

      if (error) throw error;
      if (data) {
        set((state) => ({ macros: [data, ...state.macros] }));
      }
    } catch (error) {
      console.error('Error adding macro:', error);
      throw error; // Let the UI handle the error if needed
    }
  },

  updateMacro: async (id: string, name: string, expression: string) => {
    try {
      const { data, error } = await supabase
        .from('macros')
        .update({ name, dice_expression: expression })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (data) {
        set((state) => ({
          macros: state.macros.map((m) => (m.id === id ? data : m)),
        }));
      }
    } catch (error) {
      console.error('Error updating macro:', error);
      throw error;
    }
  },

  deleteMacro: async (id: string) => {
    try {
      const { error } = await supabase
        .from('macros')
        .delete()
        .eq('id', id);

      if (error) throw error;
      set((state) => ({
        macros: state.macros.filter((m) => m.id !== id),
      }));
    } catch (error) {
      console.error('Error deleting macro:', error);
      throw error;
    }
  },
}));
