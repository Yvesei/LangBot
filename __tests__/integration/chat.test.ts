import { POST } from '@/app/api/chat/route';
import { enforceLimits } from '@/lib/server/limits';
import { ApiError } from '@/lib/server/errors';
import { apiUrl } from '../helpers/api';
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

test('keeps mixed-language text intact and returns vocabulary separately', async () => {
  const prompt = 'I need une cuillère.';
  const vocabulary = [
    {
      original: 'cuillère',
      translation: 'spoon',
      example: 'I need a spoon.',
      explanation: 'Une cuillère se dit spoon.',
    },
  ];
  const result = {
    ...tutorResult,
    correction: { correctedText: prompt, issues: [] },
    vocabulary,
  };
  jest.mocked(fetch).mockResolvedValue(providerResponse(result));
  const response = await POST(request({ ...chatBody, prompt }));
  expect(await response.json()).toEqual({ success: true, ...result });
  const sent = JSON.parse(jest.mocked(fetch).mock.calls[0][1]!.body as string);
  expect(sent.messages[0].content).toContain(
    'switching languages is not a grammar error',
  );
});

test('does not display vocabulary translation as a spelling correction', async () => {
  const vocabulary = [
    {
      original: 'une cuillère',
      translation: 'a spoon',
      example: 'I need a spoon.',
      explanation: 'Une cuillère se dit a spoon.',
    },
  ];
  jest.mocked(fetch).mockResolvedValue(
    providerResponse({
      ...tutorResult,
      correction: { ...tutorResult.correction, correctedText: 'I need a spoon.' },
      vocabulary,
    }),
  );
  const response = await POST(request({ ...chatBody, prompt: 'I need une cuillère.' }));
  expect(await response.json()).toMatchObject({
    success: true,
    correction: { correctedText: 'I need une cuillère.', issues: [] },
    vocabulary,
  });
});

test.each([
  ['She needs une cuillère.', true],
  ['She needs a spoon.', false],
])(
  'applies grammar edits only when native phrases survive: %s',
  async (correctedText, accepted) => {
    const correction = { ...tutorResult.correction, correctedText };
    jest.mocked(fetch).mockResolvedValue(
      providerResponse({
        ...tutorResult,
        correction,
        vocabulary: [
          {
            original: 'une cuillère',
            translation: 'a spoon',
            example: 'She needs a spoon.',
            explanation: 'Une cuillère se dit a spoon.',
          },
        ],
      }),
    );
    const response = await POST(
      request({ ...chatBody, prompt: 'She need une cuillère.' }),
    );
    expect(await response.json()).toMatchObject({
      success: true,
      reply: tutorResult.reply,
      correction: accepted ? correction : null,
    });
  },
);

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
        new Request(apiUrl('/api/chat'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{',
        }),
      )
    ).status,
  ).toBe(400);
  expect(
    (await POST(new Request(apiUrl('/api/chat'), { method: 'POST', body: 'text' })))
      .status,
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
    expected: { correctedText: chatBody.prompt, issues: [] },
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

test('returns rate-limit errors with Retry-After without calling Mistral', async () => {
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
