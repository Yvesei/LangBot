let enforceLimits: typeof import('@/lib/server/limits').enforceLimits;
beforeEach(async () => {
  jest.resetModules();
  jest.replaceProperty(process, 'env', {
    ...process.env,
    NODE_ENV: 'test',
    VERCEL: '',
    REQUESTS_PER_MINUTE: '2',
    DAILY_REQUEST_LIMIT: '1000',
    UPSTASH_REDIS_REST_URL: '',
    UPSTASH_REDIS_REST_TOKEN: '',
    ALLOW_IN_MEMORY_LIMITS: 'false',
  });
  enforceLimits = (await import('@/lib/server/limits')).enforceLimits;
});
afterEach(() => jest.restoreAllMocks());

test('shares limits across routes and ignores spoofed forwarding headers on other hosts', async () => {
  await enforceLimits(new Request('http://localhost/api/chat'));
  await enforceLimits(new Request('http://localhost/api/translate'));
  await expect(
    enforceLimits(
      new Request('http://localhost/api/correct', {
        headers: { 'x-forwarded-for': 'new-ip', 'x-vercel-forwarded-for': 'new-ip' },
      }),
    ),
  ).rejects.toMatchObject({ status: 429 });
});
test('enforces the daily allowance independently of the minute allowance', async () => {
  process.env.REQUESTS_PER_MINUTE = '100';
  process.env.DAILY_REQUEST_LIMIT = '1';
  await enforceLimits(new Request('http://localhost/api/chat'));
  await expect(
    enforceLimits(new Request('http://localhost/api/chat')),
  ).rejects.toMatchObject({ status: 429 });
});
test('fails closed in production without a shared store', async () => {
  jest.replaceProperty(process, 'env', { ...process.env, NODE_ENV: 'production' });
  await expect(
    enforceLimits(new Request('http://localhost/api/chat')),
  ).rejects.toMatchObject({ status: 503 });
});
test('uses atomic Redis increments with expiry', async () => {
  process.env.UPSTASH_REDIS_REST_URL = 'https://limits.example';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'synthetic';
  const fetchMock = jest
    .spyOn(global, 'fetch')
    .mockImplementation(
      async () => new Response(JSON.stringify({ result: 1 }), { status: 200 }),
    );
  await enforceLimits(new Request('http://localhost/api/chat'));
  expect(fetchMock).toHaveBeenCalledTimes(2);
  const command = JSON.parse(fetchMock.mock.calls[0][1]!.body as string);
  expect(command[0]).toBe('EVAL');
  expect(command[1]).toContain("redis.call('EXPIRE'");
});
test('store failure cannot silently disable protection', async () => {
  process.env.UPSTASH_REDIS_REST_URL = 'https://limits.example';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'synthetic';
  jest.spyOn(global, 'fetch').mockRejectedValue(new Error('unavailable'));
  await expect(
    enforceLimits(new Request('http://localhost/api/chat')),
  ).rejects.toMatchObject({ status: 503 });
});
