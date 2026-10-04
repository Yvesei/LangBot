import { z } from 'zod';
import {
  exerciseSchema,
  languageConfigSchema,
  type Correction,
  type LanguageConfig,
} from './schemas';

export const studyCardSchema = z.object({
  id: z.string().max(100),
  sourceMessageId: z.string().max(100),
  languageConfig: languageConfigSchema,
  exercise: exerciseSchema.nullable(),
  kind: z.enum(['correction', 'vocabulary']).default('correction'),
  originalText: z.string().max(2000).default(''),
  correctedText: z.string().max(4000).default(''),
  example: z.string().max(500).default(''),
  focus: z.string().max(500),
  dueAt: z.number().finite().nonnegative(),
  streak: z.number().int().min(0).max(1000),
  attempts: z.number().int().min(0).max(100000),
  successes: z.number().int().min(0).max(100000),
});
export type StudyCard = z.infer<typeof studyCardSchema>;
export const STUDY_KEY = 'langbot-study-v1';
const MAX_CARDS = 100;
const REVIEW_INTERVALS_DAYS = [1, 3, 7, 14, 30];
const MILLISECONDS_PER_DAY = 86400000;
const FAILED_REVIEW_DELAY_MS = 600000;

function getNextReviewDate(streak: number, correct: boolean, now: number): number {
  if (!correct) {
    return now + FAILED_REVIEW_DELAY_MS;
  }

  const lastIntervalIndex = REVIEW_INTERVALS_DAYS.length - 1;
  const intervalIndex = Math.min(streak - 1, lastIntervalIndex);
  const daysUntilReview = REVIEW_INTERVALS_DAYS[intervalIndex];

  return now + daysUntilReview * MILLISECONDS_PER_DAY;
}

export function createCard(
  id: string,
  correction: Correction | null,
  languageConfig: LanguageConfig,
  now = Date.now(),
  originalText = '',
): StudyCard | null {
  if (!correction || !correction.issues.length) {
    return null;
  }
  return {
    id,
    sourceMessageId: id,
    languageConfig,
    exercise: correction.exercise,
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
}

export function recordPractice(
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

export function loadCards(): StudyCard[] {
  try {
    const raw = localStorage.getItem(STUDY_KEY);
    if (!raw || raw.length > 500000) {
      return [];
    }
    const storedCards: unknown = JSON.parse(raw);
    const cardsSchema = z.array(studyCardSchema).max(MAX_CARDS);

    return cardsSchema.parse(storedCards);
  } catch {
    return [];
  }
}

export function saveCards(cards: StudyCard[]): boolean {
  try {
    localStorage.setItem(STUDY_KEY, JSON.stringify(cards.slice(-MAX_CARDS)));
    return true;
  } catch {
    return false;
  }
}
