import { Check, RotateCcw } from 'lucide-react';
import type { ReviewGroup } from '@/lib/review';

interface ReviewControlsProps {
  group: ReviewGroup;
  revealed: boolean;
  reviewed: boolean;
  onGrade: (correct: boolean) => void;
  onForget: (ids: string[]) => void;
}

export function ReviewControls(props: ReviewControlsProps) {
  return (
    <>
      {props.revealed && !props.reviewed && (
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            className="subtle-button inline-flex items-center gap-2"
            onClick={() => props.onGrade(false)}
          >
            <RotateCcw size={14} /> Practise again
          </button>
          <button
            type="button"
            className="subtle-button inline-flex items-center gap-2"
            onClick={() => props.onGrade(true)}
          >
            <Check size={14} /> I remembered
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={() => props.onForget(props.group.ids)}
        className="mt-4 text-xs text-[var(--muted)] underline"
      >
        Forget this card
      </button>
    </>
  );
}
