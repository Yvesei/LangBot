/** @jest-environment jsdom */
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Session } from '@supabase/supabase-js';
import Page from '@/app/page';
import { send } from '@/lib/api';
import {
  GUEST_MESSAGE_COUNT_STORAGE_KEY,
  GUEST_MESSAGE_LIMIT,
} from '@/lib/auth/guest-message-limit';
import { useAuthSession } from '@/lib/auth/client';
import { tutorResult } from '../../tests/fixtures';

jest.mock('@/lib/api', () => ({ send: jest.fn(), translateMessage: jest.fn() }));
jest.mock('@/lib/auth/client', () => ({
  ...jest.requireActual('@/lib/auth/client'),
  useAuthSession: jest.fn(),
}));
jest.mock('@/components/ui/voice/VoiceCall', () => ({
  VoiceCall: () => (
    <div
      role="dialog"
      aria-label="Voice call with Languify"
    />
  ),
}));

const guestAuth = { session: null, isLoading: false, isConfigured: true };

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('langbot-native', 'fr');
  localStorage.setItem('langbot-target', 'en');
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
  jest.mocked(useAuthSession).mockReturnValue(guestAuth);
  jest
    .mocked(send)
    .mockReset()
    .mockResolvedValue({ success: true, ...tutorResult });
});

function submit() {
  fireEvent.change(screen.getByRole('textbox', { name: 'Your message' }), {
    target: { value: 'I has a apple.' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Send' }));
}

function storeCount(count: number) {
  localStorage.setItem(GUEST_MESSAGE_COUNT_STORAGE_KEY, String(count));
}

test('blocks sending while the session is restoring', () => {
  jest.mocked(useAuthSession).mockReturnValue({ ...guestAuth, isLoading: true });
  render(<Page />);
  expect(screen.getByRole('textbox', { name: 'Your message' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Voice call' })).toBeDisabled();
  expect(send).not.toHaveBeenCalled();
});

test('counts successful guest replies and preserves the limit after new chat and reload', async () => {
  storeCount(GUEST_MESSAGE_LIMIT - 1);
  const view = render(<Page />);
  submit();
  await screen.findByText(tutorResult.reply);
  expect(localStorage.getItem(GUEST_MESSAGE_COUNT_STORAGE_KEY)).toBe(
    String(GUEST_MESSAGE_LIMIT),
  );
  expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
  expect(screen.getByRole('textbox', { name: 'Your message' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'New chat' }));
  expect(screen.getByRole('textbox', { name: 'Your message' })).toBeDisabled();
  view.unmount();
  render(<Page />);
  expect(screen.getByRole('textbox', { name: 'Your message' })).toBeDisabled();
  expect(send).toHaveBeenCalledTimes(1);
});

test('a failed send does not consume an allowance and a successful retry consumes one', async () => {
  storeCount(GUEST_MESSAGE_LIMIT - 1);
  jest.mocked(send).mockRejectedValueOnce(new Error('Please retry.'));
  render(<Page />);
  submit();
  await screen.findByRole('alert');
  expect(localStorage.getItem(GUEST_MESSAGE_COUNT_STORAGE_KEY)).toBe(
    String(GUEST_MESSAGE_LIMIT - 1),
  );
  expect(screen.getByRole('textbox', { name: 'Your message' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: 'Retry message' }));
  await screen.findByText(tutorResult.reply);
  expect(localStorage.getItem(GUEST_MESSAGE_COUNT_STORAGE_KEY)).toBe(
    String(GUEST_MESSAGE_LIMIT),
  );
});

test('ignores cancelled replies when counting guest messages', async () => {
  let resolve!: (value: Awaited<ReturnType<typeof send>>) => void;
  jest.mocked(send).mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  render(<Page />);
  submit();
  fireEvent.click(screen.getByRole('button', { name: 'New chat' }));
  await act(async () => resolve({ success: true, ...tutorResult }));
  expect(localStorage.getItem(GUEST_MESSAGE_COUNT_STORAGE_KEY)).toBeNull();
});

test('sign-in unlocks chat and sign-out closes an open call when the allowance was used', () => {
  storeCount(GUEST_MESSAGE_LIMIT);
  const view = render(<Page />);
  expect(screen.getByRole('textbox', { name: 'Your message' })).toBeDisabled();
  const session = { user: { id: 'signed-in-user' } } as Session;
  jest.mocked(useAuthSession).mockReturnValue({ ...guestAuth, session });
  view.rerender(<Page />);
  expect(screen.getByRole('textbox', { name: 'Your message' })).toBeEnabled();
  expect(screen.queryByRole('button', { name: 'Continue with Google' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Voice call' }));
  expect(screen.getByRole('dialog', { name: 'Voice call with Languify' })).toBeVisible();
  jest.mocked(useAuthSession).mockReturnValue(guestAuth);
  view.rerender(<Page />);
  expect(screen.queryByRole('dialog', { name: 'Voice call with Languify' })).toBeNull();
  expect(screen.getByRole('textbox', { name: 'Your message' })).toBeDisabled();
  jest.mocked(useAuthSession).mockReturnValue({ ...guestAuth, session });
  view.rerender(<Page />);
  expect(screen.queryByRole('dialog', { name: 'Voice call with Languify' })).toBeNull();
});

test('syncs the guest allowance from another tab and closes an open voice call', async () => {
  render(<Page />);
  fireEvent.click(screen.getByRole('button', { name: 'Voice call' }));
  act(() => {
    storeCount(GUEST_MESSAGE_LIMIT);
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: GUEST_MESSAGE_COUNT_STORAGE_KEY,
        newValue: String(GUEST_MESSAGE_LIMIT),
      }),
    );
  });
  await waitFor(() =>
    expect(screen.getByRole('textbox', { name: 'Your message' })).toBeDisabled(),
  );
  expect(screen.queryByRole('dialog', { name: 'Voice call with Languify' })).toBeNull();
});

test('blocks retries of failed messages after another tab consumes the allowance', async () => {
  jest.mocked(send).mockRejectedValueOnce(new Error('Please retry.'));
  render(<Page />);
  submit();
  await screen.findByRole('alert');
  act(() => {
    storeCount(GUEST_MESSAGE_LIMIT);
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: GUEST_MESSAGE_COUNT_STORAGE_KEY,
      }),
    );
  });
  fireEvent.click(screen.getByRole('button', { name: 'Retry message' }));
  expect(send).toHaveBeenCalledTimes(1);
});

test('keeps guest mode usable without auth configuration regardless of a saved count', async () => {
  storeCount(GUEST_MESSAGE_LIMIT);
  jest.mocked(useAuthSession).mockReturnValue({ ...guestAuth, isConfigured: false });
  render(<Page />);
  submit();
  await screen.findByText(tutorResult.reply);
  expect(screen.getByRole('textbox', { name: 'Your message' })).toBeEnabled();
  expect(screen.queryByRole('button', { name: 'Continue with Google' })).toBeNull();
  expect(localStorage.getItem(GUEST_MESSAGE_COUNT_STORAGE_KEY)).toBe(
    String(GUEST_MESSAGE_LIMIT),
  );
});
