import { updateMessageStatus, type ConversationMessage } from '@/lib/chat/conversation';
import { requestMessage } from './message-request';
import type { ChatState } from './useChatState';

export function useMessageRequest(state: ChatState) {
  function cancel() {
    const pendingRequest = state.activeChatRequest.current;
    if (!pendingRequest) {
      return;
    }
    pendingRequest.controller.abort();
    state.activeChatRequest.current = null;
    state.setMessages((current) =>
      updateMessageStatus(current, pendingRequest.messageId, 'failed'),
    );
    state.setLoading(false);
  }

  function sendMessage(retryMessage?: ConversationMessage, spokenContent?: string) {
    return requestMessage(state, {
      retryMessage,
      spokenContent,
    });
  }

  return {
    cancel,
    sendMessage,
  };
}
