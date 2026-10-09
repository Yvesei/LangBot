import type { ChatRequest } from '@/lib/schemas';

export const languageConfig = {
  nativeLanguage: 'fr' as const,
  targetLanguage: 'en' as const,
};
export const corrected = {
  correctedText: 'I have an apple.',
  issues: [
    {
      category: 'grammar' as const,
      explanation: 'Use have with I and an before a vowel sound.',
    },
  ],
  exercise: {
    instruction: 'Complete the sentence.',
    sentence: 'I ___ a book.',
    answer: 'have',
  },
};
export const tutorResult = {
  reply: 'What fruit do you like?',
  correction: corrected,
  topics: ['Nourriture'],
};
export const chatBody: ChatRequest = {
  prompt: 'I has a apple.',
  languageConfig,
  userLevel: 'beginner',
  history: [],
  learningFocus: [],
};

export function request(body: unknown, path = 'chat') {
  return new Request('http://localhost:3000/api/' + path, {
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
