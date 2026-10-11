import { wordDiff, type DiffPart } from '../diff';
import type { StudyCard } from '../learning';

export function normalizeReviewText(text: string): string {
  return text.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
}

function getChangedText(parts: DiffPart[], type: 'removed' | 'added'): string {
  return parts
    .filter((part) => part.type === type)
    .map((part) => part.text.trim())
    .filter(Boolean)
    .join(' ');
}

export function getReviewText(card: StudyCard) {
  const originalText = card.originalText || card.focus;
  const correctedText = card.correctedText;

  if (card.originalText) {
    const parts = wordDiff(
      originalText,
      correctedText,
      card.languageConfig.targetLanguage,
    );
    const incorrectWords = getChangedText(parts, 'removed');
    const correctWords = getChangedText(parts, 'added');

    // Missing or extra words need the sentence to show what changed.
    if (incorrectWords && correctWords) {
      return { originalText: incorrectWords, correctedText: correctWords };
    }
  }

  return { originalText, correctedText };
}

export function getReviewKey(card: StudyCard): string {
  const { originalText, correctedText } = getReviewText(card);

  return JSON.stringify([
    card.languageConfig.nativeLanguage,
    card.languageConfig.targetLanguage,
    normalizeReviewText(originalText),
    normalizeReviewText(correctedText),
  ]);
}
