import type { Dispatch, RefObject, SetStateAction } from 'react';
import { loadConversation, turnMessages } from '@/lib/chat/saved';
import type { ConversationMessage } from '@/lib/chat/conversation';
import type { LanguageConfig } from '@/lib/schemas';

interface ActiveState {
  owner: string | null;
  id: string | null;
  config: LanguageConfig | null;
  hasMore: boolean;
  error: string;
  ready: boolean;
}

interface LoadOptions {
  state: ActiveState;
  userId: string | null;
  generation: RefObject<number>;
  owner: RefObject<string | null>;
  stateOffset: RefObject<number>;
  setMessages: Dispatch<SetStateAction<ConversationMessage[]>>;
  setState: Dispatch<SetStateAction<ActiveState>>;
}

export async function loadOlderTurns(options: LoadOptions) {
  const { state, userId, generation, owner, stateOffset, setMessages, setState } =
    options;
  if (!state.id || !state.hasMore || !userId) {
    return;
  }
  const version = generation.current;
  try {
    const result = await loadConversation(
      state.id,
      stateOffset.current,
      new AbortController().signal,
    );
    if (generation.current !== version || owner.current !== userId) {
      return;
    }
    stateOffset.current += result.turns.length;
    setMessages((previous) => [...turnMessages(result.turns), ...previous]);
    setState((previous) => ({
      ...previous,
      hasMore: result.hasMore,
      error: '',
    }));
  } catch {
    if (generation.current === version && owner.current === userId) {
      setState((previous) => ({
        ...previous,
        error: 'Older messages could not be loaded.',
      }));
    }
  }
}
