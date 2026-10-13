import type { LanguageConfig } from '@/lib/schemas';
import type { VoiceMessage } from '../voice-call-types';
import { TranscriptMessageContent } from './TranscriptMessageContent';

interface TranscriptMessageProps {
  message: VoiceMessage;
  config: LanguageConfig;
  loading: boolean;
  onRetry: (message: VoiceMessage) => void;
}

export function TranscriptMessage(props: TranscriptMessageProps) {
  const { message } = props;
  return (
    <article
      className={message.role === 'user' ? 'ml-auto max-w-[88%]' : 'mr-auto max-w-[88%]'}
    >
      <p className="mb-2 text-sm font-semibold text-[var(--muted)]">
        {message.role === 'user' ? 'You said' : 'LangBot said'}
      </p>
      <TranscriptMessageContent
        message={message}
        config={props.config}
      />
      {message.status === 'failed' && (
        <button
          type="button"
          disabled={props.loading}
          onClick={() => props.onRetry(message)}
          className="subtle-button mt-3"
        >
          Retry this turn
        </button>
      )}
    </article>
  );
}
