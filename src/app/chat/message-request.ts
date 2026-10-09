import { send } from '@/lib/api';
import { buildChatRequest, updateMessageStatus } from '@/lib/chat/conversation';
import { applyTutorResponse } from './applyTutorResponse';
import {
  addPendingMessage,
  getMessageContent,
  type SendMessageOptions,
} from './message-state';
import type { ChatState } from './useChatState';

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
  state.setError(
    requestError instanceof Error
      ? requestError.message
      : 'Could not send the message. Please retry.',
  );
}

export async function requestMessage(state: ChatState, options: SendMessageOptions) {
  const config = state.config;
  if (!config || state.activeChatRequest.current || state.isSelectingLanguages) {
    return;
  }
  const content = getMessageContent(state, options);
  if (!content) {
    return;
  }
  const messageId = options.retryMessage?.id ?? crypto.randomUUID();
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
        cards: [],
        config,
        level: state.level,
        retryMessageId: options.retryMessage?.id,
      }),
      controller.signal,
    );
    if (isCurrentRequest(state, controller)) {
      applyTutorResponse({
        messageId,
        content,
        tutorResponse,
        config,
        state,
      });
    }
  } catch (requestError) {
    handleRequestError(state, controller, messageId, requestError);
  } finally {
    finishRequest(state, controller);
  }
}
