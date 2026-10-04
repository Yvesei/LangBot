import type { ChatMessage } from '../types';
import type { ChatRequest, LanguageConfig, Level, ChatResult } from '../schemas';
import type { StudyCard } from '../learning';
import {
  MAX_CONVERSATION_LENGTH,
  MAX_HISTORY_MESSAGES,
  MAX_REQUEST_BYTES,
} from '../config/limits';

export interface ConversationMessage extends ChatMessage {
  replyTo?: string;
  topics?: string[];
}

interface ChatRequestOptions {
  content: string;
  messages: ConversationMessage[];
  cards: StudyCard[];
  config: LanguageConfig;
  level: Level;
  retryMessageId?: string;
}

function getCompletedMessages(
  messages: ConversationMessage[],
  retryMessageId?: string,
): ConversationMessage[] {
  let previousMessages = messages;

  if (retryMessageId) {
    const retryIndex = messages.findIndex((message) => message.id === retryMessageId);
    previousMessages = messages.slice(0, retryIndex);
  }

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
  const serializedBody = JSON.stringify(body);
  return new TextEncoder().encode(serializedBody).byteLength;
}

export function buildChatRequest(options: ChatRequestOptions): ChatRequest {
  const { content, messages, cards, config, level, retryMessageId } = options;
  const completedMessages = getCompletedMessages(messages, retryMessageId);
  const practiceCards = cards.filter((card) => card.streak < 2);
  const recentPractice = practiceCards.slice(-3);

  const body: ChatRequest = {
    prompt: content,
    history: buildHistory(completedMessages, content),
    languageConfig: config,
    userLevel: level,
    learningFocus: recentPractice.map((card) => card.focus),
  };

  // The byte limit matters for languages that use several UTF-8 bytes per character.
  while (body.history.length > 0 && getRequestSize(body) > MAX_REQUEST_BYTES) {
    body.history.shift();
  }

  return body;
}

export function updateMessageStatus(
  messages: ConversationMessage[],
  messageId: string,
  status: ChatMessage['status'],
): ConversationMessage[] {
  return messages.map((message) => {
    if (message.id !== messageId) {
      return message;
    }

    return {
      ...message,
      status,
    };
  });
}

export function addAssistantReply(
  messages: ConversationMessage[],
  messageId: string,
  result: ChatResult,
): ConversationMessage[] {
  const updatedMessages: ConversationMessage[] = [];

  for (const message of messages) {
    if (message.id !== messageId) {
      updatedMessages.push(message);
      continue;
    }

    updatedMessages.push({
      ...message,
      correction: result.correction,
      status: 'complete',
    });

    updatedMessages.push({
      id: crypto.randomUUID(),
      role: 'assistant',
      content: result.reply,
      timestamp: new Date(),
      replyTo: messageId,
      topics: result.topics,
      status: 'complete',
    });
  }

  return updatedMessages;
}

export function getConversationTopics(messages: ConversationMessage[]): string[] {
  const topics = new Set<string>();

  for (const message of messages) {
    for (const topic of message.topics ?? []) {
      topics.add(topic);
    }
  }

  return Array.from(topics).slice(-5);
}
