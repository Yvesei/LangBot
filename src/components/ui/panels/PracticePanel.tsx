'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { BookOpen, ChevronDown } from 'lucide-react';
import { checkPractice } from '@/lib/api';
import type { StudyCard } from '@/lib/learning';
import type { LanguageConfig } from '@/lib/schemas';

interface PracticePanelProps {
  cards: StudyCard[];
  config: LanguageConfig;
  onGrade: (id: string, correct: boolean) => void;
  onForget: (id: string) => void;
  onForgetAll: () => void;
}

interface PracticeFeedback {
  correct: boolean;
  feedback: string;
}

export function PracticePanel({
  cards,
  config,
  onGrade,
  onForget,
  onForgetAll,
}: PracticePanelProps) {
  const [now, setNow] = useState(Date.now);
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<PracticeFeedback | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => {
      clearInterval(timer);
      request.current?.abort();
    };
  }, []);
  useEffect(() => {
    setNow(Date.now());
  }, [cards]);
  const due = cards.filter((card) => card.exercise !== null && card.dueAt <= now);
  const card = cards.find((item) => item.id === selected);
  const nextDue = cards.length ? Math.min(...cards.map((item) => item.dueAt)) : null;
  const attempts = cards.reduce((total, card) => total + card.attempts, 0);
  const successes = cards.reduce((total, card) => total + card.successes, 0);
  function reset() {
    request.current?.abort();
    request.current = null;
    setSelected(null);
    setAnswer('');
    setFeedback(null);
    setError('');
    setLoading(false);
    setNow(Date.now());
  }
  async function submit() {
    if (!card?.exercise || !answer.trim() || request.current || feedback) {
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError('');
    try {
      const result = await checkPractice(
        card.exercise,
        answer.trim(),
        config,
        controller.signal,
      );
      if (controller.signal.aborted) {
        return;
      }
      setFeedback(result);
      onGrade(card.id, result.correct);
      setNow(Date.now());
    } catch (error) {
      if (!controller.signal.aborted) {
        setError(
          error instanceof Error ? error.message : 'Could not check the answer. Retry.',
        );
      }
    } finally {
      if (request.current === controller) {
        setLoading(false);
        request.current = null;
      }
    }
  }
  function handleStartPractice() {
    reset();
    setSelected(due[0].id);
    setExpanded(true);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit();
  }

  function handleForgetExercise() {
    if (!card) {
      return;
    }

    reset();
    onForget(card.id);
  }

  function handleForgetAll() {
    reset();
    onForgetAll();
  }

  return (
    <section
      aria-label="Saved practice"
      className="practice-panel"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2>
          <button
            type="button"
            className="flex items-center gap-2.5 text-xs text-[var(--muted)]"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            aria-controls="practice-details"
          >
            <BookOpen size={16} />
            <span className="font-medium">Practice · {due.length} ready</span>
            <ChevronDown
              size={13}
              className={expanded ? 'rotate-180' : ''}
            />
          </button>
        </h2>
        {!card && due.length > 0 && (
          <button
            onClick={handleStartPractice}
            className="subtle-button"
          >
            Practise now
          </button>
        )}
      </div>
      <div
        id="practice-details"
        hidden={!expanded}
        className="mt-4 border-t border-[var(--line)] pt-4"
      >
        <p className="text-xs text-[var(--muted)]">
          {cards.length} saved exercises
          {attempts ? ` · ${successes}/${attempts} answers accepted` : ''}
        </p>
        {!cards.length && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Exercises from your corrections appear here. Progress stays in this browser.
          </p>
        )}
        {!card && !!cards.length && due.length === 0 && nextDue && (
          <p className="mt-2 text-sm">
            Next review: {new Date(nextDue).toLocaleString()}.
          </p>
        )}
        {card?.exercise && (
          <form
            onSubmit={handleSubmit}
            className="mt-4 space-y-3"
          >
            <p
              lang={config.nativeLanguage}
              dir="auto"
            >
              {card.exercise.instruction}
            </p>
            <p
              className="whitespace-pre-wrap font-medium"
              lang={config.targetLanguage}
              dir="auto"
            >
              {card.exercise.sentence}
            </p>
            <label className="block text-sm">
              Your answer
              <input
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                maxLength={500}
                disabled={loading || !!feedback}
                lang={config.targetLanguage}
                dir="auto"
                className="mt-1 block w-full rounded-lg border bg-white p-3 dark:bg-gray-800"
              />
            </label>
            {!feedback ? (
              <button
                disabled={!answer.trim() || loading}
                className="primary-button"
              >
                {loading ? 'Checking…' : 'Check answer'}
              </button>
            ) : (
              <div role="status">
                <p
                  className={
                    feedback.correct
                      ? 'font-medium text-green-800 dark:text-green-200'
                      : 'font-medium text-amber-800 dark:text-amber-200'
                  }
                >
                  {feedback.correct
                    ? 'Well done. Review scheduled.'
                    : 'Keep practising. Try again in 10 minutes.'}
                </p>
                <p
                  className="mt-2"
                  lang={config.nativeLanguage}
                  dir="auto"
                >
                  {feedback.feedback}
                </p>
                <p className="mt-2 text-sm">
                  Example answer:{' '}
                  <span
                    lang={config.targetLanguage}
                    dir="auto"
                  >
                    {card.exercise.answer}
                  </span>
                </p>
              </div>
            )}
            {error && (
              <p
                role="alert"
                className="text-sm text-red-700 dark:text-red-300"
              >
                {error}
              </p>
            )}
            <div className="flex gap-4 text-xs">
              <button
                type="button"
                onClick={reset}
                className="underline"
              >
                {feedback ? 'Done' : 'Close exercise'}
              </button>
              <button
                type="button"
                onClick={handleForgetExercise}
                className="underline"
              >
                Forget this exercise
              </button>
            </div>
          </form>
        )}
        {!!cards.length && !card && (
          <button
            onClick={handleForgetAll}
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
    </section>
  );
}
