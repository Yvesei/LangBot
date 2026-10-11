interface ReviewToolbarProps {
  reviewCount: number;
  onOpenReview: () => void;
}

export function ReviewToolbar(props: ReviewToolbarProps) {
  return (
    <div className="mb-5 text-xs">
      <button
        type="button"
        className="subtle-button"
        onClick={props.onOpenReview}
      >
        Flashcards · {props.reviewCount}
      </button>
    </div>
  );
}
