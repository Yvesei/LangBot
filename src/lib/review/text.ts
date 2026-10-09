import { wordDiff, type DiffPart } from '../diff';
import type { StudyCard } from '../learning';

export function normalizeReviewText(text: string): string {
  return text.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
}

function getChangedText(parts: DiffPart[], type: 'removed' | 'added'): string {
  return parts
    .filter((part) => part.type === type)
    .map((part) => part.text)
    .join(' ');
}

export function getReviewKey(card: StudyCard): string {
  let originalText = card.originalText;
  let correctedText = card.correctedText;

  if (card.kind === 'correction' && originalText) {
    const parts = wordDiff(
      originalText,
      correctedText,
      card.languageConfig.targetLanguage,
    );
    originalText = getChangedText(parts, 'removed');
    correctedText = getChangedText(parts, 'added');
  }

  if (!originalText && !correctedText) {
    originalText = card.focus;
    correctedText = '';
  }

  return JSON.stringify([
    card.languageConfig.nativeLanguage,
    card.languageConfig.targetLanguage,
    card.kind,
    normalizeReviewText(originalText),
    normalizeReviewText(correctedText),
  ]);
}
