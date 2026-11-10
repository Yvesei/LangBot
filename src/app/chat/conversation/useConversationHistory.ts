import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  conversationLanguages,
  deleteSavedChat,
  loadConversation,
  turnMessages,
} from '@/lib/chat/saved';
import type { ConversationMessage } from '@/lib/chat/conversation';
import type { LanguageConfig } from '@/lib/schemas';
import { loadOlderMessages } from './loadOlderMessages';
import { createConversation, type ActiveConversationState } from './createConversation';
import { useConversationList } from './useConversationList';

type SetMessages = Dispatch<SetStateAction<ConversationMessage[]>>;
const emptyActive = {
  id: null as string | null,
  config: null as LanguageConfig | null,
  hasMore: false,
  error: '',
  ready: true,
};

const initialActive = (owner: string | null): ActiveConversationState => ({
  owner,
  ...emptyActive,
});

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

  function startNew(config?: LanguageConfig | null) {
    return createConversation({
      state,
      userId,
      config,
      generation,
      owner,
      setMessages,
      setState,
    });
  }

  function loadOlder() {
    return loadOlderMessages({
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
  const index = useConversationList(userId);
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
      void active.startNew();
    }
    index.reload();
  }

  async function startNew(config?: LanguageConfig | null) {
    const conversation = await active.startNew(config);
    if (conversation) {
      index.reload();
    }
  }

  return {
    conversations: index.conversations,
    listHasMore: index.hasMore,
    messageCount: index.messageCount,
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
    startNew,
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
