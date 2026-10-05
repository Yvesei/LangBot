import { useEffect, useRef, useState } from 'react';
import type { StudyCard } from '@/lib/learning';
import type { LanguageConfig } from '@/lib/schemas';
import type { PracticeFeedback, PracticeSummary } from './practice-types';
import { usePracticeSubmission } from './usePracticeSubmission';

function getSummary(
  cards: StudyCard[],
  now: number,
  selected: string | null,
): PracticeSummary {
  return {
    due: cards.filter((card) => card.exercise !== null && card.dueAt <= now),
    card: cards.find((card) => card.id === selected),
    nextDue: cards.length ? Math.min(...cards.map((card) => card.dueAt)) : null,
    attempts: cards.reduce((total, card) => total + card.attempts, 0),
    successes: cards.reduce((total, card) => total + card.successes, 0),
  };
}

function usePracticeLifecycle(
  cards: StudyCard[],
  request: React.MutableRefObject<AbortController | null>,
  setNow: React.Dispatch<React.SetStateAction<number>>,
) {
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => {
      clearInterval(timer);
      abortRequest(request);
    };
  }, [request, setNow]);

  useEffect(() => setNow(Date.now()), [cards, setNow]);
}

function abortRequest(request: React.MutableRefObject<AbortController | null>) {
  request.current?.abort();
}

interface SessionOptions {
  cards: StudyCard[];
  config: LanguageConfig;
  onGrade: (id: string, correct: boolean) => void;
}

export function usePracticeSession(options: SessionOptions) {
  const [now, setNow] = useState(Date.now);
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<PracticeFeedback | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const request = useRef<AbortController | null>(null);
  const summary = getSummary(options.cards, now, selected);
  usePracticeLifecycle(options.cards, request, setNow);

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

  const submit = usePracticeSubmission({
    card: summary.card,
    answer,
    feedback,
    config: options.config,
    request,
    onGrade: options.onGrade,
    setFeedback,
    setError,
    setLoading,
    setNow,
  });

  return {
    ...summary,
    expanded,
    setExpanded,
    setSelected,
    answer,
    setAnswer,
    feedback,
    error,
    loading,
    reset,
    submit,
  };
}
