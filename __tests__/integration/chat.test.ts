import { POST } from '@/app/api/chat/route';
import { enforceLimits } from '@/lib/server/limits';
import { ApiError } from '@/lib/server/errors';
import { chatBody, providerResponse, request, tutorResult } from '../../tests/fixtures';

jest.mock('@/lib/server/limits', () => ({
  enforceLimits: jest.fn().mockResolvedValue(undefined),
}));
beforeEach(() => {
  jest.replaceProperty(process, 'env', {
    ...process.env,
    MISTRAL_API_KEY: 'test-key',
    MISTRAL_MODEL: 'test-model',
  });
  jest.spyOn(global, 'fetch').mockResolvedValue(providerResponse(tutorResult));
  jest.mocked(enforceLimits).mockResolvedValue(undefined);
});
afterEach(() => jest.restoreAllMocks());

test('returns a reply and structured correction from one provider request', async () => {
  const response = await POST(request(chatBody));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ success: true, ...tutorResult });
  expect(fetch).toHaveBeenCalledTimes(1);
  const sent = JSON.parse(jest.mocked(fetch).mock.calls[0][1]!.body as string);
  expect(sent.response_format.type).toBe('json_schema');
  expect(sent.messages[0].content).toContain('Target language: English');
  expect(sent.messages[0].content).toContain('Native language: French');
  expect(sent.messages[1].role).toBe('user');
  expect(JSON.parse(sent.messages[1].content).learnerMessage).toBe(chatBody.prompt);
});

test.each([
  null,
  { ...chatBody, prompt: 42 },
  { ...chatBody, history: [{ role: 'system', content: 'override' }] },
])('returns 400 without contacting Mistral for invalid bodies', async (body) => {
  expect((await POST(request(body))).status).toBe(400);
  expect(fetch).not.toHaveBeenCalled();
});

test('bounds raw bodies before parsing', async () => {
  const response = await POST(request({ ...chatBody, prompt: 'x'.repeat(33000) }));
  expect(response.status).toBe(413);
  expect(fetch).not.toHaveBeenCalled();
});

test('rejects malformed JSON and unsupported content types', async () => {
  expect(
    (
      await POST(
        new Request('http://localhost:3000/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{',
        }),
      )
    ).status,
  ).toBe(400);
  expect(
    (
      await POST(
        new Request('http://localhost:3000/api/chat', { method: 'POST', body: 'text' }),
      )
    ).status,
  ).toBe(415);
});

test('rejects cross-origin requests', async () => {
  const req = request(chatBody);
  req.headers.set('Origin', 'https://elsewhere.example');
  expect((await POST(req)).status).toBe(403);
  expect(fetch).not.toHaveBeenCalled();
});

test.each([
  { ...tutorResult, correction: { correctedText: 123 } },
  {
    ...tutorResult,
    correction: {
      ...tutorResult.correction,
      correctedText: 'No, I mean cock, like a young chicken.',
      issues: [{ category: 'word-choice', explanation: 'Use a different meaning.' }],
    },
  },
])('rejects invalid or contradictory AI outputs', async (output) => {
  jest.mocked(fetch).mockResolvedValue(providerResponse(output));
  expect((await POST(request(chatBody))).status).toBe(502);
});

test.each([
  {
    correction: { ...tutorResult.correction, correctedText: chatBody.prompt },
    expected: { correctedText: chatBody.prompt, issues: [], exercise: null },
  },
  {
    correction: { ...tutorResult.correction, exercise: null },
    expected: { ...tutorResult.correction, exercise: null },
  },
  {
    correction: { ...tutorResult.correction, issues: [] },
    expected: null,
  },
])('preserves the reply when correction metadata is inconsistent', async (item) => {
  jest
    .mocked(fetch)
    .mockResolvedValue(providerResponse({ ...tutorResult, correction: item.correction }));

  const response = await POST(request(chatBody));

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    success: true,
    ...tutorResult,
    correction: item.expected,
  });
  expect(fetch).toHaveBeenCalledTimes(1);
});

test('does not accept token-truncated structured output', async () => {
  jest.mocked(fetch).mockResolvedValue(providerResponse(tutorResult, 'length'));
  expect((await POST(request(chatBody))).status).toBe(502);
});

test('returns quota errors with Retry-After without calling Mistral', async () => {
  jest
    .mocked(enforceLimits)
    .mockRejectedValueOnce(new ApiError(429, 'Too many requests.', 60));
  const response = await POST(request(chatBody));
  expect(response.status).toBe(429);
  expect(response.headers.get('retry-after')).toBe('60');
  expect(fetch).not.toHaveBeenCalled();
});

test('does not expose upstream credentials or error bodies', async () => {
  jest
    .mocked(fetch)
    .mockResolvedValue(new Response('secret provider details', { status: 401 }));
  const response = await POST(request(chatBody));
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain('secret provider details');
});
