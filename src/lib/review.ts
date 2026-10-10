import type { StudyCard } from './learning';
import type { LanguageConfig, Vocabulary } from './schemas';
import { normalizeReviewText } from './review/text';

export { groupReviewCards, type ReviewGroup } from './review/groups';
export { normalizeReviewText } from './review/text';

export function createVocabularyCards(
  messageId: string,
  content: string,
  vocabulary: Vocabulary[],
  config: LanguageConfig,
  now = Date.now(),
): StudyCard[] {
  const cards: StudyCard[] = [];
  const seen = new Set<string>();
  const originalMessage = normalizeReviewText(content);

  for (const vocabularyEntry of vocabulary) {
    const normalizedOriginal = normalizeReviewText(vocabularyEntry.original);

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
      focus: vocabularyEntry.explanation,
      dueAt: now,
      streak: 0,
      attempts: 0,
      successes: 0,
    });
  }

  return cards;
}
