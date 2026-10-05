import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { checkPractice } from '@/lib/api';
import type { StudyCard } from '@/lib/learning';
import type { LanguageConfig } from '@/lib/schemas';
import type { PracticeFeedback } from './practice-types';

interface SubmissionOptions {
  card: StudyCard | undefined;
  answer: string;
  feedback: PracticeFeedback | null;
  config: LanguageConfig;
  request: MutableRefObject<AbortController | null>;
  onGrade: (id: string, correct: boolean) => void;
  setFeedback: Dispatch<SetStateAction<PracticeFeedback | null>>;
  setError: Dispatch<SetStateAction<string>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setNow: Dispatch<SetStateAction<number>>;
}

function canSubmit(options: SubmissionOptions) {
  return Boolean(
    options.card?.exercise &&
    options.answer.trim() &&
    !options.request.current &&
    !options.feedback,
  );
}

function applyError(
  error: unknown,
  options: SubmissionOptions,
  controller: AbortController,
) {
  if (!controller.signal.aborted) {
    options.setError(
      error instanceof Error ? error.message : 'Could not check the answer. Retry.',
    );
  }
}

function finishRequest(options: SubmissionOptions, controller: AbortController) {
  if (options.request.current === controller) {
    options.setLoading(false);
    options.request.current = null;
  }
}

export function usePracticeSubmission(options: SubmissionOptions) {
  return async function submit() {
    if (!canSubmit(options)) {
      return;
    }

    const exercise = options.card!.exercise!;
    const controller = new AbortController();
    options.request.current = controller;
    options.setLoading(true);
    options.setError('');

    try {
      const result = await checkPractice(
        exercise,
        options.answer.trim(),
        options.config,
        controller.signal,
      );

      if (!controller.signal.aborted) {
        options.setFeedback(result);
        options.onGrade(options.card!.id, result.correct);
        options.setNow(Date.now());
      }
    } catch (error) {
      applyError(error, options, controller);
    } finally {
      finishRequest(options, controller);
    }
  };
}
