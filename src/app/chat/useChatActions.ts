import type { ConversationMessage } from '@/lib/chat/conversation';
import type { LanguageConfig } from '@/lib/schemas';
import type { ChatState } from './useChatState';
import { useMessageRequest } from './useMessageRequest';
import { deleteSavedChat } from '@/lib/chat/saved';

export function useChatActions(state: ChatState) {
  const request = useMessageRequest(state);

  function newChat() {
    request.cancel();
    state.setVoiceOpen(false);
    state.history.startNew();
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

  async function deleteMessage(messageId: string) {
    const message = state.messages.find((item) => item.id === messageId);
    const turnId = message?.replyTo ?? messageId;
    const saved = Boolean(state.auth.session && state.history.id);
    const targetId = saved ? turnId : messageId;
    request.cancel();
    if (saved && state.history.id) {
      try {
        await deleteSavedChat(state.history.id, turnId);
        state.history.noteRemoved();
      } catch {
        state.setError('Could not delete this message. Please retry.');
        return;
      }
    }
    state.setMessages((current) =>
      current.filter((item) => item.id !== targetId && item.replyTo !== targetId),
    );
    state.setCards((current) =>
      current.filter((card) => card.sourceMessageId !== targetId),
    );
    state.setError('');
  }

  function openChat(id: string) {
    request.cancel();
    state.setVoiceOpen(false);
    state.setReviewOpen(false);
    void state.history.open(id);
  }

  async function deleteChat(id: string) {
    request.cancel();
    try {
      await state.history.deleteConversation(id);
    } catch {
      state.setError('Could not delete this chat. Please retry.');
    }
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
    openChat,
    deleteChat,
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
