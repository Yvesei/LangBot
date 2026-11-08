import type { ChatRequest } from '@/lib/schemas';
import { apiUrl } from './helpers/api';

export const languageConfig = {
  nativeLanguage: 'fr' as const,
  targetLanguage: 'en' as const,
};
export const corrected = {
  correctedText: 'I have an apple.',
  issues: [
    {
      category: 'grammar' as const,
      explanation: 'Avec « I », utilise « have », et « an » devant une voyelle.',
    },
  ],
};
export const tutorResult = {
  reply: 'What fruit do you like?',
  correction: corrected,
};

export function mockSettingsAndChats(settings: object) {
  jest.mocked(fetch).mockImplementation(async (input, init) => {
    if (String(input).startsWith('/api/conversations')) {
      if (init?.method === 'POST') {
        return Response.json({
          success: true,
          conversation: {
            id: 'ef7eb1f6-f1f4-412b-bcc7-0814e4788bf9',
            title: 'New conversation',
            native_language: 'fr',
            target_language: 'en',
            created_at: '2026-11-08T10:00:00Z',
            updated_at: '2026-11-08T10:00:00Z',
          },
        });
      }
      return Response.json({ success: true, conversations: [], hasMore: false });
    }
    return Response.json(settings);
  });
}
export const chatBody: ChatRequest = {
  prompt: 'I has a apple.',
  languageConfig,
  history: [],
  learningFocus: [],
};

export function request(body: unknown, path = 'chat') {
  return new Request(apiUrl('/api/' + path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function providerResponse(output: unknown, finishReason = 'stop') {
  return new Response(
    JSON.stringify({
      model: 'test-model',
      choices: [
        { finish_reason: finishReason, message: { content: JSON.stringify(output) } },
      ],
      usage: { prompt_tokens: 100, completion_tokens: 50 },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}
