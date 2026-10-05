import { z } from 'zod';
import { practiceOutputSchema, type Exercise, type LanguageConfig } from '../schemas';
import { post } from './request';

export function checkPractice(
  exercise: Exercise,
  answer: string,
  languageConfig: LanguageConfig,
  signal?: AbortSignal,
) {
  return post(
    '/api/practice',
    {
      exercise,
      answer,
      languageConfig,
    },
    practiceOutputSchema.extend({ success: z.literal(true) }),
    signal,
  );
}
