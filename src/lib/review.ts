import { wordDiff } from './diff';
import type { StudyCard } from './learning';
import type { LanguageConfig, Vocabulary } from './schemas';

export interface ReviewGroup {
  key: string;
  card: StudyCard;
  ids: string[];
  sourceMessageIds: string[];
  occurrences: number;
  dueAt: number;
}

function normalizeText(text: string): string {
  return text.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
}

function getReviewKey(card: StudyCard): string {
  let originalText = card.originalText;
  let correctedText = card.correctedText;

  if (card.kind === 'correction' && originalText) {
    const parts = wordDiff(originalText, correctedText, card.languageConfig.targetLanguage);
    const removedText: string[] = [];
    const addedText: string[] = [];
    for (const part of parts) {
      if (part.type === 'removed') {
        removedText.push(part.text);
      }
      if (part.type === 'added') {
        addedText.push(part.text);
      }
    }
    originalText = removedText.join(' ');
    correctedText = addedText.join(' ');
  }

  if (!originalText && !correctedText) {
    originalText = card.exercise?.sentence ?? card.focus;
    correctedText = card.exercise?.answer ?? '';
  }

  return JSON.stringify([
    card.languageConfig.nativeLanguage,
    card.languageConfig.targetLanguage,
    card.kind,
    normalizeText(originalText),
    normalizeText(correctedText),
  ]);
}

export function groupReviewCards(cards: StudyCard[]): ReviewGroup[] {
  const reviewGroups = new Map<string, ReviewGroup>();

  for (const card of cards) {
    const reviewKey = getReviewKey(card);
    const reviewGroup = reviewGroups.get(reviewKey);
    if (reviewGroup) {
      reviewGroup.card = card;
      reviewGroup.ids.push(card.id);
      if (!reviewGroup.sourceMessageIds.includes(card.sourceMessageId)) {
        reviewGroup.sourceMessageIds.push(card.sourceMessageId);
        reviewGroup.occurrences += 1;
      }
      reviewGroup.dueAt = Math.min(reviewGroup.dueAt, card.dueAt);
      continue;
    }
    reviewGroups.set(reviewKey, {
      key: reviewKey,
      card,
      ids: [card.id],
      sourceMessageIds: [card.sourceMessageId],
      occurrences: 1,
      dueAt: card.dueAt,
    });
  }

  return Array.from(reviewGroups.values()).sort((first, second) => {
    if (first.occurrences !== second.occurrences) {
      return second.occurrences - first.occurrences;
    }
    return first.dueAt - second.dueAt;
  });
}

export function createVocabularyCards(
  messageId: string,
  content: string,
  vocabulary: Vocabulary[],
  config: LanguageConfig,
  now = Date.now(),
): StudyCard[] {
  const cards: StudyCard[] = [];
  const seen = new Set<string>();
  const originalMessage = normalizeText(content);

  for (const vocabularyEntry of vocabulary) {
    const normalizedOriginal = normalizeText(vocabularyEntry.original);
    if (!originalMessage.includes(normalizedOriginal) || seen.has(normalizedOriginal)) {
      continue;
    }
    seen.add(normalizedOriginal);
    cards.push({
      id: messageId + ':vocabulary:' + cards.length,
      sourceMessageId: messageId,
      languageConfig: config,
      kind: 'vocabulary',
      originalText: vocabularyEntry.original,
      correctedText: vocabularyEntry.translation,
      example: vocabularyEntry.example,
      exercise: null,
      focus: vocabularyEntry.explanation,
      dueAt: now,
      streak: 0,
      attempts: 0,
      successes: 0,
    });
  }

  return cards;
}
