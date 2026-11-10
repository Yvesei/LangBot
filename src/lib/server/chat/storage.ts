import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { ApiError } from '@/lib/server/errors';
import { correctionSchema, type ChatResult } from '@/lib/schemas';

export const conversationSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  native_language: z.string(),
  target_language: z.string(),
  title: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});
export const turnSchema = z.object({
  id: z.string().uuid(),
  conversation_id: z.string().uuid(),
  prompt: z.string(),
  reply: z.string().nullable(),
  correction: correctionSchema.nullable(),
  origin: z.enum(['text', 'voice']),
  status: z.enum(['pending', 'complete', 'failed']),
  attempt_id: z.string().uuid(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type StoredTurn = z.infer<typeof turnSchema>;

export function databaseUnavailable(): ApiError {
  return new ApiError(503, 'Saved chats are unavailable. Please try again.');
}

export async function getConversation(
  client: SupabaseClient,
  userId: string,
  id: string,
) {
  const { data, error } = await client
    .from('conversations')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    throw databaseUnavailable();
  }
  if (!data) {
    throw new ApiError(404, 'Chat not found.');
  }
  const parsed = conversationSchema.safeParse(data);
  if (!parsed.success) {
    throw databaseUnavailable();
  }
  return parsed.data;
}

export async function getTurn(
  client: SupabaseClient,
  conversationId: string,
  id: string,
) {
  const { data, error } = await client
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .eq('id', id)
    .maybeSingle();
  if (error) {
    throw databaseUnavailable();
  }
  if (!data) {
    throw new ApiError(404, 'Message not found.');
  }
  const parsed = turnSchema.safeParse(data);
  if (!parsed.success) {
    throw databaseUnavailable();
  }
  return parsed.data;
}

interface NewTurn {
  id: string;
  prompt: string;
  origin: 'text' | 'voice';
}

interface Reservation {
  turn: StoredTurn;
  attemptId: string;
  completed?: ChatResult;
}

async function claimExistingTurn(
  client: SupabaseClient,
  conversationId: string,
  options: NewTurn,
  attemptId: string,
): Promise<Reservation> {
  const previous = await getTurn(client, conversationId, options.id);
  if (previous.prompt !== options.prompt || previous.origin !== options.origin) {
    throw new ApiError(409, 'This message ID belongs to a different message.');
  }
  if (previous.status === 'complete' && previous.reply) {
    return {
      turn: previous,
      attemptId,
      completed: {
        reply: previous.reply,
        correction: previous.correction,
      },
    };
  }
  const stale = Date.now() - Date.parse(previous.updated_at) > 70_000;
  if (previous.status === 'pending' && !stale) {
    throw new ApiError(409, 'This message is still being processed.');
  }
  const { data, error } = await client
    .from('messages')
    .update({
      status: 'pending',
      attempt_id: attemptId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', options.id)
    .eq('conversation_id', conversationId)
    .eq('attempt_id', previous.attempt_id)
    .eq('status', previous.status)
    .select('*')
    .maybeSingle();
  if (error) {
    throw databaseUnavailable();
  }
  if (!data) {
    throw new ApiError(409, 'This message is already being retried.');
  }
  const parsed = turnSchema.safeParse(data);
  if (!parsed.success) {
    throw databaseUnavailable();
  }
  return {
    turn: parsed.data,
    attemptId,
  };
}

export async function reserveTurn(
  client: SupabaseClient,
  conversationId: string,
  options: NewTurn,
): Promise<Reservation> {
  const attemptId = crypto.randomUUID();
  const { data, error } = await client
    .from('messages')
    .insert({
      id: options.id,
      conversation_id: conversationId,
      prompt: options.prompt,
      origin: options.origin,
      attempt_id: attemptId,
    })
    .select('*')
    .maybeSingle();
  if (data && !error) {
    const parsed = turnSchema.safeParse(data);
    if (!parsed.success) {
      throw databaseUnavailable();
    }
    return {
      turn: parsed.data,
      attemptId,
    };
  }
  if (error?.code !== '23505') {
    throw databaseUnavailable();
  }
  return claimExistingTurn(client, conversationId, options, attemptId);
}

export async function finishTurn(
  client: SupabaseClient,
  id: string,
  attemptId: string,
  result: ChatResult,
) {
  const { data, error } = await client
    .from('messages')
    .update({
      reply: result.reply,
      correction: result.correction,
      status: 'complete',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('attempt_id', attemptId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();
  if (error) {
    throw databaseUnavailable();
  }
  if (!data) {
    throw new ApiError(409, 'This message was retried elsewhere.');
  }
}

export async function failTurn(client: SupabaseClient, id: string, attemptId: string) {
  await client
    .from('messages')
    .update({
      status: 'failed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('attempt_id', attemptId)
    .eq('status', 'pending');
}
