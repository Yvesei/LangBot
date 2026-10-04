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
  const a = tokenize(original, locale);
  const b = tokenize(corrected, locale);
  const parts: DiffPart[] = [];
  function append(type: DiffPart['type'], text: string) {
    if (!text) {
      return;
    }
    const last = parts[parts.length - 1];
    if (last?.type === type) {
      last.text += text;
    } else {
      parts.push({
        type,
        text,
      });
    }
  }
  // Bound memory for pathological input; preserve identical prefix/suffix.
  if (a.length * b.length > 1000000) {
    let start = 0;
    let endA = a.length;
    let endB = b.length;
    while (start < endA && start < endB && a[start] === b[start]) {
      start++;
    }
    while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
      endA--;
      endB--;
    }
    append('equal', a.slice(0, start).join(''));
    append('removed', a.slice(start, endA).join(''));
    append('added', b.slice(start, endB).join(''));
    append('equal', a.slice(endA).join(''));
    return parts;
  }
  const width = b.length + 1;
  const table = new Uint16Array((a.length + 1) * width);
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i * width + j] =
        a[i] === b[j]
          ? 1 + table[(i + 1) * width + j + 1]
          : Math.max(table[(i + 1) * width + j], table[i * width + j + 1]);
    }
  }
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      append('equal', a[i]);
      i++;
      j++;
    } else if (
      i < a.length &&
      (j === b.length || table[(i + 1) * width + j] >= table[i * width + j + 1])
    ) {
      append('removed', a[i]);
      i++;
    } else {
      append('added', b[j]);
      j++;
    }
  }
  return parts;
}
