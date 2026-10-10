import { POST } from '@/app/api/translate/route';
import { languageConfig, providerResponse, request } from '../../tests/fixtures';
jest.mock('@/lib/server/limits', () => ({
  enforceLimits: jest.fn().mockResolvedValue(undefined),
}));
beforeEach(() => {
  jest.replaceProperty(process, 'env', { ...process.env, MISTRAL_API_KEY: 'test-key' });
  jest
    .spyOn(global, 'fetch')
    .mockResolvedValue(providerResponse({ translation: 'Bonjour\nMaya !' }));
});
afterEach(() => jest.restoreAllMocks());

test('uses the selected language pair and preserves structured translation', async () => {
  const response = await POST(
    request({ content: 'Hello\nMaya!', languageConfig }, 'translate'),
  );
  expect(response.status).toBe(200);
  expect((await response.json()).translation).toBe('Bonjour\nMaya !');
  const sent = JSON.parse(jest.mocked(fetch).mock.calls[0][1]!.body as string);
  expect(sent.messages[0].content).toContain('English to French');
});
test('missing language configuration must be a 400, never an accepted 500', async () => {
  expect((await POST(request({ content: 'Hello' }, 'translate'))).status).toBe(400);
  expect(fetch).not.toHaveBeenCalled();
});
