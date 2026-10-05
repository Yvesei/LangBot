import type { ChatMessage } from '../types';
import type { ChatResult } from '../schemas';
import type { ConversationMessage } from './conversation';

export function updateMessageStatus(
  messages: ConversationMessage[],
  messageId: string,
  status: ChatMessage['status'],
): ConversationMessage[] {
  return messages.map((message) => {
    return message.id === messageId
      ? {
          ...message,
          status,
        }
      : message;
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
