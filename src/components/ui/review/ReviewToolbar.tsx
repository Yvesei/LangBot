import { Layers } from 'lucide-react';

interface ReviewToolbarProps {
  reviewCount: number;
  onOpenReview: () => void;
}

export function ReviewToolbar(props: ReviewToolbarProps) {
  return (
    <button
      type="button"
      className="icon-button relative"
      onClick={props.onOpenReview}
      aria-label={`Flashcards · ${props.reviewCount}`}
      aria-haspopup="dialog"
      title="Flashcards"
    >
      <Layers size={19} />
      {props.reviewCount > 0 && (
        <span
          aria-hidden="true"
          className="absolute right-0 top-0 min-w-4 rounded-full bg-[var(--accent)] px-1 text-[9px] font-semibold leading-4 text-[var(--background)]"
        >
          {props.reviewCount > 99 ? '99+' : props.reviewCount}
        </span>
      )}
    </button>
  );
}
