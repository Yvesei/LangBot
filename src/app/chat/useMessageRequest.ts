import { send } from '@/lib/api';
import {
  addAssistantReply,
  buildChatRequest,
  updateMessageStatus,
  type ConversationMessage,
} from '@/lib/chat/conversation';
import { createCard } from '@/lib/learning';
import { createVocabularyCards } from '@/lib/review';
import type { ChatResult } from '@/lib/schemas';
import type { ChatState } from './useChatState';

const MAX_SAVED_CARDS = 100;

interface SendMessageOptions {
  retryMessage?: ConversationMessage;
  spokenContent?: string;
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

  const correctionCard = createCard(messageId, result.correction, config, content);
  const cards = createVocabularyCards(messageId, content, result.vocabulary, config);

  if (correctionCard) {
    cards.push(correctionCard);
  }
  if (cards.length === 0) {
    return;
  }

  state.setCards((current) => {
    const retainedCards = current.filter((card) => card.sourceMessageId !== messageId);
    return [...retainedCards, ...cards].slice(-MAX_SAVED_CARDS);
  });
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
    const config = state.config;
    if (!config || state.activeChatRequest.current || state.isSelectingLanguages) {
      return;
    }

    const options = { retryMessage, spokenContent };
    const content = getMessageContent(state, options);
    if (!content) {
      return;
    }

    const messageId = retryMessage?.id ?? crypto.randomUUID();
    const controller = new AbortController();
    state.activeChatRequest.current = { controller, messageId };
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
          level: state.level,
          retryMessageId: retryMessage?.id,
        }),
        controller.signal,
      );

      if (isCurrentRequest(state, controller)) {
        state.setMessages((current) =>
          addAssistantReply(current, messageId, tutorResponse),
        );
        saveReviewCards(state, messageId, content, tutorResponse);
      }
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
