import type { SupabaseClient } from '@supabase/supabase-js';
import type { LanguageConfig } from '@/lib/schemas';
import { conversationSchema, databaseUnavailable } from './storage';

export const NEW_CONVERSATION_TITLE = 'New conversation';

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
