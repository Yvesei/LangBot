'use client';

import type { StudyCard } from '@/lib/learning';
import type { LanguageConfig } from '@/lib/schemas';
import { PracticeDetails } from './PracticeDetails';
import { PracticeHeader } from './PracticePanelContent';
import { usePracticeSession } from './usePracticeSession';

interface PracticePanelProps {
  cards: StudyCard[];
  config: LanguageConfig;
  onGrade: (id: string, correct: boolean) => void;
  onForget: (id: string) => void;
  onForgetAll: () => void;
}

export function PracticePanel(props: PracticePanelProps) {
  const session = usePracticeSession(props);

  function startPractice() {
    session.reset();
    session.setSelected(session.due[0].id);
    session.setExpanded(true);
  }

  function forgetExercise() {
    if (session.card) {
      const cardId = session.card.id;
      session.reset();
      props.onForget(cardId);
    }
  }

  function forgetAll() {
    session.reset();
    props.onForgetAll();
  }

  return (
    <section
      aria-label="Saved practice"
      className="practice-panel"
    >
      <PracticeHeader
        dueCount={session.due.length}
        expanded={session.expanded}
        hasSelectedCard={Boolean(session.card)}
        onToggle={() => session.setExpanded(!session.expanded)}
        onStart={startPractice}
      />
      <PracticeDetails
        cards={props.cards}
        config={props.config}
        session={session}
        onForget={forgetExercise}
        onForgetAll={forgetAll}
      />
    </section>
  );
}
