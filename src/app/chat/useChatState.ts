import { getConversationTopics } from '@/lib/chat/conversation';
import { sameLanguages } from '@/lib/learning';
import { groupReviewCards } from '@/lib/review';
import { useChatEffects, useStoredPreferences } from './chat-state-effects';
import {
  useConfigurationState,
  useConversationState,
  useOverlayState,
  useStudyState,
} from './chat-state-groups';

export function useChatState() {
  const configuration = useConfigurationState();
  const conversation = useConversationState();
  const study = useStudyState();
  const overlays = useOverlayState();
  const { config } = configuration;
  const { messages } = conversation;
  const { cards } = study;

  useStoredPreferences({
    ...configuration,
    ...study,
    ...overlays,
    activeChatRequest: conversation.activeChatRequest,
  });
  useChatEffects({
    ...study,
    ...overlays,
    isReady: configuration.isReady,
    messagesChanged: messages,
    messagesEndRef: conversation.messagesEndRef,
    loading: conversation.loading,
  });
  const visibleCards = cards.filter(
    (card) => config !== null && sameLanguages(card.languageConfig, config),
  );

  return {
    ...configuration,
    ...conversation,
    ...study,
    ...overlays,
    visibleCards,
    topics: getConversationTopics(messages),
    reviewGroups: groupReviewCards(visibleCards),
  };
}

export type ChatState = ReturnType<typeof useChatState>;
