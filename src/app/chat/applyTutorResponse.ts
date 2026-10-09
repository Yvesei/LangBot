import { addAssistantReply } from '@/lib/chat/conversation';
import type { ChatResult, LanguageConfig } from '@/lib/schemas';
import type { ChatState } from './useChatState';

interface TutorResponseOptions {
  messageId: string;
  content: string;
  tutorResponse: ChatResult;
  config: LanguageConfig;
  state: ChatState;
}

export function applyTutorResponse(options: TutorResponseOptions) {
  const { messageId, tutorResponse, state } = options;
  state.setMessages((current) => addAssistantReply(current, messageId, tutorResponse));
}
