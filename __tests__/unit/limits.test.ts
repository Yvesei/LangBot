let enforceLimits: typeof import('@/lib/server/limits').enforceLimits;

beforeEach(async () => {
  jest.resetModules();
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
