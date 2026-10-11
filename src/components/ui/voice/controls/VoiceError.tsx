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
      <p className="text-sm text-rose-300">{props.error}</p>
      {!props.loading && (
        <button
          type="button"
          onClick={props.onListenAgain}
          className="mt-2 inline-flex items-center gap-2 text-sm underline"
        >
          <RotateCcw className="h-4 w-4" /> Listen again
        </button>
      )}
    </div>
  );
}
