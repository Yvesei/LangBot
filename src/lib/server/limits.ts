import { ApiError } from './errors';
import { getSupabaseAdminClient } from '../auth/admin';
import { getSupabaseUser } from '../auth/server';

const REQUESTS_PER_MINUTE = 5;
const MINUTE_IN_MS = 60_000;
const WINDOW_SECONDS = 60;

const buckets = new Map<string, { count: number; expires: number }>();

function getFirstForwardedIp(forwardedFor: string | null) {
  return forwardedFor?.split(',')[0]?.trim();
}

function getVercelClientIp(request: Request) {
  const forwardedFor = request.headers.get('x-vercel-forwarded-for');
  return getFirstForwardedIp(forwardedFor);
}

function getAnonymousIdentity(request: Request) {
  const clientIp = process.env.VERCEL === '1' ? getVercelClientIp(request) : 'local';
  return `ip:${clientIp || 'shared'}`;
}

async function getIdentity(request: Request) {
  const user = await getSupabaseUser();
  if (user) {
    return `user:${user.id}`;
  }

  return getAnonymousIdentity(request);
}

function incrementRequestCount(identity: string) {
  const now = Date.now();

  for (const [key, bucket] of buckets) {
    if (bucket.expires <= now) {
      buckets.delete(key);
    }
  }

  const bucket = buckets.get(identity) ?? {
    count: 0,
    expires: now + MINUTE_IN_MS,
  };
  bucket.count++;
  buckets.set(identity, bucket);
  return bucket;
}

function getSharedResult(data: unknown) {
  const result = Array.isArray(data) && data.length === 1 ? data[0] : null;
  if (!result || typeof result.allowed !== 'boolean') {
    throw new Error('Unexpected response from rate limit RPC.');
  }

  return result as { allowed: boolean; retry_after_seconds?: number };
}

function getRetryAfter(retryAfter: unknown) {
  return typeof retryAfter === 'number' && Number.isInteger(retryAfter) && retryAfter > 0
    ? Math.min(retryAfter, WINDOW_SECONDS)
    : WINDOW_SECONDS;
}

async function enforceSharedLimit(identity: string) {
  const client = getSupabaseAdminClient();
  if (!client) {
    return false;
  }

  try {
    const { data, error } = await client.rpc('register_rate_limit_hit', {
      p_identity_key: identity,
      p_window_seconds: WINDOW_SECONDS,
      p_max_hits: REQUESTS_PER_MINUTE,
    });
    if (error) {
      throw error;
    }

    const result = getSharedResult(data);
    if (!result.allowed) {
      throw new ApiError(
        429,
        'Too many requests. Try again in a minute.',
        getRetryAfter(result.retry_after_seconds),
      );
    }

    return true;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    console.error('Shared rate limit check failed.');
    throw new ApiError(503, 'Request limit unavailable. Please try again shortly.');
  }
}

export async function enforceLimits(request: Request) {
  const identity = await getIdentity(request);
  if (await enforceSharedLimit(identity)) {
    return;
  }

  const bucket = incrementRequestCount(identity);

  if (bucket.count > REQUESTS_PER_MINUTE) {
    const retryAfter = Math.max(1, Math.ceil((bucket.expires - Date.now()) / 1000));
    throw new ApiError(429, 'Too many requests. Try again in a minute.', retryAfter);
  }
}
