import { ApiError } from './errors';

const REQUESTS_PER_MINUTE = 5;
const MINUTE_IN_MS = 60_000;

const buckets = new Map<string, { count: number; expires: number }>();

function getFirstForwardedIp(forwardedFor: string | null) {
  return forwardedFor?.split(',')[0]?.trim();
}

function getVercelClientIp(request: Request) {
  const forwardedFor = request.headers.get('x-vercel-forwarded-for');
  return getFirstForwardedIp(forwardedFor);
}

function getIdentity(request: Request) {
  if (process.env.VERCEL !== '1') {
    return 'shared';
  }

  const clientIp = getVercelClientIp(request);
  return clientIp || 'shared';
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
  return bucket.count;
}

export async function enforceLimits(request: Request) {
  const requestCount = incrementRequestCount(getIdentity(request));

  if (requestCount > REQUESTS_PER_MINUTE) {
    throw new ApiError(429, 'Too many requests. Try again in a minute.', 60);
  }
}
