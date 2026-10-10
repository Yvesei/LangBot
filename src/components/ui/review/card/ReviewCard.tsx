import { useState } from 'react';
import type { ReviewGroup } from '@/lib/review';
import type { LanguageConfig } from '@/lib/schemas';
import { ReviewAnswer } from './ReviewAnswer';
import { ReviewPrompt } from './ReviewPrompt';
import { getReviewText } from '@/lib/review/text';

interface ReviewCardProps {
  group: ReviewGroup;
  config: LanguageConfig;
}

export function ReviewCard({ group, config }: ReviewCardProps) {
  const [flipped, setFlipped] = useState(false);
  const { originalText, correctedText } = getReviewText(group.card);

  function flipCard() {
    setFlipped((current) => !current);
  }

  return (
    <button
      type="button"
      className="review-card"
      aria-pressed={flipped}
      onClick={flipCard}
    >
      <span className={`review-card-inner${flipped ? ' is-flipped' : ''}`}>
        <ReviewPrompt
          text={originalText}
          kind={group.card.kind}
          flipped={flipped}
        />
        <ReviewAnswer
          text={correctedText}
          explanation={group.card.focus}
          config={config}
          flipped={flipped}
        />
      </span>
    </button>
  );
}
