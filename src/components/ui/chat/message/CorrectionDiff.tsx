import { useMemo } from 'react';
import { wordDiff } from '@/lib/diff';

export function CorrectionDiff({
  original,
  corrected,
  language,
}: {
  original: string;
  corrected: string;
  language: string;
}) {
  const parts = useMemo(
    () => wordDiff(original, corrected, language),
    [original, corrected, language],
  );
  return (
    <span
      className="whitespace-pre-wrap break-words"
      lang={language}
      dir="auto"
    >
      {parts.map((part, index) => {
        if (part.type === 'removed') {
          return (
            <del
              key={index}
              className="text-red-600 dark:text-red-400"
            >
              <span className="sr-only">Removed: </span>
              {part.text}
            </del>
          );
        }
        if (part.type === 'added') {
          return (
            <ins
              key={index}
              className="text-green-700 no-underline dark:text-green-400"
            >
              <span className="sr-only">Added: </span>
              {part.text}
            </ins>
          );
        }
        return <span key={index}>{part.text}</span>;
      })}
    </span>
  );
}
