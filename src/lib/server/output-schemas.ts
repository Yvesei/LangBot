import {
  correctionSchema,
  tutorOutputSchema,
  LANGUAGES,
  type LanguageConfig,
} from '../schemas';

export function correctionOutputSchema(config: LanguageConfig) {
  const nativeLanguage = LANGUAGES[config.nativeLanguage];
  const targetLanguage = LANGUAGES[config.targetLanguage];

  return correctionSchema.extend({
    correctedText: correctionSchema.shape.correctedText.describe(
      `The complete minimally corrected learner text. Fix target-language errors in ${targetLanguage} (${config.targetLanguage}); preserve the learner's meaning and wording. Do not translate the whole sentence into ${nativeLanguage}.`,
    ),
    issues: correctionSchema.shape.issues.describe(
      `Write every explanation in ${nativeLanguage} (${config.nativeLanguage}), the learner's native language. Only quoted words or phrases may be in ${targetLanguage}. These explanations also appear on flashcards.`,
    ),
  });
}

export function tutorResponseSchema(config: LanguageConfig) {
  return tutorOutputSchema.extend({
    reply: tutorOutputSchema.shape.reply.describe(
      `A conversational reply in ${LANGUAGES[config.targetLanguage]} (${config.targetLanguage}). Correction explanations belong in correction.issues, in ${LANGUAGES[config.nativeLanguage]}.`,
    ),
    correction: correctionOutputSchema(config),
  });
}
