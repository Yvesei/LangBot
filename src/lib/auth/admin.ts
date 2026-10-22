import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { ApiError } from '../server/errors';
import { SUPABASE_URL } from './config';

let serviceClient: SupabaseClient | null = null;

/** Returns the server-only Supabase client when a service key is configured. */
export function getSupabaseAdminClient(): SupabaseClient | null {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!serviceRoleKey) {
    return null;
  }

  if (!SUPABASE_URL) {
    throw new ApiError(503, 'Shared rate limiting is not configured correctly.');
  }

  serviceClient ??= createClient(SUPABASE_URL, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return serviceClient;
}
