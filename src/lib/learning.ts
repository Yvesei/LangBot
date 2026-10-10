import type { Correction, LanguageConfig } from './schemas';
import type { StudyCard } from './learning/schema';

export { loadCards, saveCards } from './learning/storage';
export { STUDY_KEY, studyCardSchema, type StudyCard } from './learning/schema';

export function createCard(
  id: string,
  correction: Correction | null,
  languageConfig: LanguageConfig,
  originalText = '',
): StudyCard | null {
  if (!correction || !correction.issues.length) {
    return null;
  }

  return {
    id,
    sourceMessageId: id,
    languageConfig,
    kind: 'correction',
    originalText,
    correctedText: correction.correctedText,
    example: '',
    focus: correction.issues.map((issue) => issue.explanation).join('\n'),
  };
}

export function sameLanguages(first: LanguageConfig, second: LanguageConfig) {
  const sameNativeLanguage = first.nativeLanguage === second.nativeLanguage;
  const sameTargetLanguage = first.targetLanguage === second.targetLanguage;
  return sameNativeLanguage && sameTargetLanguage;
}
