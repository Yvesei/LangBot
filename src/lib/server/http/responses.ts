import { NextResponse } from 'next/server';
import { ApiError } from '../errors';

function getHeaders(requestId: string, error?: ApiError) {
  return {
    'Cache-Control': 'no-store',
    'X-Request-ID': requestId,
    ...(error?.retryAfter ? { 'Retry-After': String(error.retryAfter) } : {}),
  };
}

export function successResponse(requestId: string, body: object) {
  return NextResponse.json(
    {
      success: true,
      ...body,
    },
    { headers: getHeaders(requestId) },
  );
}

export function errorResponse(requestId: string, error: unknown) {
  const knownError = error instanceof ApiError ? error : undefined;
  const status = knownError?.status ?? 500;
  console.warn(
    JSON.stringify({
      event: 'api_error',
      requestId,
      status,
    }),
  );

  return NextResponse.json(
    {
      success: false,
      error: knownError?.message ?? 'Something went wrong. Please try again.',
    },
    {
      status,
      headers: getHeaders(requestId, knownError),
    },
  );
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
