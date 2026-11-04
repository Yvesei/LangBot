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
import { ApiError } from '@/lib/server/errors';
import { readJsonBody } from '@/lib/server/http/request-body';

export const runtime = 'nodejs';
const uuid = z.string().uuid();
const pageSize = 40;

async function listChats(client: SupabaseClient, userId: string, offset: number) {
  const { data, error } = await client
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + pageSize);
  if (error || !data) {
    throw databaseUnavailable();
  }
  const parsed = z.array(conversationSchema).safeParse(data);
  if (!parsed.success) {
    throw databaseUnavailable();
  }
  return {
    conversations: parsed.data.slice(0, pageSize),
    hasMore: parsed.data.length > pageSize,
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
    .from('chat_turns')
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
    return listChats(client, user.id, offset.data);
  }
  if (!uuid.safeParse(id).success) {
    throw new ApiError(400, 'Invalid chat ID.');
  }
  return loadChat(client, user.id, id, offset.data);
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
        .from('chat_turns')
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
