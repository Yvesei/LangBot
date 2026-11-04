import type { ChatMessage } from '../types';

export interface ConversationMessage extends ChatMessage {
  replyTo?: string;
  origin?: 'text' | 'voice';
}

export { buildChatRequest } from './conversation-request';
export { addAssistantReply, updateMessageStatus } from './conversation-messages';
