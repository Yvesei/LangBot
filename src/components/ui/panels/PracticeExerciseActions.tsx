interface PracticeExerciseActionsProps {
  feedbackAvailable: boolean;
  error: string;
  onClose: () => void;
  onForget: () => void;
}

export function PracticeExerciseActions(props: PracticeExerciseActionsProps) {
  return (
    <>
      {props.error && (
        <p
          role="alert"
          className="text-sm text-red-700 dark:text-red-300"
        >
          {props.error}
        </p>
      )}
      <div className="flex gap-4 text-xs">
        <button
          type="button"
          onClick={props.onClose}
          className="underline"
        >
          {props.feedbackAvailable ? 'Done' : 'Close exercise'}
        </button>
        <button
          type="button"
          onClick={props.onForget}
          className="underline"
        >
          Forget this exercise
        </button>
      </div>
    </>
  );
}
