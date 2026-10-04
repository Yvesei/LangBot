import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiError } from './errors';
import { enforceLimits } from './limits';
import { MAX_REQUEST_BYTES } from '../config/limits';

const REQUEST_BODY_TIMEOUT_MS = 5000;

interface RequestChunks {
  chunks: Uint8Array[];
  bytes: number;
}

async function readBody(request: Request): Promise<unknown> {
  if (
    request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !==
    'application/json'
  ) {
    throw new ApiError(415, 'Send application/json.');
  }
  const combined = await readBytes(request, MAX_REQUEST_BYTES);
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(combined));
  } catch {
    throw new ApiError(400, 'Invalid JSON.');
  }
}

function combineRequestChunks({ chunks, bytes }: RequestChunks) {
  const combined = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return combined;
}

export async function readBytes(request: Request, maxBytes: number) {
  if (Number(request.headers.get('content-length')) > maxBytes) {
    throw new ApiError(413, 'Request is too large.');
  }
  const reader = request.body?.getReader();
  if (!reader) {
    throw new ApiError(400, 'A request body is required.');
  }
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    void reader.cancel().catch(() => undefined);
  }, REQUEST_BODY_TIMEOUT_MS);
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (timedOut) {
        throw new ApiError(408, 'Request body timed out.');
      }
      if (done) {
        break;
      }
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        throw new ApiError(413, 'Request is too large.');
      }
      chunks.push(value);
    }
  } finally {
    clearTimeout(timer);
    reader.releaseLock();
  }
  return combineRequestChunks({
    chunks,
    bytes,
  });
}

export function route<S extends z.ZodType>(
  schema: S,
  handler: (body: z.infer<S>, signal: AbortSignal) => Promise<object>,
) {
  return guardedRoute(async (request) => {
    const parsed = schema.safeParse(await readBody(request));
    if (!parsed.success) {
      throw new ApiError(
        400,
        'Invalid request. Check the languages, level, text length, and conversation.',
      );
    }
    return handler(parsed.data, request.signal);
  });
}

export function guardedRoute(handler: (request: Request) => Promise<object>) {
  return async (request: Request) => {
    const id = crypto.randomUUID();
    try {
      const origin = request.headers.get('origin');
      if (origin && origin !== new URL(request.url).origin) {
        throw new ApiError(403, 'Cross-origin requests are not allowed.');
      }
      await enforceLimits(request);
      const result = await handler(request);
      return NextResponse.json(
        {
          success: true,
          ...result,
        },
        {
          headers: {
            'Cache-Control': 'no-store',
            'X-Request-ID': id,
          },
        },
      );
    } catch (error) {
      const known = error instanceof ApiError;
      const status = known ? error.status : 500;
      // Never log learner text, provider bodies, or credentials.
      console.warn(
        JSON.stringify({
          event: 'api_error',
          requestId: id,
          status,
        }),
      );
      return NextResponse.json(
        {
          success: false,
          error: known ? error.message : 'Something went wrong. Please try again.',
        },
        {
          status,
          headers: {
            'Cache-Control': 'no-store',
            'X-Request-ID': id,
            ...(known && error.retryAfter
              ? { 'Retry-After': String(error.retryAfter) }
              : {}),
          },
        },
      );
    }
  };
}

export function methodNotAllowed() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed',
    },
    {
      status: 405,
      headers: { Allow: 'POST' },
    },
  );
}
