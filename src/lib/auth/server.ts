import 'server-only';

import { createServerClient } from '@supabase/ssr';
import {
  isAuthRetryableFetchError,
  type SupabaseClient,
  type User,
} from '@supabase/supabase-js';
import { cookies } from 'next/headers';

import { ApiError } from '../server/errors';
import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from './config';

export function getSupabaseServerClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  return createServerClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: async () => (await cookies()).getAll(),

      setAll: async (cookiesToSet) => {
        const store = await cookies();
        for (const { name, value, options } of cookiesToSet) {
          store.set(name, value, options);
        }
      },
    },
  });
}

/**
 * The signed-in user for the current request, or null for guests.
 * Reads the session cookies; returns null when auth is not configured.
 */

export async function getSupabaseUser(): Promise<User | null> {
  const client = getSupabaseServerClient();
  if (!client) {
    return null;
  }

  const { data, error } = await client.auth.getUser();
  if (
    error &&
    (isAuthRetryableFetchError(error) ||
      !error.status ||
      error.status === 429 ||
      error.status >= 500)
  ) {
    throw new ApiError(503, 'Unable to verify your session. Please try again.');
  }

  return error ? null : (data.user ?? null);
}
