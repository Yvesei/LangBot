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
          ? 'transcript-bubble transcript-user'
          : 'transcript-bubble'
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
        <p className="mt-2 text-sm text-[var(--muted)]">
          Correction unavailable for this message.
        </p>
      )}
      {message.status === 'pending' && (
        <p className="mt-2 text-sm text-[var(--muted)]">Checking your sentence…</p>
      )}
    </div>
  );
}
