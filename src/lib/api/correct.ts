import { z } from 'zod';
import { correctionSchema, type LanguageConfig, type Level } from '../schemas';
import { post } from './request';

export function correctMessage(
  content: string,
  languageConfig: LanguageConfig,
  userLevel: Level,
  signal?: AbortSignal,
) {
  return post(
    '/api/correct',
    {
      content,
      languageConfig,
      userLevel,
    },
    z.object({
      success: z.literal(true),
      correction: correctionSchema.nullable(),
    }),
    signal,
  );
}
