import { z } from 'zod';

export const vocabularySchema = z.object({
  original: z.string().min(1).max(200),
  translation: z.string().min(1).max(200),
  example: z.string().min(1).max(500),
  explanation: z.string().min(1).max(500),
});

export type Vocabulary = z.infer<typeof vocabularySchema>;
