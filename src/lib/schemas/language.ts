import { z } from 'zod';

export const languageCodeSchema = z.enum([
  'en',
  'fr',
  'es',
  'de',
  'it',
  'pt',
  'ru',
  'ja',
  'ko',
  'zh',
  'ar',
  'hi',
]);

export type LanguageCode = z.infer<typeof languageCodeSchema>;

export const LANGUAGES: Record<LanguageCode, string> = {
  en: 'English',
  fr: 'French',
  es: 'Spanish',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  ru: 'Russian',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese',
  ar: 'Arabic',
  hi: 'Hindi',
};

export const levelSchema = z.enum(['beginner', 'intermediate', 'advanced']);

interface LanguagePair {
  nativeLanguage: LanguageCode;
  targetLanguage: LanguageCode;
}

function hasDifferentLanguages(config: LanguagePair): boolean {
  return config.nativeLanguage !== config.targetLanguage;
}

export const languageConfigSchema = z
  .object({
    nativeLanguage: languageCodeSchema,
    targetLanguage: languageCodeSchema,
  })
  .strict()
  .refine(hasDifferentLanguages, 'Choose two different languages.');

export type LanguageConfig = z.infer<typeof languageConfigSchema>;
export type Level = z.infer<typeof levelSchema>;
