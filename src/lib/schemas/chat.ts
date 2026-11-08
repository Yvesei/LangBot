import { z } from 'zod';
import { correctionSchema } from './correction';
import { languageConfigSchema } from './language';

export const tutorOutputSchema = z
  .object({
    reply: z.string().min(1).max(4000),
    correction: correctionSchema,
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

export type TutorOutput = z.infer<typeof tutorOutputSchema>;

export type ChatResult = z.infer<typeof chatResultSchema>;
