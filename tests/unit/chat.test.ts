import { correctionRequestSchema } from '@/lib/schemas';
import { tutorPrompt } from '@/lib/server/prompts';
import { turnMessages } from '@/lib/chat/saved';
import { languageConfig } from '../fixtures';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ensureConversation } from '@/lib/server/chat/conversations';

describe('chat input boundaries', () => {
  test('text APIs accept messages with only the selected languages', () => {
    const correction = {
      content: 'I has a apple.',
      languageConfig,
    };
    expect(correctionRequestSchema.parse(correction)).toEqual(correction);
  });

  test('selected languages control the system prompt', () => {
    const prompt = tutorPrompt({ nativeLanguage: 'en', targetLanguage: 'ja' });
    expect(prompt).toContain('Target language: Japanese');
    expect(prompt).toContain('Native language: English');
    expect(prompt).not.toContain('DO NOT CORRECT');
  });
});

test('saved turns reopen with pending, failed, and complete states', () => {
  const turn = {
    id: '7207ee80-801c-4e25-b8a9-04020135080b',
    prompt: 'Bonjour',
    reply: null,
    correction: null,
    origin: 'text' as const,
    status: 'pending' as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  expect(turnMessages([turn])[0].status).toBe('pending');
  expect(
    turnMessages([
      { ...turn, updated_at: new Date(Date.now() - 71_000).toISOString() },
    ])[0].status,
  ).toBe('failed');
  const complete = turnMessages([{ ...turn, reply: 'Hello', status: 'complete' }]);
  expect(complete.map((message) => message.role)).toEqual(['user', 'assistant']);
  expect(complete[1].replyTo).toBe(turn.id);
});

test.each([
  [[], true],
  [[{ prompt: 'Earlier message' }], false],
])('names only an empty default conversation', async (messages, shouldRename) => {
  const id = '7207ee80-801c-4e25-b8a9-04020135080b';
  const userId = '3f41537f-8091-4b71-b7d1-c6198212252f';
  const row = {
    id,
    user_id: userId,
    native_language: languageConfig.nativeLanguage,
    target_language: languageConfig.targetLanguage,
    title: 'New conversation',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const update = jest.fn();
  const conversations = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: row, error: null }),
    update: update.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      }),
    }),
  };
  const messageQuery = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue({ data: messages, error: null }),
  };
  const client = {
    from: (table: string) => (table === 'conversations' ? conversations : messageQuery),
  } as unknown as SupabaseClient;

  await ensureConversation(client, userId, {
    id,
    config: languageConfig,
    prompt: 'First message',
  });
  if (shouldRename) {
    expect(update).toHaveBeenCalledWith({ title: 'First message' });
  } else {
    expect(update).not.toHaveBeenCalled();
  }
});
