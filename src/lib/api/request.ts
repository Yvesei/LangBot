import { z } from 'zod';

function getRequestSignal(signal: AbortSignal | undefined, timeout: AbortSignal) {
  if (signal) {
    return AbortSignal.any([signal, timeout]);
  }

  return timeout;
}

function getApiErrorMessage(data: unknown): string {
  const parsed = z.object({ error: z.string().max(300) }).safeParse(data);

  if (parsed.success) {
    return parsed.data.error;
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
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error('The service returned an unreadable response. Please retry.');
    }
    if (!response.ok) {
      throw new Error(getApiErrorMessage(data));
    }
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      throw new Error('The service returned an invalid response. Please retry.');
    }
    return parsed.data;
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
