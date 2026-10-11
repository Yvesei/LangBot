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
      <span className="text-xs text-[var(--muted)]">What you wrote</span>
      <span
        className="mt-5 whitespace-pre-wrap text-3xl font-medium"
        dir="auto"
      >
        {text}
      </span>
      <span className="mt-6 text-xs text-[var(--muted)]">Click to flip</span>
    </span>
  );
}
