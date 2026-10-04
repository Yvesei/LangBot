import { POST } from '@/app/api/practice/route';
import {
  corrected,
  languageConfig,
  providerResponse,
  request,
} from '../../tests/fixtures';
jest.mock('@/lib/server/limits', () => ({
  enforceLimits: jest.fn().mockResolvedValue(undefined),
}));
afterEach(() => jest.restoreAllMocks());

test('grades a saved exercise with explicit feedback', async () => {
  jest.replaceProperty(process, 'env', { ...process.env, MISTRAL_API_KEY: 'test-key' });
  jest
    .spyOn(global, 'fetch')
    .mockResolvedValue(providerResponse({ correct: true, feedback: 'Bien joué !' }));
  const response = await POST(
    request({ exercise: corrected.exercise, answer: 'have', languageConfig }, 'practice'),
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    success: true,
    correct: true,
    feedback: 'Bien joué !',
  });
});
