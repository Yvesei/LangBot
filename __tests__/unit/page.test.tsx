/** @jest-environment jsdom */
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
