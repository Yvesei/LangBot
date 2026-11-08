import { translateMessage } from '@/lib/api';
import { languageConfig } from '../fixtures';

beforeEach(() => {
  jest.mocked(fetch).mockReset();
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

test('JSON validation keeps its original precedence over subsequently queued cancellation', async () => {
  const controller = new AbortController();
  jest.mocked(fetch).mockResolvedValue({
    ok: true,

    json: () => {
      const decodedResponse = Promise.resolve({});
      decodedResponse.then(() => queueMicrotask(() => controller.abort()));
      return decodedResponse;
    },
  } as Response);

  await expect(
    translateMessage('Hello', languageConfig, controller.signal),
  ).rejects.toThrow('The service returned an invalid response. Please retry.');
  expect(controller.signal.aborted).toBe(true);
});

test('translation uses its own validated contract', async () => {
  jest
    .mocked(fetch)
    .mockResolvedValueOnce(Response.json({ success: true, translation: 'Bonjour' }));
  expect((await translateMessage('Hello', languageConfig)).translation).toBe('Bonjour');
  expect(jest.mocked(fetch).mock.calls.map(([url]) => url)).toEqual(['/api/translate']);
});
