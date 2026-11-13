/** @jest-environment jsdom */
import '@testing-library/jest-dom';
import { createBrowserClient, createServerClient } from '@supabase/ssr';
import {
  AuthApiError,
  AuthSessionMissingError,
  AuthUnknownError,
  createClient,
} from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { StrictMode, type ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';

import { GET } from '@/app/auth/callback/route';
import { getSupabaseAdminClient } from '@/lib/auth/admin';
import { getSupabaseUser } from '@/lib/auth/server';
import { middleware } from '@/middleware';
import { AuthSessionProvider, useAuthSession } from '@/lib/auth/client';

let mockConfigured = true;
const account = {
  id: 'user-1',
  email: 'john@doe.com',
  user_metadata: { full_name: 'John Doe' },
};
const auth = {
  getSession: jest.fn(),
  signInAnonymously: jest.fn(),
  linkIdentity: jest.fn(),
  signInWithOAuth: jest.fn(),
  signOut: jest.fn(),
  getUser: jest.fn(),
  exchangeCodeForSession: jest.fn(),
};
const sdk = jest.mocked({ createBrowserClient, createServerClient, createClient });
const store = { getAll: jest.fn(), set: jest.fn() };
const sessionCookie = {
  name: 'session',
  value: 'new',
  options: { path: '/', sameSite: 'lax' as const },
};

jest.mock('@/lib/auth/config', () => ({
  isSupabaseConfigured: () => mockConfigured,

  get SUPABASE_URL() {
    return mockConfigured ? 'https://languify.supabase.co' : undefined;
  },
  SUPABASE_ANON_KEY: 'public-key',
}));
jest.mock('@supabase/ssr', () => ({
  createBrowserClient: jest.fn(),
  createServerClient: jest.fn(),
}));
jest.mock('@supabase/supabase-js', () => ({
  ...jest.requireActual('@supabase/supabase-js'),
  createClient: jest.fn(),
}));
jest.mock('next/headers', () => ({ cookies: jest.fn() }));
jest.mock('next/server', () => {
  Object.assign(globalThis, jest.requireActual('node:stream/web'));
  const { Request, Response, Headers } = jest.requireActual(
    'next/dist/compiled/@edge-runtime/primitives/fetch',
  );
  Object.assign(globalThis, { Request, Response, Headers });
  return jest.requireActual('next/server');
});

beforeEach(() => {
  mockConfigured = true;
  Object.values(auth).forEach((method) => method.mockReset());
  auth.getSession.mockResolvedValue({ data: { session: { user: account } } });
  auth.getUser.mockResolvedValue({ data: { user: account }, error: null });
  auth.exchangeCodeForSession.mockResolvedValue({ error: null });
  auth.signInWithOAuth.mockResolvedValue({ error: null });
  auth.signInAnonymously.mockResolvedValue({
    data: { session: { user: account } },
    error: null,
  });
  auth.linkIdentity.mockResolvedValue({ error: null });
  const client = {
    auth: {
      ...auth,

      onAuthStateChange: jest.fn(),
    },
  } as unknown as ReturnType<typeof createBrowserClient>;
  sdk.createBrowserClient.mockReturnValue(client);
  sdk.createServerClient.mockReset().mockReturnValue(client);
  jest
    .mocked(cookies)
    .mockResolvedValue(store as unknown as Awaited<ReturnType<typeof cookies>>);
  store.getAll.mockReturnValue([{ name: 'session', value: 'old' }]);
});

afterEach(() => {
  jest.restoreAllMocks();
  window.history.replaceState(null, '', '/');
});

test.each([
  ['?code=valid', '/'],
  ['?error=access_denied', '/?auth_error=1'],
  ['', '/?auth_error=1'],
  ['?code=invalid', '/?auth_error=1'],
  ['?code=offline', '/?auth_error=1'],
  ['?code=unconfigured', '/?auth_error=1'],
])('callback %s → %s', async (query, location) => {
  auth.exchangeCodeForSession.mockImplementation(async () => {
    const adapter = sdk.createServerClient.mock.calls[0][2].cookies;
    expect(await adapter.getAll()).toEqual([{ name: 'session', value: 'old' }]);
    await adapter.setAll?.([sessionCookie], {});
    return { error: null };
  });
  if (query.includes('invalid'))
    auth.exchangeCodeForSession.mockResolvedValue({ error: new Error('Invalid code') });
  if (query.includes('offline'))
    auth.exchangeCodeForSession.mockRejectedValue(new Error('Offline'));
  if (query.includes('unconfigured')) mockConfigured = false;
  const response = await GET(
    new Request(`http://localhost:3000/auth/callback${query}`, {
      headers: { 'x-forwarded-host': 'untrusted.example' },
    }),
  );
  expect(response.status).toBe(307);
  expect(response.headers.get('location')).toBe(location);
  expect(response.headers.get('cache-control')).toBe('private, no-store');
  if (!query || query.includes('access_denied'))
    expect(createServerClient).not.toHaveBeenCalled();
  if (location === '/') {
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith('valid');
    expect(store.set).toHaveBeenCalledWith('session', 'new', sessionCookie.options);
  }
});

test.each([
  ['verified', null],
  ['guest', new AuthSessionMissingError()],
  ['guest', new AuthApiError('Invalid', 401, 'bad_jwt')],
  ['unavailable', new AuthApiError('Limited', 429, 'over_request_rate_limit')],
  ['unavailable', new AuthApiError('Offline', 503, 'unexpected_failure')],
  ['unavailable', new AuthUnknownError('Offline', new Error('Connection refused'))],
])('server identity case %#: %s', async (result, error) => {
  auth.getUser.mockResolvedValue({ data: { user: account }, error });
  if (result === 'unavailable')
    await expect(getSupabaseUser()).rejects.toMatchObject({ status: 503 });
  else expect(await getSupabaseUser()).toBe(result === 'verified' ? account : null);
});

test('middleware forwards all refreshed cookies and preserves cache headers across auth events', async () => {
  auth.getUser.mockImplementation(async () => {
    const adapter = sdk.createServerClient.mock.calls[0][2].cookies;
    expect(await adapter.getAll()).toEqual([{ name: 'session', value: 'old' }]);
    await adapter.setAll?.([sessionCookie], {
      'Cache-Control': 'private, no-store',
    });
    await adapter.setAll?.(
      [{ name: 'verifier', value: '', options: { path: '/', maxAge: 0 } }],
      {},
    );
    return { data: { user: account }, error: null };
  });
  const request = new NextRequest('https://languify.test/', {
    headers: { cookie: 'session=old' },
  });
  const response = await middleware(request);
  expect(response.headers.get('x-middleware-request-cookie')).toContain('session=new');
  expect(response.cookies.get('session')).toMatchObject({
    value: 'new',
    ...sessionCookie.options,
  });
  expect(response.cookies.get('verifier')).toMatchObject({ value: '', maxAge: 0 });
  expect(response.headers.get('cache-control')).toBe('private, no-store');
});

test('admin access is optional, fails closed on missing URL, and caches a non-persistent client', () => {
  jest.replaceProperty(process, 'env', { ...process.env, SUPABASE_SERVICE_ROLE_KEY: '' });
  expect(getSupabaseAdminClient()).toBeNull();
  process.env.SUPABASE_SERVICE_ROLE_KEY = ' service-key ';
  mockConfigured = false;
  expect(getSupabaseAdminClient).toThrow(expect.objectContaining({ status: 503 }));
  mockConfigured = true;
  sdk.createClient.mockReturnValue({} as ReturnType<typeof createClient>);
  expect(getSupabaseAdminClient()).toBe(getSupabaseAdminClient());
  expect(createClient).toHaveBeenCalledTimes(1);
  expect(createClient).toHaveBeenCalledWith(
    'https://languify.supabase.co',
    'service-key',
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
});

test.each(['', '  ', ' anon-key ', undefined])('public key fallback: %j', (anonKey) => {
  const url = anonKey === undefined ? '' : 'https://languify.supabase.co';
  jest.replaceProperty(process, 'env', {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: ` ${url} `,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ' publishable-key ',
  });
  jest.isolateModules(() => {
    const config = jest.requireActual('@/lib/auth/config');
    expect(config.isSupabaseConfigured()).toBe(anonKey !== undefined);
    expect(config.SUPABASE_URL).toBe(url);
    expect(config.SUPABASE_ANON_KEY).toBe(anonKey?.trim() || 'publishable-key');
  });
});

test('creates one guest session for all consumers on a first visit', async () => {
  let finish!: (value: unknown) => void;
  auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  auth.signInAnonymously.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  sdk.createBrowserClient.mockReturnValue({
    auth: {
      ...auth,

      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: jest.fn() } } }),
    },
  } as never);

  function wrapper({ children }: { children: ReactNode }) {
    return (
      <StrictMode>
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </StrictMode>
    );
  }
  const { result } = renderHook(
    () => [useAuthSession(), useAuthSession(), useAuthSession()],
    { wrapper },
  );
  await waitFor(() => expect(auth.signInAnonymously).toHaveBeenCalledTimes(1));
  await act(async () => finish({ data: { session: { user: account } }, error: null }));
  await waitFor(() =>
    expect(result.current.every((item) => item.session?.user.id === account.id)).toBe(
      true,
    ),
  );
});

test('retries an unsuccessful guest session', async () => {
  auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  auth.signInAnonymously.mockResolvedValueOnce({
    data: { session: null },
    error: new Error('Offline'),
  });
  sdk.createBrowserClient.mockReturnValue({
    auth: {
      ...auth,

      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: jest.fn() } } }),
    },
  } as never);
  const { result } = renderHook(() => useAuthSession(), { wrapper: AuthSessionProvider });
  await waitFor(() => expect(result.current.error).toBeTruthy());
  act(() => result.current.retry?.());
  await waitFor(() => expect(result.current.session?.user.id).toBe(account.id));
  expect(result.current.error).toBe('');
});
