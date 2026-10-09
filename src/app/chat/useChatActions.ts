import type { ConversationMessage } from '@/lib/chat/conversation';
import type { LanguageConfig, Level } from '@/lib/schemas';
import {
  changeLanguages as applyLanguageChange,
  changeLevel as applyLevelChange,
  closeVoiceCall as applyVoiceClose,
  deleteMessage as applyMessageDeletion,
  selectLanguages as applyLanguageSelection,
  startNewChat,
} from './chat-session-actions';
import {
  forgetReview as applyForgetReview,
  gradeReview as applyReviewGrade,
} from './chat-study-actions';
import type { ChatState } from './useChatState';
import { useMessageRequest } from './useMessageRequest';

export function useChatActions(state: ChatState) {
  const request = useMessageRequest(state);

  function newChat() {
    startNewChat(state, request.cancel);
  }

  function selectLanguages(config: LanguageConfig) {
    applyLanguageSelection(state, newChat, config);
  }

  function changeLevel(level: Level) {
    applyLevelChange(state, level);
  }

  function deleteMessage(messageId: string) {
    applyMessageDeletion(state, request.cancel, messageId);
  }

  function openVoiceCall() {
    state.setError('');
    state.setVoiceOpen(true);
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
    openVoiceCall,
    closeVoiceCall: applyVoiceClose.bind(null, state),
    gradeReview: applyReviewGrade.bind(null, state),
    forgetReview: applyForgetReview.bind(null, state),
    clearError: state.setError.bind(null, ''),
    send: request.sendMessage.bind(null, undefined, undefined),
    sendSpoken,
    retry,
    changeLanguages: applyLanguageChange.bind(null, state, request.cancel),
  };
}

export type ChatActions = ReturnType<typeof useChatActions>;
