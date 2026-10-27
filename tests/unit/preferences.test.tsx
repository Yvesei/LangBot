/** @jest-environment jsdom */
import '@testing-library/jest-dom';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { Session } from '@supabase/supabase-js';

import type { AuthSessionState } from '@/lib/auth/client';
import type { AppSettings } from '@/lib/config/preferences';
import { THEME_STORAGE_KEY } from '@/lib/config/theme';
import { usePreferences } from '@/lib/config/usePreferences';
import { setThemePersistence, toggleTheme } from '@/lib/theme/store';

const guestConfig = { nativeLanguage: 'fr', targetLanguage: 'en' } as const;
const savedConfig = { nativeLanguage: 'de', targetLanguage: 'en' } as const;
const selectedConfig = { nativeLanguage: 'es', targetLanguage: 'fr' } as const;

function auth(userId: string | null): AuthSessionState {
  return {
    session: userId ? ({ user: { id: userId } } as Session) : null,
    isLoading: false,
    isConfigured: true,
  };
}

function settings(userId: string | null, guestMessageLimit = 3): AppSettings {
  return {
    success: true,
    userId,
    guestMessageLimit,
    preferences: userId ? { ...savedConfig, theme: 'neo' } : null,
  };
}

function response(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,

    json: async () => body,
  } as Response;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function expectGuestStorage() {
  expect(localStorage.getItem('langbot-native')).toBe(guestConfig.nativeLanguage);
  expect(localStorage.getItem('langbot-target')).toBe(guestConfig.targetLanguage);
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('original');
}

beforeEach(() => {
  jest.mocked(fetch).mockReset();
  setThemePersistence();
  localStorage.clear();
  localStorage.setItem('langbot-native', guestConfig.nativeLanguage);
  localStorage.setItem('langbot-target', guestConfig.targetLanguage);
  localStorage.setItem(THEME_STORAGE_KEY, 'original');
  document.documentElement.dataset.theme = 'original';
});

afterEach(() => {
  setThemePersistence();
  jest.restoreAllMocks();
});

test('restores account preferences, saves changes to the database, and restores guest preferences on logout', async () => {
  let userId: string | null = 'user-1';
  jest
    .mocked(fetch)
    .mockImplementation(async (_url, options) =>
      response(
        options?.method === 'PATCH' ? { success: true, userId } : settings(userId),
      ),
    );
  const { result, rerender } = renderHook(({ account }) => usePreferences(account), {
    initialProps: { account: auth(userId) },
  });

  await waitFor(() => expect(result.current.isReady).toBe(true));
  expect(result.current.config).toEqual(savedConfig);
  expect(result.current.guestMessageLimit).toBe(3);
  expect(document.documentElement).toHaveAttribute('data-theme', 'neo');
  expectGuestStorage();

  act(() => {
    result.current.setConfig(selectedConfig);
    toggleTheme();
  });
  await waitFor(() => {
    expect(fetch).toHaveBeenLastCalledWith(
      '/api/settings',
      expect.objectContaining({
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Profile-User-ID': 'user-1',
        },
        body: JSON.stringify({ languageConfig: selectedConfig, theme: 'original' }),
        cache: 'no-store',
      }),
    );
  });
  expect(result.current.config).toEqual(selectedConfig);
  expect(document.documentElement).toHaveAttribute('data-theme', 'original');
  expectGuestStorage();

  userId = null;
  rerender({ account: auth(userId) });
  await waitFor(() => expect(result.current.isReady).toBe(true));
  expect(result.current.config).toEqual(guestConfig);
  expect(document.documentElement).toHaveAttribute('data-theme', 'original');
  act(() => toggleTheme());
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('neo');
});

test('ignores a delayed response from the previous account after switching users', async () => {
  const previous = deferred<Response>();
  const next = {
    ...settings('user-2'),
    preferences: { ...selectedConfig, theme: 'original' },
  };
  jest
    .mocked(fetch)
    .mockReturnValueOnce(previous.promise)
    .mockResolvedValueOnce(response(next));
  const { result, rerender } = renderHook(({ account }) => usePreferences(account), {
    initialProps: { account: auth('user-1') },
  });
  const previousSignal = jest.mocked(fetch).mock.calls[0][1]?.signal;
  expect(result.current.isReady).toBe(false);

  rerender({ account: auth('user-2') });
  await waitFor(() => expect(result.current.isReady).toBe(true));
  expect(previousSignal?.aborted).toBe(true);
  expect(result.current.config).toEqual(selectedConfig);

  await act(async () => previous.resolve(response(settings('user-1'))));
  expect(result.current.config).toEqual(selectedConfig);
  expect(document.documentElement).toHaveAttribute('data-theme', 'original');
  expectGuestStorage();
});

test('saves a theme chosen while restoring auth to the resolved account without a late GET undoing it', async () => {
  const pending = deferred<Response>();
  jest.mocked(fetch).mockImplementation((_url, options) => {
    return options?.method === 'PATCH'
      ? Promise.resolve(response({ success: true, userId: 'user-1' }))
      : pending.promise;
  });
  const { result, rerender } = renderHook(({ account }) => usePreferences(account), {
    initialProps: { account: { ...auth(null), isLoading: true } },
  });

  act(() => toggleTheme());
  expect(document.documentElement).toHaveAttribute('data-theme', 'neo');
  expect(fetch).not.toHaveBeenCalled();
  expectGuestStorage();

  rerender({ account: auth('user-1') });
  await waitFor(() => {
    expect(fetch).toHaveBeenLastCalledWith(
      '/api/settings',
      expect.objectContaining({
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Profile-User-ID': 'user-1',
        },
        body: JSON.stringify({ theme: 'neo' }),
      }),
    );
  });
  expect(result.current.isReady).toBe(false);

  await act(async () => {
    pending.resolve(
      response({
        ...settings('user-1'),
        preferences: { ...savedConfig, theme: 'original' },
      }),
    );
  });
  await waitFor(() => expect(result.current.isReady).toBe(true));
  expect(document.documentElement).toHaveAttribute('data-theme', 'neo');
  expectGuestStorage();
});

test.each(['retry', 'account switch'] as const)(
  'keeps failed preference saves isolated when recovering through %s',
  async (recovery) => {
    let userId = 'user-1';
    let rejectSave = true;
    jest.mocked(fetch).mockImplementation(async (_url, options) => {
      if (options?.method === 'PATCH' && rejectSave) {
        rejectSave = false;
        return response({ error: 'Database is unavailable.' }, 503);
      }
      return response(
        options?.method === 'PATCH' ? { success: true, userId } : settings(userId),
      );
    });
    const { result, rerender } = renderHook(({ account }) => usePreferences(account), {
      initialProps: { account: auth(userId) },
    });
    await waitFor(() => expect(result.current.isReady).toBe(true));

    act(() => result.current.setConfig(selectedConfig));
    await waitFor(() =>
      expect(result.current.warning).toBe('Your preferences could not be saved.'),
    );
    expect(result.current.config).toEqual(selectedConfig);
    expectGuestStorage();

    if (recovery === 'account switch') {
      userId = 'user-2';
      rerender({ account: auth(userId) });
      await waitFor(() => expect(result.current.isReady).toBe(true));
      expect(result.current.warning).toBe('');

      userId = 'user-1';
      rerender({ account: auth(userId) });
      await waitFor(() => expect(result.current.isReady).toBe(true));
      expect(result.current.warning).toBe('');
      expect(result.current.config).toEqual(savedConfig);
    } else {
      act(() => result.current.retrySave());
      await waitFor(() => expect(result.current.warning).toBe(''));
      expect(fetch).toHaveBeenLastCalledWith(
        '/api/settings',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ languageConfig: selectedConfig }),
        }),
      );
      expect(result.current.config).toEqual(selectedConfig);
    }
    expectGuestStorage();
  },
);

test('keeps configured guests blocked when settings are unavailable until a successful retry', async () => {
  jest
    .mocked(fetch)
    .mockResolvedValueOnce(response({ error: 'Database is unavailable.' }, 503))
    .mockResolvedValueOnce(response(settings(null, 0)));
  const { result } = renderHook(() => usePreferences(auth(null)));

  await waitFor(() =>
    expect(result.current.error).toBe('Your settings could not be loaded.'),
  );
  expect(result.current.isReady).toBe(false);

  act(() => result.current.retry());
  await waitFor(() => expect(result.current.isReady).toBe(true));
  expect(result.current.error).toBe('');
  expect(result.current.guestMessageLimit).toBe(0);
  expect(result.current.config).toEqual(guestConfig);
  expectGuestStorage();
});
