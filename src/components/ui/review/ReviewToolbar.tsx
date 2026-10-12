import { Layers } from 'lucide-react';

interface ReviewToolbarProps {
  reviewCount: number;
  onOpenReview: () => void;
}

export function ReviewToolbar(props: ReviewToolbarProps) {
  return (
    <button
      type="button"
      className="icon-button nav-flashcards"
      onClick={props.onOpenReview}
      aria-label={`Flashcards · ${props.reviewCount}`}
      aria-haspopup="dialog"
      title="Flashcards"
    >
      <Layers size={22} />
      <span
        className="hidden sm:inline"
        aria-hidden="true"
      >
        Flashcards
      </span>
      {props.reviewCount > 0 && (
        <span
          aria-hidden="true"
          className="card-count"
        >
          {props.reviewCount > 99 ? '99+' : props.reviewCount}
        </span>
      )}
    </button>
  );
}
