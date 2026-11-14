import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { studyCardSchema, type StudyCard } from '@/lib/learning/schema';
import {
  assertSameOrigin,
  chatResponse,
  getChatAccount,
} from '@/lib/server/chat/account';
import { ApiError } from '@/lib/server/errors';
import { readJsonBody } from '@/lib/server/http/request-body';

export const runtime = 'nodejs';
const batchSize = 100;
const pageSize = 1000;
const uuid = z.string().uuid();
const idsSchema = z.array(z.string().max(100)).min(1).max(batchSize);
const writeSchema = z
  .object({
    cards: z.array(studyCardSchema).min(1).max(batchSize),
    import: z.union([z.boolean(), z.literal('manual')]).optional(),
  })
  .strict()
  .refine(({ cards }) => new Set(cards.map((card) => card.id)).size === cards.length);

function unavailable() {
  return new ApiError(503, 'Saved cards are unavailable. Please try again.');
}

async function getCardsAccount(request: Request) {
  const account = await getChatAccount();
  if (request.headers.get('x-profile-user-id') !== account.user.id) {
    throw new ApiError(409, 'Your account changed. Reload your cards and try again.');
  }
  return account;
}

function parseCard(row: Record<string, unknown>) {
  const parsed = studyCardSchema.safeParse({
    id: row.id,
    sourceMessageId: row.source_message_id,
    languageConfig: {
      nativeLanguage: row.native_language,
      targetLanguage: row.target_language,
    },
    originalText: row.original_text,
    correctedText: row.corrected_text,
    focus: row.focus,
  });
  return parsed.success ? parsed.data : null;
}

function cardRow(card: StudyCard, userId: string) {
  return {
    user_id: userId,
    id: card.id,
    source_message_id: card.sourceMessageId,
    native_language: card.languageConfig.nativeLanguage,
    target_language: card.languageConfig.targetLanguage,
    original_text: card.originalText,
    corrected_text: card.correctedText,
    focus: card.focus,
  };
}

function sameCard(first: StudyCard, second: StudyCard) {
  return (
    first.id === second.id &&
    first.sourceMessageId === second.sourceMessageId &&
    first.languageConfig.nativeLanguage === second.languageConfig.nativeLanguage &&
    first.languageConfig.targetLanguage === second.languageConfig.targetLanguage &&
    first.originalText === second.originalText &&
    first.correctedText === second.correctedText &&
    first.focus === second.focus
  );
}

async function loadCards(client: SupabaseClient, userId: string) {
  const cards: StudyCard[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await client
      .from('study_cards')
      .select('*')
      .eq('user_id', userId)
      .order('created_at')
      .order('id')
      .range(offset, offset + pageSize - 1);
    if (error || !data) {
      throw unavailable();
    }
    cards.push(...data.map(parseCard).filter((card): card is StudyCard => card !== null));
    if (data.length < pageSize) {
      return cards;
    }
  }
}

async function confirmedImports(
  client: SupabaseClient,
  userId: string,
  cards: StudyCard[],
) {
  const { data, error } = await client
    .from('study_cards')
    .select('*')
    .eq('user_id', userId)
    .in(
      'id',
      cards.map((card) => card.id),
    );
  if (error || !data) {
    throw unavailable();
  }
  const stored = new Map(data.map((row) => [row.id, parseCard(row)]));
  return cards
    .filter((card) => {
      const existing = stored.get(card.id);
      return existing && sameCard(existing, card);
    })
    .map((card) => card.id);
}

async function ownedLegacyCards(
  client: SupabaseClient,
  userId: string,
  cards: StudyCard[],
) {
  const ids = [
    ...new Set(
      cards
        .map((card) => card.sourceMessageId)
        .filter((id) => uuid.safeParse(id).success),
    ),
  ];
  if (!ids.length) {
    return [];
  }
  const { data, error } = await client
    .from('messages')
    .select('id, conversations!inner(user_id)')
    .eq('conversations.user_id', userId)
    .in('id', ids);
  if (error || !data) {
    throw unavailable();
  }
  const owned = new Set(data.map((row) => row.id));
  return cards.filter((card) => owned.has(card.sourceMessageId));
}

export const GET = chatResponse(async (request) => {
  const { client, user } = await getCardsAccount(request);
  return {
    userId: user.id,
    cards: await loadCards(client, user.id),
  };
});

export const POST = chatResponse(async (request) => {
  assertSameOrigin(request);
  const { client, user } = await getCardsAccount(request);
  const parsed = writeSchema.safeParse(await readJsonBody(request, 131072));
  if (!parsed.success) {
    throw new ApiError(400, 'Invalid cards.');
  }
  const cards =
    parsed.data.import === true
      ? await ownedLegacyCards(client, user.id, parsed.data.cards)
      : parsed.data.cards;
  if (cards.length) {
    const { error } = await client.from('study_cards').upsert(
      cards.map((card) => cardRow(card, user.id)),
      {
        onConflict: 'user_id,id',
        ignoreDuplicates: Boolean(parsed.data.import),
      },
    );
    if (error) {
      throw unavailable();
    }
  }
  const importedIds =
    parsed.data.import && cards.length
      ? await confirmedImports(client, user.id, cards)
      : cards.map((card) => card.id);
  return {
    userId: user.id,
    importedIds,
  };
});

export const DELETE = chatResponse(async (request) => {
  assertSameOrigin(request);
  const { client, user } = await getCardsAccount(request);
  const parsed = z
    .union([
      z.object({ ids: idsSchema }).strict(),
      z.object({ sourceMessageId: z.string().max(100) }).strict(),
    ])
    .safeParse(await readJsonBody(request));
  if (!parsed.success) {
    throw new ApiError(400, 'Invalid cards.');
  }
  const query = client.from('study_cards').delete().eq('user_id', user.id);
  const { error } = await ('ids' in parsed.data
    ? query.in('id', parsed.data.ids)
    : query.eq('source_message_id', parsed.data.sourceMessageId));
  if (error) {
    throw unavailable();
  }
  return {
    userId: user.id,
    deleted: true,
  };
});
