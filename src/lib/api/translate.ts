import { z } from 'zod';
import { translationOutputSchema, type LanguageConfig } from '../schemas';
import { post } from './request';

export function translateMessage(
  content: string,
  languageConfig: LanguageConfig,
  signal?: AbortSignal,
) {
  return post(
    '/api/translate',
    {
      content,
      languageConfig,
    },
    translationOutputSchema.extend({ success: z.literal(true) }),
    signal,
  );
}
