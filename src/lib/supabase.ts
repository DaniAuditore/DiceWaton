import { createClient } from '@supabase/supabase-js';
import { fakeSupabase } from './fakeSupabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const shouldUseFakeSupabase = import.meta.env.VITE_E2E_FAKE_SUPABASE === 'true';

if (!shouldUseFakeSupabase && (!supabaseUrl || !supabaseAnonKey)) {
  throw new Error(
    'Supabase client requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. For E2E fake mode set VITE_E2E_FAKE_SUPABASE=true.',
  );
}

export const supabase = shouldUseFakeSupabase
  ? (fakeSupabase as unknown as ReturnType<typeof createClient>)
  : createClient(supabaseUrl as string, supabaseAnonKey as string);
