import { send, correctMessage, translateMessage } from '@/lib/api';
import { chatBody, corrected, languageConfig, tutorResult } from '../../tests/fixtures';

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

test('chat sends the contract and validates the response', async () => {
  jest.mocked(fetch).mockResolvedValue(Response.json({ success: true, ...tutorResult }));
  const result = await send(chatBody);
  expect(result.reply).toBe(tutorResult.reply);
  expect(fetch).toHaveBeenCalledWith(
    '/api/chat',
    expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(chatBody),
    }),
  );
});

test('correction and translation use their own validated contracts', async () => {
  jest
    .mocked(fetch)
    .mockResolvedValueOnce(Response.json({ success: true, correction: corrected }));
  expect(
    (await correctMessage('I has a apple.', languageConfig, 'beginner')).correction,
  ).toEqual(corrected);
  jest
    .mocked(fetch)
    .mockResolvedValueOnce(Response.json({ success: true, translation: 'Bonjour' }));
  expect((await translateMessage('Hello', languageConfig)).translation).toBe('Bonjour');
  expect(jest.mocked(fetch).mock.calls.map(([url]) => url)).toEqual([
    '/api/correct',
    '/api/translate',
  ]);
});

test.each([
  [
    Response.json({ success: false, error: 'Quota reached' }, { status: 429 }),
    'Quota reached',
  ],
  [Response.json({ unexpected: true }, { status: 503 }), 'The request failed'],
  [new Response('<html>Proxy error</html>', { status: 502 }), 'unreadable response'],
  [Response.json({ success: true, reply: 'missing correction' }), 'invalid response'],
])(
  'shows useful errors without accepting malformed responses',
  async (response, message) => {
    jest.mocked(fetch).mockResolvedValue(response);
    await expect(send(chatBody)).rejects.toThrow(message);
  },
);

test('caller cancellation reaches fetch and yields a cancellation error', async () => {
  const controller = new AbortController();
  jest.mocked(fetch).mockImplementation(
    (_url, options) =>
      new Promise((_resolve, reject) => {
        options!.signal!.addEventListener(
          'abort',
          () => reject(options!.signal!.reason),
          { once: true },
        );
      }),
  );
  const pending = send(chatBody, controller.signal);
  const rejected = expect(pending).rejects.toThrow('Request cancelled');
  controller.abort();
  await rejected;
  expect(jest.mocked(fetch).mock.calls[0][1]!.signal!.aborted).toBe(true);
});

test('the client deadline aborts a stalled request', async () => {
  jest.useFakeTimers();
  jest.spyOn(AbortSignal, 'timeout').mockImplementation((ms) => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms);
    return controller.signal;
  });
  jest.mocked(fetch).mockImplementation(
    (_url, options) =>
      new Promise((_resolve, reject) => {
        options!.signal!.addEventListener(
          'abort',
          () => reject(options!.signal!.reason),
          { once: true },
        );
      }),
  );
  const rejected = expect(send(chatBody)).rejects.toThrow('timed out');
  await jest.advanceTimersByTimeAsync(40000);
  await rejected;
});
