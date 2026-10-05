import { CorrectionDiff } from '@/components/ui/chat/CorrectionDiff';
import type { LanguageCode } from '@/lib/schemas';
import type { VoiceMessage } from './voice-call-types';

interface TranscriptMessageProps {
  message: VoiceMessage;
  language: LanguageCode;
  loading: boolean;
  onRetry: (message: VoiceMessage) => void;
}

function MessageContent({ message, language }: TranscriptMessageProps) {
  const changed =
    message.role === 'user' &&
    message.correction &&
    message.correction.correctedText !== message.content;

  return (
    <div
      className={
        message.role === 'user'
          ? 'py-3 [&_del]:text-red-400 [&_ins]:text-green-400'
          : 'rounded-2xl rounded-bl-sm bg-white/5 px-4 py-3'
      }
      lang={language}
      dir="auto"
    >
      <p className="whitespace-pre-wrap">
        {changed && message.correction ? (
          <CorrectionDiff
            original={message.content}
            corrected={message.correction.correctedText}
            language={language}
          />
        ) : (
          message.content
        )}
      </p>
      {message.role === 'user' && message.correction === null && (
        <p className="mt-2 text-xs text-slate-400">
          Correction unavailable for this message.
        </p>
      )}
      {message.status === 'pending' && (
        <p className="mt-2 text-xs text-blue-100">Checking your sentence…</p>
      )}
    </div>
  );
}

export function TranscriptMessage(props: TranscriptMessageProps) {
  const { message } = props;
  return (
    <article
      className={message.role === 'user' ? 'ml-auto max-w-[88%]' : 'mr-auto max-w-[88%]'}
    >
      <p className="mb-1 text-xs text-slate-500">
        {message.role === 'user' ? 'You said' : 'LangBot said'}
      </p>
      <MessageContent {...props} />
      {message.status === 'failed' && (
        <button
          type="button"
          disabled={props.loading}
          onClick={() => props.onRetry(message)}
          className="mt-2 text-xs text-rose-300 underline disabled:opacity-40"
        >
          Retry this turn
        </button>
      )}
    </article>
  );
}
