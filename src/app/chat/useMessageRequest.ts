import { send } from '@/lib/api';
import {
  addAssistantReply,
  buildChatRequest,
  updateMessageStatus,
  type ConversationMessage,
} from '@/lib/chat/conversation';
import { createFlashcards } from '@/lib/learning';
import type { ChatResult, LanguageConfig } from '@/lib/schemas';
import { GUEST_MESSAGE_LIMIT } from '@/lib/auth/guest-message-limit';
import type { ChatState } from './useChatState';

const MAX_SAVED_CARDS = 100;

interface SendMessageOptions {
  retryMessage?: ConversationMessage;
  spokenContent?: string;
}

interface SuccessfulResponseOptions {
  controller: AbortController;
  messageId: string;
  content: string;
  result: ChatResult;
  isGuestMessage: boolean;
}

function getMessageContent(state: ChatState, options: SendMessageOptions) {
  if (options.retryMessage) {
    return options.retryMessage.content;
  }

  if (options.spokenContent !== undefined) {
    return options.spokenContent.trim();
  }

  return state.prompt.trim();
}

function addPendingMessage(
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

function isCurrentRequest(state: ChatState, controller: AbortController) {
  return (
    !controller.signal.aborted &&
    state.activeChatRequest.current?.controller === controller
  );
}

function canStartMessage(
  state: ChatState,
): state is ChatState & { config: LanguageConfig } {
  return (
    Boolean(state.config) &&
    state.isReady &&
    !state.activeChatRequest.current &&
    !state.isSelectingLanguages &&
    !state.auth.isLoading &&
    !state.isGuestLimitReached
  );
}

function finishRequest(state: ChatState, controller: AbortController) {
  if (state.activeChatRequest.current?.controller !== controller) {
    return;
  }

  state.activeChatRequest.current = null;
  state.setLoading(false);
}

function handleRequestError(
  state: ChatState,
  controller: AbortController,
  messageId: string,
  requestError: unknown,
) {
  if (!isCurrentRequest(state, controller)) {
    return;
  }

  state.setMessages((current) => updateMessageStatus(current, messageId, 'failed'));

  let errorMessage = 'Could not send the message. Please retry.';
  if (requestError instanceof Error) {
    errorMessage = requestError.message;
  }

  state.setError(errorMessage);
}

function saveReviewCards(
  state: ChatState,
  messageId: string,
  content: string,
  result: ChatResult,
) {
  const config = state.config;
  if (!config) {
    return;
  }

  const cards = createFlashcards(messageId, result.correction, config, content);
  if (cards.length === 0) {
    return;
  }

  state.setCards((current) => {
    const retainedCards = current.filter((card) => card.sourceMessageId !== messageId);
    return [...retainedCards, ...cards].slice(-MAX_SAVED_CARDS);
  });
}

function handleSuccessfulResponse(state: ChatState, options: SuccessfulResponseOptions) {
  if (!isCurrentRequest(state, options.controller)) {
    return;
  }

  state.setMessages((current) =>
    addAssistantReply(current, options.messageId, options.result),
  );
  const guestMessageCount = options.isGuestMessage ? state.recordGuestMessage() : null;
  if (guestMessageCount !== null && guestMessageCount >= GUEST_MESSAGE_LIMIT) {
    state.setVoiceOpen(false);
  }
  saveReviewCards(state, options.messageId, options.content, options.result);
}

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

  async function sendMessage(retryMessage?: ConversationMessage, spokenContent?: string) {
    if (!canStartMessage(state)) {
      return;
    }

    const config = state.config;
    const isGuestMessage = state.auth.isConfigured && !state.auth.session;

    const options = {
      retryMessage,
      spokenContent,
    };
    const content = getMessageContent(state, options);
    if (!content) {
      return;
    }

    const messageId = retryMessage?.id ?? crypto.randomUUID();
    const controller = new AbortController();
    state.activeChatRequest.current = {
      controller,
      messageId,
    };
    state.setLoading(true);
    state.setError('');
    addPendingMessage(state, messageId, content, options);

    try {
      const tutorResponse = await send(
        buildChatRequest({
          content,
          messages: state.messages,
          cards: state.visibleCards,
          config,
          retryMessageId: retryMessage?.id,
        }),
        controller.signal,
      );

      handleSuccessfulResponse(state, {
        controller,
        messageId,
        content,
        result: tutorResponse,
        isGuestMessage,
      });
    } catch (requestError) {
      handleRequestError(state, controller, messageId, requestError);
    } finally {
      finishRequest(state, controller);
    }
  }

  return {
    cancel,
    sendMessage,
  };
}
