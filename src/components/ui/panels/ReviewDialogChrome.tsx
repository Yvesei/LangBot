import type { RefObject } from 'react';
import { X } from 'lucide-react';
import { LANGUAGES, type LanguageConfig } from '@/lib/schemas';

interface ReviewHeaderProps {
  config: LanguageConfig;
  dueCount: number;
  closeButton: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}

export function ReviewHeader(props: ReviewHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-4">
      <div>
        <h2
          id="review-title"
          className="text-xl font-medium"
        >
          Your review cards
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {LANGUAGES[props.config.nativeLanguage]} →{' '}
          {LANGUAGES[props.config.targetLanguage]} · {props.dueCount} ready to review
        </p>
      </div>
      <button
        ref={props.closeButton}
        type="button"
        onClick={props.onClose}
        className="icon-button"
        aria-label="Close review"
      >
        <X size={20} />
      </button>
    </header>
  );
}

export function ReviewFooter({ onClose }: { onClose: () => void }) {
  return (
    <footer className="mt-6 flex items-center justify-between gap-4">
      <p className="text-xs text-[var(--muted)]">
        Saved in this browser for your next session. AI suggestions can be wrong.
      </p>
      <button
        type="button"
        onClick={onClose}
        className="subtle-button"
      >
        Back to conversation
      </button>
    </footer>
  );
}
