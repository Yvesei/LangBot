'use client';

import { useState } from 'react';
import { groupReviewCards } from '@/lib/review';
import type { StudyCard } from '@/lib/learning';
import type { LanguageConfig } from '@/lib/schemas';
import { ReviewCard } from '../card/ReviewCard';
import { ReviewFooter } from './ReviewFooter';
import { ReviewHeader } from './ReviewHeader';
import { useReviewDialog } from './useReviewDialog';

interface ReviewDialogProps {
  cards: StudyCard[];
  config: LanguageConfig;
  onForget: (ids: string[]) => void;
  onClose: () => void;
}

export function ReviewDialog(props: ReviewDialogProps) {
  const { dialog, closeButton } = useReviewDialog();
  const [index, setIndex] = useState(0);
  const groups = groupReviewCards(props.cards);
  const activeIndex = Math.min(index, groups.length - 1);
  const group = groups[activeIndex];

  function previousCard() {
    setIndex(activeIndex - 1);
  }

  function nextCard() {
    setIndex(activeIndex + 1);
  }

  return (
    <dialog
      ref={dialog}
      className="review-dialog"
      aria-labelledby="review-title"
      onCancel={props.onClose}
    >
      <ReviewHeader
        config={props.config}
        closeButton={closeButton}
        onClose={props.onClose}
      />
      {groups.length === 0 && (
        <p className="py-10 text-sm">
          Corrections and words you ask about will appear here.
        </p>
      )}
      {group && (
        <div className="mt-6">
          <ReviewCard
            key={group.key}
            group={group}
            config={props.config}
          />
          <nav
            className="mt-5 flex items-center justify-between gap-3"
            aria-label="Flashcard navigation"
          >
            <button
              type="button"
              className="subtle-button"
              disabled={activeIndex === 0}
              onClick={previousCard}
            >
              Previous
            </button>
            <span className="text-sm text-[var(--muted)]">
              {activeIndex + 1} / {groups.length}
            </span>
            <button
              type="button"
              className="subtle-button"
              disabled={activeIndex === groups.length - 1}
              onClick={nextCard}
            >
              Next
            </button>
          </nav>
          <button
            type="button"
            className="mt-4 text-xs text-[var(--muted)] underline"
            onClick={() => props.onForget(group.ids)}
          >
            Remove card
          </button>
        </div>
      )}
      <ReviewFooter onClose={props.onClose} />
    </dialog>
  );
}
