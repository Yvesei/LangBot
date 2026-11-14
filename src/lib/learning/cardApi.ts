import { z } from 'zod';
import { studyCardSchema, type StudyCard } from './schema';

const listSchema = z.object({
  success: z.literal(true),
  userId: z.string(),
  cards: z.array(studyCardSchema),
});
const saveSchema = z.object({
  success: z.literal(true),
  userId: z.string(),
  importedIds: z.array(z.string()),
});
const deleteSchema = z.object({
  success: z.literal(true),
  userId: z.string(),
  deleted: z.literal(true),
});

async function request<S extends z.ZodType>(
  userId: string,
  options: { method: string; body?: unknown },
  schema: S,
  signal: AbortSignal,
): Promise<z.infer<S>> {
  const response = await fetch('/api/cards', {
    method: options.method,
    headers: {
      'Content-Type': 'application/json',
      'X-Profile-User-ID': userId,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: 'no-store',
    signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]),
  });
  if (!response.ok) {
    throw new Error('Cards are unavailable. Please retry.');
  }
  const result = schema.parse(await response.json()) as z.infer<S> & { userId: string };
  if (result.userId !== userId) {
    throw new Error('Your session changed. Please retry.');
  }
  return result;
}

export function listCards(userId: string, signal: AbortSignal) {
  return request(userId, { method: 'GET' }, listSchema, signal);
}

export function putCard(
  userId: string,
  card: StudyCard,
  signal: AbortSignal,
  importing = false,
) {
  const body = {
    cards: [card],
    ...(importing ? { import: true } : {}),
  };
  if (new TextEncoder().encode(JSON.stringify(body)).length > 131072) {
    throw new Error('A card is too large to save.');
  }
  return request(
    userId,
    {
      method: 'POST',
      body,
    },
    saveSchema,
    signal,
  );
}

export function importCards(
  userId: string,
  cards: StudyCard[],
  signal: AbortSignal,
  manual = false,
) {
  return request(
    userId,
    {
      method: 'POST',
      body: {
        cards,
        import: manual ? 'manual' : true,
      },
    },
    saveSchema,
    signal,
  );
}

export function deleteCards(userId: string, ids: string[], signal: AbortSignal) {
  return request(
    userId,
    {
      method: 'DELETE',
      body: { ids },
    },
    deleteSchema,
    signal,
  );
}

export function deleteCardsForMessage(
  userId: string,
  sourceMessageId: string,
  signal: AbortSignal,
) {
  return request(
    userId,
    {
      method: 'DELETE',
      body: { sourceMessageId },
    },
    deleteSchema,
    signal,
  );
}
