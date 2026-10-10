import type { ConversationMessage } from '@/lib/chat/conversation';
import { saveLanguageConfigToStorage } from '@/lib/config/language';
import { recordReview } from '@/lib/learning';
import type { LanguageConfig, Level } from '@/lib/schemas';
import type { ChatState } from './useChatState';
import { useMessageRequest } from './useMessageRequest';

export function useChatActions(state: ChatState) {
  const request = useMessageRequest(state);

  function newChat() {
    if (state.messages.length > 0 && state.visibleCards.length > 0) {
      state.setReviewRequested(true);
    }

    request.cancel();
    state.setMessages([]);
    state.setPrompt('');
    state.setError('');
  }

  function selectLanguages(config: LanguageConfig) {
    newChat();
    state.setReviewOpen(false);
    state.setReviewRequested(false);
    state.setConfig(config);
    state.setIsSelectingLanguages(false);

    if (!saveLanguageConfigToStorage(config, state.level)) {
      state.setStorageWarning('Language settings could not be saved in this browser.');
    }
  }

  function changeLevel(level: Level) {
    state.setLevel(level);

    if (state.config && !saveLanguageConfigToStorage(state.config, level)) {
      state.setStorageWarning('Your level could not be saved in this browser.');
    }
  }

  function changeLanguages() {
    request.cancel();
    state.setReviewOpen(false);
    state.setReviewRequested(false);
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

  function gradeReview(ids: string[], correct: boolean) {
    state.setCards((current) =>
      current.map((card) => (ids.includes(card.id) ? recordReview(card, correct) : card)),
    );
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

  function retry(message: ConversationMessage) {
    void request.sendMessage(message);
  }

  return {
    cancel: request.cancel,
    newChat,
    selectLanguages,
    changeLevel,
    deleteMessage,
    gradeReview,
    forgetReview,
    clearError,
    send,
    sendSpoken,
    retry,
    changeLanguages,
  };
}

export type ChatActions = ReturnType<typeof useChatActions>;
