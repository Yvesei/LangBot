/** @jest-environment jsdom */
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import Page from '@/app/page';
import { send } from '@/lib/api';
import { STUDY_KEY } from '@/lib/learning';
import { tutorResult } from '../fixtures';
import {
  canRecord,
  RecordedRecognition,
  type Recognition,
} from '@/lib/voice/recognition';

jest.mock('@/lib/api', () => ({
  send: jest.fn(),
  translateMessage: jest.fn(),
}));

jest.mock('@/lib/voice/recognition', () => ({
  canRecord: jest.fn(),
  RecordedRecognition: jest.fn(),
}));

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };

  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
  localStorage.clear();
  localStorage.setItem('langbot-native', 'fr');
  localStorage.setItem('langbot-target', 'en');
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
  jest.mocked(send).mockReset();
  jest.mocked(send).mockResolvedValue({ success: true, ...tutorResult });
  jest.mocked(canRecord).mockReturnValue(false);
  jest.mocked(RecordedRecognition).mockReset();
});

function submit(text: string) {
  fireEvent.change(screen.getByRole('textbox', { name: 'Your message' }), {
    target: { value: text },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Send' }));
}

test('Send produces a visible correction diff', async () => {
  const { container } = render(<Page />);
  submit('I has a apple.');
  await screen.findByText(tutorResult.reply);
  const userMessage = container.querySelector('.message-user');
  expect(userMessage?.querySelector('del')).toBeInTheDocument();
  expect(userMessage?.querySelector('ins')).toBeInTheDocument();
  expect(screen.queryByText('I has a apple.')).not.toBeInTheDocument();
  expect(screen.queryByText('Corrected sentence')).not.toBeInTheDocument();
  expect(send).toHaveBeenCalledWith(
    expect.objectContaining({
      languageConfig: { nativeLanguage: 'fr', targetLanguage: 'en' },
    }),
    expect.anything(),
  );
});

test('keeps the original and reply when a correction is unavailable', async () => {
  jest.mocked(send).mockResolvedValue({
    success: true,
    ...tutorResult,
    correction: null,
  });
  const { container } = render(<Page />);

  submit('I has a apple.');

  await screen.findByText(tutorResult.reply);
  expect(screen.getByText('I has a apple.')).toBeInTheDocument();
  expect(
    screen.getByText('Correction unavailable for this message.'),
  ).toBeInTheDocument();
  expect(container.querySelector('del')).not.toBeInTheDocument();
  expect(container.querySelector('ins')).not.toBeInTheDocument();
});

test('deleting a user turn removes it and its reply from future history', async () => {
  render(<Page />);
  submit('I has a apple.');
  await screen.findByText(tutorResult.reply);
  fireEvent.click(screen.getByRole('button', { name: 'Delete turn' }));
  expect(screen.queryByText(tutorResult.reply)).not.toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem(STUDY_KEY)!)).toEqual([]);
  submit('Hello again.');
  await waitFor(() =>
    expect(send).toHaveBeenLastCalledWith(
      expect.objectContaining({ history: [], learningFocus: [] }),
      expect.anything(),
    ),
  );
});

test('New chat cancels outstanding work and ignores a late result', async () => {
  let resolve!: (value: Awaited<ReturnType<typeof send>>) => void;
  jest.mocked(send).mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  render(<Page />);
  submit('I has a apple.');
  const signal = jest.mocked(send).mock.calls[0][1]!;
  fireEvent.click(screen.getByRole('button', { name: 'New chat' }));
  expect(signal.aborted).toBe(true);
  await act(async () => {
    resolve({ success: true, ...tutorResult });
  });
  expect(screen.queryByText(tutorResult.reply)).not.toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem(STUDY_KEY)!)).toEqual([]);
});

test('a failed send is visible and can be retried without duplicating the user turn', async () => {
  jest.mocked(send).mockRejectedValueOnce(new Error('The AI service is busy.'));
  const { container } = render(<Page />);
  submit('I has a apple.');
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: 'Retry message' }));
  await screen.findByText(tutorResult.reply);
  expect(container.querySelectorAll('article')).toHaveLength(2);
});

test('same-language setup stays on the form', () => {
  localStorage.clear();
  render(<Page />);
  fireEvent.change(screen.getByRole('combobox', { name: 'Language to practise' }), {
    target: { value: 'fr' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Start practising' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Choose two different languages.');
  expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
});

test('flashcards flip between the changed words and the correction, and stay saved', async () => {
  const view = render(<Page />);
  submit('I has a apple.');
  await screen.findByText(tutorResult.reply);
  const navigation = screen.getByRole('navigation', { name: 'Chat navigation' });
  fireEvent.click(within(navigation).getByRole('button', { name: 'Flashcards · 1' }));
  const dialog = await screen.findByRole('dialog', { name: 'Your flashcards' });
  expect(screen.getByText(tutorResult.reply)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Close flashcards' })).toHaveFocus();
  expect(within(dialog).getByText('has a')).toBeVisible();
  expect(within(dialog).getByText('have an')).not.toBeVisible();
  expect(within(dialog).queryByText('I has a apple.')).not.toBeInTheDocument();

  fireEvent.click(within(dialog).getByRole('button', { pressed: false }));
  expect(within(dialog).getByText('have an')).toBeVisible();
  expect(
    within(dialog).getByText(tutorResult.correction.issues[0].explanation),
  ).toBeVisible();
  expect(within(dialog).getByText('has a')).not.toBeVisible();
  fireEvent.click(within(dialog).getByRole('button', { pressed: true }));
  expect(within(dialog).getByText('has a')).toBeVisible();
  expect(within(dialog).getByText('have an')).not.toBeVisible();
  expect(
    within(dialog).queryByRole('button', { name: 'I remembered' }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Close flashcards' }));
  fireEvent.click(screen.getByRole('button', { name: 'New chat' }));
  expect(screen.queryByText(tutorResult.reply)).not.toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Flashcards · 1' })).toBeInTheDocument();
  view.unmount();

  render(<Page />);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Flashcards · 1' }));
  expect(within(screen.getByRole('dialog')).getByText('has a')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Close flashcards' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('English-native Spanish learners see English explanations in chat and flashcards', async () => {
  localStorage.clear();
  const explanation = 'With “yo”, use “tengo”, the first-person form of “tener”.';
  const reply = '¿Qué fruta te gusta?';
  jest.mocked(send).mockResolvedValue({
    success: true,
    reply,
    correction: {
      correctedText: 'Yo tengo una manzana.',
      issues: [{ category: 'grammar', explanation }],
    },
  });
  render(<Page />);
  fireEvent.change(screen.getByRole('combobox', { name: 'Your native language' }), {
    target: { value: 'en' },
  });
  fireEvent.change(screen.getByRole('combobox', { name: 'Language to practise' }), {
    target: { value: 'es' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Start practising' }));
  submit('Yo tiene una manzana.');
  await screen.findByText(reply);
  expect(send).toHaveBeenCalledWith(
    expect.objectContaining({
      languageConfig: { nativeLanguage: 'en', targetLanguage: 'es' },
    }),
    expect.anything(),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Explain correction' }));
  expect(screen.getByText(explanation).closest('ul')).toHaveAttribute('lang', 'en');
  fireEvent.click(screen.getByRole('button', { name: 'Close explanation' }));
  expect(JSON.parse(localStorage.getItem(STUDY_KEY)!)[0].focus).toBe(explanation);

  fireEvent.click(screen.getByRole('button', { name: 'Flashcards · 1' }));
  const dialog = await screen.findByRole('dialog', { name: 'Your flashcards' });
  expect(within(dialog).getByText('tiene')).toBeVisible();
  fireEvent.click(within(dialog).getByRole('button', { pressed: false }));
  expect(within(dialog).getByText('tengo')).toBeVisible();
  expect(within(dialog).getByText('tengo')).toHaveAttribute('lang', 'es');
  expect(within(dialog).getByText(explanation)).toBeVisible();
  expect(within(dialog).getByText(explanation)).toHaveAttribute('lang', 'en');
});

test('saves a translated word through the correction and flips to its answer', async () => {
  const content = 'I need a cuillère.';
  jest.mocked(send).mockResolvedValue({
    success: true,
    ...tutorResult,
    correction: {
      correctedText: 'I need a spoon.',
      issues: [{ category: 'translation', explanation: 'Une cuillère se dit spoon.' }],
    },
  });
  const { container } = render(<Page />);
  submit(content);
  await screen.findByText(tutorResult.reply);
  const userMessage = container.querySelector('.message-user');
  expect(userMessage?.querySelector('del')).toHaveTextContent('cuillère');
  expect(userMessage?.querySelector('ins')).toHaveTextContent('spoon');
  const openReview = screen.getByRole('button', { name: 'Flashcards · 1' });
  openReview.focus();
  fireEvent.click(openReview);
  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getByText('cuillère')).toBeVisible();
  expect(within(dialog).getByText('spoon')).not.toBeVisible();
  fireEvent.click(within(dialog).getByRole('button', { pressed: false }));
  expect(within(dialog).getByText('spoon')).toBeVisible();
  expect(within(dialog).getByText('Une cuillère se dit spoon.')).toBeVisible();
  expect(send).toHaveBeenCalledTimes(1);
  fireEvent(dialog, new Event('cancel', { bubbles: true, cancelable: true }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(openReview).toHaveFocus();
});

test('spoken turns use the same correction and flashcards, which open manually after a call', async () => {
  const content = 'I need a cuillère.';
  const explanation = 'Une cuillère se dit spoon.';
  const recognition: Recognition = {
    start: jest.fn(() => recognition.onstart?.()),
    stop: jest.fn(),
    abort: jest.fn(),
    onstart: null,
    onend: null,
    onresult: null,
    onerror: null,
  };
  jest.mocked(canRecord).mockReturnValue(true);
  jest
    .mocked(RecordedRecognition)
    .mockImplementation(() => recognition as unknown as RecordedRecognition);
  jest.mocked(send).mockResolvedValue({
    success: true,
    ...tutorResult,
    correction: {
      correctedText: 'I need a spoon.',
      issues: [{ category: 'translation', explanation }],
    },
  });

  render(<Page />);
  fireEvent.click(screen.getByRole('button', { name: 'Voice call' }));
  const call = screen.getByRole('dialog', { name: 'Voice call with Languify' });

  act(() => {
    recognition.onresult?.({
      resultIndex: 0,
      results: {
        length: 1,
        0: { isFinal: true, length: 1, 0: { transcript: content } },
      },
    });
    recognition.onend?.();
  });

  await within(call).findByText(tutorResult.reply);
  expect(send).toHaveBeenCalledTimes(1);
  expect(send).toHaveBeenCalledWith(
    expect.objectContaining({
      prompt: content,
      languageConfig: { nativeLanguage: 'fr', targetLanguage: 'en' },
    }),
    expect.anything(),
  );
  const spokenMessage = within(call).getByText('You said').closest('article');
  expect(spokenMessage?.querySelector('del')).toHaveTextContent('cuillère');
  expect(spokenMessage?.querySelector('ins')).toHaveTextContent('spoon');
  const cards = JSON.parse(localStorage.getItem(STUDY_KEY)!);
  expect(cards).toHaveLength(1);
  expect(cards[0]).toMatchObject({
    originalText: content,
    correctedText: 'I need a spoon.',
    focus: explanation,
  });

  fireEvent.keyDown(window, { key: 'Escape' });
  expect(recognition.abort).toHaveBeenCalled();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByText(tutorResult.reply)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Flashcards · 1' }));
  const flashcards = screen.getByRole('dialog', { name: 'Your flashcards' });
  expect(within(flashcards).getByText('cuillère')).toBeVisible();
  fireEvent.click(within(flashcards).getByRole('button', { pressed: false }));
  expect(within(flashcards).getByText('spoon')).toBeVisible();
  expect(within(flashcards).getByText(explanation)).toBeVisible();
});

test('browsing resets the card to its front and removing the last card keeps navigation usable', async () => {
  jest
    .mocked(send)
    .mockResolvedValueOnce({ success: true, ...tutorResult })
    .mockResolvedValueOnce({
      success: true,
      ...tutorResult,
      reply: 'What did the message say?',
      correction: {
        correctedText: 'I received your message.',
        issues: [{ category: 'spelling', explanation: 'Write received, with ei.' }],
      },
    });
  render(<Page />);
  submit('I has a apple.');
  await screen.findByText(tutorResult.reply);
  submit('I recieved your message.');
  await screen.findByText('What did the message say?');
  fireEvent.click(screen.getByRole('button', { name: 'Flashcards · 2' }));
  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getByRole('button', { name: 'Previous' })).toBeDisabled();
  expect(within(dialog).getByText('1 / 2')).toBeVisible();
  fireEvent.click(within(dialog).getByRole('button', { pressed: false }));
  fireEvent.click(within(dialog).getByRole('button', { name: 'Next' }));
  expect(within(dialog).getByRole('button', { pressed: false })).toHaveTextContent(
    'recieved',
  );
  expect(within(dialog).getByRole('button', { name: 'Next' })).toBeDisabled();
  expect(within(dialog).getByText('2 / 2')).toBeVisible();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Previous' }));
  expect(within(dialog).getByRole('button', { pressed: false })).toHaveTextContent(
    'has a',
  );
  fireEvent.click(within(dialog).getByRole('button', { name: 'Next' }));
  fireEvent.click(within(dialog).getByRole('button', { name: 'Remove card' }));
  expect(within(dialog).getByRole('button', { pressed: false })).toHaveTextContent(
    'has a',
  );
  expect(within(dialog).getByText('1 / 1')).toBeVisible();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Remove card' }));
  expect(
    within(dialog).getByText('Corrections and words you ask about will appear here.'),
  ).toBeVisible();
  expect(within(dialog).queryByRole('navigation')).not.toBeInTheDocument();
});

test('recurring errors appear once and removing a card deletes all its occurrences', async () => {
  render(<Page />);
  submit('I has a apple.');
  await screen.findByText(tutorResult.reply);
  submit('I has a apple.');
  await waitFor(() => expect(screen.getAllByText(tutorResult.reply)).toHaveLength(2));
  fireEvent.click(screen.getByRole('button', { name: 'Flashcards · 1' }));
  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getByText('1 / 1')).toBeVisible();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Remove card' }));
  expect(
    within(dialog).queryByRole('button', { pressed: false }),
  ).not.toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem(STUDY_KEY)!)).toEqual([]);
});

test('flashcards from a different language pair do not appear in the new session', async () => {
  const view = render(<Page />);
  submit('I has a apple.');
  await screen.findByText(tutorResult.reply);
  view.unmount();
  localStorage.setItem('langbot-target', 'ja');
  render(<Page />);
  fireEvent.click(screen.getByRole('button', { name: 'Flashcards · 0' }));
  expect(
    within(screen.getByRole('dialog')).queryByRole('button', { pressed: false }),
  ).not.toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem(STUDY_KEY)!)).toHaveLength(1);
});

test('IME Enter does not submit a partially composed word', () => {
  render(<Page />);
  const input = screen.getByRole('textbox', { name: 'Your message' });
  fireEvent.change(input, { target: { value: '日本語' } });
  fireEvent.keyDown(input, { key: 'Enter', isComposing: true, keyCode: 229 });
  expect(send).not.toHaveBeenCalled();
});
