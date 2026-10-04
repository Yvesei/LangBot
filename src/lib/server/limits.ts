import { createHash } from 'node:crypto';
import { ApiError } from './errors';

const buckets = new Map<string, { count: number; expires: number }>();
const incrementScript = `
local n = redis.call('INCR', KEYS[1])
if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
return n`;

function parsePositiveInteger(value: string | undefined, fallback: number) {
  const parsedInteger = Number(value);
  return Number.isSafeInteger(parsedInteger) && parsedInteger > 0 ? parsedInteger : fallback;
}

function parseLimitStoreCount(storeResponse: unknown): number {
  if (
    !storeResponse ||
    typeof storeResponse !== 'object' ||
    !('result' in storeResponse) ||
    typeof storeResponse.result !== 'number' ||
    !Number.isSafeInteger(storeResponse.result) ||
    storeResponse.result < 1
  ) {
    throw new Error('Invalid limit store response');
  }
  return storeResponse.result;
}

async function incrementSharedLimit(key: string, seconds: number, url: string, token: string) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['EVAL', incrementScript, '1', `langbot:${key}`, String(seconds)]),
      signal: AbortSignal.timeout(3000),
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new Error('Limit store unavailable');
    }
    const storeResponse: unknown = await response.json();
    return parseLimitStoreCount(storeResponse);
  } catch {
    throw new ApiError(
      503,
      'Usage protection is temporarily unavailable. Please try again.',
    );
  }
}

function incrementLocalLimit(key: string, seconds: number): number {
  const now = Date.now();
  for (const [id, bucket] of buckets) {
    if (bucket.expires <= now) {
      buckets.delete(id);
    }
  }
  const bucket = buckets.get(key) ?? {
    count: 0,
    expires: now + seconds * 1000,
  };
  bucket.count++;
  buckets.set(key, bucket);
  return bucket.count;
}

async function incrementLimitCount(key: string, seconds: number): Promise<number> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    return incrementSharedLimit(key, seconds, url, token);
  }
  // A per-process fallback cannot protect a multi-instance deployment.
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.ALLOW_IN_MEMORY_LIMITS !== 'true'
  ) {
    throw new ApiError(503, 'Usage protection is not configured.');
  }
  return incrementLocalLimit(key, seconds);
}

export async function enforceLimits(request: Request) {
  // Trust only Vercel's platform-supplied header. On other hosts use a shared
  // bucket until a trusted proxy integration is configured; ignore arbitrary XFF.
  const ip =
    process.env.VERCEL === '1'
      ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() || 'shared'
      : 'shared';
  const identity = createHash('sha256').update(ip).digest('hex').slice(0, 24);
  const perMinute = parsePositiveInteger(process.env.REQUESTS_PER_MINUTE, 20);
  if ((await incrementLimitCount(`minute:${identity}`, 60)) > perMinute) {
    throw new ApiError(429, 'Too many requests. Try again in a minute.', 60);
  }
  const day = new Date().toISOString().slice(0, 10);
  const daily = parsePositiveInteger(process.env.DAILY_REQUEST_LIMIT, 1000);
  if ((await incrementLimitCount(`daily:${day}`, 172800)) > daily) {
    const midnight = new Date(`${day}T00:00:00Z`).getTime() + 86400000;
    throw new ApiError(
      429,
      'The daily AI request allowance has been reached. Try again tomorrow.',
      Math.max(1, Math.ceil((midnight - Date.now()) / 1000)),
    );
  }
}
