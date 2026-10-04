/** @jest-environment jsdom */
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import Page from '@/app/page';
import { checkPractice, send } from '@/lib/api';
import { STUDY_KEY } from '@/lib/learning';
import { tutorResult } from '../../tests/fixtures';

jest.mock('@/lib/api', () => ({
  send: jest.fn(),
  translateMessage: jest.fn(),
  checkPractice: jest.fn(),
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
  jest.mocked(checkPractice).mockReset();
});
function submit(text: string) {
  fireEvent.change(screen.getByRole('textbox', { name: 'Your message' }), {
    target: { value: text },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Send' }));
}
test('Send produces a visible correction diff and saves an exercise', async () => {
  const { container } = render(<Page />);
  submit('I has a apple.');
  await screen.findByText(tutorResult.reply);
  const userMessage = container.querySelector('.message-user');
  expect(userMessage?.querySelector('del')).toBeInTheDocument();
  expect(userMessage?.querySelector('ins')).toBeInTheDocument();
  expect(screen.queryByText('I has a apple.')).not.toBeInTheDocument();
  expect(screen.queryByText('Corrected sentence')).not.toBeInTheDocument();
  expect(await screen.findByText('Practice · 1 ready')).toBeInTheDocument();
  expect(send).toHaveBeenCalledWith(
    expect.objectContaining({
      languageConfig: { nativeLanguage: 'fr', targetLanguage: 'en' },
      userLevel: 'beginner',
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
  expect(screen.getByText('Practice · 0 ready')).toBeInTheDocument();
});

test('language and level selections reach the tutor', async () => {
  localStorage.setItem('langbot-native', 'en');
  localStorage.setItem('langbot-target', 'ja');
  render(<Page />);
  fireEvent.change(screen.getByRole('combobox', { name: 'Level' }), {
    target: { value: 'advanced' },
  });
  submit('こんにちは');
  await waitFor(() =>
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        languageConfig: { nativeLanguage: 'en', targetLanguage: 'ja' },
        userLevel: 'advanced',
      }),
      expect.anything(),
    ),
  );
});
test('deleting a user turn removes it and its reply from future history and removes its exercise', async () => {
  render(<Page />);
  submit('I has a apple.');
  await screen.findByText(tutorResult.reply);
  fireEvent.click(screen.getByRole('button', { name: 'Delete turn' }));
  expect(screen.queryByText(tutorResult.reply)).not.toBeInTheDocument();
  expect(screen.getByText('Practice · 0 ready')).toBeInTheDocument();
  submit('Hello again.');
  await waitFor(() =>
    expect(send).toHaveBeenLastCalledWith(
      expect.objectContaining({ history: [] }),
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
  expect(screen.getByText('Practice · 0 ready')).toBeInTheDocument();
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

test('end of session opens saved cards and due cards return on the next visit', async () => {
  const view = render(<Page />);
  submit('I has a apple.');
  await screen.findByText(tutorResult.reply);
  fireEvent.click(screen.getByRole('button', { name: 'End session & review' }));
  const dialog = await screen.findByRole('dialog', { name: 'Your review cards' });
  expect(within(dialog).getByText('I has a apple.')).toBeVisible();
  expect(within(dialog).queryByText('I have an apple.')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Close review' })).toHaveFocus();
  view.unmount();

  render(<Page />);
  const nextVisit = await screen.findByRole('dialog');
  fireEvent.click(within(nextVisit).getByRole('button', { name: 'Show answer' }));
  expect(within(nextVisit).getByText('I have an apple.')).toBeVisible();
  fireEvent.click(within(nextVisit).getByRole('button', { name: 'I remembered' }));
  expect(within(nextVisit).getByRole('status')).toHaveTextContent('Review saved');
  await waitFor(() => {
    const saved = JSON.parse(localStorage.getItem(STUDY_KEY)!);
    expect(saved[0].successes).toBe(1);
    expect(saved[0].dueAt).toBeGreaterThan(Date.now());
  });
  fireEvent.click(screen.getByRole('button', { name: 'Close review' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('saves vocabulary from a mixed sentence without marking it as a grammar error', async () => {
  const content = 'I need une cuillère.';
  jest.mocked(send).mockResolvedValue({
    success: true,
    ...tutorResult,
    correction: { correctedText: content, issues: [], exercise: null },
    vocabulary: [
      {
        original: 'cuillère',
        translation: 'spoon',
        example: 'I need a spoon.',
        explanation: 'Une cuillère se dit spoon.',
      },
    ],
  });
  const { container } = render(<Page />);
  submit(content);
  await screen.findByText(tutorResult.reply);
  expect(container.querySelector('.message-user')).toHaveTextContent(content);
  expect(container.querySelector('ins')).not.toBeInTheDocument();
  expect(screen.getByText('Practice · 0 ready')).toBeInTheDocument();
  const openReview = screen.getByRole('button', { name: 'Review cards · 1' });
  openReview.focus();
  fireEvent.click(openReview);
  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getByText('cuillère')).toBeVisible();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Show answer' }));
  expect(within(dialog).getByText('spoon')).toBeVisible();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Practise again' }));
  const saved = JSON.parse(localStorage.getItem(STUDY_KEY)!);
  expect(saved[0].attempts).toBe(1);
  expect(saved[0].successes).toBe(0);
  expect(saved[0].dueAt).toBeGreaterThan(Date.now());
  fireEvent(dialog, new Event('cancel', { bubbles: true, cancelable: true }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(openReview).toHaveFocus();
});

test('recurring errors share a review card and forgetting removes all its occurrences', async () => {
  render(<Page />);
  submit('I has a apple.');
  await screen.findByText(tutorResult.reply);
  submit('I has a apple.');
  await waitFor(() => expect(screen.getAllByText(tutorResult.reply)).toHaveLength(2));
  fireEvent.click(screen.getByRole('button', { name: 'Review cards · 1' }));
  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getAllByRole('article')).toHaveLength(1);
  expect(within(dialog).getByText('2 times in your conversations')).toBeVisible();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Forget this card' }));
  expect(within(dialog).queryByRole('article')).not.toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem(STUDY_KEY)!)).toEqual([]);
});

test('review cards from a different language pair do not appear in the new session', async () => {
  const view = render(<Page />);
  submit('I has a apple.');
  await screen.findByText(tutorResult.reply);
  view.unmount();
  localStorage.setItem('langbot-target', 'ja');
  render(<Page />);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Review cards · 0' }));
  expect(
    within(screen.getByRole('dialog')).queryByRole('article'),
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

test('practice feedback schedules a review and persists it across a reload', async () => {
  jest
    .mocked(checkPractice)
    .mockResolvedValue({ success: true, correct: true, feedback: 'Bien joué !' });
  const view = render(<Page />);
  submit('I has a apple.');
  fireEvent.click(await screen.findByRole('button', { name: 'Practise now' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Your answer' }), {
    target: { value: 'have' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
  await screen.findByText('Bien joué !');
  await waitFor(() => {
    const saved = JSON.parse(localStorage.getItem(STUDY_KEY)!);
    expect(saved[0].attempts).toBe(1);
    expect(saved[0].dueAt).toBeGreaterThan(Date.now());
  });
  view.unmount();
  render(<Page />);
  expect(screen.getByText('Practice · 0 ready')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Practice · 0 ready' }));
  expect(screen.getByText(/1 saved exercises/)).toBeVisible();
});
