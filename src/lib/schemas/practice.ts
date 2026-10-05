import { z } from 'zod';
import { exerciseSchema } from './correction';
import { languageConfigSchema } from './language';

export const practiceRequestSchema = z
  .object({
    exercise: exerciseSchema,
    answer: z.string().trim().min(1).max(500),
    languageConfig: languageConfigSchema,
  })
  .strict();

export const practiceOutputSchema = z
  .object({
    correct: z.boolean(),
    feedback: z.string().min(1).max(800),
  })
  .strict();
