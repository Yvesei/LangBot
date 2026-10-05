import { z } from 'zod';
import { ApiError } from './errors';
import { guardedRoute } from './http/guarded-route';
import { readJsonBody } from './http/request-body';

export { guardedRoute } from './http/guarded-route';
export { methodNotAllowed } from './http/responses';
export { readBytes } from './http/request-body';

export function route<Schema extends z.ZodType>(
  schema: Schema,
  handler: (body: z.infer<Schema>, signal: AbortSignal) => Promise<object>,
) {
  return guardedRoute(async (request) => {
    const parsed = schema.safeParse(await readJsonBody(request));

    if (!parsed.success) {
      throw new ApiError(
        400,
        'Invalid request. Check the languages, level, text length, and conversation.',
      );
    }

    return handler(parsed.data, request.signal);
  });
}
