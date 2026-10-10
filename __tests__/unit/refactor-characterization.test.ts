import { z } from 'zod';
import { parseCompletionResponse } from '@/lib/server/mistral-response';
import { getRetryDelay, waitForRetry } from '@/lib/server/retry';
import { readBytes } from '@/lib/server/http';
import {
  providerResponse,
  corrected,
  languageConfig,
  tutorResult,
} from '../../tests/fixtures';
import { wordDiff } from '@/lib/diff';
import { addAssistantReply, buildChatRequest } from '@/lib/chat/conversation';
import { MAX_REQUEST_BYTES } from '@/lib/config/limits';

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

const outputSchema = z.object({ translation: z.string().trim().min(1) });

function conversationMessage(id: string, content: string) {
  return { id, content, role: 'user' as const, timestamp: new Date(0) };
}

test('diff ties prefer removing the original tokens and merge adjacent parts', () => {
  expect(wordDiff('a b', 'b a')).toEqual([
    { type: 'removed', text: 'a ' },
    { type: 'equal', text: 'b' },
    { type: 'added', text: ' a' },
  ]);
});

test('large diffs preserve the common prefix and suffix exactly', () => {
  const originalMiddle = 'a '.repeat(600);
  const correctedMiddle = 'b '.repeat(600);
  expect(wordDiff(`start ${originalMiddle}end`, `start ${correctedMiddle}end`)).toEqual([
    { type: 'equal', text: 'start ' },
    { type: 'removed', text: originalMiddle.slice(0, -1) },
    { type: 'added', text: correctedMiddle.slice(0, -1) },
    { type: 'equal', text: ' end' },
  ]);
});

test('fallback tokenization preserves punctuation, whitespace, and combining marks', () => {
  const segmenterDescriptor = Object.getOwnPropertyDescriptor(Intl, 'Segmenter')!;
  Object.defineProperty(Intl, 'Segmenter', { value: undefined, configurable: true });
  try {
    expect(wordDiff('cafe\u0301\n  !', 'cafe\u0301\n  ?')).toEqual([
      { type: 'equal', text: 'cafe\u0301\n  ' },
      { type: 'removed', text: '!' },
      { type: 'added', text: '?' },
    ]);
  } finally {
    Object.defineProperty(Intl, 'Segmenter', segmenterDescriptor);
  }
});

test('completion parsing retains schema transformations and optional metadata defaults', async () => {
  const response = new Response(
    JSON.stringify({
      choices: [
        {
          finish_reason: 'stop',
          message: { content: '{"translation":" Bonjour ","extra":true}' },
        },
        { finish_reason: 'stop', message: { content: '{"translation":"Ignored"}' } },
      ],
    }),
  );
  expect(await parseCompletionResponse(response, outputSchema)).toEqual({
    data: { translation: 'Bonjour' },
    model: undefined,
    usage: null,
  });
});

test.each([
  [{ choices: [] }, 'The AI response was incomplete. Please retry.'],
  [
    { choices: [{ finish_reason: 'length', message: { content: '{}' } }] },
    'The AI response was incomplete. Please retry.',
  ],
  [
    { choices: [{ finish_reason: 'stop', message: { content: 'not JSON' } }] },
    'The AI returned an invalid response. Please retry.',
  ],
  [
    { choices: [{ finish_reason: 'stop', message: { content: '{"translation":42}' } }] },
    'The AI returned an invalid response. Please retry.',
  ],
])('completion parsing preserves each validation error', async (body, message) => {
  await expect(
    parseCompletionResponse(new Response(JSON.stringify(body)), outputSchema),
  ).rejects.toMatchObject({ status: 502, message });
});

test('malformed provider envelopes retain their JSON decoding exception', async () => {
  await expect(
    parseCompletionResponse(new Response('not JSON'), outputSchema),
  ).rejects.toMatchObject({ name: 'SyntaxError' });
});

test('completion parsing returns reported model and usage unchanged', async () => {
  expect(
    await parseCompletionResponse(
      providerResponse({ translation: 'Bonjour' }),
      outputSchema,
    ),
  ).toEqual({
    data: { translation: 'Bonjour' },
    model: 'test-model',
    usage: { prompt_tokens: 100, completion_tokens: 50 },
  });
});

test('retry delays preserve numeric, past-date, future-date, and jitter behavior', () => {
  jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-01-01T00:00:00Z'));
  jest.spyOn(Math, 'random').mockReturnValue(0.5);
  expect(getRetryDelay('2')).toBe(2000);
  expect(getRetryDelay('-1')).toBe(-1000);
  expect(getRetryDelay('Wed, 31 Dec 2025 23:59:59 GMT')).toBe(0);
  expect(getRetryDelay('Thu, 01 Jan 2026 00:00:03 GMT')).toBe(3000);
  expect(getRetryDelay('invalid')).toBe(850);
  expect(getRetryDelay(null)).toBe(850);
});

test('aborting a retry rejects with the caller reason and clears the timer', async () => {
  jest.useFakeTimers();
  const controller = new AbortController();
  const reason = new Error('Caller cancelled');
  const retry = waitForRetry(100, controller.signal);
  const rejection = expect(retry).rejects.toBe(reason);
  controller.abort(reason);
  await rejection;
  expect(jest.getTimerCount()).toBe(0);
});

test('stream byte reads combine chunks in arrival order', async () => {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array([1, 2]));
      controller.enqueue(new Uint8Array([3]));
      controller.close();
    },
  });
  const request = new Request('http://localhost/api/chat', {
    method: 'POST',
    body,
    duplex: 'half',
  } as RequestInit);
  expect(await readBytes(request, 3)).toEqual(new Uint8Array([1, 2, 3]));
  expect(request.body?.locked).toBe(false);
});

test('stalled stream reads preserve timeout errors and release the reader', async () => {
  jest.useFakeTimers();
  const request = new Request('http://localhost/api/chat', {
    method: 'POST',
    body: new ReadableStream(),
    duplex: 'half',
  } as RequestInit);
  const reading = readBytes(request, 3);
  const rejection = expect(reading).rejects.toMatchObject({
    status: 408,
    message: 'Request body timed out.',
  });
  await jest.advanceTimersByTimeAsync(5000);
  await rejection;
  expect(request.body?.locked).toBe(false);
  expect(jest.getTimerCount()).toBe(0);
});

test('chat history drops pending/failed turns and stops at the first oversized recent turn', () => {
  const messages = [
    conversationMessage('old', 'Old'),
    conversationMessage('oversized', 'x'.repeat(20000)),
    conversationMessage('recent', 'Recent'),
    { ...conversationMessage('pending', 'Pending'), status: 'pending' as const },
    { ...conversationMessage('failed', 'Failed'), status: 'failed' as const },
  ];
  const request = buildChatRequest({
    content: 'Hello',
    messages,
    cards: [],
    config: languageConfig,
    level: 'beginner',
  });
  expect(request.history).toEqual([{ role: 'user', content: 'Recent' }]);
});

test('chat history respects UTF-8 request size and retry cutoffs', () => {
  const messages = Array.from({ length: 12 }, (_, index) =>
    conversationMessage(String(index), '語'.repeat(1000)),
  );
  const options = {
    content: 'Hello',
    messages,
    cards: [],
    config: languageConfig,
    level: 'beginner' as const,
  };
  const request = buildChatRequest(options);
  expect(
    new TextEncoder().encode(JSON.stringify(request)).byteLength,
  ).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
  expect(request.history.length).toBeLessThan(messages.length);
  expect(buildChatRequest({ ...options, retryMessageId: '1' }).history).toEqual([
    { role: 'user', content: messages[0].content },
  ]);
});

test('reply insertion preserves unrelated message identities', () => {
  const original = conversationMessage('one', 'Original');
  const unrelated = conversationMessage('two', 'Other');
  const replies = addAssistantReply([original, unrelated], original.id, tutorResult);
  expect(replies[0]).toEqual({ ...original, correction: corrected, status: 'complete' });
  expect(replies[1]).toMatchObject({
    role: 'assistant',
    replyTo: 'one',
    content: tutorResult.reply,
  });
  expect(replies[2]).toBe(unrelated);
  expect(original).not.toHaveProperty('correction');
});
