'use client';

import { groupReviewCards } from '@/lib/review';
import type { StudyCard } from '@/lib/learning';
import type { LanguageConfig } from '@/lib/schemas';
import { ReviewCard } from './ReviewCard';
import { ReviewFooter, ReviewHeader } from './ReviewDialogChrome';
import { useReviewDialog } from './useReviewDialog';

interface ReviewDialogProps {
  cards: StudyCard[];
  config: LanguageConfig;
  onGrade: (ids: string[], correct: boolean) => void;
  onForget: (ids: string[]) => void;
  onClose: () => void;
}

export function ReviewDialog(props: ReviewDialogProps) {
  const { dialog, closeButton } = useReviewDialog();
  const groups = groupReviewCards(props.cards);
  const dueCount = groups.filter((group) => group.dueAt <= Date.now()).length;

  return (
    <dialog
      ref={dialog}
      className="review-dialog"
      aria-labelledby="review-title"
      onCancel={props.onClose}
    >
      <ReviewHeader
        config={props.config}
        dueCount={dueCount}
        closeButton={closeButton}
        onClose={props.onClose}
      />
      <p className="mt-4 text-sm text-[var(--muted)]">
        Repeated mistakes come first. Reveal each answer, then mark what you remembered.
      </p>
      {groups.length === 0 && (
        <p className="py-10 text-sm">
          Words you ask about and sentences you correct will appear here.
        </p>
      )}
      <div className="mt-4 space-y-4">
        {groups.map((group) => (
          <ReviewCard
            key={group.key}
            group={group}
            config={props.config}
            onGrade={props.onGrade}
            onForget={props.onForget}
          />
        ))}
      </div>
      <ReviewFooter onClose={props.onClose} />
    </dialog>
  );
}
