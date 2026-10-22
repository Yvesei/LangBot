import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from './config';

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  // createBrowserClient caches its instance, so repeated calls stay cheap.
  return createBrowserClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
}
