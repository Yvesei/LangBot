import { Layers } from 'lucide-react';

interface ReviewToolbarProps {
  reviewCount: number;
  onOpenReview: () => void;
}

export function ReviewToolbar(props: ReviewToolbarProps) {
  return (
    <button
      type="button"
      className="sidebar-action"
      onClick={props.onOpenReview}
      aria-label={`Flashcards · ${props.reviewCount}`}
      aria-haspopup="dialog"
      title="Flashcards"
    >
      <Layers size={19} />
      <span aria-hidden="true">Flashcards</span>
      {props.reviewCount > 0 && (
        <span
          aria-hidden="true"
          className="sidebar-badge"
        >
          {props.reviewCount > 99 ? '99+' : props.reviewCount}
        </span>
      )}
    </button>
  );
}
