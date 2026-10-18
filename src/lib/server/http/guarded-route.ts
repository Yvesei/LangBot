import { ApiError } from '../errors';
import { enforceLimits } from '../limits';
import { errorResponse, successResponse } from './responses';

function getRequestOrigin(request: Request) {
  const requestUrl = new URL(request.url);
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') ?? requestUrl.protocol.slice(0, -1);

  if (!host) {
    return requestUrl.origin;
  }

  return `${protocol}://${host}`;
}

function assertSameOrigin(request: Request) {
  const origin = request.headers.get('origin');

  if (origin && origin !== getRequestOrigin(request)) {
    throw new ApiError(403, 'Cross-origin requests are not allowed.');
  }
}

export function guardedRoute(handler: (request: Request) => Promise<object>) {
  return async (request: Request) => {
    const requestId = crypto.randomUUID();

    try {
      assertSameOrigin(request);
      await enforceLimits(request);
      return successResponse(requestId, await handler(request));
    } catch (error) {
      return errorResponse(requestId, error);
    }
  };
}
