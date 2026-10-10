import { useState } from 'react';
import type { ReviewGroup } from '@/lib/review';
import type { LanguageConfig } from '@/lib/schemas';
import { ReviewAnswer } from './ReviewAnswer';
import { ReviewControls } from './ReviewControls';
import { ReviewPrompt } from './ReviewPrompt';

interface ReviewCardProps {
  group: ReviewGroup;
  config: LanguageConfig;
  onGrade: (ids: string[], correct: boolean) => void;
  onForget: (ids: string[]) => void;
}

export function ReviewCard(props: ReviewCardProps) {
  const [revealed, setRevealed] = useState(false);
  const [reviewed, setReviewed] = useState(false);

  function grade(correct: boolean) {
    props.onGrade(props.group.ids, correct);
    setReviewed(true);
  }

  return (
    <article className="review-card">
      <ReviewPrompt
        group={props.group}
        config={props.config}
        revealed={revealed}
        onReveal={() => setRevealed(true)}
      />
      {revealed && (
        <ReviewAnswer
          group={props.group}
          config={props.config}
          reviewed={reviewed}
        />
      )}
      <ReviewControls
        group={props.group}
        revealed={revealed}
        reviewed={reviewed}
        onGrade={grade}
        onForget={props.onForget}
      />
    </article>
  );
}
