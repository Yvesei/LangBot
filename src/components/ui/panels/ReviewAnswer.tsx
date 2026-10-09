import type { ReviewGroup } from '@/lib/review';
import type { LanguageConfig } from '@/lib/schemas';

interface ReviewAnswerProps {
  group: ReviewGroup;
  config: LanguageConfig;
  reviewed: boolean;
}

export function ReviewAnswer({ group, config, reviewed }: ReviewAnswerProps) {
  const card = group.card;
  const answer = card.correctedText || '';

  return (
    <div className="mt-4 border-t border-[var(--line)] pt-4">
      <p
        className="whitespace-pre-wrap font-medium"
        lang={config.targetLanguage}
        dir="auto"
      >
        {answer}
      </p>
      <p
        className="mt-2 text-sm text-[var(--muted)]"
        lang={config.nativeLanguage}
        dir="auto"
      >
        {card.focus}
      </p>
      {card.example && (
        <p
          className="mt-3 text-sm"
          lang={config.targetLanguage}
          dir="auto"
        >
          {card.example}
        </p>
      )}
      {reviewed && (
        <p
          role="status"
          className="mt-3 text-xs text-[var(--muted)]"
        >
          Review saved. Next review: {new Date(group.dueAt).toLocaleString()}.
        </p>
      )}
    </div>
  );
}
