import type { LanguageConfig } from '@/lib/schemas';

interface ReviewAnswerProps {
  text: string;
  explanation: string;
  config: LanguageConfig;
  flipped: boolean;
}

export function ReviewAnswer({ text, explanation, config, flipped }: ReviewAnswerProps) {
  return (
    <span
      className="review-card-face review-card-back"
      hidden={!flipped}
    >
      <span
        className="whitespace-pre-wrap text-3xl font-medium"
        lang={config.targetLanguage}
        dir="auto"
      >
        {text}
      </span>
      <span
        className="mt-5 whitespace-pre-wrap text-sm text-[var(--muted)]"
        lang={config.nativeLanguage}
        dir="auto"
      >
        {explanation}
      </span>
      <span className="mt-6 text-xs text-[var(--muted)]">Click to flip back</span>
    </span>
  );
}
