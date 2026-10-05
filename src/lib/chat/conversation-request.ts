import type { ChatRequest, LanguageConfig, Level } from '../schemas';
import {
  MAX_CONVERSATION_LENGTH,
  MAX_HISTORY_MESSAGES,
  MAX_REQUEST_BYTES,
} from '../config/limits';
import type { ConversationMessage } from './conversation';

interface ChatRequestOptions {
  content: string;
  messages: ConversationMessage[];
  cards: Array<{ streak: number; focus: string }>;
  config: LanguageConfig;
  level: Level;
  retryMessageId?: string;
}

function getCompletedMessages(
  messages: ConversationMessage[],
  retryMessageId?: string,
): ConversationMessage[] {
  const previousMessages = retryMessageId
    ? messages.slice(
        0,
        messages.findIndex((message) => message.id === retryMessageId),
      )
    : messages;

  return previousMessages.filter((message) => {
    return message.status !== 'pending' && message.status !== 'failed';
  });
}

function buildHistory(
  messages: ConversationMessage[],
  content: string,
): ChatRequest['history'] {
  const history: ChatRequest['history'] = [];
  const recentMessages = messages.slice(-MAX_HISTORY_MESSAGES);
  let remainingLength = MAX_CONVERSATION_LENGTH - content.length;

  for (let index = recentMessages.length - 1; index >= 0; index--) {
    const message = recentMessages[index];

    if (message.content.length > remainingLength) {
      break;
    }

    remainingLength -= message.content.length;
    history.unshift({
      role: message.role,
      content: message.content,
    });
  }

  return history;
}

function getRequestSize(body: ChatRequest): number {
  return new TextEncoder().encode(JSON.stringify(body)).byteLength;
}

export function buildChatRequest(options: ChatRequestOptions): ChatRequest {
  const { content, messages, cards, config, level, retryMessageId } = options;
  const completedMessages = getCompletedMessages(messages, retryMessageId);
  const recentPractice = cards.filter((card) => card.streak < 2).slice(-3);
  const body: ChatRequest = {
    prompt: content,
    history: buildHistory(completedMessages, content),
    languageConfig: config,
    userLevel: level,
    learningFocus: recentPractice.map((card) => card.focus),
  };

  while (body.history.length > 0 && getRequestSize(body) > MAX_REQUEST_BYTES) {
    body.history.shift();
  }

  return body;
}
