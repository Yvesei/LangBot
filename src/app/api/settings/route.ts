import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import { getSupabaseServerClient, getSupabaseUser } from '@/lib/auth/server';
import { preferenceUpdateSchema } from '@/lib/config/preferences';
import { DEFAULT_THEME, THEMES, type UITheme } from '@/lib/config/theme';
import { languageCodeSchema } from '@/lib/schemas/language';
import { ApiError } from '@/lib/server/errors';
import { readJsonBody } from '@/lib/server/http/request-body';
import { errorResponse, successResponse } from '@/lib/server/http/responses';

export const runtime = 'nodejs';

const themeSchema = z.enum(Object.keys(THEMES) as [UITheme, ...UITheme[]]);
const profileColumns = 'native_language,target_language,ui_theme';
const profileSchema = z.object({
  native_language: languageCodeSchema.nullable(),
  target_language: languageCodeSchema.nullable(),
  ui_theme: themeSchema,
});
const guestLimitSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);

function unavailable() {
  return new ApiError(503, 'Settings are unavailable. Please try again.');
}

async function getGuestLimit(client: SupabaseClient) {
  const { data, error } = await client
    .from('app_settings')
    .select('guest_message_limit')
    .eq('id', 'default')
    .maybeSingle();
  const parsed = guestLimitSchema.safeParse(data?.guest_message_limit);
  if (error || !parsed.success) {
    throw unavailable();
  }

  return parsed.data;
}

function preferences(data: unknown) {
  if (data === null) {
    return {
      nativeLanguage: null,
      targetLanguage: null,
      theme: DEFAULT_THEME,
    };
  }

  const parsed = profileSchema.safeParse(data);
  if (!parsed.success) {
    throw unavailable();
  }

  return {
    nativeLanguage: parsed.data.native_language,
    targetLanguage: parsed.data.target_language,
    theme: parsed.data.ui_theme,
  };
}

function withResponse(handler: (request: Request) => Promise<object>) {
  return async (request: Request) => {
    const requestId = crypto.randomUUID();
    try {
      return successResponse(requestId, await handler(request));
    } catch (error) {
      return errorResponse(requestId, error);
    }
  };
}

export const GET = withResponse(async () => {
  const client = getSupabaseServerClient();
  if (!client) {
    return {
      userId: null,
      guestMessageLimit: 5,
      preferences: null,
    };
  }

  const [guestMessageLimit, user] = await Promise.all([
    getGuestLimit(client),
    getSupabaseUser(client),
  ]);
  if (!user) {
    return {
      userId: null,
      guestMessageLimit,
      preferences: null,
    };
  }

  const { data, error } = await client
    .from('profiles')
    .select(profileColumns)
    .eq('id', user.id)
    .maybeSingle();
  if (error) {
    throw unavailable();
  }

  return {
    userId: user.id,
    guestMessageLimit,
    preferences: preferences(data),
  };
});

function assertSameOrigin(request: Request) {
  const url = new URL(request.url);
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') ?? url.protocol.slice(0, -1);
  const expected = host ? `${protocol}://${host}` : url.origin;
  const origin = request.headers.get('origin');
  if (origin && origin !== expected) {
    throw new ApiError(403, 'Cross-origin requests are not allowed.');
  }
}

export const PATCH = withResponse(async (request) => {
  assertSameOrigin(request);
  const client = getSupabaseServerClient();
  const user = client ? await getSupabaseUser(client) : null;
  if (!client || !user) {
    throw new ApiError(401, 'Sign in to save your preferences.');
  }

  if (request.headers.get('x-profile-user-id') !== user.id) {
    throw new ApiError(409, 'Your account changed. Reload your settings and try again.');
  }

  const parsed = preferenceUpdateSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    throw new ApiError(400, 'Choose valid language or theme preferences.');
  }

  const changes: Record<string, string> = {
    id: user.id,
    updated_at: new Date().toISOString(),
  };
  if (parsed.data.languageConfig) {
    changes.native_language = parsed.data.languageConfig.nativeLanguage;
    changes.target_language = parsed.data.languageConfig.targetLanguage;
  }

  if (parsed.data.theme) {
    changes.ui_theme = parsed.data.theme;
  }

  const { error } = await client.from('profiles').upsert(changes, {
    onConflict: 'id',
    defaultToNull: false,
  });
  if (error) {
    throw unavailable();
  }

  return { userId: user.id };
});
