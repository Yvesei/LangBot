import type { DiffPart } from '../diff';
import { appendBoundedDiff, tokenize } from './parts';
import { appendDetailedDiff } from './subsequence';

const MAX_DIFF_TABLE_CELLS = 1000000;

export function wordDiff(original: string, corrected: string, locale = 'en'): DiffPart[] {
  const originalTokens = tokenize(original, locale);
  const correctedTokens = tokenize(corrected, locale);
  const parts: DiffPart[] = [];
  const exceedsTableLimit =
    originalTokens.length * correctedTokens.length > MAX_DIFF_TABLE_CELLS;

  if (exceedsTableLimit) {
    appendBoundedDiff(parts, originalTokens, correctedTokens);
    return parts;
  }

  appendDetailedDiff(parts, originalTokens, correctedTokens);
  return parts;
}
