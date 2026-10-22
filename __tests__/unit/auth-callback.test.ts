const mockExchangeCodeForSession = jest.fn();
const mockGetSupabaseServerClient = jest.fn();

jest.mock('@/lib/auth/server', () => ({
  getSupabaseServerClient: () => mockGetSupabaseServerClient(),
}));

import { GET } from '@/app/auth/callback/route';

beforeEach(() => {
  mockExchangeCodeForSession.mockReset();
  mockGetSupabaseServerClient.mockReset().mockReturnValue({
    auth: { exchangeCodeForSession: mockExchangeCodeForSession },
  });
});

test('returns to the app after exchanging the OAuth code', async () => {
  mockExchangeCodeForSession.mockResolvedValue({ error: null });

  const response = await GET(
    new Request('https://languify.test/auth/callback?code=valid-code'),
  );

  expect(response.headers.get('location')).toBe('/');
  expect(response.status).toBe(307);
  expect(mockExchangeCodeForSession).toHaveBeenCalledWith('valid-code');
  expect(response.headers.get('cache-control')).toBe('private, no-store');
});

test('redirects with a visible error when the provider returns an error', async () => {
  const response = await GET(
    new Request('https://languify.test/auth/callback?error=access_denied'),
  );

  expect(response.headers.get('location')).toBe('/?auth_error=1');
  const destination = new URL(response.headers.get('location')!, 'https://languify.test');
  expect(destination.origin).toBe('https://languify.test');
  expect(destination.searchParams.get('auth_error')).toBe('1');
  expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
});

test('redirects with a visible error when code exchange fails', async () => {
  mockExchangeCodeForSession.mockResolvedValue({
    error: new Error('Invalid OAuth code'),
  });

  const response = await GET(
    new Request('https://languify.test/auth/callback?code=invalid-code'),
  );

  expect(response.headers.get('location')).toBe('/?auth_error=1');
});

test('does not attempt an exchange without a code', async () => {
  const response = await GET(new Request('https://languify.test/auth/callback'));

  expect(response.headers.get('location')).toBe('/?auth_error=1');
  expect(mockGetSupabaseServerClient).not.toHaveBeenCalled();
});

test('returns a visible error when authentication is not configured', async () => {
  mockGetSupabaseServerClient.mockReturnValue(null);

  const response = await GET(
    new Request('https://languify.test/auth/callback?code=valid-code'),
  );

  expect(response.headers.get('location')).toBe('/?auth_error=1');
});

test.each(['client creation', 'code exchange'])(
  'returns a visible error after an unexpected %s failure',
  async (failure) => {
    if (failure === 'client creation') {
      mockGetSupabaseServerClient.mockImplementation(() => {
        throw new Error('Invalid configuration');
      });
    } else {
      mockExchangeCodeForSession.mockRejectedValue(new Error('Provider unavailable'));
    }

    const response = await GET(
      new Request('https://languify.test/auth/callback?code=valid-code'),
    );

    expect(response.headers.get('location')).toBe('/?auth_error=1');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  },
);

test.each([
  { query: '?code=valid-code', location: '/' },
  { query: '?error=access_denied', location: '/?auth_error=1' },
])(
  'keeps $location on the browser origin behind a reverse proxy',
  async ({ query, location }) => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });

    const response = await GET(
      new Request(`http://localhost:3000/auth/callback${query}`, {
        headers: {
          host: 'internal-app:3000',
          'x-forwarded-host': 'untrusted.example',
          'x-forwarded-proto': 'https',
        },
      }),
    );

    expect(response.headers.get('location')).toBe(location);
    expect(
      new URL(response.headers.get('location')!, 'https://languify.test').origin,
    ).toBe('https://languify.test');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  },
);
