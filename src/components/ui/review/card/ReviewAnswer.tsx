import type { LanguageConfig } from '@/lib/schemas';
import { BoldText } from '@/components/ui/text/BoldText';

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
        className="review-answer-text whitespace-pre-wrap text-3xl font-extrabold tracking-tight"
        lang={config.targetLanguage}
        dir="auto"
      >
        {text}
      </span>
      <span
        className="mt-5 whitespace-pre-wrap text-base leading-relaxed text-[var(--muted)]"
        lang={config.nativeLanguage}
        dir="auto"
      >
        <BoldText text={explanation} />
      </span>
      <span className="mt-6 text-sm text-[var(--muted)]">Click to flip back</span>
    </span>
  );
}
