/** @jest-environment jsdom */
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createBrowserClient, createServerClient } from '@supabase/ssr';
import {
  AuthApiError,
  AuthSessionMissingError,
  AuthUnknownError,
  createClient,
  type SupabaseClient,
} from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

import Page from '@/app/page';
import { GET } from '@/app/auth/callback/route';
import { AuthMenu } from '@/components/ui/chat/header/AuthMenu';
import { send } from '@/lib/api';
import { getSupabaseAdminClient } from '@/lib/auth/admin';
import { getSupabaseUser } from '@/lib/auth/server';
import {
  GUEST_MESSAGE_COUNT_STORAGE_KEY as countKey,
  GUEST_MESSAGE_LIMIT as limit,
} from '@/lib/auth/guest-message-limit';
import { middleware } from '@/middleware';
import { tutorResult } from '../../tests/fixtures';

let mockConfigured = true;
const account = {
  id: 'user-1',
  email: 'john@doe.com',
  user_metadata: { full_name: 'John Doe' },
};
type Session = { user: typeof account };
type Listener = (event: string, session: Session | null) => void;
const listeners = new Set<Listener>();
const auth = {
  getSession: jest.fn(),
  signInWithOAuth: jest.fn(),
  signOut: jest.fn(),
  getUser: jest.fn(),
  exchangeCodeForSession: jest.fn(),
};
const sdk = jest.mocked({ createBrowserClient, createServerClient, createClient });
const sendMessage = jest.mocked(send);
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
jest.mock('@/lib/api', () => ({ send: jest.fn(), translateMessage: jest.fn() }));
jest.mock('@/components/ui/voice/VoiceCall', () => ({
  VoiceCall: () => (
    <div
      role="dialog"
      aria-label="Voice call with Languify"
    />
  ),
}));

beforeEach(() => {
  mockConfigured = true;
  listeners.clear();
  Object.values(auth).forEach((method) => method.mockReset());
  auth.getSession.mockResolvedValue({ data: { session: null } });
  auth.getUser.mockResolvedValue({ data: { user: account }, error: null });
  auth.exchangeCodeForSession.mockResolvedValue({ error: null });
  auth.signInWithOAuth.mockResolvedValue({ error: null });
  const client = {
    auth: {
      ...auth,

      onAuthStateChange: (listener: Listener) => {
        listeners.add(listener);
        return {
          data: { subscription: { unsubscribe: () => listeners.delete(listener) } },
        };
      },
    },
  } as unknown as SupabaseClient;
  sdk.createBrowserClient.mockReturnValue(client);
  sdk.createServerClient.mockReset().mockReturnValue(client);
  jest
    .mocked(cookies)
    .mockResolvedValue(store as unknown as Awaited<ReturnType<typeof cookies>>);
  store.getAll.mockReturnValue([{ name: 'session', value: 'old' }]);
  localStorage.clear();
  localStorage.setItem('langbot-native', 'fr');
  localStorage.setItem('langbot-target', 'en');
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
  sendMessage.mockReset().mockResolvedValue({ success: true, ...tutorResult });
});

afterEach(() => {
  jest.restoreAllMocks();
  window.history.replaceState(null, '', '/');
});

function emit(session: Parameters<Listener>[1]) {
  act(() =>
    listeners.forEach((listener) =>
      listener(session ? 'SIGNED_IN' : 'SIGNED_OUT', session),
    ),
  );
}

async function openChat() {
  const view = render(<Page />);
  await waitFor(() => expect(composer()).toBeEnabled());
  return view;
}

function composer() {
  return screen.getByRole('textbox', { name: 'Your message' });
}

function click(name: string) {
  fireEvent.click(screen.getByRole('button', { name }));
}

function submit() {
  fireEvent.change(composer(), {
    target: { value: 'I has a apple.' },
  });
  click('Send');
}

function exhaustAllowance() {
  localStorage.setItem(countKey, String(limit));
  fireEvent(window, new StorageEvent('storage', { key: countKey }));
}

test('Google sign-in uses the browser origin and recovers after back navigation', async () => {
  render(<AuthMenu />);
  const button = await screen.findByRole('button', { name: 'Sign in with Google' });
  fireEvent.click(button);
  expect(auth.signInWithOAuth).toHaveBeenCalledWith({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });
  expect(button).toBeDisabled();
  await act(async () => undefined);
  fireEvent(window, new PageTransitionEvent('pageshow', { persisted: true }));
  expect(button).toBeEnabled();
});

test('callback errors appear in both entry points until retry; provider failures stay visible', async () => {
  window.history.replaceState(null, '', '/?auth_error=1&other=value#chat');
  localStorage.setItem(countKey, String(limit));
  auth.signInWithOAuth.mockResolvedValue({ error: new Error('Provider disabled') });
  render(<Page />);
  await screen.findByRole('button', { name: 'Sign in with Google' });
  expect(await screen.findAllByText(/Google sign-in did not finish/)).toHaveLength(2);
  expect(window.location.search).toContain('auth_error=1');
  click('Sign in with Google');
  expect(await screen.findByText(/Could not start Google sign-in/)).toBeVisible();
  expect(window.location.search + window.location.hash).toBe('?other=value#chat');
});

test.each([false, true])('settings (invalid metadata: %s)', async (invalid) => {
  const user = invalid
    ? {
        ...account,
        user_metadata: { full_name: { invalid: true }, name: ' ', avatar_url: [] },
      }
    : account;
  auth.getSession.mockResolvedValue({ data: { session: { user } } });
  auth.signOut.mockResolvedValue({ error: new Error('Offline') });
  const view = render(<AuthMenu />);
  const trigger = await screen.findByRole('button', { name: 'Account' });
  trigger.focus();
  fireEvent.click(trigger);
  const dialog = screen.getByRole('dialog', { name: 'Settings' });
  expect(within(dialog).getAllByText(account.email).length).toBeGreaterThan(0);
  if (!invalid) expect(within(dialog).getByText('John Doe')).toBeVisible();
  fireEvent.click(within(dialog).getByRole('button', { name: /sign out/i }));
  expect(await within(dialog).findByRole('alert')).toHaveTextContent(
    'Could not sign out.',
  );
  click('Close settings');
  expect(trigger).toHaveFocus();
  fireEvent.click(trigger);
  emit(null);
  emit({ user: account });
  expect(screen.queryByRole('dialog')).toBeNull();
  view.unmount();
  expect(listeners.size).toBe(0);
});

test.each(['stale success', 'stale failure'])('events beat %s', async (outcome) => {
  const pending = Promise.withResolvers<{ data: { session: Session } }>();
  auth.getSession.mockReturnValue(pending.promise);
  render(<Page />);
  expect(composer()).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Voice call' })).toBeDisabled();
  emit(outcome === 'stale failure' ? { user: account } : null);
  await act(async () => {
    if (outcome === 'stale success')
      pending.resolve({ data: { session: { user: account } } });
    else pending.reject(new Error('Offline'));
  });
  expect(composer()).toBeEnabled();
  expect(screen.queryByRole('button', { name: 'Account' }) !== null).toBe(
    outcome === 'stale failure',
  );
});

test('successful guest replies consume the allowance across new chats and reloads', async () => {
  localStorage.setItem(countKey, String(limit - 1));
  const view = await openChat();
  submit();
  await screen.findByText(tutorResult.reply);
  expect(localStorage.getItem(countKey)).toBe(String(limit));
  expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
  click('New chat');
  expect(composer()).toBeDisabled();
  view.unmount();
  render(<Page />);
  await screen.findByRole('button', { name: 'Sign in with Google' });
  expect(composer()).toBeDisabled();
  expect(send).toHaveBeenCalledTimes(1);
});

test.each([false, true])('guest retry (other tab: %s)', async (otherTab) => {
  auth.getSession.mockRejectedValue(new Error('Offline'));
  localStorage.setItem(countKey, String(limit - 1));
  sendMessage.mockRejectedValueOnce(new Error('Please retry.'));
  await openChat();
  submit();
  await screen.findByRole('alert');
  expect(localStorage.getItem(countKey)).toBe(String(limit - 1));
  if (otherTab) exhaustAllowance();
  click('Retry message');
  if (!otherTab) await screen.findByText(tutorResult.reply);
  expect(send).toHaveBeenCalledTimes(otherTab ? 1 : 2);
  expect(localStorage.getItem(countKey)).toBe(String(limit));
});

test('cancelled replies do not consume an allowance', async () => {
  const pending = Promise.withResolvers<Awaited<ReturnType<typeof send>>>();
  sendMessage.mockReturnValue(pending.promise);
  await openChat();
  submit();
  click('New chat');
  await act(async () => pending.resolve({ success: true, ...tutorResult }));
  expect(localStorage.getItem(countKey)).toBeNull();
});

test('sign-in unlocks an exhausted chat and sign-out closes the call permanently', async () => {
  localStorage.setItem(countKey, String(limit));
  render(<Page />);
  await screen.findByRole('button', { name: 'Continue with Google' });
  emit({ user: account });
  expect(composer()).toBeEnabled();
  click('Voice call');
  expect(screen.getByRole('dialog', { name: 'Voice call with Languify' })).toBeVisible();
  emit(null);
  expect(composer()).toBeDisabled();
  emit({ user: account });
  expect(screen.queryByRole('dialog')).toBeNull();
});

test('another tab exhausting the allowance closes an active guest call', async () => {
  await openChat();
  click('Voice call');
  exhaustAllowance();
  expect(composer()).toBeDisabled();
  expect(screen.queryByRole('dialog', { name: 'Voice call with Languify' })).toBeNull();
});

test('unconfigured auth leaves chat usable and skips browser, server and middleware clients', async () => {
  await middleware(new NextRequest('https://languify.test/api/chat'));
  expect(createServerClient).not.toHaveBeenCalled();
  mockConfigured = false;
  localStorage.setItem(countKey, String(limit));
  await openChat();
  submit();
  await screen.findByText(tutorResult.reply);
  expect(localStorage.getItem(countKey)).toBe(String(limit));
  expect(await getSupabaseUser()).toBeNull();
  await middleware(new NextRequest('https://languify.test/'));
  expect(createBrowserClient).not.toHaveBeenCalled();
  expect(createServerClient).not.toHaveBeenCalled();
  expect(cookies).not.toHaveBeenCalled();
});

test.each([
  ['?error=access_denied', '/?auth_error=1'],
  ['', '/?auth_error=1'],
  ['?code=invalid', '/?auth_error=1'],
  ['?code=offline', '/?auth_error=1'],
  ['?code=unconfigured', '/?auth_error=1'],
])('callback %s → %s', async (query, location) => {
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
});

test('the callback persists session cookies through the server cookie adapter', async () => {
  auth.exchangeCodeForSession.mockImplementation(async () => {
    const adapter = sdk.createServerClient.mock.calls[0][2].cookies;
    expect(await adapter.getAll()).toEqual([{ name: 'session', value: 'old' }]);
    await adapter.setAll?.([sessionCookie], {});
    return { error: null };
  });
  const response = await GET(
    new Request('http://localhost:3000/auth/callback?code=valid', {
      headers: { 'x-forwarded-host': 'untrusted.example' },
    }),
  );
  expect(response.headers.get('location')).toBe('/');
  expect(response.headers.get('cache-control')).toBe('private, no-store');
  expect(auth.exchangeCodeForSession).toHaveBeenCalledWith('valid');
  expect(store.set).toHaveBeenCalledWith('session', 'new', sessionCookie.options);
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
  expect(createClient).not.toHaveBeenCalled();
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
  jest.replaceProperty(process, 'env', {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL:
      anonKey === undefined ? ' ' : ' https://languify.supabase.co ',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ' publishable-key ',
  });
  jest.isolateModules(() => {
    const config = jest.requireActual('@/lib/auth/config');
    expect(config.isSupabaseConfigured()).toBe(anonKey !== undefined);
    expect(config.SUPABASE_URL).toBe(
      anonKey === undefined ? '' : 'https://languify.supabase.co',
    );
    expect(config.SUPABASE_ANON_KEY).toBe(anonKey?.trim() || 'publishable-key');
  });
});
