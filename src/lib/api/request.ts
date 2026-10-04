import { z } from 'zod';

function getRequestSignal(signal: AbortSignal | undefined, timeout: AbortSignal) {
  if (signal) {
    return AbortSignal.any([signal, timeout]);
  }

  return timeout;
}

function getApiErrorMessage(responseBody: unknown): string {
  const parsedResponse = z.object({ error: z.string().max(300) }).safeParse(responseBody);

  if (parsedResponse.success) {
    return parsedResponse.data.error;
  }

  return 'The request failed. Please retry.';
}

export async function post<S extends z.ZodType>(
  path: string,
  body: unknown,
  schema: S,
  signal?: AbortSignal,
): Promise<z.infer<S>> {
  const timeout = AbortSignal.timeout(40000);
  try {
    const requestSignal = getRequestSignal(signal, timeout);
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: requestSignal,
    });
    let responseBody: unknown;
    try {
      responseBody = await response.json();
    } catch {
      throw new Error('The service returned an unreadable response. Please retry.');
    }
    if (!response.ok) {
      throw new Error(getApiErrorMessage(responseBody));
    }
    const parsedResponse = schema.safeParse(responseBody);
    if (!parsedResponse.success) {
      throw new Error('The service returned an invalid response. Please retry.');
    }
    return parsedResponse.data;
  } catch (error) {
    if (signal?.aborted) {
      throw new Error('Request cancelled.');
    }
    if (timeout.aborted) {
      throw new Error('The request timed out. Please retry.');
    }
    if (error instanceof Error) {
      throw error;
    }

    throw new Error('Could not reach the service.');
  }
}
