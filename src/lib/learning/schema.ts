import { z } from 'zod';
import { languageConfigSchema } from '../schemas';

export const studyCardSchema = z.object({
  id: z.string().max(100),
  sourceMessageId: z.string().max(100),
  languageConfig: languageConfigSchema,
  kind: z.enum(['correction', 'vocabulary']).default('correction'),
  originalText: z.string().max(2000).default(''),
  correctedText: z.string().max(4000).default(''),
  example: z.string().max(500).default(''),
  focus: z.string().max(500),
  dueAt: z.number().finite().nonnegative(),
  streak: z.number().int().min(0).max(1000),
  attempts: z.number().int().min(0).max(100000),
  successes: z.number().int().min(0).max(100000),
});

export type StudyCard = z.infer<typeof studyCardSchema>;
export const STUDY_KEY = 'langbot-study-v1';
