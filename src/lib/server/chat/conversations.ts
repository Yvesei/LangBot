import type { SupabaseClient } from '@supabase/supabase-js';
import type { LanguageConfig } from '@/lib/schemas';
import { ApiError } from '@/lib/server/errors';
import { conversationSchema, databaseUnavailable, getConversation } from './storage';

const NEW_CONVERSATION_TITLE = 'New conversation';

async function nameConversation(
  client: SupabaseClient,
  userId: string,
  id: string,
  prompt: string,
) {
  const { data, error } = await client
    .from('messages')
    .select('prompt')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })
    .limit(1);
  if (error || !data) {
    throw databaseUnavailable();
  }
  if (data.length > 0) {
    return;
  }
  const { error: updateError } = await client
    .from('conversations')
    .update({ title: prompt.slice(0, 80) })
    .eq('id', id)
    .eq('user_id', userId)
    .eq('title', NEW_CONVERSATION_TITLE);
  if (updateError) {
    throw databaseUnavailable();
  }
}

export async function ensureConversation(
  client: SupabaseClient,
  userId: string,
  options: { id: string; config: LanguageConfig; prompt: string },
) {
  const { id, config, prompt } = options;
  let conversation;
  try {
    conversation = await getConversation(client, userId, id);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 404) {
      throw error;
    }
  }
  if (!conversation) {
    const { error } = await client.from('conversations').insert({
      id,
      user_id: userId,
      native_language: config.nativeLanguage,
      target_language: config.targetLanguage,
      title: prompt.slice(0, 80),
    });
    if (error && error.code !== '23505') {
      throw databaseUnavailable();
    }
    conversation = await getConversation(client, userId, id);
  }
  if (
    conversation.native_language !== config.nativeLanguage ||
    conversation.target_language !== config.targetLanguage
  ) {
    throw new ApiError(409, 'This chat uses different languages. Start a new chat.');
  }
  if (conversation.title === NEW_CONVERSATION_TITLE) {
    await nameConversation(client, userId, id, prompt);
  }
  return conversation;
}

export async function createConversation(
  client: SupabaseClient,
  userId: string,
  config: LanguageConfig,
) {
  const { data, error } = await client
    .from('conversations')
    .insert({
      id: crypto.randomUUID(),
      user_id: userId,
      native_language: config.nativeLanguage,
      target_language: config.targetLanguage,
      title: NEW_CONVERSATION_TITLE,
    })
    .select('*')
    .maybeSingle();
  if (error || !data) {
    throw databaseUnavailable();
  }
  const parsed = conversationSchema.safeParse(data);
  if (!parsed.success) {
    throw databaseUnavailable();
  }
  return parsed.data;
}
