import { ApiError } from './errors';
import { LANGUAGES, type LanguageConfig } from '../schemas';
import type { Transcript } from './transcription-schema';

export function validateTranscript(data: Transcript, config: LanguageConfig): string {
  const allowedLanguages = [config.nativeLanguage, config.targetLanguage];
  const hasOtherLanguage = data.languages.some((language) => {
    return !allowedLanguages.some((allowed) => allowed === language);
  });

  if (hasOtherLanguage) {
    throw new ApiError(
      422,
      `Please speak ${LANGUAGES[config.nativeLanguage]} or ${LANGUAGES[config.targetLanguage]}, or change your language settings.`,
    );
  }

  if (!data.text || data.languages.length === 0) {
    throw new ApiError(422, 'I didn’t catch that. Please try again.');
  }

  return data.text;
}
