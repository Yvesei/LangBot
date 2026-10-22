import { createServerClient } from '@supabase/ssr';
import {
  AuthApiError,
  AuthRetryableFetchError,
  AuthSessionMissingError,
  AuthUnknownError,
} from '@supabase/supabase-js';
import { cookies } from 'next/headers';

import { getSupabaseServerClient, getSupabaseUser } from '@/lib/auth/server';

let mockConfigured = true;
const mockGetUser = jest.fn();

jest.mock('@supabase/ssr', () => ({ createServerClient: jest.fn() }));
jest.mock('next/headers', () => ({ cookies: jest.fn() }));
jest.mock('@/lib/auth/config', () => ({
  isSupabaseConfigured: () => mockConfigured,
  SUPABASE_URL: 'https://languify.supabase.co',
  SUPABASE_ANON_KEY: 'public-key',
}));

beforeEach(() => {
  mockConfigured = true;
  mockGetUser.mockReset();
  jest.mocked(createServerClient).mockReturnValue({
    auth: { getUser: mockGetUser },
  } as unknown as ReturnType<typeof createServerClient>);
});

test('skips authentication and cookie access when it is not configured', async () => {
  mockConfigured = false;

  expect(getSupabaseServerClient()).toBeNull();
  expect(await getSupabaseUser()).toBeNull();
  expect(createServerClient).not.toHaveBeenCalled();
  expect(cookies).not.toHaveBeenCalled();
});

test('returns only the user verified by the Auth server', async () => {
  const user = { id: 'verified-user' };
  mockGetUser.mockResolvedValue({ data: { user }, error: null });

  expect(await getSupabaseUser()).toBe(user);
});

test.each([
  new AuthSessionMissingError(),
  new AuthApiError('Invalid token', 401, 'bad_jwt'),
])('treats missing or invalid sessions as guests (%s)', async (error) => {
  mockGetUser.mockResolvedValue({ data: { user: { id: 'untrusted-user' } }, error });

  expect(await getSupabaseUser()).toBeNull();
});

test.each([
  new AuthRetryableFetchError('Auth server is unavailable', 503),
  new AuthApiError('Too many requests', 429, 'over_request_rate_limit'),
  new AuthApiError('Provider error', 500, 'unexpected_failure'),
  new AuthUnknownError('Network unavailable', new Error('Connection refused')),
])(
  'rejects authentication outages instead of using a guest identity (%s)',
  async (error) => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error });

    await expect(getSupabaseUser()).rejects.toMatchObject({ status: 503 });
  },
);

test('writes refreshed cookies using the request cookie store', async () => {
  const store = {
    getAll: jest.fn().mockReturnValue([{ name: 'session', value: 'old' }]),
    set: jest.fn(),
  };
  jest
    .mocked(cookies)
    .mockResolvedValue(store as unknown as Awaited<ReturnType<typeof cookies>>);
  getSupabaseServerClient();
  const options = jest.mocked(createServerClient).mock.calls[0][2];
  const cookieMethods = options.cookies;

  expect(await cookieMethods.getAll()).toEqual([{ name: 'session', value: 'old' }]);
  await cookieMethods.setAll?.(
    [{ name: 'session', value: 'new', options: { path: '/', sameSite: 'lax' } }],
    {},
  );

  expect(store.set).toHaveBeenCalledWith('session', 'new', {
    path: '/',
    sameSite: 'lax',
  });
});
