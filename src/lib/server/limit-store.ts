import { ApiError } from './errors';

const buckets = new Map<string, { count: number; expires: number }>();
const incrementScript = `
local n = redis.call('INCR', KEYS[1])
if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
return n`;

function parseStoreCount(storeResponse: unknown): number {
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

async function incrementRemoteLimit(key: string, seconds: number) {
  const response = await fetch(process.env.UPSTASH_REDIS_REST_URL!, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([
      'EVAL',
      incrementScript,
      '1',
      `langbot:${key}`,
      String(seconds),
    ]),
    signal: AbortSignal.timeout(3000),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Limit store unavailable');
  }

  return parseStoreCount(await response.json());
}

function assertLocalLimitsAllowed() {
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.ALLOW_IN_MEMORY_LIMITS !== 'true'
  ) {
    throw new ApiError(503, 'Usage protection is not configured.');
  }
}

export async function incrementLimitCount(key: string, seconds: number): Promise<number> {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      return await incrementRemoteLimit(key, seconds);
    } catch {
      throw new ApiError(
        503,
        'Usage protection is temporarily unavailable. Please try again.',
      );
    }
  }

  assertLocalLimitsAllowed();
  return incrementLocalLimit(key, seconds);
}
