import { createHash } from 'node:crypto';
import { ApiError } from './errors';
import { incrementLimitCount } from './limit-store';

function parsePositiveInteger(value: string | undefined, fallback: number) {
  const parsedInteger = Number(value);
  return Number.isSafeInteger(parsedInteger) && parsedInteger > 0
    ? parsedInteger
    : fallback;
}

function getIdentity(request: Request) {
  const ip =
    process.env.VERCEL === '1'
      ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() || 'shared'
      : 'shared';
  return createHash('sha256').update(ip).digest('hex').slice(0, 24);
}

async function enforceMinuteLimit(identity: string) {
  const allowedRequests = parsePositiveInteger(process.env.REQUESTS_PER_MINUTE, 20);
  const requestCount = await incrementLimitCount(`minute:${identity}`, 60);

  if (requestCount > allowedRequests) {
    throw new ApiError(429, 'Too many requests. Try again in a minute.', 60);
  }
}

async function enforceDailyLimit() {
  const day = new Date().toISOString().slice(0, 10);
  const allowedRequests = parsePositiveInteger(process.env.DAILY_REQUEST_LIMIT, 1000);
  const requestCount = await incrementLimitCount(`daily:${day}`, 172800);

  if (requestCount <= allowedRequests) {
    return;
  }

  const midnight = new Date(`${day}T00:00:00Z`).getTime() + 86400000;
  throw new ApiError(
    429,
    'The daily AI request allowance has been reached. Try again tomorrow.',
    Math.max(1, Math.ceil((midnight - Date.now()) / 1000)),
  );
}

export async function enforceLimits(request: Request) {
  const identity = getIdentity(request);
  await enforceMinuteLimit(identity);
  await enforceDailyLimit();
}
