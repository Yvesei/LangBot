import type { DiffPart } from '../diff';
import { appendPart } from './parts';

function fillSubsequenceRow(
  lengths: Uint16Array,
  original: string[],
  corrected: string[],
  originalIndex: number,
) {
  const width = corrected.length + 1;

  for (let correctedIndex = corrected.length - 1; correctedIndex >= 0; correctedIndex--) {
    lengths[originalIndex * width + correctedIndex] =
      original[originalIndex] === corrected[correctedIndex]
        ? 1 + lengths[(originalIndex + 1) * width + correctedIndex + 1]
        : Math.max(
            lengths[(originalIndex + 1) * width + correctedIndex],
            lengths[originalIndex * width + correctedIndex + 1],
          );
  }
}

function buildSubsequenceTable(original: string[], corrected: string[]) {
  const width = corrected.length + 1;
  const lengths = new Uint16Array((original.length + 1) * width);

  for (let originalIndex = original.length - 1; originalIndex >= 0; originalIndex--) {
    fillSubsequenceRow(lengths, original, corrected, originalIndex);
  }

  return lengths;
}

export function appendDetailedDiff(
  parts: DiffPart[],
  original: string[],
  corrected: string[],
) {
  const width = corrected.length + 1;
  const lengths = buildSubsequenceTable(original, corrected);
  let originalIndex = 0;
  let correctedIndex = 0;

  while (originalIndex < original.length || correctedIndex < corrected.length) {
    const isMatch =
      originalIndex < original.length &&
      correctedIndex < corrected.length &&
      original[originalIndex] === corrected[correctedIndex];

    if (isMatch) {
      appendPart(parts, 'equal', original[originalIndex++]);
      correctedIndex++;
      continue;
    }

    const shouldRemove =
      originalIndex < original.length &&
      (correctedIndex === corrected.length ||
        lengths[(originalIndex + 1) * width + correctedIndex] >=
          lengths[originalIndex * width + correctedIndex + 1]);

    if (shouldRemove) {
      appendPart(parts, 'removed', original[originalIndex++]);
      continue;
    }

    appendPart(parts, 'added', corrected[correctedIndex++]);
  }
}
