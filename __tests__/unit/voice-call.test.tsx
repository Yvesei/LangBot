/** @jest-environment jsdom */
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen } from '@testing-library/react';
import * as voice from '@/lib/voice/recognition';
import type { LanguageConfig } from '@/lib/schemas';
import { VoiceCall } from '@/components/ui/voice/VoiceCall';
import { corrected, languageConfig } from '../../tests/fixtures';

jest.mock('@/lib/voice/recognition', () => ({
  canRecord: jest.fn(),
  RecordedRecognition: jest.fn(),
}));

const { RecordedRecognition: RealRecordedRecognition } = jest.requireActual<typeof voice>(
  '@/lib/voice/recognition',
);

class FakeRecognition {
  static latest: FakeRecognition;
  lang = '';
  continuous = false;
  interimResults = false;
  maxAlternatives = 1;
  onstart: (() => void) | null = null;
  onresult: ((event: never) => void) | null = null;
  onerror: ((event: never) => void) | null = null;
  onend: (() => void) | null = null;
  start = jest.fn(() => this.onstart?.());
  stop = jest.fn();
  abort = jest.fn();

  constructor(public config: LanguageConfig) {
    FakeRecognition.latest = this;
  }
}

class FakeUtterance {
  lang = '';
  voice: SpeechSynthesisVoice | null = null;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(public text: string) {}
}

const speak = jest.fn();
const cancel = jest.fn();
const config = { ...languageConfig };

beforeEach(() => {
  jest.mocked(voice.canRecord).mockReturnValue(true);
  jest.mocked(voice.RecordedRecognition).mockImplementation((config) => {
    return new FakeRecognition(config) as unknown as voice.RecordedRecognition;
  });
  speak.mockReset();
  cancel.mockReset();
  Object.defineProperty(window, 'SpeechRecognition', {
    configurable: true,
    value: FakeRecognition,
  });
  Object.defineProperty(window, 'webkitSpeechRecognition', {
    configurable: true,
    value: undefined,
  });
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: {
      speak,
      cancel,

      getVoices: () => [],
    },
  });
  Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', {
    configurable: true,
    value: FakeUtterance,
  });
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
});

afterEach(() => jest.restoreAllMocks());

const baseProps = {
  open: true,
  config,
  messages: [],
  loading: false,
  error: '',
  onSend: jest.fn(),
  onRetry: jest.fn(),
  onClearError: jest.fn(),
  onClose: jest.fn(),
};

test('submits a mixed-language transcript using both configured languages', () => {
  const oldSend = jest.fn();
  const currentSend = jest.fn();
  const view = render(
    <VoiceCall
      {...baseProps}
      onSend={oldSend}
    />,
  );
  expect(screen.getByRole('status')).toHaveTextContent('Listening');
  expect(FakeRecognition.latest.config).toEqual(languageConfig);
  view.rerender(
    <VoiceCall
      {...baseProps}
      onSend={currentSend}
    />,
  );
  const results = {
    0: { 0: { transcript: 'I need une cuillère' }, isFinal: true, length: 1 },
    length: 1,
  };
  act(() => {
    FakeRecognition.latest.onresult?.({ resultIndex: 0, results } as never);
    FakeRecognition.latest.onend?.();
  });
  expect(oldSend).not.toHaveBeenCalled();
  expect(currentSend).toHaveBeenCalledWith('I need une cuillère');
  expect(screen.getByRole('status')).toHaveTextContent('thinking');
});

test('keeps both sides readable, shows a correction, and speaks the new reply', () => {
  const view = render(<VoiceCall {...baseProps} />);
  const user = {
    id: 'user-1',
    role: 'user' as const,
    content: 'I has a apple.',
    timestamp: new Date(),
    status: 'complete' as const,
    correction: corrected,
  };
  const assistant = {
    id: 'assistant-1',
    role: 'assistant' as const,
    content: 'What fruit do you like?',
    timestamp: new Date(),
    status: 'complete' as const,
    replyTo: user.id,
  };
  view.rerender(
    <VoiceCall
      {...baseProps}
      messages={[user, assistant]}
    />,
  );
  const userMessage = screen.getByText('You said').closest('article');
  expect(userMessage?.querySelector('del')).toBeInTheDocument();
  expect(userMessage?.querySelector('ins')).toBeInTheDocument();
  expect(screen.queryByText('I has a apple.')).not.toBeInTheDocument();
  expect(screen.getByText('What fruit do you like?')).toBeInTheDocument();
  expect(screen.queryByText('Suggested correction')).not.toBeInTheDocument();
  expect(speak).toHaveBeenCalledTimes(1);
  expect((speak.mock.calls[0][0] as FakeUtterance).text).toBe('What fruit do you like?');
});

test('shows a useful fallback when recording is unavailable', () => {
  jest.mocked(voice.canRecord).mockReturnValue(false);
  Object.defineProperty(window, 'SpeechRecognition', {
    configurable: true,
    value: undefined,
  });
  render(<VoiceCall {...baseProps} />);
  expect(
    screen.getByText('Voice calls aren’t available in this browser'),
  ).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Back to chat' })).toBeInTheDocument();
});

test('Firefox can start recording without the browser speech recognition API', () => {
  jest
    .mocked(voice.RecordedRecognition)
    .mockImplementation((config) => new RealRecordedRecognition(config));
  Object.defineProperty(window, 'SpeechRecognition', {
    configurable: true,
    value: undefined,
  });
  const getUserMedia = jest.fn(() => new Promise(() => {}));
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia },
  });
  Object.defineProperty(window, 'MediaRecorder', { configurable: true, value: class {} });
  const view = render(<VoiceCall {...baseProps} />);
  expect(
    screen.queryByText('Voice calls aren’t available in this browser'),
  ).not.toBeInTheDocument();
  expect(getUserMedia).toHaveBeenCalledWith(
    expect.objectContaining({ audio: expect.any(Object) }),
  );
  expect(screen.getByText(/Audio is sent to Mistral/)).toBeInTheDocument();
  view.unmount();
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: undefined,
  });
  Object.defineProperty(window, 'MediaRecorder', {
    configurable: true,
    value: undefined,
  });
});

test('missing speech playback does not prevent microphone input', () => {
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: undefined,
  });
  render(<VoiceCall {...baseProps} />);
  expect(screen.getByRole('status')).toHaveTextContent('Listening');
  expect(screen.getByRole('button', { name: 'Play spoken replies' })).toBeDisabled();
});

test('closing the call detaches callbacks and ignores late speech completion', () => {
  const view = render(<VoiceCall {...baseProps} />);
  view.rerender(
    <VoiceCall
      {...baseProps}
      messages={[
        { id: 'reply', role: 'assistant', content: 'Hello', timestamp: new Date() },
      ]}
    />,
  );
  const utterance = speak.mock.calls[0][0] as FakeUtterance;
  const lateEnd = utterance.onend;
  const mic = FakeRecognition.latest;
  view.unmount();
  expect(mic.onend).toBeNull();
  expect(utterance.onend).toBeNull();
  act(() => lateEnd?.());
  expect(mic.start).toHaveBeenCalledTimes(1);
});

test('Escape immediately releases the microphone', () => {
  render(<VoiceCall {...baseProps} />);
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(FakeRecognition.latest.abort).toHaveBeenCalled();
  expect(cancel).toHaveBeenCalled();
});

test('muting and unmuting the mic while the AI speaks does not record its reply', () => {
  const view = render(<VoiceCall {...baseProps} />);
  view.rerender(
    <VoiceCall
      {...baseProps}
      messages={[
        { id: 'reply', role: 'assistant', content: 'Hello', timestamp: new Date() },
      ]}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Mute microphone' }));
  fireEvent.click(screen.getByRole('button', { name: 'Unmute microphone' }));
  expect(FakeRecognition.latest.start).toHaveBeenCalledTimes(1);
  act(() => (speak.mock.calls[0][0] as FakeUtterance).onend?.());
  expect(FakeRecognition.latest.start).toHaveBeenCalledTimes(2);
});

test('aggregates final and interim transcript segments before submitting a turn', () => {
  const onSend = jest.fn();
  render(
    <VoiceCall
      {...baseProps}
      onSend={onSend}
    />,
  );
  act(() =>
    FakeRecognition.latest.onresult?.({
      resultIndex: 1,
      results: {
        length: 3,
        0: { 0: { transcript: 'Ignored' }, isFinal: true, length: 1 },
        1: { 0: { transcript: 'Hello' }, isFinal: true, length: 1 },
        2: { 0: { transcript: ' world' }, isFinal: false, length: 1 },
      },
    } as never),
  );
  const transcriptDisplays = screen.getAllByText('Hello world');
  expect(transcriptDisplays).toHaveLength(2);
  expect(transcriptDisplays.map((display) => display.textContent)).toEqual([
    'Hello  world',
    'Hello  world',
  ]);
  act(() => FakeRecognition.latest.onend?.());
  expect(onSend).toHaveBeenCalledWith('Hello');
});

test('oversized final transcripts pause the microphone without sending', () => {
  const onSend = jest.fn();
  render(
    <VoiceCall
      {...baseProps}
      onSend={onSend}
    />,
  );
  act(() => {
    FakeRecognition.latest.onresult?.({
      resultIndex: 0,
      results: {
        length: 1,
        0: { 0: { transcript: 'x'.repeat(2001) }, isFinal: true, length: 1 },
      },
    } as never);
    FakeRecognition.latest.onend?.();
  });
  expect(onSend).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toHaveTextContent('Please speak in shorter turns.');
  expect(screen.getByRole('button', { name: 'Unmute microphone' })).toBeInTheDocument();
});

test.each(['onend', 'onerror'] as const)(
  'speech %s resumes listening only once and ignores repeated callbacks',
  (callback) => {
    const view = render(<VoiceCall {...baseProps} />);
    view.rerender(
      <VoiceCall
        {...baseProps}
        messages={[
          {
            id: 'reply',
            role: 'assistant',
            content: '**Hello**\n world',
            timestamp: new Date(),
          },
        ]}
      />,
    );
    const utterance = speak.mock.calls[0][0] as FakeUtterance;
    expect(utterance.text).toBe('Hello world');
    act(() => utterance[callback]?.());
    expect(FakeRecognition.latest.start).toHaveBeenCalledTimes(2);
    act(() => utterance[callback]?.());
    expect(FakeRecognition.latest.start).toHaveBeenCalledTimes(2);
    if (callback === 'onerror') {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'The spoken reply could not be played.',
      );
    }
  },
);
