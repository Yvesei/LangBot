import { z } from 'zod';
import { languageConfigSchema } from '../schemas';

export const studyCardSchema = z.object({
  id: z.string().max(100),
  sourceMessageId: z.string().max(100),
  languageConfig: languageConfigSchema,
  originalText: z.string().max(2000).default(''),
  correctedText: z.string().max(4000).default(''),
  focus: z.string().max(4000),
});

export type StudyCard = z.infer<typeof studyCardSchema>;
export const STUDY_KEY = 'langbot-study-v1';
