import { complete } from '@/lib/server/mistral';
import { translationOutputSchema } from '@/lib/schemas';
import { providerResponse } from '../../tests/fixtures';
const messages = [{ role: 'user' as const, content: 'Hello' }];
beforeEach(() => {
  jest.replaceProperty(process, 'env', { ...process.env, MISTRAL_API_KEY: 'synthetic' });
});
afterEach(() => jest.restoreAllMocks());

test('retries a transient response once and accepts the valid result', async () => {
  const mock = jest
    .spyOn(global, 'fetch')
    .mockResolvedValueOnce(
      new Response('', { status: 429, headers: { 'Retry-After': '0' } }),
    )
    .mockResolvedValueOnce(providerResponse({ translation: 'Bonjour' }));
  expect(
    await complete(
      translationOutputSchema,
      'translation',
      messages,
      new AbortController().signal,
    ),
  ).toEqual({ translation: 'Bonjour' });
  expect(mock).toHaveBeenCalledTimes(2);
});
test('does not wait beyond the bounded retry budget', async () => {
  const mock = jest.spyOn(global, 'fetch').mockResolvedValue(
    new Response('', {
      status: 429,
      headers: { 'Retry-After': '60' },
    }),
  );
  await expect(
    complete(
      translationOutputSchema,
      'translation',
      messages,
      new AbortController().signal,
    ),
  ).rejects.toMatchObject({ status: 429, retryAfter: 60 });
  expect(mock).toHaveBeenCalledTimes(1);
});
test('propagates cancellation through the provider signal', async () => {
  const controller = new AbortController();
  controller.abort();
  jest.spyOn(global, 'fetch').mockImplementation(async (_url, options) => {
    options!.signal!.throwIfAborted();
    return providerResponse({ translation: 'Bonjour' });
  });
  await expect(
    complete(translationOutputSchema, 'translation', messages, controller.signal),
  ).rejects.toMatchObject({ status: 504 });
});
test('rejects non-JSON output and never treats it as a correction', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValue(
    new Response(
      JSON.stringify({
        choices: [{ finish_reason: 'stop', message: { content: 'not JSON' } }],
      }),
    ),
  );
  await expect(
    complete(
      translationOutputSchema,
      'translation',
      messages,
      new AbortController().signal,
    ),
  ).rejects.toMatchObject({ status: 502 });
});
