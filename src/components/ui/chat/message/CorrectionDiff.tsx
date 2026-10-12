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
              className="correction-removed"
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
              className="correction-added"
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
