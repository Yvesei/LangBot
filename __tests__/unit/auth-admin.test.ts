import { createClient } from '@supabase/supabase-js';

import { getSupabaseAdminClient } from '@/lib/auth/admin';

let mockUrl: string | undefined = 'https://languify.supabase.co';

jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));
jest.mock('@/lib/auth/config', () => ({
  get SUPABASE_URL() {
    return mockUrl;
  },
}));

beforeEach(() => {
  mockUrl = 'https://languify.supabase.co';
  jest.replaceProperty(process, 'env', { ...process.env, SUPABASE_SERVICE_ROLE_KEY: '' });
});

afterEach(() => jest.restoreAllMocks());

test('keeps shared limiting optional when no service key is configured', () => {
  expect(getSupabaseAdminClient()).toBeNull();
  expect(createClient).not.toHaveBeenCalled();
});

test('fails closed when a configured service key has no project URL', () => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
  mockUrl = undefined;

  expect(getSupabaseAdminClient).toThrow(expect.objectContaining({ status: 503 }));
  expect(createClient).not.toHaveBeenCalled();
});

test('creates one server client with persistence and token refresh disabled', () => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = ' service-key ';
  const client = {} as ReturnType<typeof createClient>;
  jest.mocked(createClient).mockReturnValue(client);

  expect(getSupabaseAdminClient()).toBe(client);
  expect(getSupabaseAdminClient()).toBe(client);
  expect(createClient).toHaveBeenCalledTimes(1);
  expect(createClient).toHaveBeenCalledWith(
    'https://languify.supabase.co',
    'service-key',
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
});
