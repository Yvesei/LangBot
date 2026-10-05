import type { DiffPart } from '../diff';

export function tokenize(text: string, locale: string): string[] {
  if (typeof Intl.Segmenter === 'function') {
    return Array.from(
      new Intl.Segmenter(locale, { granularity: 'word' }).segment(text),
      (part) => part.segment,
    );
  }

  return text.match(/[\p{L}\p{N}\p{M}]+|\s+|[^\p{L}\p{N}\p{M}\s]/gu) ?? [];
}

export function appendPart(parts: DiffPart[], type: DiffPart['type'], text: string) {
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

export function appendBoundedDiff(
  parts: DiffPart[],
  originalTokens: string[],
  correctedTokens: string[],
) {
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
  appendPart(
    parts,
    'removed',
    originalTokens.slice(commonPrefixLength, originalEnd).join(''),
  );
  appendPart(
    parts,
    'added',
    correctedTokens.slice(commonPrefixLength, correctedEnd).join(''),
  );
  appendPart(parts, 'equal', originalTokens.slice(originalEnd).join(''));
}
