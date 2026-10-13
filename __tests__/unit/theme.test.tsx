/** @jest-environment jsdom */
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import Page from '@/app/page';
import { ThemeSwitcher } from '@/components/ui/chat/sidebar/ThemeSwitcher';
import { send } from '@/lib/api';
import { THEME_INIT_SCRIPT, THEME_STORAGE_KEY } from '@/lib/config/theme';
import { toggleTheme } from '@/lib/theme/store';
import { tutorResult } from '../../tests/fixtures';

jest.mock('@/lib/api', () => ({
  send: jest.fn(),
  translateMessage: jest.fn(),
}));

jest.mock('@/lib/voice/recognition', () => ({
  canRecord: jest.fn().mockReturnValue(false),
  RecordedRecognition: jest.fn(),
}));

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('langbot-native', 'fr');
  localStorage.setItem('langbot-target', 'en');
  document.documentElement.dataset.theme = 'neo';
  window.HTMLElement.prototype.scrollIntoView = jest.fn();

  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };

  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
  jest.mocked(send).mockResolvedValue({ success: true, ...tutorResult });
});

afterEach(() => {
  jest.restoreAllMocks();
  document.documentElement.dataset.theme = 'neo';
});

test('switches both themes without clearing the conversation or saved flashcards', async () => {
  render(<Page />);
  fireEvent.change(screen.getByRole('textbox', { name: 'Your message' }), {
    target: { value: 'I has a apple.' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Send' }));
  await screen.findByText(tutorResult.reply);

  fireEvent.click(screen.getByRole('button', { name: 'Switch to Original theme' }));
  expect(document.documentElement).toHaveAttribute('data-theme', 'original');
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('original');
  expect(screen.getByText(tutorResult.reply)).toBeInTheDocument();
  expect(localStorage.getItem('langbot-native')).toBe('fr');
  expect(localStorage.getItem('langbot-target')).toBe('en');

  fireEvent.click(screen.getByRole('button', { name: 'Flashcards · 1' }));
  const dialog = await screen.findByRole('dialog', { name: 'Your flashcards' });
  fireEvent.click(within(dialog).getByRole('button', { pressed: false }));
  expect(
    within(dialog).getByText(tutorResult.correction.issues[0].explanation),
  ).toBeVisible();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Close flashcards' }));

  fireEvent.click(screen.getByRole('button', { name: 'Switch to Neo brutalism theme' }));
  expect(document.documentElement).toHaveAttribute('data-theme', 'neo');
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('neo');
  expect(screen.getByText(tutorResult.reply)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Flashcards · 1' })).toBeInTheDocument();
});

test('restores the saved theme across remounts', () => {
  localStorage.setItem(THEME_STORAGE_KEY, 'original');
  new Function(THEME_INIT_SCRIPT)();
  const view = render(<ThemeSwitcher />);
  expect(document.documentElement).toHaveAttribute('data-theme', 'original');
  expect(
    screen.getByRole('button', { name: 'Switch to Neo brutalism theme' }),
  ).toBeInTheDocument();
  view.unmount();

  document.documentElement.dataset.theme = 'neo';
  new Function(THEME_INIT_SCRIPT)();
  render(<ThemeSwitcher />);
  expect(document.documentElement).toHaveAttribute('data-theme', 'original');
});

test('still switches appearance when browser storage is blocked', () => {
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('Storage is blocked.');
  });
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Storage is blocked.');
  });
  render(<ThemeSwitcher />);

  fireEvent.click(screen.getByRole('button', { name: 'Switch to Original theme' }));
  expect(document.documentElement).toHaveAttribute('data-theme', 'original');
  fireEvent.click(screen.getByRole('button', { name: 'Switch to Neo brutalism theme' }));
  expect(document.documentElement).toHaveAttribute('data-theme', 'neo');
});

test('keeps multiple switchers in sync and handles rapid toggles', () => {
  render(
    <>
      <ThemeSwitcher />
      <ThemeSwitcher />
    </>,
  );
  fireEvent.click(screen.getAllByRole('button', { name: 'Switch to Original theme' })[0]);
  expect(
    screen.getAllByRole('button', { name: 'Switch to Neo brutalism theme' }),
  ).toHaveLength(2);

  act(() => {
    toggleTheme();
    toggleTheme();
  });
  expect(document.documentElement).toHaveAttribute('data-theme', 'original');
  expect(
    screen.getAllByRole('button', { name: 'Switch to Neo brutalism theme' }),
  ).toHaveLength(2);
});

test('syncs theme changes from another tab without writing them back', () => {
  render(<ThemeSwitcher />);
  const writeStorage = jest.spyOn(Storage.prototype, 'setItem');
  fireEvent(
    window,
    new StorageEvent('storage', {
      key: THEME_STORAGE_KEY,
      newValue: 'original',
    }),
  );
  expect(document.documentElement).toHaveAttribute('data-theme', 'original');
  expect(
    screen.getByRole('button', { name: 'Switch to Neo brutalism theme' }),
  ).toBeInTheDocument();
  expect(writeStorage).not.toHaveBeenCalled();

  fireEvent(window, new StorageEvent('storage', { key: 'unrelated', newValue: 'neo' }));
  expect(document.documentElement).toHaveAttribute('data-theme', 'original');

  fireEvent(window, new StorageEvent('storage', { key: null }));
  expect(document.documentElement).toHaveAttribute('data-theme', 'neo');
});

test('keeps the current appearance across remounts when storage is blocked', () => {
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Storage is blocked.');
  });
  const view = render(<ThemeSwitcher />);
  fireEvent.click(screen.getByRole('button', { name: 'Switch to Original theme' }));
  view.unmount();
  render(<ThemeSwitcher />);
  expect(
    screen.getByRole('button', { name: 'Switch to Neo brutalism theme' }),
  ).toBeInTheDocument();
});

test('boots the default theme when storage cannot be read', () => {
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('Storage is blocked.');
  });
  document.documentElement.dataset.theme = 'original';
  new Function(THEME_INIT_SCRIPT)();
  render(<ThemeSwitcher />);
  expect(
    screen.getByRole('button', { name: 'Switch to Original theme' }),
  ).toBeInTheDocument();
});

test.each([
  { saved: 'original', expected: 'original' },
  { saved: 'neo', expected: 'neo' },
  { saved: 'focus', expected: 'original' },
  { saved: 'unrecognized-theme', expected: 'neo' },
])(
  'applies $expected before hydration when storage contains $saved',
  ({ saved, expected }) => {
    localStorage.setItem(THEME_STORAGE_KEY, saved);
    new Function(THEME_INIT_SCRIPT)();
    expect(document.documentElement).toHaveAttribute('data-theme', expected);
  },
);
