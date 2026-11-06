import { createServerClient } from '@supabase/ssr';

import { GET, PATCH } from '@/app/api/settings/route';

let mockConfigured = true;
const mockGetUser = jest.fn();
const settingsQuery = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  maybeSingle: jest.fn(),
};
const profileQuery = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  maybeSingle: jest.fn(),
  upsert: jest.fn(),
};
const mockFrom = jest.fn((table) =>
  table === 'app_settings' ? settingsQuery : profileQuery,
);
const profile = {
  native_language: 'fr',
  target_language: 'en',
  ui_theme: 'original',
};

jest.mock('@supabase/ssr', () => ({ createServerClient: jest.fn() }));
jest.mock('next/headers', () => ({ cookies: jest.fn() }));
jest.mock('@/lib/auth/config', () => ({
  isSupabaseConfigured: () => mockConfigured,
  SUPABASE_URL: 'https://settings.example.supabase.co',
  SUPABASE_ANON_KEY: 'synthetic-public-key',
}));

beforeEach(() => {
  mockConfigured = true;
  mockGetUser.mockResolvedValue({ data: { user: { id: 'account-a' } }, error: null });
  settingsQuery.maybeSingle.mockResolvedValue({
    data: { guest_message_limit: 3 },
    error: null,
  });
  profileQuery.maybeSingle.mockResolvedValue({ data: profile, error: null });
  profileQuery.upsert.mockResolvedValue({ error: null });
  jest.mocked(createServerClient).mockReturnValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  } as never);
});

function getSettings() {
  return GET(new Request('http://localhost:3000/api/settings'));
}

function patchSettings(body: unknown, origin = 'http://localhost:3000') {
  return PATCH(
    new Request('http://localhost:3000/api/settings', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Profile-User-ID': 'account-a',
        origin,
      },
      body: JSON.stringify(body),
    }),
  );
}

test('keeps local defaults without Supabase and rejects preference writes', async () => {
  mockConfigured = false;
  const response = await getSettings();
  expect(await response.json()).toEqual({
    success: true,
    userId: null,
    guestMessageLimit: 5,
    preferences: null,
  });
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect((await patchSettings({ theme: 'neo' })).status).toBe(401);
  expect(createServerClient).not.toHaveBeenCalled();
});

test('guests receive the database allowance without account preferences', async () => {
  mockGetUser.mockResolvedValue({ data: { user: null }, error: { status: 400 } });
  expect(await (await getSettings()).json()).toEqual({
    success: true,
    userId: null,
    guestMessageLimit: 3,
    preferences: null,
  });
  expect(mockFrom).not.toHaveBeenCalledWith('profiles');
  expect((await patchSettings({ theme: 'neo' })).status).toBe(401);
  expect(profileQuery.upsert).not.toHaveBeenCalled();
});

test('reads preferences for the verified account and defaults a missing profile', async () => {
  expect(await (await getSettings()).json()).toEqual({
    success: true,
    userId: 'account-a',
    guestMessageLimit: 3,
    preferences: { nativeLanguage: 'fr', targetLanguage: 'en', theme: 'original' },
  });
  expect(profileQuery.eq).toHaveBeenCalledWith('id', 'account-a');
  profileQuery.maybeSingle.mockResolvedValue({ data: null, error: null });
  expect((await (await getSettings()).json()).preferences).toEqual({
    nativeLanguage: null,
    targetLanguage: null,
    theme: 'neo',
  });
});

test.each([
  null,
  {},
  { guest_message_limit: -1 },
  { guest_message_limit: 1.5 },
  { guest_message_limit: Number.MAX_SAFE_INTEGER + 1 },
])('fails closed for missing or invalid application settings: %j', async (data) => {
  settingsQuery.maybeSingle.mockResolvedValue({ data, error: null });
  expect((await getSettings()).status).toBe(503);
});

test('accepts zero guest messages and reports database or auth outages', async () => {
  settingsQuery.maybeSingle.mockResolvedValue({
    data: { guest_message_limit: 0 },
    error: null,
  });
  expect((await (await getSettings()).json()).guestMessageLimit).toBe(0);
  settingsQuery.maybeSingle.mockResolvedValue({ data: null, error: {} });
  expect((await getSettings()).status).toBe(503);
  settingsQuery.maybeSingle.mockResolvedValue({
    data: { guest_message_limit: 5 },
    error: null,
  });
  mockGetUser.mockResolvedValue({ data: { user: null }, error: { status: 503 } });
  expect((await getSettings()).status).toBe(503);
  expect((await patchSettings({ theme: 'neo' })).status).toBe(503);
});

test.each([
  {},
  { user_id: 'account-b', theme: 'neo' },
  { theme: 'unknown' },
  { languageConfig: { nativeLanguage: 'fr', targetLanguage: 'fr' } },
  { languageConfig: { nativeLanguage: 'unknown', targetLanguage: 'en' } },
])('rejects invalid or ownership-bearing preference patches: %j', async (body) => {
  expect((await patchSettings(body)).status).toBe(400);
  expect(profileQuery.upsert).not.toHaveBeenCalled();
});

test.each([
  [{ theme: 'original' }, { ui_theme: 'original' }],
  [
    { languageConfig: { nativeLanguage: 'fr', targetLanguage: 'en' } },
    { native_language: 'fr', target_language: 'en' },
  ],
])('writes only provided fields under the verified account: %j', async (body, fields) => {
  const response = await patchSettings(body);
  expect(response.status).toBe(200);
  expect(profileQuery.upsert).toHaveBeenCalledWith(
    { id: 'account-a', updated_at: expect.any(String), ...fields },
    { onConflict: 'id', defaultToNull: false },
  );
  expect(await response.json()).toEqual({
    success: true,
    userId: 'account-a',
  });
});

test('rejects cross-origin patches and surfaces profile read/write errors', async () => {
  expect((await patchSettings({ theme: 'neo' }, 'https://other.example')).status).toBe(
    403,
  );
  expect(profileQuery.upsert).not.toHaveBeenCalled();
  profileQuery.maybeSingle.mockResolvedValue({ data: null, error: {} });
  expect((await getSettings()).status).toBe(503);
  profileQuery.upsert.mockResolvedValue({ error: {} });
  expect((await patchSettings({ theme: 'neo' })).status).toBe(503);
});

test('rejects a stale queued patch after the cookie user changes', async () => {
  mockGetUser.mockResolvedValue({ data: { user: { id: 'account-b' } }, error: null });
  expect((await patchSettings({ theme: 'neo' })).status).toBe(409);
  expect(profileQuery.upsert).not.toHaveBeenCalled();
  const missingIdentity = new Request('http://localhost:3000/api/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ theme: 'neo' }),
  });
  expect((await PATCH(missingIdentity)).status).toBe(409);
  expect(profileQuery.upsert).not.toHaveBeenCalled();
});

test('saving preferences does not depend on application settings being available', async () => {
  settingsQuery.maybeSingle.mockResolvedValue({ data: null, error: {} });
  expect((await patchSettings({ theme: 'neo' })).status).toBe(200);
  expect(mockFrom).not.toHaveBeenCalledWith('app_settings');
});
