import { ArrowRight } from 'lucide-react';

export function SetupActions({ onCancel }: { onCancel?: () => void }) {
  return (
    <>
      <button
        type="submit"
        className="primary-button flex w-full items-center justify-center gap-3"
      >
        Start practising <ArrowRight size={16} />
      </button>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="w-full underline"
        >
          Back to chat
        </button>
      )}
    </>
  );
}
