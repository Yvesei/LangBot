import type { ConversationMessage } from '@/lib/chat/conversation';
import type { LanguageConfig } from '@/lib/schemas';
import type { ChatState } from './useChatState';
import { useMessageRequest } from './useMessageRequest';

export function useChatActions(state: ChatState) {
  const request = useMessageRequest(state);

  function newChat() {
    request.cancel();
    state.setVoiceOpen(false);
    state.setMessages([]);
    state.setPrompt('');
    state.setError('');
  }

  function selectLanguages(config: LanguageConfig) {
    newChat();
    state.setReviewOpen(false);
    state.setConfig(config);
    state.setIsSelectingLanguages(false);
  }

  function changeLanguages() {
    request.cancel();
    state.setVoiceOpen(false);
    state.setReviewOpen(false);
    state.setIsSelectingLanguages(true);
  }

  function deleteMessage(messageId: string) {
    request.cancel();
    state.setMessages((current) =>
      current.filter(
        (message) => message.id !== messageId && message.replyTo !== messageId,
      ),
    );
    state.setCards((current) =>
      current.filter((card) => card.sourceMessageId !== messageId),
    );
    state.setError('');
  }

  function forgetReview(ids: string[]) {
    state.setCards((current) => current.filter((card) => !ids.includes(card.id)));
  }

  function clearError() {
    state.setError('');
  }

  function send() {
    return request.sendMessage();
  }

  function sendSpoken(content: string) {
    void request.sendMessage(undefined, content);
  }

  function openVoiceCall() {
    state.setError('');
    state.setReviewOpen(false);
    state.setVoiceOpen(true);
  }

  function closeVoiceCall() {
    state.setVoiceOpen(false);
  }

  function retry(message: ConversationMessage) {
    void request.sendMessage(message);
  }

  return {
    cancel: request.cancel,
    newChat,
    selectLanguages,
    deleteMessage,
    forgetReview,
    clearError,
    send,
    sendSpoken,
    openVoiceCall,
    closeVoiceCall,
    retry,
    changeLanguages,
  };
}

export type ChatActions = ReturnType<typeof useChatActions>;
