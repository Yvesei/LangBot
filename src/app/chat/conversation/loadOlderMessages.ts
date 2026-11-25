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
  loadingGeneration: RefObject<number | null>;
  setMessages: Dispatch<SetStateAction<ConversationMessage[]>>;
  setState: Dispatch<SetStateAction<ActiveConversationState>>;
  queryClient: QueryClient;
}

function canLoad({ state, userId }: LoadOptions) {
  return state.id && state.hasMore && userId && state.ready && state.owner === userId;
}

function isCurrent({ generation, owner, userId }: LoadOptions, version: number) {
  return generation.current === version && owner.current === userId;
}

export async function loadOlderMessages(options: LoadOptions) {
  const {
    state,
    userId,
    generation,
    stateOffset,
    setMessages,
    setState,
    loadingGeneration,
  } = options;
  if (!canLoad(options) || !state.id || !userId) {
    return 'skipped';
  }
  const version = generation.current;
  if (loadingGeneration.current === version) {
    return 'skipped';
  }
  loadingGeneration.current = version;
  try {
    const id = state.id;
    const offset = stateOffset.current;
    const result = await options.queryClient.fetchQuery({
      queryKey: ['conversation', userId, id, offset],

      queryFn: ({ signal }) => loadConversation(id, offset, signal),
      staleTime: 30_000,
    });
    if (!isCurrent(options, version)) {
      return 'stale';
    }
    stateOffset.current += result.turns.length;
    setMessages((previous) => [...turnMessages(result.turns), ...previous]);
    setState((previous) => ({
      ...previous,
      hasMore: result.hasMore,
      error: '',
    }));
    return 'done';
  } catch {
    if (isCurrent(options, version)) {
      setState((previous) => ({
        ...previous,
        error: 'Older messages could not be loaded.',
      }));
      return 'done';
    }
    return 'stale';
  } finally {
    if (loadingGeneration.current === version) {
      loadingGeneration.current = null;
    }
  }
}
