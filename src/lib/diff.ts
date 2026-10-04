export interface DiffPart {
  type: 'equal' | 'added' | 'removed';
  text: string;
}

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

export function wordDiff(original: string, corrected: string, locale = 'en'): DiffPart[] {
  const originalTokens = tokenize(original, locale);
  const correctedTokens = tokenize(corrected, locale);
  const parts: DiffPart[] = [];
  function appendPart(type: DiffPart['type'], text: string) {
    if (!text) {
      return;
    }
    const previousPart = parts[parts.length - 1];
    if (previousPart?.type === type) {
      previousPart.text += text;
    } else {
      parts.push({
        type,
        text,
      });
    }
  }
  // Bound memory for pathological input; preserve identical prefix/suffix.
  if (originalTokens.length * correctedTokens.length > 1000000) {
    let commonPrefixLength = 0;
    let originalEnd = originalTokens.length;
    let correctedEnd = correctedTokens.length;
    while (commonPrefixLength < originalEnd && commonPrefixLength < correctedEnd && originalTokens[commonPrefixLength] === correctedTokens[commonPrefixLength]) {
      commonPrefixLength++;
    }
    while (originalEnd > commonPrefixLength && correctedEnd > commonPrefixLength && originalTokens[originalEnd - 1] === correctedTokens[correctedEnd - 1]) {
      originalEnd--;
      correctedEnd--;
    }
    appendPart('equal', originalTokens.slice(0, commonPrefixLength).join(''));
    appendPart('removed', originalTokens.slice(commonPrefixLength, originalEnd).join(''));
    appendPart('added', correctedTokens.slice(commonPrefixLength, correctedEnd).join(''));
    appendPart('equal', originalTokens.slice(originalEnd).join(''));
    return parts;
  }
  const tableWidth = correctedTokens.length + 1;
  const subsequenceLengths = new Uint16Array((originalTokens.length + 1) * tableWidth);
  for (let originalIndex = originalTokens.length - 1; originalIndex >= 0; originalIndex--) {
    for (let correctedIndex = correctedTokens.length - 1; correctedIndex >= 0; correctedIndex--) {
      subsequenceLengths[originalIndex * tableWidth + correctedIndex] =
        originalTokens[originalIndex] === correctedTokens[correctedIndex]
          ? 1 + subsequenceLengths[(originalIndex + 1) * tableWidth + correctedIndex + 1]
          : Math.max(subsequenceLengths[(originalIndex + 1) * tableWidth + correctedIndex], subsequenceLengths[originalIndex * tableWidth + correctedIndex + 1]);
    }
  }
  let originalIndex = 0;
  let correctedIndex = 0;
  while (originalIndex < originalTokens.length || correctedIndex < correctedTokens.length) {
    if (originalIndex < originalTokens.length && correctedIndex < correctedTokens.length && originalTokens[originalIndex] === correctedTokens[correctedIndex]) {
      appendPart('equal', originalTokens[originalIndex]);
      originalIndex++;
      correctedIndex++;
    } else if (
      originalIndex < originalTokens.length &&
      (correctedIndex === correctedTokens.length || subsequenceLengths[(originalIndex + 1) * tableWidth + correctedIndex] >= subsequenceLengths[originalIndex * tableWidth + correctedIndex + 1])
    ) {
      appendPart('removed', originalTokens[originalIndex]);
      originalIndex++;
    } else {
      appendPart('added', correctedTokens[correctedIndex]);
      correctedIndex++;
    }
  }
  return parts;
}
