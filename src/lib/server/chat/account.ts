import type { SupabaseClient, User } from '@supabase/supabase-js';
import { getSupabaseServerClient, getSupabaseUser } from '@/lib/auth/server';
import { ApiError } from '@/lib/server/errors';
import { errorResponse, successResponse } from '@/lib/server/http/responses';

export async function getChatAccount(): Promise<{ client: SupabaseClient; user: User }> {
  const client = getSupabaseServerClient();
  const user = client ? await getSupabaseUser(client) : null;
  if (!client || !user) {
    throw new ApiError(401, 'Sign in to save chats.');
  }
  return {
    client,
    user,
  };
}

export function chatResponse(handler: (request: Request) => Promise<object>) {
  return async (request: Request) => {
    const requestId = crypto.randomUUID();
    try {
      return successResponse(requestId, await handler(request));
    } catch (error) {
      return errorResponse(requestId, error);
    }
  };
}

export function assertSameOrigin(request: Request) {
  const url = new URL(request.url);
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') ?? url.protocol.slice(0, -1);
  const expected = host ? `${protocol}://${host}` : url.origin;
  const origin = request.headers.get('origin');
  if (origin && origin !== expected) {
    throw new ApiError(403, 'Cross-origin requests are not allowed.');
  }
}
