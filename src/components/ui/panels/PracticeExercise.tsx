import type { FormEvent } from 'react';
import type { LanguageConfig } from '@/lib/schemas';
import type { PracticeFeedback as Feedback, PracticeSummary } from './practice-types';
import { PracticeExerciseActions } from './PracticeExerciseActions';
import { PracticeFeedback } from './PracticeFeedback';
import { PracticeQuestion } from './PracticeQuestion';

interface PracticeExerciseProps {
  summary: PracticeSummary;
  config: LanguageConfig;
  answer: string;
  setAnswer: (answer: string) => void;
  feedback: Feedback | null;
  error: string;
  loading: boolean;
  onSubmit: () => void;
  onClose: () => void;
  onForget: () => void;
}

export function PracticeExercise(props: PracticeExerciseProps) {
  const exercise = props.summary.card?.exercise;

  if (!exercise) {
    return null;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void props.onSubmit();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 space-y-3"
    >
      <PracticeQuestion
        exercise={exercise}
        config={props.config}
        answer={props.answer}
        setAnswer={props.setAnswer}
        disabled={props.loading || Boolean(props.feedback)}
      />
      {!props.feedback && (
        <button
          disabled={!props.answer.trim() || props.loading}
          className="primary-button"
        >
          {props.loading ? 'Checking…' : 'Check answer'}
        </button>
      )}
      {props.feedback && (
        <PracticeFeedback
          feedback={props.feedback}
          config={props.config}
          answer={exercise.answer}
        />
      )}
      <PracticeExerciseActions
        feedbackAvailable={Boolean(props.feedback)}
        error={props.error}
        onClose={props.onClose}
        onForget={props.onForget}
      />
    </form>
  );
}
