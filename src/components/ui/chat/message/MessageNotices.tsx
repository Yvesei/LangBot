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
          className="mt-2 text-sm text-[var(--muted)]"
        >
          Writing a reply and checking your sentence…
        </p>
      )}
      {user && message.correction === null && (
        <p className="mt-2 text-sm text-[var(--muted)]">
          Correction unavailable for this message.
        </p>
      )}
      {message.status === 'failed' && (
        <div
          className="mt-3"
          role="status"
        >
          <p className="text-error text-base">Reply and correction weren’t completed.</p>
          <button
            onClick={onRetry}
            disabled={busy}
            className="subtle-button mt-3 inline-flex items-center gap-2"
          >
            <RotateCcw size={14} /> Retry message
          </button>
        </div>
      )}
    </>
  );
}
