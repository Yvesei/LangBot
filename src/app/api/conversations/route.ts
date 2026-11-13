import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  assertSameOrigin,
  chatResponse,
  getChatAccount,
} from '@/lib/server/chat/account';
import {
  conversationSchema,
  databaseUnavailable,
  getConversation,
  turnSchema,
} from '@/lib/server/chat/storage';
import { createConversation } from '@/lib/server/chat/conversations';
import { ApiError } from '@/lib/server/errors';
import { readJsonBody } from '@/lib/server/http/request-body';
import { languageConfigSchema } from '@/lib/schemas/language';

export const runtime = 'nodejs';
const uuid = z.string().uuid();
const pageSize = 40;
const createSchema = z.object({ languageConfig: languageConfigSchema }).strict();

async function listChats(
  client: SupabaseClient,
  userId: string,
  isAnonymous: boolean,
  offset: number,
) {
  const [conversations, messages] = await Promise.all([
    client
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .order('id', { ascending: false })
      .range(offset, offset + pageSize),
    isAnonymous
      ? client.from('messages').select('id', {
          count: 'exact',
          head: true,
        })
      : Promise.resolve({
          count: 0,
          error: null,
        }),
  ]);
  const { data, error } = conversations;
  if (error || !data) {
    throw databaseUnavailable();
  }
  if (messages.error || messages.count === null) {
    throw databaseUnavailable();
  }
  const parsed = z.array(conversationSchema).safeParse(data);
  if (!parsed.success) {
    throw databaseUnavailable();
  }
  return {
    conversations: parsed.data.slice(0, pageSize),
    hasMore: parsed.data.length > pageSize,
    messageCount: messages.count,
  };
}

async function loadChat(
  client: SupabaseClient,
  userId: string,
  id: string,
  offset: number,
) {
  const conversation = await getConversation(client, userId, id);
  const { data, error } = await client
    .from('messages')
    .select('*')
    .eq('conversation_id', id)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + pageSize);
  if (error || !data) {
    throw databaseUnavailable();
  }
  const parsed = z.array(turnSchema).safeParse(data);
  if (!parsed.success) {
    throw databaseUnavailable();
  }
  return {
    conversation,
    turns: parsed.data.slice(0, pageSize).reverse(),
    hasMore: parsed.data.length > pageSize,
  };
}

export const GET = chatResponse(async (request) => {
  const { client, user } = await getChatAccount();
  const params = new URL(request.url).searchParams;
  const offset = z.coerce
    .number()
    .int()
    .min(0)
    .max(10000)
    .safeParse(params.get('offset') ?? '0');
  if (!offset.success) {
    throw new ApiError(400, 'Invalid page.');
  }
  const id = params.get('id');
  if (!id) {
    return listChats(client, user.id, Boolean(user.is_anonymous), offset.data);
  }
  if (!uuid.safeParse(id).success) {
    throw new ApiError(400, 'Invalid chat ID.');
  }
  return loadChat(client, user.id, id, offset.data);
});

export const POST = chatResponse(async (request) => {
  assertSameOrigin(request);
  const { client, user } = await getChatAccount();
  const parsed = createSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    throw new ApiError(400, 'Invalid conversation.');
  }
  return {
    conversation: await createConversation(client, user.id, parsed.data.languageConfig),
  };
});

export const PATCH = chatResponse(async (request) => {
  assertSameOrigin(request);
  const { client, user } = await getChatAccount();
  const parsed = z
    .object({
      conversationId: uuid,
      title: z.string().trim().min(1).max(80),
    })
    .strict()
    .safeParse(await readJsonBody(request));
  if (!parsed.success) {
    throw new ApiError(400, 'Invalid conversation title.');
  }
  const { data, error } = await client
    .from('conversations')
    .update({ title: parsed.data.title })
    .eq('id', parsed.data.conversationId)
    .eq('user_id', user.id)
    .select('id')
    .maybeSingle();
  if (error) {
    throw databaseUnavailable();
  }
  if (!data) {
    throw new ApiError(404, 'Chat not found.');
  }
  return { updated: true };
});

export const DELETE = chatResponse(async (request) => {
  assertSameOrigin(request);
  const { client, user } = await getChatAccount();
  const parsed = z
    .object({
      conversationId: uuid,
      turnId: uuid.optional(),
    })
    .strict()
    .safeParse(await readJsonBody(request));
  if (!parsed.success) {
    throw new ApiError(400, 'Invalid chat ID.');
  }
  const { conversationId, turnId } = parsed.data;
  await getConversation(client, user.id, conversationId);
  const query = turnId
    ? client
        .from('messages')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('id', turnId)
    : client
        .from('conversations')
        .delete()
        .eq('user_id', user.id)
        .eq('id', conversationId);
  const { error } = await query;
  if (error) {
    throw databaseUnavailable();
  }
  return { deleted: true };
});
