import { BookOpen, ChevronDown } from 'lucide-react';
import type { StudyCard } from '@/lib/learning';
import type { PracticeSummary } from './practice-types';

interface PracticeHeaderProps {
  dueCount: number;
  expanded: boolean;
  hasSelectedCard: boolean;
  onToggle: () => void;
  onStart: () => void;
}

export function PracticeHeader(props: PracticeHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2>
        <button
          type="button"
          className="flex items-center gap-2.5 text-xs text-[var(--muted)]"
          onClick={props.onToggle}
          aria-expanded={props.expanded}
          aria-controls="practice-details"
        >
          <BookOpen size={16} />
          <span className="font-medium">Practice · {props.dueCount} ready</span>
          <ChevronDown
            size={13}
            className={props.expanded ? 'rotate-180' : ''}
          />
        </button>
      </h2>
      {!props.hasSelectedCard && props.dueCount > 0 && (
        <button
          onClick={props.onStart}
          className="subtle-button"
        >
          Practise now
        </button>
      )}
    </div>
  );
}

export function PracticeSummaryText({
  cards,
  summary,
}: {
  cards: StudyCard[];
  summary: PracticeSummary;
}) {
  const progress = summary.attempts
    ? ` · ${summary.successes}/${summary.attempts} answers accepted`
    : '';

  return (
    <>
      <p className="text-xs text-[var(--muted)]">
        {cards.length} saved exercises{progress}
      </p>
      {!cards.length && (
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Exercises from your corrections appear here. Progress stays in this browser.
        </p>
      )}
      {!summary.card &&
        Boolean(cards.length) &&
        summary.due.length === 0 &&
        summary.nextDue && (
          <p className="mt-2 text-sm">
            Next review: {new Date(summary.nextDue).toLocaleString()}.
          </p>
        )}
    </>
  );
}
