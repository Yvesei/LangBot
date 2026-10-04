export interface DiffPart {
  type: 'equal' | 'added' | 'removed';
  text: string;
}

const MAX_DIFF_TABLE_CELLS = 1000000;

function tokenize(text: string, locale: string): string[] {
  if (typeof Intl.Segmenter === 'function') {
    return Array.from(
      new Intl.Segmenter(locale, { granularity: 'word' }).segment(text),
      (part) => part.segment,
    );
  }
  // Preserve every character, including whitespace and punctuation.
  return text.match(/[\p{L}\p{N}\p{M}]+|\s+|[^\p{L}\p{N}\p{M}\s]/gu) ?? [];
}

function appendPart(parts: DiffPart[], type: DiffPart['type'], text: string) {
  if (!text) {
    return;
  }
  const previousPart = parts[parts.length - 1];
  if (previousPart?.type === type) {
    previousPart.text += text;
    return;
  }
  parts.push({
    type,
    text,
  });
}

function appendBoundedDiff(parts: DiffPart[], originalTokens: string[], correctedTokens: string[]) {
  let commonPrefixLength = 0;
  let originalEnd = originalTokens.length;
  let correctedEnd = correctedTokens.length;
  while (
    commonPrefixLength < originalEnd &&
    commonPrefixLength < correctedEnd &&
    originalTokens[commonPrefixLength] === correctedTokens[commonPrefixLength]
  ) {
    commonPrefixLength++;
  }
  while (
    originalEnd > commonPrefixLength &&
    correctedEnd > commonPrefixLength &&
    originalTokens[originalEnd - 1] === correctedTokens[correctedEnd - 1]
  ) {
    originalEnd--;
    correctedEnd--;
  }
  appendPart(parts, 'equal', originalTokens.slice(0, commonPrefixLength).join(''));
  appendPart(parts, 'removed', originalTokens.slice(commonPrefixLength, originalEnd).join(''));
  appendPart(parts, 'added', correctedTokens.slice(commonPrefixLength, correctedEnd).join(''));
  appendPart(parts, 'equal', originalTokens.slice(originalEnd).join(''));
}

function fillSubsequenceRow(
  subsequenceLengths: Uint16Array,
  originalTokens: string[],
  correctedTokens: string[],
  originalIndex: number,
) {
  const tableWidth = correctedTokens.length + 1;
  for (let correctedIndex = correctedTokens.length - 1; correctedIndex >= 0; correctedIndex--) {
    subsequenceLengths[originalIndex * tableWidth + correctedIndex] =
      originalTokens[originalIndex] === correctedTokens[correctedIndex]
        ? 1 + subsequenceLengths[(originalIndex + 1) * tableWidth + correctedIndex + 1]
        : Math.max(
            subsequenceLengths[(originalIndex + 1) * tableWidth + correctedIndex],
            subsequenceLengths[originalIndex * tableWidth + correctedIndex + 1],
          );
  }
}

function buildSubsequenceTable(originalTokens: string[], correctedTokens: string[]) {
  const tableWidth = correctedTokens.length + 1;
  const subsequenceLengths = new Uint16Array((originalTokens.length + 1) * tableWidth);
  for (let originalIndex = originalTokens.length - 1; originalIndex >= 0; originalIndex--) {
    fillSubsequenceRow(subsequenceLengths, originalTokens, correctedTokens, originalIndex);
  }
  return subsequenceLengths;
}

function appendDetailedDiff(parts: DiffPart[], originalTokens: string[], correctedTokens: string[]) {
  const tableWidth = correctedTokens.length + 1;
  const subsequenceLengths = buildSubsequenceTable(originalTokens, correctedTokens);
  let originalIndex = 0;
  let correctedIndex = 0;
  while (originalIndex < originalTokens.length || correctedIndex < correctedTokens.length) {
    const isMatchingToken =
      originalIndex < originalTokens.length &&
      correctedIndex < correctedTokens.length &&
      originalTokens[originalIndex] === correctedTokens[correctedIndex];
    if (isMatchingToken) {
      appendPart(parts, 'equal', originalTokens[originalIndex]);
      originalIndex++;
      correctedIndex++;
      continue;
    }
    const shouldRemoveToken =
      originalIndex < originalTokens.length &&
      (correctedIndex === correctedTokens.length ||
        subsequenceLengths[(originalIndex + 1) * tableWidth + correctedIndex] >=
          subsequenceLengths[originalIndex * tableWidth + correctedIndex + 1]);
    if (shouldRemoveToken) {
      appendPart(parts, 'removed', originalTokens[originalIndex]);
      originalIndex++;
      continue;
    }
    appendPart(parts, 'added', correctedTokens[correctedIndex]);
    correctedIndex++;
  }
}

export function wordDiff(original: string, corrected: string, locale = 'en'): DiffPart[] {
  const originalTokens = tokenize(original, locale);
  const correctedTokens = tokenize(corrected, locale);
  const parts: DiffPart[] = [];
  // Bound memory for pathological input; preserve identical prefix/suffix.
  const exceedsTableLimit = originalTokens.length * correctedTokens.length > MAX_DIFF_TABLE_CELLS;
  if (exceedsTableLimit) {
    appendBoundedDiff(parts, originalTokens, correctedTokens);
    return parts;
  }
  appendDetailedDiff(parts, originalTokens, correctedTokens);
  return parts;
}
