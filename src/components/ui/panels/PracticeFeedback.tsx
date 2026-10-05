import type { LanguageConfig } from '@/lib/schemas';
import type { PracticeFeedback as Feedback } from './practice-types';

interface PracticeFeedbackProps {
  feedback: Feedback;
  config: LanguageConfig;
  answer: string;
}

export function PracticeFeedback(props: PracticeFeedbackProps) {
  return (
    <div role="status">
      <p
        className={
          props.feedback.correct
            ? 'font-medium text-green-800 dark:text-green-200'
            : 'font-medium text-amber-800 dark:text-amber-200'
        }
      >
        {props.feedback.correct
          ? 'Well done. Review scheduled.'
          : 'Keep practising. Try again in 10 minutes.'}
      </p>
      <p
        className="mt-2"
        lang={props.config.nativeLanguage}
        dir="auto"
      >
        {props.feedback.feedback}
      </p>
      <p className="mt-2 text-sm">
        Example answer:{' '}
        <span
          lang={props.config.targetLanguage}
          dir="auto"
        >
          {props.answer}
        </span>
      </p>
    </div>
  );
}
