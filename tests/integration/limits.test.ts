import { POST as correct } from '@/app/api/correct/route';
import { POST as translate } from '@/app/api/translate/route';
import { POST as transcribe } from '@/app/api/transcribe/route';
import { corrected, languageConfig, providerResponse, request } from '../fixtures';

beforeEach(() => {
  jest.replaceProperty(process, 'env', {
    ...process.env,
    MISTRAL_API_KEY: 'synthetic',
    VERCEL: '',
  });
  jest.mocked(fetch).mockReset();
});

afterEach(() => jest.restoreAllMocks());

function audioRequest() {
  return new Request('http://localhost:3000/api/transcribe', {
    method: 'POST',
    body: new Uint8Array([79, 103, 103, 83]),
    headers: {
      'Content-Type': 'audio/ogg',
      'X-Native-Language': 'fr',
      'X-Target-Language': 'en',
    },
  });
}

test('shares the five-request limit across text and transcription routes and resets after a minute', async () => {
  const clock = jest.spyOn(Date, 'now').mockReturnValue(0);
  const correctionRoute = {
    handler: correct,
    path: 'correct',
    body: { content: 'I has a apple.', languageConfig },
    output: corrected,
  };
  const translationRoute = {
    handler: translate,
    path: 'translate',
    body: { content: 'Hello', languageConfig },
    output: { translation: 'Bonjour' },
  };

  for (const route of [
    correctionRoute,
    translationRoute,
    correctionRoute,
    translationRoute,
  ]) {
    jest.mocked(fetch).mockResolvedValueOnce(providerResponse(route.output));
    const response = await route.handler(request(route.body, route.path));

    expect(response.status).toBe(200);
  }

  jest
    .mocked(fetch)
    .mockResolvedValueOnce(providerResponse({ text: 'Hello', languages: ['en'] }));
  expect((await transcribe(audioRequest())).status).toBe(200);

  const blocked = await transcribe(audioRequest());

  expect(blocked.status).toBe(429);
  expect(blocked.headers.get('Retry-After')).toBe('60');
  expect(await blocked.json()).toEqual({
    success: false,
    error: 'Too many requests. Try again in a minute.',
  });
  expect(fetch).toHaveBeenCalledTimes(5);

  clock.mockReturnValue(60_000);
  jest.mocked(fetch).mockResolvedValueOnce(providerResponse(corrected));
  const allowed = await correct(request(correctionRoute.body, correctionRoute.path));

  expect(allowed.status).toBe(200);
  expect(fetch).toHaveBeenCalledTimes(6);
});
