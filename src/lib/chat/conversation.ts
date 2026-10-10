import type { ChatMessage } from '../types';

export interface ConversationMessage extends ChatMessage {
  replyTo?: string;
}

export { buildChatRequest } from './conversation-request';
export { addAssistantReply, updateMessageStatus } from './conversation-messages';
