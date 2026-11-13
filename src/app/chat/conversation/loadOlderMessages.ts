import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import { loadConversation, turnMessages } from '@/lib/chat/saved';
import type { ConversationMessage } from '@/lib/chat/conversation';
import type { ActiveConversationState } from './createConversation';

interface LoadOptions {
  state: ActiveConversationState;
  userId: string | null;
  generation: RefObject<number>;
  owner: RefObject<string | null>;
  stateOffset: RefObject<number>;
  setMessages: Dispatch<SetStateAction<ConversationMessage[]>>;
  setState: Dispatch<SetStateAction<ActiveConversationState>>;
  queryClient: QueryClient;
}

export async function loadOlderMessages(options: LoadOptions) {
  const { state, userId, generation, owner, stateOffset, setMessages, setState } =
    options;
  if (!state.id || !state.hasMore || !userId) {
    return;
  }
  const version = generation.current;
  try {
    const id = state.id;
    const offset = stateOffset.current;
    const result = await options.queryClient.fetchQuery({
      queryKey: ['conversation', userId, id, offset],

      queryFn: ({ signal }) => loadConversation(id, offset, signal),
      staleTime: 30_000,
    });
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
