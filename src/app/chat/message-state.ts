import { updateMessageStatus } from '@/lib/chat/conversation';
import type { ConversationMessage } from '@/lib/chat/conversation';
import type { ChatState } from './useChatState';

export interface SendMessageOptions {
  retryMessage?: ConversationMessage;
  spokenContent?: string;
}

export function getMessageContent(state: ChatState, options: SendMessageOptions) {
  return (
    options.retryMessage?.content ?? options.spokenContent?.trim() ?? state.prompt.trim()
  );
}

export function addPendingMessage(
  state: ChatState,
  messageId: string,
  content: string,
  options: SendMessageOptions,
) {
  if (options.retryMessage) {
    state.setMessages((current) => updateMessageStatus(current, messageId, 'pending'));
    return;
  }
  if (options.spokenContent === undefined) {
    state.setPrompt('');
  }
  state.setMessages((current) => [
    ...current,
    {
      id: messageId,
      role: 'user',
      content,
      timestamp: new Date(),
      status: 'pending',
    },
  ]);
}
