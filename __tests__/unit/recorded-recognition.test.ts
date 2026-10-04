/** @jest-environment jsdom */
import { RecordedRecognition } from '@/lib/voice/recognition';
import { languageConfig } from '../../tests/fixtures';

class FakeRecorder {
  static latest: FakeRecorder;
  static isTypeSupported = (type: string) => type.startsWith('audio/ogg');
  state = 'inactive';
  mimeType = 'audio/ogg;codecs=opus';
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  start() {
    this.state = 'recording';
  }
  stop() {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['test-audio']) });
    this.onstop?.();
  }
  constructor() {
    FakeRecorder.latest = this;
  }
}
const stopTrack = jest.fn();
const stream = { getTracks: () => [{ stop: stopTrack }] };
const flush = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
};
beforeEach(() => {
  jest.useFakeTimers();
  stopTrack.mockReset();
  jest.mocked(global.fetch).mockReset();
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: jest.fn().mockResolvedValue(stream) },
  });
  Object.defineProperty(window, 'MediaRecorder', {
    configurable: true,
    value: FakeRecorder,
  });
});
afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

test('records a turn, releases the mic, and emits the server transcript', async () => {
  jest.mocked(global.fetch).mockResolvedValue({
    ok: true,
    json: async () => ({ text: 'I need une cuillère.' }),
  } as Response);
  const recognition = new RecordedRecognition(languageConfig);
  recognition.onresult = jest.fn();
  recognition.onend = jest.fn();
  recognition.start();
  await flush();
  recognition.stop();
  await flush();
  expect(stopTrack).toHaveBeenCalledTimes(1);
  expect(global.fetch).toHaveBeenCalledWith(
    '/api/transcribe',
    expect.objectContaining({
      headers: {
        'Content-Type': 'audio/ogg;codecs=opus',
        'X-Native-Language': 'fr',
        'X-Target-Language': 'en',
      },
      body: expect.any(Blob),
    }),
  );
  expect(recognition.onresult).toHaveBeenCalledWith(
    expect.objectContaining({
      results: expect.objectContaining({
        0: expect.objectContaining({
          0: { transcript: 'I need une cuillère.' },
          isFinal: true,
        }),
      }),
    }),
  );
  expect(recognition.onend).toHaveBeenCalledTimes(1);
  recognition.abort();
});

test('cancels a pending upload and ignores its late response', async () => {
  let resolve!: (response: Response) => void;
  jest.mocked(global.fetch).mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const recognition = new RecordedRecognition(languageConfig);
  recognition.onresult = jest.fn();
  recognition.start();
  await flush();
  recognition.stop();
  const signal = jest.mocked(global.fetch).mock.calls[0][1]!.signal!;
  recognition.abort();
  resolve({ ok: true, json: async () => ({ text: 'Late reply' }) } as Response);
  await flush();
  expect(signal.aborted).toBe(true);
  expect(recognition.onresult).not.toHaveBeenCalled();
});

test('releases a microphone permission request that resolves after closing', async () => {
  let resolve!: (value: MediaStream) => void;
  jest.mocked(navigator.mediaDevices.getUserMedia).mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const recognition = new RecordedRecognition(languageConfig);
  recognition.onstart = jest.fn();
  recognition.start();
  recognition.abort();
  resolve(stream as unknown as MediaStream);
  await flush();
  expect(stopTrack).toHaveBeenCalledTimes(1);
  expect(recognition.onstart).not.toHaveBeenCalled();
  expect(global.fetch).not.toHaveBeenCalled();
});

test('muting an active recording discards it without uploading', async () => {
  const recognition = new RecordedRecognition(languageConfig);
  recognition.start();
  await flush();
  recognition.abort();
  expect(FakeRecorder.latest.state).toBe('inactive');
  expect(stopTrack).toHaveBeenCalledTimes(1);
  expect(global.fetch).not.toHaveBeenCalled();
});

test('permission denial and unavailable formats release resources and report errors', async () => {
  jest
    .mocked(navigator.mediaDevices.getUserMedia)
    .mockRejectedValueOnce(new DOMException('Denied', 'NotAllowedError'));
  const recognition = new RecordedRecognition(languageConfig);
  recognition.onerror = jest.fn();
  recognition.start();
  await flush();
  expect(recognition.onerror).toHaveBeenCalledWith(
    expect.objectContaining({ error: 'not-allowed' }),
  );
  jest.spyOn(FakeRecorder, 'isTypeSupported').mockReturnValue(false);
  recognition.start();
  await flush();
  expect(recognition.onerror).toHaveBeenLastCalledWith(
    expect.objectContaining({ error: 'format' }),
  );
  expect(stopTrack).toHaveBeenCalledTimes(1);
  expect(fetch).not.toHaveBeenCalled();
});

test.each([
  [
    { ok: false, json: async () => ({ error: 'Usage limit reached.' }) },
    'Usage limit reached.',
  ],
  [{ ok: true, json: async () => ({ text: '' }) }, 'didn’t catch that'],
  [{ ok: true, json: async () => ({ text: 42 }) }, 'invalid response'],
  [{ ok: true, json: async () => ({ text: 'x'.repeat(2001) }) }, 'invalid response'],
])(
  'reports transcription failures and allows another turn',
  async (response, message) => {
    jest.mocked(fetch).mockResolvedValue(response as Response);
    const recognition = new RecordedRecognition(languageConfig);
    recognition.onerror = jest.fn();
    recognition.start();
    await flush();
    recognition.stop();
    await flush();
    expect(recognition.onerror).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining(message) }),
    );
    recognition.start();
    await flush();
    expect(FakeRecorder.latest.state).toBe('recording');
    recognition.abort();
  },
);

test('oversized recordings are discarded before upload', async () => {
  const recognition = new RecordedRecognition(languageConfig);
  recognition.onerror = jest.fn();
  recognition.start();
  await flush();
  FakeRecorder.latest.ondataavailable?.({
    data: new Blob([new Uint8Array(2 * 1024 * 1024 + 1)]),
  });
  expect(recognition.onerror).toHaveBeenCalledWith(
    expect.objectContaining({ error: 'size' }),
  );
  expect(stopTrack).toHaveBeenCalledTimes(1);
  expect(fetch).not.toHaveBeenCalled();
});

test('a stalled transcription is aborted after its deadline', async () => {
  jest.mocked(fetch).mockImplementation(
    (_url, options) =>
      new Promise((_resolve, reject) => {
        options!.signal!.addEventListener('abort', () => reject(new Error('Aborted')), {
          once: true,
        });
      }),
  );
  const recognition = new RecordedRecognition(languageConfig);
  recognition.onerror = jest.fn();
  recognition.start();
  await flush();
  recognition.stop();
  await jest.advanceTimersByTimeAsync(35000);
  expect(recognition.onerror).toHaveBeenCalledWith(
    expect.objectContaining({ message: expect.stringContaining('timed out') }),
  );
  expect(jest.getTimerCount()).toBe(0);
});

function mockAudioContext(sample: () => number) {
  const close = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(window, 'AudioContext', {
    configurable: true,
    value: class {
      state = 'running';
      resume = jest.fn().mockResolvedValue(undefined);
      close = close;
      createMediaStreamSource = () => ({ connect: jest.fn() });
      createAnalyser = () => ({
        fftSize: 2048,
        getByteTimeDomainData: (data: Uint8Array) => data.fill(sample()),
      });
    },
  });
  return close;
}

test('a pause after speech sends exactly one turn and releases audio resources', async () => {
  let sample = 145;
  const close = mockAudioContext(() => sample);
  jest
    .mocked(fetch)
    .mockResolvedValue({ ok: true, json: async () => ({ text: 'Hello' }) } as Response);
  const recognition = new RecordedRecognition(languageConfig);
  recognition.start();
  await flush();
  await jest.advanceTimersByTimeAsync(500);
  sample = 128;
  await jest.advanceTimersByTimeAsync(1600);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(close).toHaveBeenCalledTimes(1);
  expect(stopTrack).toHaveBeenCalledTimes(1);
  recognition.abort();
});

test('silence is not uploaded and continuous speech has a bounded turn duration', async () => {
  mockAudioContext(() => 128);
  const recognition = new RecordedRecognition(languageConfig);
  recognition.onerror = jest.fn();
  recognition.start();
  await flush();
  await jest.advanceTimersByTimeAsync(30100);
  expect(fetch).not.toHaveBeenCalled();
  expect(recognition.onerror).toHaveBeenCalledWith(
    expect.objectContaining({ error: 'silence' }),
  );
  mockAudioContext(() => 145);
  jest
    .mocked(fetch)
    .mockResolvedValue({ ok: true, json: async () => ({ text: 'Hello' }) } as Response);
  recognition.start();
  await flush();
  await jest.advanceTimersByTimeAsync(30100);
  expect(fetch).toHaveBeenCalledTimes(1);
  recognition.abort();
});
