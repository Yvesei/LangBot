import { z } from 'zod';
import { correctionSchema } from '@/lib/schemas/correction';
import { languageConfigSchema, type LanguageConfig } from '@/lib/schemas/language';
import type { ConversationMessage } from './conversation';
import { post } from '@/lib/api/request';

const conversationSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  native_language: z.string(),
  target_language: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});
const turnSchema = z.object({
  id: z.string().uuid(),
  prompt: z.string(),
  reply: z.string().nullable(),
  correction: correctionSchema.nullable(),
  origin: z.enum(['text', 'voice']),
  status: z.enum(['pending', 'complete', 'failed']),
  created_at: z.string(),
  updated_at: z.string(),
});
const listSchema = z.object({
  success: z.literal(true),
  conversations: z.array(conversationSchema),
  hasMore: z.boolean(),
});
const createSchema = z.object({
  success: z.literal(true),
  conversation: conversationSchema,
});
const detailSchema = z.object({
  success: z.literal(true),
  conversation: conversationSchema,
  turns: z.array(turnSchema),
  hasMore: z.boolean(),
});
const savedReplySchema = z.object({
  success: z.literal(true),
  conversationId: z.string().uuid(),
  messageId: z.string().uuid(),
  reply: z.string(),
  correction: correctionSchema.nullable(),
});
export type SavedConversation = z.infer<typeof conversationSchema>;

async function readResponse<T extends z.ZodType>(response: Response, schema: T) {
  const body: unknown = await response.json();
  if (!response.ok) {
    const parsed = z.object({ error: z.string() }).safeParse(body);
    throw new Error(parsed.success ? parsed.data.error : 'Saved chats are unavailable.');
  }
  return schema.parse(body) as z.infer<T>;
}

export async function listConversations(offset: number, signal: AbortSignal) {
  const response = await fetch(`/api/conversations?offset=${offset}`, {
    signal,
    cache: 'no-store',
  });
  return readResponse(response, listSchema);
}

export async function loadConversation(id: string, offset: number, signal: AbortSignal) {
  const response = await fetch(
    `/api/conversations?id=${encodeURIComponent(id)}&offset=${offset}`,
    {
      signal,
      cache: 'no-store',
    },
  );
  return readResponse(response, detailSchema);
}

export function createSavedConversation(config: LanguageConfig, signal: AbortSignal) {
  return post('/api/conversations', { languageConfig: config }, createSchema, signal);
}

export async function deleteSavedChat(conversationId: string, turnId?: string) {
  const response = await fetch('/api/conversations', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversationId,
      ...(turnId ? { turnId } : {}),
    }),
  });
  return readResponse(
    response,
    z.object({
      success: z.literal(true),
      deleted: z.literal(true),
    }),
  );
}

export function sendConversationMessage(
  body: {
    conversationId: string;
    messageId: string;
    prompt: string;
    languageConfig: LanguageConfig;
    learningFocus: string[];
    origin: 'text' | 'voice';
  },
  signal: AbortSignal,
) {
  return post('/api/messages', body, savedReplySchema, signal);
}

export function conversationLanguages(conversation: SavedConversation): LanguageConfig {
  return languageConfigSchema.parse({
    nativeLanguage: conversation.native_language,
    targetLanguage: conversation.target_language,
  });
}

export function turnMessages(turns: z.infer<typeof turnSchema>[]): ConversationMessage[] {
  return turns.flatMap((turn) => {
    const expired = Date.now() - Date.parse(turn.updated_at) > 70_000;
    const user: ConversationMessage = {
      id: turn.id,
      role: 'user',
      content: turn.prompt,
      timestamp: new Date(turn.created_at),
      correction: turn.correction,
      status: turn.status === 'pending' && expired ? 'failed' : turn.status,
      origin: turn.origin,
    };
    if (!turn.reply || turn.status !== 'complete') {
      return [user];
    }
    return [
      user,
      {
        id: `${turn.id}:reply`,
        role: 'assistant',
        content: turn.reply,
        timestamp: new Date(turn.created_at),
        replyTo: turn.id,
        status: 'complete',
      },
    ];
  });
}
