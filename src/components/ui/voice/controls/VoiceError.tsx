import { RotateCcw } from 'lucide-react';

interface VoiceErrorProps {
  error: string;
  loading: boolean;
  onListenAgain: () => void;
}

export function VoiceError(props: VoiceErrorProps) {
  if (!props.error) {
    return null;
  }

  return (
    <div
      className="mt-4 max-w-md"
      role="alert"
    >
      <p className="notice-error">{props.error}</p>
      {!props.loading && (
        <button
          type="button"
          onClick={props.onListenAgain}
          className="subtle-button mt-3 inline-flex items-center gap-2"
        >
          <RotateCcw className="h-4 w-4" /> Listen again
        </button>
      )}
    </div>
  );
}
