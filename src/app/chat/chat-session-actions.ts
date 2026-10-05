import { saveLanguageConfigToStorage } from '@/lib/config/language';
import type { LanguageConfig, Level } from '@/lib/schemas';
import type { ChatState } from './useChatState';

export function startNewChat(state: ChatState, cancel: () => void) {
  if (state.messages.length > 0 && state.visibleCards.length > 0) {
    state.setReviewRequested(true);
  }
  cancel();
  state.setMessages([]);
  state.setPrompt('');
  state.setError('');
}

export function selectLanguages(
  state: ChatState,
  newChat: () => void,
  config: LanguageConfig,
) {
  newChat();
  state.setReviewOpen(false);
  state.setReviewRequested(false);
  state.setConfig(config);
  state.setIsSelectingLanguages(false);
  if (!saveLanguageConfigToStorage(config, state.level)) {
    state.setStorageWarning('Language settings could not be saved in this browser.');
  }
}

export function changeLevel(state: ChatState, level: Level) {
  state.setLevel(level);
  if (state.config && !saveLanguageConfigToStorage(state.config, level)) {
    state.setStorageWarning('Your level could not be saved in this browser.');
  }
}

export function deleteMessage(state: ChatState, cancel: () => void, messageId: string) {
  cancel();
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

export function changeLanguages(state: ChatState, cancel: () => void) {
  cancel();
  state.setReviewOpen(false);
  state.setReviewRequested(false);
  state.setIsSelectingLanguages(true);
}
