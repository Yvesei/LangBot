import { useEffect, useRef, useState } from 'react';
import { listConversations, type SavedConversation } from '@/lib/chat/saved';

export function useHistoryIndex(userId: string | null) {
  const [state, setState] = useState({
    owner: null as string | null,
    ready: !userId,
    conversations: [] as SavedConversation[],
    hasMore: false,
    error: '',
  });
  const [revision, setRevision] = useState(0);
  const owner = useRef(userId);
  owner.current = userId;
  useEffect(() => {
    const controller = new AbortController();
    setState((previous) =>
      previous.owner === userId
        ? {
            ...previous,
            error: '',
          }
        : {
            owner: userId,
            ready: !userId,
            conversations: [],
            hasMore: false,
            error: '',
          },
    );
    if (userId) {
      void listConversations(0, controller.signal)
        .then((result) => {
          if (!controller.signal.aborted && owner.current === userId) {
            setState({
              owner: userId,
              ready: true,
              conversations: result.conversations,
              hasMore: result.hasMore,
              error: '',
            });
          }
        })
        .catch(() => {
          if (!controller.signal.aborted && owner.current === userId) {
            setState((previous) => ({
              ...previous,
              error: 'Your chats could not be loaded.',
            }));
          }
        });
    }
    return () => controller.abort();
  }, [userId, revision]);

  async function loadMore() {
    if (!userId || !state.hasMore) {
      return;
    }
    try {
      const result = await listConversations(
        state.conversations.length,
        new AbortController().signal,
      );
      if (owner.current !== userId) {
        return;
      }
      setState((previous) => ({
        ...previous,
        conversations: [...previous.conversations, ...result.conversations],
        hasMore: result.hasMore,
        error: '',
      }));
    } catch {
      if (owner.current === userId) {
        setState((previous) => ({
          ...previous,
          error: 'More chats could not be loaded.',
        }));
      }
    }
  }

  return {
    ...state,
    loadMore,

    reload: () => setRevision((value) => value + 1),
  };
}
