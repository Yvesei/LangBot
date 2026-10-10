interface ReviewToolbarProps {
  reviewCount: number;
  hasMessages: boolean;
  onOpenReview: () => void;
  onEndSession: () => void;
}

export function ReviewToolbar(props: ReviewToolbarProps) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3 text-xs">
      <button
        type="button"
        className="subtle-button"
        onClick={props.onOpenReview}
      >
        Review cards · {props.reviewCount}
      </button>
      {props.hasMessages && (
        <button
          type="button"
          className="text-[var(--muted)]"
          onClick={props.onEndSession}
        >
          End session & review
        </button>
      )}
    </div>
  );
}
