import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  conversationLanguages,
  deleteSavedChat,
  listConversations,
  loadConversation,
  turnMessages,
  type SavedConversation,
} from '@/lib/chat/saved';
import type { ConversationMessage } from '@/lib/chat/conversation';
import type { LanguageConfig } from '@/lib/schemas';
import { loadOlderTurns } from './loadOlderTurns';

type SetMessages = Dispatch<SetStateAction<ConversationMessage[]>>;
const emptyActive = {
  id: null as string | null,
  config: null as LanguageConfig | null,
  hasMore: false,
  error: '',
  ready: true,
};

const initialActive = (owner: string | null) => ({
  owner,
  ...emptyActive,
});

function useHistoryIndex(userId: string | null) {
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

function useActiveHistory(userId: string | null, setMessages: SetMessages) {
  const [state, setState] = useState(initialActive(userId));
  const generation = useRef(0);
  const stateOffset = useRef(40);
  const owner = useRef(userId);
  owner.current = userId;
  useEffect(() => {
    generation.current++;
    setState(initialActive(userId));
  }, [userId]);

  const open = useCallback(
    async (id: string) => {
      if (!userId) {
        return;
      }
      const version = ++generation.current;
      setState((previous) => ({
        ...previous,
        id,
        ready: false,
        error: '',
      }));
      try {
        const result = await loadConversation(id, 0, new AbortController().signal);
        if (generation.current !== version || owner.current !== userId) {
          return;
        }
        const config = conversationLanguages(result.conversation);
        stateOffset.current = result.turns.length;
        setMessages(turnMessages(result.turns));
        setState({
          owner: userId,
          id,
          config,
          hasMore: result.hasMore,
          ready: true,
          error: '',
        });
      } catch {
        if (generation.current === version && owner.current === userId) {
          setState((previous) => ({
            ...previous,
            ready: false,
            error: 'This chat could not be loaded.',
          }));
        }
      }
    },
    [userId, setMessages],
  );

  function startNew() {
    generation.current++;
    setState(initialActive(userId));
    setMessages([]);
  }

  function loadOlder() {
    return loadOlderTurns({
      state,
      userId,
      generation,
      owner,
      stateOffset,
      setMessages,
      setState,
    });
  }

  function noteStarted(id: string, config: LanguageConfig, newTurn: boolean) {
    if (state.id) {
      if (newTurn) {
        stateOffset.current++;
      }
      return state.id;
    }
    stateOffset.current = 0;
    setState((previous) => ({
      ...previous,
      id,
      config,
    }));
    return id;
  }

  return {
    ...state,
    open,
    startNew,
    loadOlder,
    noteStarted,

    noteRemoved: () => (stateOffset.current = Math.max(0, stateOffset.current - 1)),
  };
}

export function useConversationHistory(userId: string | null, setMessages: SetMessages) {
  const index = useHistoryIndex(userId);
  const active = useActiveHistory(userId, setMessages);
  const initialized = useRef<string | null>(null);
  const open = active.open;
  useEffect(() => {
    if (!userId) {
      initialized.current = null;
      return;
    }
    if (!index.ready || index.owner !== userId || initialized.current === userId) {
      return;
    }
    initialized.current = userId;
    if (index.conversations[0]) {
      void open(index.conversations[0].id);
    }
  }, [userId, index.ready, index.owner, index.conversations, open]);

  async function deleteConversation(id: string) {
    await deleteSavedChat(id);
    if (active.id === id) {
      active.startNew();
    }
    index.reload();
  }

  return {
    conversations: index.conversations,
    listHasMore: index.hasMore,
    loadMoreChats: index.loadMore,
    reloadChats: index.reload,

    retry: () => {
      if (active.error && active.id) {
        void active.open(active.id);
      } else {
        index.reload();
      }
    },
    id: active.id,
    config: active.config,
    open: active.open,
    startNew: active.startNew,
    noteStarted: active.noteStarted,
    noteRemoved: active.noteRemoved,
    loadOlder: active.loadOlder,
    hasOlder: active.hasMore,
    deleteConversation,
    isReady:
      index.owner === userId && index.ready && active.owner === userId && active.ready,
    error: index.error || active.error,
  };
}
