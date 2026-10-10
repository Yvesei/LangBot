import { send } from '@/lib/api';
import {
  addAssistantReply,
  buildChatRequest,
  updateMessageStatus,
  type ConversationMessage,
} from '@/lib/chat/conversation';
import type { ChatState } from './useChatState';

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

  async function sendMessage(
    retryMessage?: ConversationMessage,
    spokenContent?: string,
  ) {
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
          cards: [],
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
