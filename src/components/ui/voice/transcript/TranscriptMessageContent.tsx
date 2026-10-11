import { CorrectionDiff } from '@/components/ui/chat/message/CorrectionDiff';
import type { LanguageCode } from '@/lib/schemas';
import type { VoiceMessage } from '../voice-call-types';

interface TranscriptMessageContentProps {
  message: VoiceMessage;
  language: LanguageCode;
}

export function TranscriptMessageContent({
  message,
  language,
}: TranscriptMessageContentProps) {
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
