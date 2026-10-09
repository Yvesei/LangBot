import { POST as chat } from '@/app/api/chat/route';
import { POST as correct } from '@/app/api/correct/route';
import { POST as translate } from '@/app/api/translate/route';
import {
  chatBody,
  corrected,
  languageConfig,
  providerResponse,
  request,
  tutorResult,
} from '../../tests/fixtures';

beforeEach(() => {
  jest.replaceProperty(process, 'env', {
    ...process.env,
    MISTRAL_API_KEY: 'synthetic',
    VERCEL: '',
  });
  jest.mocked(fetch).mockReset();
});

afterEach(() => jest.restoreAllMocks());

test('shares the five-request limit across text routes and allows requests after a minute', async () => {
  const clock = jest.spyOn(Date, 'now').mockReturnValue(0);
  const chatRoute = {
    handler: chat,
    path: 'chat',
    body: chatBody,
    output: tutorResult,
  };
  const correctionRoute = {
    handler: correct,
    path: 'correct',
    body: { content: chatBody.prompt, languageConfig, userLevel: 'beginner' },
    output: corrected,
  };
  const translationRoute = {
    handler: translate,
    path: 'translate',
    body: { content: 'Hello', languageConfig },
    output: { translation: 'Bonjour' },
  };

  for (const route of [
    chatRoute,
    correctionRoute,
    translationRoute,
    chatRoute,
    translationRoute,
  ]) {
    jest.mocked(fetch).mockResolvedValueOnce(providerResponse(route.output));
    const response = await route.handler(request(route.body, route.path));

    expect(response.status).toBe(200);
  }

  const blocked = await correct(request(correctionRoute.body, 'correct'));

  expect(blocked.status).toBe(429);
  expect(blocked.headers.get('Retry-After')).toBe('60');
  expect(await blocked.json()).toEqual({
    success: false,
    error: 'Too many requests. Try again in a minute.',
  });
  expect(fetch).toHaveBeenCalledTimes(5);

  clock.mockReturnValue(60_000);
  jest.mocked(fetch).mockResolvedValueOnce(providerResponse(tutorResult));
  const allowed = await chat(request(chatBody));

  expect(allowed.status).toBe(200);
  expect(fetch).toHaveBeenCalledTimes(6);
});
