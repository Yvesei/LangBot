import type { Dispatch, RefObject, SetStateAction } from 'react';
import { conversationLanguages, createSavedConversation } from '@/lib/chat/saved';
import type { ConversationMessage } from '@/lib/chat/conversation';
import type { LanguageConfig } from '@/lib/schemas';

export interface ActiveConversationState {
  owner: string | null;
  id: string | null;
  config: LanguageConfig | null;
  hasMore: boolean;
  error: string;
  ready: boolean;
}

interface StartOptions {
  state: ActiveConversationState;
  userId: string | null;
  config?: LanguageConfig | null;
  generation: RefObject<number>;
  owner: RefObject<string | null>;
  setMessages: Dispatch<SetStateAction<ConversationMessage[]>>;
  setState: Dispatch<SetStateAction<ActiveConversationState>>;
}

function isCurrent(options: StartOptions, version: number) {
  return (
    options.generation.current === version && options.owner.current === options.userId
  );
}

export async function startSavedConversation(options: StartOptions) {
  const { state, userId, config, generation, setMessages, setState } = options;
  if (!state.ready) {
    return null;
  }
  const version = ++generation.current;
  const nextConfig = config ?? null;
  setState({
    owner: userId,
    id: null,
    config: nextConfig,
    hasMore: false,
    error: '',
    ready: !userId || !nextConfig,
  });
  setMessages([]);
  if (!userId || !nextConfig) {
    return null;
  }
  try {
    const result = await createSavedConversation(
      nextConfig,
      new AbortController().signal,
    );
    if (!isCurrent(options, version)) {
      return null;
    }
    setState({
      owner: userId,
      id: result.conversation.id,
      config: conversationLanguages(result.conversation),
      hasMore: false,
      error: '',
      ready: true,
    });
    return result.conversation;
  } catch {
    if (isCurrent(options, version)) {
      setState((previous) => ({
        ...previous,
        ready: true,
        error: 'A new chat could not be created.',
      }));
    }
    return null;
  }
}
