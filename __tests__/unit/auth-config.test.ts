beforeEach(() => {
  jest.resetModules();
  jest.replaceProperty(process, 'env', {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: ' https://languify.supabase.co ',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ' publishable-key ',
  });
});

afterEach(() => jest.restoreAllMocks());

test('uses a publishable key when the anon key is blank', async () => {
  const config = await import('@/lib/auth/config');

  expect(config.isSupabaseConfigured()).toBe(true);
  expect(config.SUPABASE_URL).toBe('https://languify.supabase.co');
  expect(config.SUPABASE_ANON_KEY).toBe('publishable-key');
});

test('uses a publishable key when the anon key contains only whitespace', async () => {
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = '  ';
  const config = await import('@/lib/auth/config');

  expect(config.SUPABASE_ANON_KEY).toBe('publishable-key');
});

test('keeps a configured anon key when both keys are present', async () => {
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ' anon-key ';
  const config = await import('@/lib/auth/config');

  expect(config.SUPABASE_ANON_KEY).toBe('anon-key');
});

test('disables authentication when public configuration is blank', async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = ' ';
  const config = await import('@/lib/auth/config');

  expect(config.isSupabaseConfigured()).toBe(false);
});
