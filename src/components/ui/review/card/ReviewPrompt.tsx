interface ReviewPromptProps {
  text: string;
  flipped: boolean;
}

export function ReviewPrompt({ text, flipped }: ReviewPromptProps) {
  return (
    <span
      className="review-card-face review-card-front"
      hidden={flipped}
    >
      <span className="review-prompt-label text-sm font-bold uppercase tracking-wider text-[var(--muted)]">
        What you wrote
      </span>
      <span
        className="review-prompt-text mt-5 whitespace-pre-wrap text-3xl font-extrabold tracking-tight"
        dir="auto"
      >
        {text}
      </span>
      <span className="mt-6 text-sm text-[var(--muted)]">Click to flip</span>
    </span>
  );
}
