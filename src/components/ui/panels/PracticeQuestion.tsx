import type { LanguageConfig } from '@/lib/schemas';
import type { Exercise } from '@/lib/schemas';

interface PracticeQuestionProps {
  exercise: Exercise;
  config: LanguageConfig;
  answer: string;
  setAnswer: (answer: string) => void;
  disabled: boolean;
}

export function PracticeQuestion(props: PracticeQuestionProps) {
  return (
    <>
      <p
        lang={props.config.nativeLanguage}
        dir="auto"
      >
        {props.exercise.instruction}
      </p>
      <p
        className="whitespace-pre-wrap font-medium"
        lang={props.config.targetLanguage}
        dir="auto"
      >
        {props.exercise.sentence}
      </p>
      <label className="block text-sm">
        Your answer
        <input
          value={props.answer}
          onChange={(event) => props.setAnswer(event.target.value)}
          maxLength={500}
          disabled={props.disabled}
          lang={props.config.targetLanguage}
          dir="auto"
          className="mt-1 block w-full rounded-lg border bg-white p-3 dark:bg-gray-800"
        />
      </label>
    </>
  );
}
