import { getConversationTopics } from '@/lib/chat/conversation';
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
  const { messages } = conversation;

  useStoredPreferences({
    ...configuration,
    ...study,
    activeChatRequest: conversation.activeChatRequest,
  });
  useChatEffects({
    ...study,
    messagesChanged: messages,
    messagesEndRef: conversation.messagesEndRef,
  });

  return {
    ...configuration,
    ...conversation,
    ...study,
    topics: getConversationTopics(messages),
  };
}

export type ChatState = ReturnType<typeof useChatState>;
