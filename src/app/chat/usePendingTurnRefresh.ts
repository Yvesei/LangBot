import { useEffect } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import { loadConversation, turnMessages } from '@/lib/chat/saved';
import type { ConversationMessage } from '@/lib/chat/conversation';

interface RefreshOptions {
  conversationId: string | null;
  userId: string | null;
  messages: ConversationMessage[];
  setMessages: Dispatch<SetStateAction<ConversationMessage[]>>;
  activeRequest: RefObject<{ controller: AbortController } | null>;
}

function mergePending(current: ConversationMessage[], refreshed: ConversationMessage[]) {
  const byId = new Map(refreshed.map((message) => [message.id, message]));
  return current.flatMap((message) => {
    if (message.role !== 'user' || message.status !== 'pending') {
      return [message];
    }
    const updated = byId.get(message.id);
    if (!updated) {
      const expired = Date.now() - message.timestamp.getTime() > 70_000;
      return expired
        ? [
            {
              ...message,
              status: 'failed' as const,
            },
          ]
        : [message];
    }
    const reply = byId.get(`${message.id}:reply`);
    return reply ? [updated, reply] : [updated];
  });
}

export function usePendingTurnRefresh(options: RefreshOptions) {
  const { conversationId, userId, messages, setMessages, activeRequest } = options;
  const hasPending = messages.some((message) => message.status === 'pending');
  useEffect(() => {
    if (!conversationId || !userId || !hasPending) {
      return;
    }
    const controller = new AbortController();

    async function refresh() {
      if (!conversationId || activeRequest.current || controller.signal.aborted) {
        return;
      }
      try {
        const result = await loadConversation(conversationId, 0, controller.signal);
        if (!controller.signal.aborted) {
          setMessages((current) => mergePending(current, turnMessages(result.turns)));
        }
      } catch {
        // The next poll can recover from a transient read failure.
      }
    }
    void refresh();
    const timer = setInterval(() => void refresh(), 3000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [conversationId, userId, hasPending, setMessages, activeRequest]);
}
