import type { StudyCard } from './learning';
import type { LanguageConfig, Vocabulary } from './schemas';

export { groupReviewCards, type ReviewGroup } from './review/groups';
export { normalizeReviewText } from './review/text';

type CreateVocabularyCards = (
  ...parameters: [
    messageId: string,
    content: string,
    vocabulary: Vocabulary[],
    config: LanguageConfig,
    now?: number,
  ]
) => StudyCard[];

export const createVocabularyCards: CreateVocabularyCards =
  function createVocabularyCards(messageId, content, vocabulary, config) {
    // Preserve the original four-argument runtime arity while accepting the optional date.
    // eslint-disable-next-line prefer-rest-params
    const now = arguments[4] === undefined ? Date.now() : (arguments[4] as number);
    const cards: StudyCard[] = [];
    const seen = new Set<string>();
    const originalMessage = content.trim().toLocaleLowerCase().replace(/\s+/g, ' ');

    for (const vocabularyEntry of vocabulary) {
      const normalizedOriginal = vocabularyEntry.original
        .trim()
        .toLocaleLowerCase()
        .replace(/\s+/g, ' ');

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
  };
