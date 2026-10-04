import { POST } from '@/app/api/correct/route';
import {
  corrected,
  languageConfig,
  providerResponse,
  request,
} from '../../tests/fixtures';
jest.mock('@/lib/server/limits', () => ({
  enforceLimits: jest.fn().mockResolvedValue(undefined),
}));
beforeEach(() => {
  jest.replaceProperty(process, 'env', { ...process.env, MISTRAL_API_KEY: 'test-key' });
  jest.spyOn(global, 'fetch').mockResolvedValue(providerResponse(corrected));
});
afterEach(() => jest.restoreAllMocks());

test('returns minimal corrections and an exercise instead of a magic sentinel', async () => {
  const response = await POST(
    request(
      { content: 'I has a apple.', languageConfig, userLevel: 'beginner' },
      'correct',
    ),
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ success: true, correction: corrected });
});
test('returns unchanged text explicitly when no errors are found', async () => {
  const correction = { correctedText: 'Hello.', issues: [], exercise: null };
  jest.mocked(fetch).mockResolvedValue(providerResponse(correction));
  const response = await POST(
    request({ content: 'Hello.', languageConfig, userLevel: 'beginner' }, 'correct'),
  );
  expect(response.status).toBe(200);
  expect((await response.json()).correction).toEqual(correction);
});
test('rejects non-string content rather than throwing a 500', async () => {
  expect(
    (
      await POST(
        request({ content: 23, languageConfig, userLevel: 'beginner' }, 'correct'),
      )
    ).status,
  ).toBe(400);
  expect(fetch).not.toHaveBeenCalled();
});

test.each([
  {
    correction: { ...corrected, correctedText: 'I has a apple.' },
    expected: { correctedText: 'I has a apple.', issues: [], exercise: null },
  },
  {
    correction: { ...corrected, exercise: null },
    expected: { ...corrected, exercise: null },
  },
  {
    correction: { ...corrected, issues: [] },
    expected: null,
  },
])('handles inconsistent correction metadata without a gateway error', async (item) => {
  jest.mocked(fetch).mockResolvedValue(providerResponse(item.correction));

  const response = await POST(
    request(
      { content: 'I has a apple.', languageConfig, userLevel: 'beginner' },
      'correct',
    ),
  );

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    success: true,
    correction: item.expected,
  });
  expect(fetch).toHaveBeenCalledTimes(1);
});
