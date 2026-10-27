let mockAdminClient: { rpc: jest.Mock } | null = null;
const mockGetSupabaseUser = jest.fn();

jest.mock('@/lib/auth/admin', () => ({
  getSupabaseAdminClient: () => mockAdminClient,
}));

jest.mock('@/lib/auth/server', () => ({
  getSupabaseUser: () => mockGetSupabaseUser(),
}));

let enforceLimits: typeof import('@/lib/server/limits').enforceLimits;

beforeEach(async () => {
  jest.resetModules();
  mockAdminClient = null;
  mockGetSupabaseUser.mockReset().mockResolvedValue(null);
  jest.replaceProperty(process, 'env', {
    ...process.env,
    NODE_ENV: 'test',
    VERCEL: '',
  });
  enforceLimits = (await import('@/lib/server/limits')).enforceLimits;
});

afterEach(() => jest.restoreAllMocks());

test('allows five requests per minute across API routes', async () => {
  await enforceLimits(new Request('http://localhost/api/chat'));
  await enforceLimits(new Request('http://localhost/api/translate'));
  await enforceLimits(new Request('http://localhost/api/correct'));
  await enforceLimits(new Request('http://localhost/api/chat'));
  await enforceLimits(new Request('http://localhost/api/translate'));

  await expect(
    enforceLimits(new Request('http://localhost/api/correct')),
  ).rejects.toMatchObject({ status: 429 });
});

test('uses separate counters for Vercel client IPs', async () => {
  process.env.VERCEL = '1';

  for (let request = 0; request < 5; request++) {
    await enforceLimits(
      new Request('http://localhost/api/chat', {
        headers: { 'x-vercel-forwarded-for': 'first-user' },
      }),
    );
  }

  await enforceLimits(
    new Request('http://localhost/api/chat', {
      headers: { 'x-vercel-forwarded-for': 'second-user' },
    }),
  );

  await expect(
    enforceLimits(
      new Request('http://localhost/api/chat', {
        headers: { 'x-vercel-forwarded-for': 'first-user' },
      }),
    ),
  ).rejects.toMatchObject({ status: 429 });
});

test('uses the shared RPC when an admin client is available', async () => {
  const rpc = jest.fn().mockResolvedValue({
    data: [{ allowed: true, retry_after_seconds: 0 }],
    error: null,
  });
  mockAdminClient = { rpc };

  for (let request = 0; request < 8; request++) {
    await enforceLimits(new Request('http://localhost/api/chat'));
  }

  rpc.mockResolvedValue({
    data: [{ allowed: false, retry_after_seconds: 37 }],
    error: null,
  });

  await expect(
    enforceLimits(new Request('http://localhost/api/chat')),
  ).rejects.toMatchObject({ status: 429, retryAfter: 37 });

  expect(rpc).toHaveBeenLastCalledWith('register_rate_limit_hit', {
    p_identity_key: 'ip:local',
    p_window_seconds: 60,
    p_max_hits: 5,
  });
});

test('authenticated limits follow the verified user across IP addresses', async () => {
  process.env.VERCEL = '1';
  mockGetSupabaseUser.mockResolvedValue({ id: 'first-user' });

  for (let index = 0; index < 5; index++) {
    await enforceLimits(
      new Request('http://localhost/api/chat', {
        headers: { 'x-vercel-forwarded-for': `address-${index}` },
      }),
    );
  }

  await expect(
    enforceLimits(
      new Request('http://localhost/api/chat', {
        headers: { 'x-vercel-forwarded-for': 'new-address' },
      }),
    ),
  ).rejects.toMatchObject({ status: 429 });

  mockGetSupabaseUser.mockResolvedValue({ id: 'second-user' });
  await expect(
    enforceLimits(new Request('http://localhost/api/chat')),
  ).resolves.toBeUndefined();

  mockGetSupabaseUser.mockResolvedValue(null);
  await expect(
    enforceLimits(new Request('http://localhost/api/chat')),
  ).resolves.toBeUndefined();
});

test('keys the shared limit by the verified user', async () => {
  const rpc = jest.fn().mockResolvedValue({
    data: [{ allowed: true, retry_after_seconds: 0 }],
    error: null,
  });
  mockAdminClient = { rpc };
  mockGetSupabaseUser.mockResolvedValue({ id: 'verified-user' });

  await enforceLimits(new Request('http://localhost/api/chat'));

  expect(rpc).toHaveBeenCalledWith('register_rate_limit_hit', {
    p_identity_key: 'user:verified-user',
    p_window_seconds: 60,
    p_max_hits: 5,
  });
});

test.each(['', '1'])(
  'ignores untrusted forwarded IP headers (VERCEL=%s)',
  async (vercel) => {
    process.env.VERCEL = vercel;

    for (let index = 0; index < 5; index++) {
      await enforceLimits(
        new Request('http://localhost/api/chat', {
          headers: { 'x-forwarded-for': `address-${index}` },
        }),
      );
    }

    await expect(
      enforceLimits(
        new Request('http://localhost/api/chat', {
          headers: { 'x-forwarded-for': 'another-address' },
        }),
      ),
    ).rejects.toMatchObject({ status: 429 });
  },
);

test('returns the remaining local window and resets when it expires', async () => {
  const now = jest.spyOn(Date, 'now').mockReturnValue(1_000);
  for (let index = 0; index < 5; index++) {
    await enforceLimits(new Request('http://localhost/api/chat'));
  }

  now.mockReturnValue(31_000);
  await expect(
    enforceLimits(new Request('http://localhost/api/chat')),
  ).rejects.toMatchObject({ status: 429, retryAfter: 30 });

  now.mockReturnValue(61_000);
  await expect(
    enforceLimits(new Request('http://localhost/api/chat')),
  ).resolves.toBeUndefined();
});

test.each([
  { data: null, error: { message: 'Database unavailable' } },
  { data: null, error: null },
  { data: [], error: null },
  { data: [{}], error: null },
  { data: [{ allowed: 'true' }], error: null },
  { data: [{ allowed: false }, { allowed: true }], error: null },
])(
  'fails closed when the configured shared limit cannot be checked: %j',
  async (response) => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockAdminClient = { rpc: jest.fn().mockResolvedValue(response) };

    await expect(
      enforceLimits(new Request('http://localhost/api/chat')),
    ).rejects.toMatchObject({ status: 503 });
  },
);

test('fails closed when the shared request throws', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  mockAdminClient = {
    rpc: jest.fn().mockRejectedValue(new Error('Network unavailable')),
  };

  await expect(
    enforceLimits(new Request('http://localhost/api/chat')),
  ).rejects.toMatchObject({ status: 503 });
});

test.each([undefined, null, -1, 0, 1.5, '37', 600])(
  'uses a bounded positive retry delay for an invalid RPC delay (%s)',
  async (retryAfter) => {
    mockAdminClient = {
      rpc: jest.fn().mockResolvedValue({
        data: [{ allowed: false, retry_after_seconds: retryAfter }],
        error: null,
      }),
    };

    await expect(
      enforceLimits(new Request('http://localhost/api/chat')),
    ).rejects.toMatchObject({ status: 429, retryAfter: 60 });
  },
);
