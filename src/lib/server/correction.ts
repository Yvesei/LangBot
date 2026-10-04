import type { Correction } from '../schemas';

export function normalizeCorrection(
  original: string,
  correction: Correction,
): Correction | null {
  if (correction.correctedText === original) {
    return {
      correctedText: original,
      issues: [],
      exercise: null,
    };
  }

  // Never apply an unexplained rewrite or save an exercise derived from it.
  if (correction.issues.length === 0) {
    return null;
  }

  // A missing optional exercise should not invalidate an explained correction.
  return correction;
}
