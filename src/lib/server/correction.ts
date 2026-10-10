import type { Correction } from '../schemas';

export function normalizeCorrection(
  original: string,
  correction: Correction,
): Correction | null {
  if (correction.correctedText === original) {
    return {
      correctedText: original,
      issues: [],
    };
  }

  // Never apply an unexplained rewrite.
  if (correction.issues.length === 0) {
    return null;
  }

  return correction;
}
