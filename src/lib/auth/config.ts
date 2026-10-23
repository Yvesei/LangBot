// Auth configuration is optional: the app runs guest-mode when unset.
// Newer Supabase projects name the public key "publishable" instead of "anon".
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}
