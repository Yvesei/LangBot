'use client';

import { useEffect, useRef, useState } from 'react';
import { X, ArrowRight, RotateCcw, Check } from 'lucide-react';
import { groupReviewCards, type ReviewGroup } from '@/lib/review';
import type { StudyCard } from '@/lib/learning';
import { LANGUAGES, type LanguageConfig } from '@/lib/schemas';

interface ReviewDialogProps {
  cards: StudyCard[];
  config: LanguageConfig;
  onGrade: (ids: string[], correct: boolean) => void;
  onForget: (ids: string[]) => void;
  onClose: () => void;
}

interface ReviewCardProps {
  group: ReviewGroup;
  config: LanguageConfig;
  onGrade: ReviewDialogProps['onGrade'];
  onForget: ReviewDialogProps['onForget'];
}

function ReviewCard({ group, config, onGrade, onForget }: ReviewCardProps) {
  const [revealed, setRevealed] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const card = group.card;
  const isVocabulary = card.kind === 'vocabulary';
  const front = card.originalText || card.exercise?.sentence || card.focus;
  const answer = card.correctedText || card.exercise?.answer || '';

  function grade(correct: boolean) {
    onGrade(group.ids, correct);
    setReviewed(true);
  }

  return (
    <article className="review-card">
      <div className="flex items-center justify-between gap-3 text-xs text-[var(--muted)]">
        <span>{isVocabulary ? 'Word to remember' : 'Sentence to practise'}</span>
        <span>
          {group.occurrences} {group.occurrences === 1 ? 'time' : 'times'} in your
          conversations
        </span>
      </div>
      <p className="mt-4 text-xs text-[var(--muted)]">
        {isVocabulary
          ? `How would you say this in ${LANGUAGES[config.targetLanguage]}?`
          : 'Can you correct this?'}
      </p>
      <p
        className="mt-2 whitespace-pre-wrap text-lg"
        dir="auto"
      >
        {front}
      </p>
      {!revealed && (
        <button
          type="button"
          className="mt-4 inline-flex items-center gap-2 text-sm"
          onClick={() => setRevealed(true)}
        >
          Show answer <ArrowRight size={14} />
        </button>
      )}
      {revealed && (
        <div className="mt-4 border-t border-[var(--line)] pt-4">
          <p
            className="whitespace-pre-wrap font-medium"
            lang={config.targetLanguage}
            dir="auto"
          >
            {answer}
          </p>
          <p
            className="mt-2 text-sm text-[var(--muted)]"
            lang={config.nativeLanguage}
            dir="auto"
          >
            {card.focus}
          </p>
          {card.example && (
            <p
              className="mt-3 text-sm"
              lang={config.targetLanguage}
              dir="auto"
            >
              {card.example}
            </p>
          )}
          {!reviewed && (
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                className="subtle-button inline-flex items-center gap-2"
                onClick={() => grade(false)}
              >
                <RotateCcw size={14} /> Practise again
              </button>
              <button
                type="button"
                className="subtle-button inline-flex items-center gap-2"
                onClick={() => grade(true)}
              >
                <Check size={14} /> I remembered
              </button>
            </div>
          )}
          {reviewed && (
            <p
              role="status"
              className="mt-3 text-xs text-[var(--muted)]"
            >
              Review saved. Next review: {new Date(group.dueAt).toLocaleString()}.
            </p>
          )}
        </div>
      )}
      <button
        type="button"
        onClick={() => onForget(group.ids)}
        className="mt-4 text-xs text-[var(--muted)] underline"
      >
        Forget this card
      </button>
    </article>
  );
}

export function ReviewDialog({
  cards,
  config,
  onGrade,
  onForget,
  onClose,
}: ReviewDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const groups = groupReviewCards(cards);
  const due = groups.filter((group) => group.dueAt <= Date.now());

  useEffect(() => {
    const modal = dialog.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    if (!modal) {
      return;
    }
    modal.showModal();
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus();
    return () => {
      modal.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus();
      }
    };
  }, []);

  return (
    <dialog
      ref={dialog}
      className="review-dialog"
      aria-labelledby="review-title"
      onCancel={onClose}
    >
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2
            id="review-title"
            className="text-xl font-medium"
          >
            Your review cards
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {LANGUAGES[config.nativeLanguage]} → {LANGUAGES[config.targetLanguage]} ·{' '}
            {due.length} ready to review
          </p>
        </div>
        <button
          ref={closeButton}
          type="button"
          onClick={onClose}
          className="icon-button"
          aria-label="Close review"
        >
          <X size={20} />
        </button>
      </header>
      <p className="mt-4 text-sm text-[var(--muted)]">
        Repeated mistakes come first. Reveal each answer, then mark what you remembered.
      </p>
      {groups.length === 0 && (
        <p className="py-10 text-sm">
          Words you ask about and sentences you correct will appear here.
        </p>
      )}
      <div className="mt-4 space-y-4">
        {groups.map((group) => (
          <ReviewCard
            key={group.key}
            group={group}
            config={config}
            onGrade={onGrade}
            onForget={onForget}
          />
        ))}
      </div>
      <footer className="mt-6 flex items-center justify-between gap-4">
        <p className="text-xs text-[var(--muted)]">
          Saved in this browser for your next session. AI suggestions can be wrong.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="subtle-button"
        >
          Back to conversation
        </button>
      </footer>
    </dialog>
  );
}
