/** @jest-environment jsdom */
import { createElement, type ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import { correctionRequestSchema } from '@/lib/schemas';
import { tutorPrompt } from '@/lib/server/prompts';
import { turnMessages } from '@/lib/chat/saved';
import { languageConfig } from '../fixtures';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ensureConversation } from '@/lib/server/chat/conversations';
import { useConversationList } from '@/app/chat/conversation/useConversationList';
import { useMessageTranslation } from '@/components/ui/chat/message/useMessageActions';
import { translateMessage } from '@/lib/api';
import {
  listConversations,
  renameSavedConversation,
  deleteSavedChat,
} from '@/lib/chat/saved';

jest.mock('@/lib/chat/saved', () => ({
  ...jest.requireActual('@/lib/chat/saved'),
  listConversations: jest.fn(),
  renameSavedConversation: jest.fn(),
  deleteSavedChat: jest.fn(),
}));
jest.mock('sonner', () => ({ toast: { error: jest.fn() } }));
jest.mock('@/lib/api', () => ({ translateMessage: jest.fn() }));

describe('chat input boundaries', () => {
  test('text APIs accept messages with only the selected languages', () => {
    const correction = {
      content: 'I has a apple.',
      languageConfig,
    };
    expect(correctionRequestSchema.parse(correction)).toEqual(correction);
  });

  test('selected languages control the system prompt', () => {
    const prompt = tutorPrompt({ nativeLanguage: 'en', targetLanguage: 'ja' });
    expect(prompt).toContain('Target language: Japanese');
    expect(prompt).toContain('Native language: English');
    expect(prompt).not.toContain('DO NOT CORRECT');
  });
});

test('saved turns reopen with pending, failed, and complete states', () => {
  const turn = {
    id: '7207ee80-801c-4e25-b8a9-04020135080b',
    prompt: 'Bonjour',
    reply: null,
    correction: null,
    origin: 'text' as const,
    status: 'pending' as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  expect(turnMessages([turn])[0].status).toBe('pending');
  expect(
    turnMessages([
      { ...turn, updated_at: new Date(Date.now() - 71_000).toISOString() },
    ])[0].status,
  ).toBe('failed');
  const complete = turnMessages([{ ...turn, reply: 'Hello', status: 'complete' }]);
  expect(complete.map((message) => message.role)).toEqual(['user', 'assistant']);
  expect(complete[1].replyTo).toBe(turn.id);
});

test('reuses a message translation when the conversation is reopened', async () => {
  const message = {
    id: 'one',
    role: 'assistant' as const,
    content: 'Bonjour',
    timestamp: new Date(),
  };
  jest
    .mocked(translateMessage)
    .mockResolvedValue({ success: true, translation: 'Hello' });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
  const first = renderHook(
    () => useMessageTranslation(message, languageConfig, jest.fn()),
    { wrapper },
  );
  await act(async () => first.result.current.translate());
  expect(first.result.current.translation).toBe('Hello');
  first.unmount();
  const reopened = renderHook(
    () => useMessageTranslation(message, languageConfig, jest.fn()),
    { wrapper },
  );
  await act(async () => reopened.result.current.translate());
  expect(reopened.result.current.showTranslation).toBe(true);
  expect(translateMessage).toHaveBeenCalledTimes(1);
  client.clear();
});

test.each([
  [[], true],
  [[{ prompt: 'Earlier message' }], false],
])('names only an empty default conversation', async (messages, shouldRename) => {
  const id = '7207ee80-801c-4e25-b8a9-04020135080b';
  const userId = '3f41537f-8091-4b71-b7d1-c6198212252f';
  const row = {
    id,
    user_id: userId,
    native_language: languageConfig.nativeLanguage,
    target_language: languageConfig.targetLanguage,
    title: 'New conversation',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const update = jest.fn();
  const conversations = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: row, error: null }),
    update: update.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      }),
    }),
  };
  const messageQuery = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue({ data: messages, error: null }),
  };
  const client = {
    from: (table: string) => (table === 'conversations' ? conversations : messageQuery),
  } as unknown as SupabaseClient;

  await ensureConversation(client, userId, {
    id,
    config: languageConfig,
    prompt: 'First message',
  });
  if (shouldRename) {
    expect(update).toHaveBeenCalledWith({ title: 'First message' });
  } else {
    expect(update).not.toHaveBeenCalled();
  }
});

test.each(['rename', 'delete'] as const)(
  'rolls back a failed optimistic %s',
  async (action) => {
    const chat = {
      id: '7207ee80-801c-4e25-b8a9-04020135080b',
      title: 'Original',
      native_language: 'en',
      target_language: 'fr',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    };
    jest.mocked(listConversations).mockResolvedValue({
      success: true,
      conversations: [chat],
      hasMore: false,
      messageCount: 0,
    });
    let fail!: (reason: Error) => void;
    const pending = new Promise<never>((_resolve, reject) => {
      fail = reject;
    });
    if (action === 'rename') {
      jest.mocked(renameSavedConversation).mockReturnValue(pending);
    } else {
      jest.mocked(deleteSavedChat).mockReturnValue(pending);
    }
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client }, children);
    const { result } = renderHook(() => useConversationList('user'), { wrapper });
    await waitFor(() => expect(result.current.conversations).toHaveLength(1));
    act(() => {
      if (action === 'rename') result.current.rename(chat.id, 'Changed');
      else void result.current.deleteChat(chat.id).catch(() => {});
    });
    await waitFor(() =>
      expect(result.current.conversations.map((item) => item.title)).toEqual(
        action === 'rename' ? ['Changed'] : [],
      ),
    );
    act(() => fail(new Error('failed')));
    await waitFor(() => expect(result.current.conversations[0]?.title).toBe('Original'));
    expect(toast.error).toHaveBeenCalled();
    client.clear();
  },
);
