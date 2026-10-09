import { providerResponse } from '../../tests/fixtures';
import { POST } from '@/app/api/transcribe/route';
import { enforceLimits } from '@/lib/server/limits';
jest.mock('@/lib/server/limits', () => ({
  enforceLimits: jest.fn().mockResolvedValue(undefined),
}));

function request(
  body: BodyInit = new Uint8Array([79, 103, 103, 83]),
  headers: Record<string, string> = {},
) {
  return new Request('http://localhost:3000/api/transcribe', {
    method: 'POST',
    body,
    headers: {
      'Content-Type': 'audio/ogg;codecs=opus',
      'X-Native-Language': 'fr',
      'X-Target-Language': 'en',
      ...headers,
    },
  });
}
beforeEach(() => {
  jest.replaceProperty(process, 'env', { ...process.env, MISTRAL_API_KEY: 'test-key' });
  jest.mocked(global.fetch).mockReset();
});
afterEach(() => jest.restoreAllMocks());

test('sends both selected languages to Voxtral and preserves a mixed transcript', async () => {
  jest
    .mocked(global.fetch)
    .mockResolvedValue(
      providerResponse({ text: 'I need une cuillère.', languages: ['en', 'fr'] }),
    );
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ success: true, text: 'I need une cuillère.' });
  expect(enforceLimits).toHaveBeenCalled();
  const [url, options] = jest.mocked(global.fetch).mock.calls[0];
  expect(url).toBe('https://api.mistral.ai/v1/chat/completions');
  const body = JSON.parse(options!.body as string);
  expect(body.model).toBe('voxtral-small-latest');
  expect(body.messages[0].content).toContain('French (fr)');
  expect(body.messages[0].content).toContain('English (en)');
  expect(body.messages[0].content).toContain('Never translate');
  expect(body.messages[1].content[0].type).toBe('input_audio');
  expect(body.messages[1].content[0].input_audio).toBe('T2dnUw==');
  expect(response.headers.get('cache-control')).toBe('no-store');
});

test.each([
  [new Uint8Array(), {}, 400],
  [new Uint8Array([1]), { 'Content-Type': 'application/json' }, 415],
  [new Uint8Array([1]), { 'X-Native-Language': 'invalid' }, 400],
  [new Uint8Array([1]), { 'X-Target-Language': 'fr' }, 400],
  [new Uint8Array([1]), { 'X-Native-Language': '' }, 400],
  [new Uint8Array([1]), { 'X-Target-Language': '' }, 400],
  [new Uint8Array(2 * 1024 * 1024 + 1), {}, 413],
  [new Uint8Array([1]), { Origin: 'https://untrusted.example' }, 403],
] as const)(
  'rejects invalid audio requests before contacting Mistral',
  async (body, headers, status) => {
    const response = await POST(request(body, headers));
    expect(response.status).toBe(status);
    expect(global.fetch).not.toHaveBeenCalled();
  },
);

test.each([
  { text: 'Hola.', languages: ['es'] },
  { text: 'Hello hola.', languages: ['en', 'es'] },
  { text: '', languages: [] },
  { text: 'Uncertain.', languages: [] },
])('rejects unrelated languages and unrecognized speech', async (transcript) => {
  jest.mocked(global.fetch).mockResolvedValue(providerResponse(transcript));
  const response = await POST(request());
  expect(response.status).toBe(422);
  expect(await response.json()).toMatchObject({ success: false });
});

test.each(['fr', 'en'])(
  'accepts a turn entirely in either selected language: %s',
  async (language) => {
    jest
      .mocked(global.fetch)
      .mockResolvedValue(providerResponse({ text: 'Transcript', languages: [language] }));
    expect((await POST(request())).status).toBe(200);
  },
);

test('uses updated language settings instead of a fixed English recognition language', async () => {
  jest
    .mocked(global.fetch)
    .mockResolvedValue(providerResponse({ text: '日本語', languages: ['ja'] }));
  const response = await POST(
    request(undefined, { 'X-Native-Language': 'de', 'X-Target-Language': 'ja' }),
  );
  expect(response.status).toBe(200);
  const body = JSON.parse(jest.mocked(global.fetch).mock.calls[0][1]!.body as string);
  expect(body.messages[0].content).toContain('German (de) and Japanese (ja)');
});

test('surfaces voice quota errors without leaking upstream details or retrying', async () => {
  jest
    .mocked(global.fetch)
    .mockResolvedValue(new Response('private quota details', { status: 429 }));
  const response = await POST(request());
  expect(response.status).toBe(429);
  expect(await response.text()).not.toContain('private quota details');
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('does not leak provider errors or accept an oversized transcript', async () => {
  jest
    .mocked(global.fetch)
    .mockResolvedValueOnce(new Response('private provider error', { status: 403 }));
  const failed = await POST(request());
  expect(failed.status).toBe(503);
  expect(await failed.text()).not.toContain('private provider error');
  jest
    .mocked(global.fetch)
    .mockResolvedValueOnce(
      providerResponse({ text: 'x'.repeat(2001), languages: ['en'] }),
    );
  expect((await POST(request())).status).toBe(502);
});
