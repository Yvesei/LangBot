/** @jest-environment jsdom */
import '@testing-library/jest-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import Page from '@/app/page';
import { send } from '@/lib/api';
import { tutorResult } from '../../tests/fixtures';

jest.mock('@/lib/api', () => ({
  send: jest.fn(),
  translateMessage: jest.fn(),
}));

jest.mock('@/lib/voice/recognition', () => ({
  canRecord: jest.fn().mockReturnValue(false),
  RecordedRecognition: jest.fn(),
}));

const originalWidth = window.innerWidth;

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('langbot-native', 'en');
  localStorage.setItem('langbot-target', 'es');
  window.innerWidth = 390;
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
  window.innerWidth = originalWidth;
});

test('mobile navigation preserves the draft and returns focus after Escape or backdrop close', () => {
  const { container } = render(<Page />);
  const message = screen.getByRole('textbox', { name: 'Your message' });
  fireEvent.change(message, { target: { value: 'My unfinished message.' } });
  const open = screen.getByRole('button', { name: 'Open navigation' });
  fireEvent.click(open);
  const navigation = screen.getByRole('dialog', { name: 'App navigation' });
  expect(
    within(navigation).getByRole('button', { name: 'Close navigation' }),
  ).toHaveFocus();
  expect(container.querySelector('.chat-workspace')).toHaveAttribute('inert');

  fireEvent.keyDown(window, { key: 'Escape' });
  expect(
    screen.queryByRole('dialog', { name: 'App navigation' }),
  ).not.toBeInTheDocument();
  expect(message).toHaveValue('My unfinished message.');
  expect(open).toHaveFocus();
  expect(container.querySelector('.chat-workspace')).not.toHaveAttribute('inert');

  fireEvent.click(open);
  fireEvent.click(container.querySelector('.sidebar-backdrop')!);
  expect(open).toHaveFocus();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('mobile navigation traps focus and releases the conversation on desktop resize', () => {
  const { container } = render(<Page />);
  fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
  const navigation = screen.getByRole('dialog', { name: 'App navigation' });
  const first = within(navigation).getByRole('button', { name: 'Close navigation' });
  const last = within(navigation).getByRole('link', { name: 'GitHub repository' });
  fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
  expect(last).toHaveFocus();
  fireEvent.keyDown(window, { key: 'Tab' });
  expect(first).toHaveFocus();

  window.innerWidth = 1024;
  fireEvent(window, new Event('resize'));
  expect(container.querySelector('.chat-workspace')).not.toHaveAttribute('inert');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'New chat' })).toHaveFocus();
});

test('opening flashcards from the drawer closes navigation and restores focus to the menu', async () => {
  render(<Page />);
  fireEvent.change(screen.getByRole('textbox', { name: 'Your message' }), {
    target: { value: 'Yo tiene una manzana.' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Send' }));
  await screen.findByText(tutorResult.reply);
  const open = screen.getByRole('button', { name: 'Open navigation' });
  fireEvent.click(open);
  const navigation = screen.getByRole('dialog', { name: 'App navigation' });
  fireEvent.click(within(navigation).getByRole('button', { name: 'Flashcards · 1' }));
  expect(
    screen.queryByRole('dialog', { name: 'App navigation' }),
  ).not.toBeInTheDocument();
  const cards = screen.getByRole('dialog', { name: 'Your flashcards' });
  fireEvent.click(within(cards).getByRole('button', { name: 'Close flashcards' }));
  expect(open).toHaveFocus();
  expect(screen.getByText(tutorResult.reply)).toBeInTheDocument();
});
