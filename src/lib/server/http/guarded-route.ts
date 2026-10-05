import { ApiError } from '../errors';
import { enforceLimits } from '../limits';
import { errorResponse, successResponse } from './responses';

function assertSameOrigin(request: Request) {
  const origin = request.headers.get('origin');

  if (origin && origin !== new URL(request.url).origin) {
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
