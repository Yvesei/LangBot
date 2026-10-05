import { z } from 'zod';
import {
  MAX_CONVERSATION_LENGTH,
  MAX_HISTORY_MESSAGES,
  MAX_MESSAGE_LENGTH,
} from '../config/limits';
import { correctionSchema } from './correction';
import { languageConfigSchema, levelSchema } from './language';

const historyMessageSchema = z
  .object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1).max(4000),
  })
  .strict();

interface ConversationInput {
  prompt: string;
  history: Array<{ content: string }>;
}

function isConversationWithinLimit(conversation: ConversationInput): boolean {
  let totalLength = conversation.prompt.length;

  for (const message of conversation.history) {
    totalLength += message.content.length;
  }

  return totalLength <= MAX_CONVERSATION_LENGTH;
}

export const chatRequestSchema = z
  .object({
    prompt: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
    history: z.array(historyMessageSchema).max(MAX_HISTORY_MESSAGES).default([]),
    languageConfig: languageConfigSchema,
    userLevel: levelSchema,
    learningFocus: z.array(z.string().min(1).max(500)).max(3).default([]),
  })
  .strict()
  .refine(isConversationWithinLimit, 'Conversation is too long. Start a new chat.');

export const tutorOutputSchema = z
  .object({
    reply: z.string().min(1).max(4000),
    correction: correctionSchema,
    topics: z.array(z.string().min(1).max(60)).max(5),
  })
  .strict();

export const chatResultSchema = tutorOutputSchema.extend({
  correction: correctionSchema.nullable(),
});

export const translationRequestSchema = z
  .object({
    content: z.string().trim().min(1).max(4000),
    languageConfig: languageConfigSchema,
  })
  .strict();

export const translationOutputSchema = z
  .object({ translation: z.string().min(1).max(8000) })
  .strict();

export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type TutorOutput = z.infer<typeof tutorOutputSchema>;

export type ChatResult = z.infer<typeof chatResultSchema>;
