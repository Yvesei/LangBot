import { createServerClient } from '@supabase/ssr';
import { NextRequest } from 'next/server';

import { middleware } from '@/middleware';

let mockUrl: string | undefined = 'https://languify.supabase.co';
const mockGetUser = jest.fn();

jest.mock('@supabase/ssr', () => ({ createServerClient: jest.fn() }));
jest.mock('@/lib/auth/config', () => ({
  get SUPABASE_URL() {
    return mockUrl;
  },
  SUPABASE_ANON_KEY: 'public-key',
}));

beforeEach(() => {
  mockUrl = 'https://languify.supabase.co';
  mockGetUser.mockReset().mockResolvedValue({ data: { user: null }, error: null });
  jest.mocked(createServerClient).mockReturnValue({
    auth: { getUser: mockGetUser },
  } as unknown as ReturnType<typeof createServerClient>);
});

test('skips requests in guest mode', async () => {
  mockUrl = undefined;

  await middleware(new NextRequest('https://languify.test/'));

  expect(createServerClient).not.toHaveBeenCalled();
});

test('leaves API session validation to the guarded handler', async () => {
  await middleware(new NextRequest('https://languify.test/api/chat'));

  expect(createServerClient).not.toHaveBeenCalled();
});

test('passes every refreshed cookie and cache header to the browser and server', async () => {
  mockGetUser.mockImplementation(async () => {
    const cookieMethods = jest.mocked(createServerClient).mock.calls[0][2].cookies;
    await cookieMethods.setAll?.(
      [{ name: 'session', value: 'new-token', options: { path: '/', sameSite: 'lax' } }],
      { 'Cache-Control': 'private, no-store', Expires: '0', Pragma: 'no-cache' },
    );
    // Supabase sends cache headers once per client, including when a later
    // auth event writes another cookie in the same request.
    await cookieMethods.setAll?.(
      [{ name: 'verifier', value: '', options: { path: '/', maxAge: 0 } }],
      {},
    );
    return { data: { user: { id: 'verified-user' } }, error: null };
  });
  const request = new NextRequest('https://languify.test/', {
    headers: { cookie: 'session=old-token; verifier=old-verifier' },
  });

  const response = await middleware(request);

  expect(mockGetUser).toHaveBeenCalledTimes(1);
  expect(request.cookies.get('session')?.value).toBe('new-token');
  expect(response.headers.get('x-middleware-request-cookie')).toContain(
    'session=new-token',
  );
  expect(response.cookies.get('session')).toMatchObject({
    value: 'new-token',
    path: '/',
    sameSite: 'lax',
  });
  expect(response.cookies.get('verifier')).toMatchObject({ value: '', maxAge: 0 });
  expect(response.headers.get('cache-control')).toBe('private, no-store');
  expect(response.headers.get('expires')).toBe('0');
  expect(response.headers.get('pragma')).toBe('no-cache');
});
