import type { Correction, Vocabulary } from '../schemas';
import { normalizeCorrection } from './correction';

function unchangedCorrection(original: string): Correction {
  return {
    correctedText: original,
    issues: [],
    exercise: null,
  };
}

export function normalizeBilingualCorrection(
  original: string,
  correction: Correction,
  vocabulary: Vocabulary[],
): Correction | null {
  const phrases = vocabulary.filter((item) => original.includes(item.original));
  phrases.sort((first, second) => second.original.length - first.original.length);

  let translated = original;
  for (const phrase of phrases) {
    translated = translated.replaceAll(phrase.original, phrase.translation);
  }

  // A vocabulary substitution alone is not a grammar correction.
  if (translated !== original && correction.correctedText === translated) {
    return unchangedCorrection(original);
  }

  for (const phrase of phrases) {
    const beforeCount = original.split(phrase.original).length - 1;
    const afterCount = correction.correctedText.split(phrase.original).length - 1;
    if (afterCount < beforeCount) {
      // Keep the reply and vocabulary, but do not apply an ambiguous rewrite.
      return null;
    }
  }

  return normalizeCorrection(original, correction);
}
