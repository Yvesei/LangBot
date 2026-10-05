import type { ChatMessage } from '../types';

export interface ConversationMessage extends ChatMessage {
  replyTo?: string;
  topics?: string[];
}

export { buildChatRequest } from './conversation-request';
export {
  addAssistantReply,
  getConversationTopics,
  updateMessageStatus,
} from './conversation-messages';
