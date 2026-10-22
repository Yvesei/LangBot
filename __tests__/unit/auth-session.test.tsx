/** @jest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react';
import type { Session } from '@supabase/supabase-js';

import { useAuthSession } from '@/lib/auth/use-session';

let mockConfigured = true;
const mockGetSession = jest.fn();
const mockUnsubscribe = jest.fn();
let mockListener: ((event: string, session: Session | null) => void) | undefined;

jest.mock('@/lib/auth/config', () => ({
  isSupabaseConfigured: () => mockConfigured,
}));

jest.mock('@/lib/auth/browser', () => ({
  getSupabaseBrowserClient: () =>
    mockConfigured
      ? {
          auth: {
            getSession: mockGetSession,

            onAuthStateChange: (listener: typeof mockListener) => {
              mockListener = listener;
              return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
            },
          },
        }
      : null,
}));

const session = { user: { id: 'user-1' } } as Session;

beforeEach(() => {
  mockConfigured = true;
  mockGetSession.mockReset();
  mockUnsubscribe.mockReset();
  mockListener = undefined;
});

test('restores the browser session and finishes loading', async () => {
  mockGetSession.mockResolvedValue({ data: { session } });
  const { result } = renderHook(useAuthSession);

  expect(result.current.isLoading).toBe(true);
  await waitFor(() => expect(result.current.session).toBe(session));
  expect(result.current.isLoading).toBe(false);
});

test('finishes loading when session restoration fails', async () => {
  mockGetSession.mockRejectedValue(new Error('Offline'));
  const { result } = renderHook(useAuthSession);

  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.session).toBeNull();
});

test('does not restore a stale session after signing out', async () => {
  let resolveSession!: (value: { data: { session: Session } }) => void;
  mockGetSession.mockReturnValue(
    new Promise((resolve) => {
      resolveSession = resolve;
    }),
  );
  const { result } = renderHook(useAuthSession);

  act(() => mockListener?.('SIGNED_OUT', null));
  await act(async () => resolveSession({ data: { session } }));

  expect(result.current.session).toBeNull();
  expect(result.current.isLoading).toBe(false);
});

test('does not clear a new session when the initial request fails', async () => {
  let rejectSession!: (error: Error) => void;
  mockGetSession.mockReturnValue(
    new Promise((_resolve, reject) => {
      rejectSession = reject;
    }),
  );
  const { result } = renderHook(useAuthSession);

  act(() => mockListener?.('SIGNED_IN', session));
  await act(async () => rejectSession(new Error('Offline')));

  expect(result.current.session).toBe(session);
  expect(result.current.isLoading).toBe(false);
});

test('unsubscribes from auth events on unmount', async () => {
  mockGetSession.mockResolvedValue({ data: { session: null } });
  const { unmount } = renderHook(useAuthSession);
  await act(async () => undefined);

  unmount();

  expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
});

test('works in guest mode without configuring a client', () => {
  mockConfigured = false;
  const { result } = renderHook(useAuthSession);

  expect(result.current).toEqual({
    session: null,
    isLoading: false,
    isConfigured: false,
  });
  expect(mockGetSession).not.toHaveBeenCalled();
});
