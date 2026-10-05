import { getConversationTopics } from '@/lib/chat/conversation';
import { sameLanguages } from '@/lib/learning';
import { useChatEffects, useStoredPreferences } from './chat-state-effects';
import {
  useConfigurationState,
  useConversationState,
  useStudyState,
} from './chat-state-groups';

export function useChatState() {
  const configuration = useConfigurationState();
  const conversation = useConversationState();
  const study = useStudyState();
  const { config } = configuration;
  const { messages } = conversation;
  const { cards } = study;

  useStoredPreferences({
    ...configuration,
    ...study,
    activeChatRequest: conversation.activeChatRequest,
  });
  useChatEffects({
    ...study,
    isReady: configuration.isReady,
    messagesChanged: messages,
    messagesEndRef: conversation.messagesEndRef,
  });
  const visibleCards = cards.filter(
    (card) => config !== null && sameLanguages(card.languageConfig, config),
  );

  return {
    ...configuration,
    ...conversation,
    ...study,
    visibleCards,
    topics: getConversationTopics(messages),
  };
}

export type ChatState = ReturnType<typeof useChatState>;
