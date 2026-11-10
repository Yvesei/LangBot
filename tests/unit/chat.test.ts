import { correctionRequestSchema } from '@/lib/schemas';
import { tutorPrompt } from '@/lib/server/prompts';
import { turnMessages } from '@/lib/chat/saved';
import { languageConfig } from '../fixtures';

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
