import type { ConversationMessage } from '@/lib/chat/conversation';
import { saveLanguageConfigToStorage } from '@/lib/config/language';
import type { LanguageConfig, Level } from '@/lib/schemas';
import type { ChatState } from './useChatState';
import { useMessageRequest } from './useMessageRequest';

export function useChatActions(state: ChatState) {
  const request = useMessageRequest(state);

  function newChat() {
    request.cancel();
    state.setMessages([]);
    state.setPrompt('');
    state.setError('');
  }

  function selectLanguages(config: LanguageConfig) {
    newChat();
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
    state.setIsSelectingLanguages(true);
  }

  function deleteMessage(messageId: string) {
    request.cancel();
    state.setMessages((current) =>
      current.filter(
        (message) => message.id !== messageId && message.replyTo !== messageId,
      ),
    );
    state.setError('');
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
    clearError,
    send,
    sendSpoken,
    retry,
    changeLanguages,
  };
}

export type ChatActions = ReturnType<typeof useChatActions>;
