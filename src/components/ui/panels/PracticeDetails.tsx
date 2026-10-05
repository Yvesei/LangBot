import type { StudyCard } from '@/lib/learning';
import type { LanguageConfig } from '@/lib/schemas';
import { PracticeExercise } from './PracticeExercise';
import { PracticeSummaryText } from './PracticePanelContent';
import type { usePracticeSession } from './usePracticeSession';

interface PracticeDetailsProps {
  cards: StudyCard[];
  config: LanguageConfig;
  session: ReturnType<typeof usePracticeSession>;
  onForget: () => void;
  onForgetAll: () => void;
}

export function PracticeDetails(props: PracticeDetailsProps) {
  const { session } = props;

  return (
    <div
      id="practice-details"
      hidden={!session.expanded}
      className="mt-4 border-t border-[var(--line)] pt-4"
    >
      <PracticeSummaryText
        cards={props.cards}
        summary={session}
      />
      <PracticeExercise
        summary={session}
        config={props.config}
        answer={session.answer}
        setAnswer={session.setAnswer}
        feedback={session.feedback}
        error={session.error}
        loading={session.loading}
        onSubmit={session.submit}
        onClose={session.reset}
        onForget={props.onForget}
      />
      {Boolean(props.cards.length) && !session.card && (
        <button
          onClick={props.onForgetAll}
          className="mt-3 text-xs underline"
        >
          Clear saved practice for these languages
        </button>
      )}
      <p className="mt-3 text-xs text-gray-500">
        AI feedback can be wrong. Review intervals: 1, 3, 7, 14, then 30 days after
        successful answers.
      </p>
    </div>
  );
}
