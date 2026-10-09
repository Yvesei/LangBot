import { ArrowRight, Check, RotateCcw } from 'lucide-react';
import type { ReviewGroup } from '@/lib/review';
import { LANGUAGES, type LanguageConfig } from '@/lib/schemas';

interface ReviewPromptProps {
  group: ReviewGroup;
  config: LanguageConfig;
  revealed: boolean;
  onReveal: () => void;
}

export function ReviewPrompt(props: ReviewPromptProps) {
  const card = props.group.card;
  const front = card.originalText || card.focus;

  return (
    <>
      <div className="flex items-center justify-between gap-3 text-xs text-[var(--muted)]">
        <span>
          {card.kind === 'vocabulary' ? 'Word to remember' : 'Sentence to practise'}
        </span>
        <span>{props.group.occurrences} times in your conversations</span>
      </div>
      <p className="mt-4 text-xs text-[var(--muted)]">
        {card.kind === 'vocabulary'
          ? `How would you say this in ${LANGUAGES[props.config.targetLanguage]}?`
          : 'Can you correct this?'}
      </p>
      <p
        className="mt-2 whitespace-pre-wrap text-lg"
        dir="auto"
      >
        {front}
      </p>
      {!props.revealed && (
        <button
          type="button"
          className="mt-4 inline-flex items-center gap-2 text-sm"
          onClick={props.onReveal}
        >
          Show answer <ArrowRight size={14} />
        </button>
      )}
    </>
  );
}

interface ReviewControlsProps {
  group: ReviewGroup;
  revealed: boolean;
  reviewed: boolean;
  onGrade: (correct: boolean) => void;
  onForget: (ids: string[]) => void;
}

export function ReviewControls(props: ReviewControlsProps) {
  return (
    <>
      {props.revealed && !props.reviewed && (
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            className="subtle-button inline-flex items-center gap-2"
            onClick={() => props.onGrade(false)}
          >
            <RotateCcw size={14} /> Practise again
          </button>
          <button
            type="button"
            className="subtle-button inline-flex items-center gap-2"
            onClick={() => props.onGrade(true)}
          >
            <Check size={14} /> I remembered
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={() => props.onForget(props.group.ids)}
        className="mt-4 text-xs text-[var(--muted)] underline"
      >
        Forget this card
      </button>
    </>
  );
}
