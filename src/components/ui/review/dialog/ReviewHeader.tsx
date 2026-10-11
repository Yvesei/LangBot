import type { RefObject } from 'react';
import { X } from 'lucide-react';
import { LANGUAGES, type LanguageConfig } from '@/lib/schemas';

interface ReviewHeaderProps {
  config: LanguageConfig;
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
          Your flashcards
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {LANGUAGES[props.config.nativeLanguage]} →{' '}
          {LANGUAGES[props.config.targetLanguage]}
        </p>
      </div>
      <button
        ref={props.closeButton}
        type="button"
        onClick={props.onClose}
        className="icon-button"
        aria-label="Close flashcards"
      >
        <X size={20} />
      </button>
    </header>
  );
}
