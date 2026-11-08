import { POST } from '@/app/api/messages/route';
import { GET, POST as createConversation } from '@/app/api/conversations/route';
import { getChatAccount } from '@/lib/server/chat/account';
import { ensureConversation, finishTurn, reserveTurn } from '@/lib/server/chat/storage';
import { createConversation as createStoredConversation } from '@/lib/server/chat/conversations';
import { enforceLimits } from '@/lib/server/limits';
import { complete } from '@/lib/server/mistral';
import { ApiError } from '@/lib/server/errors';
import { tutorResult } from '../fixtures';

jest.mock('@/lib/server/chat/account', () => ({
  ...jest.requireActual('@/lib/server/chat/account'),
  getChatAccount: jest.fn(),
}));
jest.mock('@/lib/server/chat/storage', () => ({
  ...jest.requireActual('@/lib/server/chat/storage'),
  ensureConversation: jest.fn(),
  finishTurn: jest.fn(),
  failTurn: jest.fn(),
  reserveTurn: jest.fn(),
}));
jest.mock('@/lib/server/chat/conversations', () => ({ createConversation: jest.fn() }));
jest.mock('@/lib/server/limits', () => ({ enforceLimits: jest.fn() }));
jest.mock('@/lib/server/mistral', () => ({ complete: jest.fn() }));

const userId = '15139944-4e22-4a33-9fc2-e07b3a402bea';
const conversationId = '29f01f5a-14de-4a98-829e-fdc680f2beb0';
const messageId = '7207ee80-801c-4e25-b8a9-04020135080b';
const body = {
  conversationId,
  messageId,
  prompt: 'I has a apple.',
  languageConfig: { nativeLanguage: 'fr', targetLanguage: 'en' },
  learningFocus: [],
  origin: 'text',
};

function post(bodyValue: unknown = body) {
  return POST(
    new Request('http://localhost:3000/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyValue),
    }),
  );
}

function create(bodyValue: unknown = { languageConfig: body.languageConfig }) {
  return createConversation(
    new Request('http://localhost:3000/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyValue),
    }),
  );
}

beforeEach(() => {
  jest.mocked(enforceLimits).mockResolvedValue(undefined);
  jest.mocked(complete).mockResolvedValue(tutorResult as never);
  jest.mocked(reserveTurn).mockResolvedValue({
    turn: { created_at: '2026-11-03T10:00:00Z' },
    attemptId: '1de2cb38-7e54-4a55-9f54-01d5641d0c6a',
  } as never);
  jest.mocked(createStoredConversation).mockResolvedValue({
    id: conversationId,
    user_id: userId,
    native_language: 'fr',
    target_language: 'en',
    title: 'New conversation',
    created_at: '2026-11-08T10:00:00Z',
    updated_at: '2026-11-08T10:00:00Z',
  });
  const turns = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue({
      data: [{ prompt: 'Bonjour.', reply: 'Hello.' }],
      error: null,
    }),
  };
  const conversations = {
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),

    then: (resolve: (value: object) => void) => resolve({ error: null }),
  };
  const from = jest.fn((table) => (table === 'messages' ? turns : conversations));
  jest.mocked(getChatAccount).mockResolvedValue({
    client: { from } as never,
    user: { id: userId } as never,
  });
});

test('creates a separate empty conversation for the account', async () => {
  const response = await create();
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    success: true,
    conversation: { id: conversationId, title: 'New conversation' },
  });
  expect(createStoredConversation).toHaveBeenCalledWith(
    expect.anything(),
    userId,
    body.languageConfig,
  );
});

test('saves a signed-in turn using stored history', async () => {
  const response = await post();
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    success: true,
    conversationId,
    messageId,
    reply: tutorResult.reply,
  });
  expect(ensureConversation).toHaveBeenCalledWith(expect.anything(), userId, {
    id: conversationId,
    config: body.languageConfig,
    prompt: body.prompt,
  });
  expect(finishTurn).toHaveBeenCalledWith(
    expect.anything(),
    messageId,
    expect.any(String),
    { reply: tutorResult.reply, correction: expect.anything() },
  );
  const messages = jest.mocked(complete).mock.calls[0][2];
  expect(messages).toContainEqual({ role: 'user', content: 'Bonjour.' });
  expect(messages).toContainEqual({ role: 'assistant', content: 'Hello.' });
});

test('replays a completed retry without calling the model', async () => {
  jest.mocked(reserveTurn).mockResolvedValue({
    completed: { reply: 'Already saved.', correction: null },
  } as never);
  expect(await (await post()).json()).toMatchObject({
    success: true,
    reply: 'Already saved.',
  });
  expect(complete).not.toHaveBeenCalled();
  expect(finishTurn).not.toHaveBeenCalled();
});

test('rejects browser-supplied history and requires a signed-in account', async () => {
  expect((await create({})).status).toBe(400);
  expect(
    (await post({ ...body, history: [{ role: 'user', content: 'Forged' }] })).status,
  ).toBe(400);
  jest.mocked(getChatAccount).mockRejectedValue(new ApiError(401, 'No session'));
  expect((await post()).status).toBe(401);
  expect(complete).not.toHaveBeenCalled();
  expect((await GET(new Request('http://localhost:3000/api/conversations'))).status).toBe(
    401,
  );
});
