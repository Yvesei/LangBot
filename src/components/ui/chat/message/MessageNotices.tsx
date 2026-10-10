import { RotateCcw } from 'lucide-react';
import type { ChatMessage } from '@/lib/types';

interface MessageNoticesProps {
  message: ChatMessage;
  busy: boolean;
  onRetry: () => void;
}

export function MessageNotices({ message, busy, onRetry }: MessageNoticesProps) {
  const user = message.role === 'user';

  return (
    <>
      {user && message.status === 'pending' && (
        <p
          role="status"
          className="mt-2 text-xs text-gray-500"
        >
          Writing a reply and checking your sentence…
        </p>
      )}
      {user && message.correction === null && (
        <p className="mt-2 text-xs text-[var(--muted)]">
          Correction unavailable for this message.
        </p>
      )}
      {message.status === 'failed' && (
        <div
          className="mt-3"
          role="status"
        >
          <p className="text-sm text-red-700 dark:text-red-300">
            Reply and correction weren’t completed.
          </p>
          <button
            onClick={onRetry}
            disabled={busy}
            className="mt-2 inline-flex items-center gap-2 text-xs disabled:opacity-40"
          >
            <RotateCcw size={14} /> Retry message
          </button>
        </div>
      )}
    </>
  );
}
