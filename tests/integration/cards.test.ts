import { DELETE, GET, POST } from '@/app/api/cards/route';
import { getChatAccount } from '@/lib/server/chat/account';

jest.mock('@/lib/server/chat/account', () => ({
  ...jest.requireActual('@/lib/server/chat/account'),
  getChatAccount: jest.fn(),
}));

const ownedMessage = '9b034681-b5c5-4aa7-9322-0b8ac5f83560';
const otherMessage = '9b034681-b5c5-4aa7-9322-0b8ac5f83561';
const card = {
  id: 'card-a',
  sourceMessageId: ownedMessage,
  languageConfig: { nativeLanguage: 'en', targetLanguage: 'fr' },
  originalText: 'Bonjour',
  correctedText: 'Bonjour !',
  focus: 'Punctuation',
};
const row = {
  user_id: 'account-a',
  id: card.id,
  source_message_id: card.sourceMessageId,
  native_language: 'en',
  target_language: 'fr',
  original_text: card.originalText,
  corrected_text: card.correctedText,
  focus: card.focus,
};
const query = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  range: jest.fn(),
  upsert: jest.fn(),
  delete: jest.fn().mockReturnThis(),
  in: jest.fn(),
};
const messages = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  in: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getChatAccount).mockResolvedValue({
    client: {
      from: (table: string) => (table === 'messages' ? messages : query),
    } as never,
    user: { id: 'account-a', is_anonymous: true } as never,
  });
  query.range.mockResolvedValue({ data: [row], error: null });
  query.upsert.mockResolvedValue({ error: null });
  query.in.mockResolvedValue({ error: null });
  messages.in.mockResolvedValue({ data: [{ id: ownedMessage }], error: null });
});

function request(method: string, body: unknown) {
  return new Request('http://localhost:3000/api/cards', {
    method,
    headers: {
      'content-type': 'application/json',
      origin: 'http://localhost:3000',
      'x-profile-user-id': 'account-a',
    },
    body: JSON.stringify(body),
  });
}

test('reads cards scoped to the verified anonymous or signed-in user', async () => {
  const response = await GET(
    new Request('http://localhost:3000/api/cards', {
      headers: { 'x-profile-user-id': 'account-a' },
    }),
  );
  expect(await response.json()).toEqual({
    success: true,
    userId: 'account-a',
    cards: [card],
  });
  expect(query.eq).toHaveBeenCalledWith('user_id', 'account-a');
});

test('returns valid cards even if a stored row is malformed', async () => {
  query.range.mockResolvedValue({
    data: [row, { ...row, id: 'broken', target_language: 'invalid' }],
    error: null,
  });
  const response = await GET(
    new Request('http://localhost:3000/api/cards', {
      headers: { 'x-profile-user-id': 'account-a' },
    }),
  );
  expect((await response.json()).cards).toEqual([card]);
});

test('only imports cards for owned messages and never overwrites existing cards', async () => {
  query.in.mockResolvedValue({ data: [row], error: null });
  const response = await POST(
    request('POST', {
      import: true,
      cards: [
        card,
        { ...card, id: 'other', sourceMessageId: otherMessage },
        { ...card, id: 'legacy', sourceMessageId: 'legacy' },
      ],
    }),
  );
  expect(await response.json()).toEqual({
    success: true,
    userId: 'account-a',
    importedIds: [card.id],
  });
  expect(messages.eq).toHaveBeenCalledWith('conversations.user_id', 'account-a');
  expect(query.upsert).toHaveBeenCalledWith([row], {
    onConflict: 'user_id,id',
    ignoreDuplicates: true,
  });
});

test('does not confirm an existing card with conflicting content', async () => {
  query.in.mockResolvedValue({ data: [{ ...row, focus: 'Different' }], error: null });
  const response = await POST(request('POST', { import: true, cards: [card] }));
  expect((await response.json()).importedIds).toEqual([]);
});

test('manual import accepts unverifiable cards without overwriting a conflict', async () => {
  const legacyCard = { ...card, sourceMessageId: 'legacy' };
  query.in.mockResolvedValue({ data: [{ ...row, focus: 'Different' }], error: null });
  const response = await POST(request('POST', { import: 'manual', cards: [legacyCard] }));
  expect((await response.json()).importedIds).toEqual([]);
  expect(messages.select).not.toHaveBeenCalled();
  expect(query.upsert).toHaveBeenCalledWith([{ ...row, source_message_id: 'legacy' }], {
    onConflict: 'user_id,id',
    ignoreDuplicates: true,
  });
});

test('manual import confirms an unverifiable card once saved identically', async () => {
  const legacyCard = { ...card, sourceMessageId: 'legacy' };
  query.in.mockResolvedValue({
    data: [{ ...row, source_message_id: 'legacy' }],
    error: null,
  });
  const response = await POST(request('POST', { import: 'manual', cards: [legacyCard] }));
  expect((await response.json()).importedIds).toEqual([card.id]);
});

test('saves and deletes under the verified account regardless of card ID', async () => {
  expect((await POST(request('POST', { cards: [card] }))).status).toBe(200);
  expect(query.upsert).toHaveBeenCalledWith([row], {
    onConflict: 'user_id,id',
    ignoreDuplicates: false,
  });
  expect((await DELETE(request('DELETE', { ids: [card.id] }))).status).toBe(200);
  expect(query.eq).toHaveBeenCalledWith('user_id', 'account-a');
  expect(query.in).toHaveBeenCalledWith('id', [card.id]);
});

test('deletes cards by source message under the verified account', async () => {
  const response = await DELETE(request('DELETE', { sourceMessageId: ownedMessage }));
  expect(response.status).toBe(200);
  expect(query.eq).toHaveBeenCalledWith('user_id', 'account-a');
  expect(query.eq).toHaveBeenCalledWith('source_message_id', ownedMessage);
  expect(query.in).not.toHaveBeenCalled();
});

test('rejects mixed or missing delete selectors', async () => {
  expect(
    (await DELETE(request('DELETE', { ids: [card.id], sourceMessageId: ownedMessage })))
      .status,
  ).toBe(400);
  expect((await DELETE(request('DELETE', {}))).status).toBe(400);
  expect(query.delete).not.toHaveBeenCalled();
});

test('accepts a valid card whose escaped text exceeds the default body limit', async () => {
  const large = {
    ...card,
    originalText: '\u0001'.repeat(2000),
    correctedText: '\u0001'.repeat(4000),
    focus: '\u0001'.repeat(4000),
  };
  expect((await POST(request('POST', { cards: [large] }))).status).toBe(200);
});

test('rejects supplied ownership and duplicate IDs', async () => {
  expect(
    (await POST(request('POST', { cards: [card], user_id: 'account-b' }))).status,
  ).toBe(400);
  expect((await POST(request('POST', { cards: [card, card] }))).status).toBe(400);
  expect(query.upsert).not.toHaveBeenCalled();
});

test('rejects requests when the browser account has changed', async () => {
  const response = await GET(
    new Request('http://localhost:3000/api/cards', {
      headers: { 'x-profile-user-id': 'account-b' },
    }),
  );
  expect(response.status).toBe(409);
  expect(query.select).not.toHaveBeenCalled();
});
