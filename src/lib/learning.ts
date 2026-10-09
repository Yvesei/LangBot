import type { Correction, LanguageConfig } from './schemas';
import type { StudyCard } from './learning/schema';

export { loadCards, saveCards } from './learning/storage';
export { STUDY_KEY, studyCardSchema, type StudyCard } from './learning/schema';

const REVIEW_INTERVALS_DAYS = [1, 3, 7, 14, 30];
const MILLISECONDS_PER_DAY = 86400000;
const FAILED_REVIEW_DELAY_MS = 600000;

function getNextReviewDate(streak: number, correct: boolean, now: number): number {
  if (!correct) {
    return now + FAILED_REVIEW_DELAY_MS;
  }

  const intervalIndex = Math.min(streak - 1, REVIEW_INTERVALS_DAYS.length - 1);
  return now + REVIEW_INTERVALS_DAYS[intervalIndex] * MILLISECONDS_PER_DAY;
}

type CreateCard = (
  ...parameters: [
    id: string,
    correction: Correction | null,
    languageConfig: LanguageConfig,
    now?: number,
    originalText?: string,
  ]
) => StudyCard | null;

export const createCard: CreateCard = function createCard(
  id,
  correction,
  languageConfig,
) {
  // Preserve the original three-argument runtime arity while accepting optional values.
  // eslint-disable-next-line prefer-rest-params
  const now = arguments[3] === undefined ? Date.now() : (arguments[3] as number);
  // eslint-disable-next-line prefer-rest-params
  const originalText = arguments[4] === undefined ? '' : (arguments[4] as string);

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
    focus: correction.issues[0].explanation,
    dueAt: now,
    streak: 0,
    attempts: 0,
    successes: 0,
  };
};

export function recordReview(
  card: StudyCard,
  correct: boolean,
  now = Date.now(),
): StudyCard {
  const streak = correct ? Math.min(1000, card.streak + 1) : 0;

  return {
    ...card,
    streak,
    attempts: Math.min(100000, card.attempts + 1),
    successes: Math.min(100000, card.successes + Number(correct)),
    dueAt: getNextReviewDate(streak, correct, now),
  };
}

export function sameLanguages(first: LanguageConfig, second: LanguageConfig) {
  const sameNativeLanguage = first.nativeLanguage === second.nativeLanguage;
  const sameTargetLanguage = first.targetLanguage === second.targetLanguage;
  return sameNativeLanguage && sameTargetLanguage;
}
