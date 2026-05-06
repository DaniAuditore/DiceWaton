import { createClient } from '@supabase/supabase-js';
import { fakeSupabase } from './fakeSupabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'dummy-key';

const shouldUseFakeSupabase =
  import.meta.env.VITE_E2E_FAKE_SUPABASE === 'true' ||
  supabaseUrl === 'http://localhost:54321' ||
  supabaseAnonKey === 'dummy-key';

export const supabase = shouldUseFakeSupabase
  ? (fakeSupabase as any)
  : createClient(supabaseUrl, supabaseAnonKey);
