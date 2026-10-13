import { CorrectionDiff } from '@/components/ui/chat/message/CorrectionDiff';
import { CorrectionExplanation } from '@/components/ui/chat/message/CorrectionExplanation';
import { BoldText } from '@/components/ui/text/BoldText';
import type { LanguageConfig } from '@/lib/schemas';
import type { VoiceMessage } from '../voice-call-types';

interface TranscriptMessageContentProps {
  message: VoiceMessage;
  config: LanguageConfig;
}

export function TranscriptMessageContent({
  message,
  config,
}: TranscriptMessageContentProps) {
  const language = config.targetLanguage;
  const correction = message.correction;
  const changed =
    message.role === 'user' && correction && correction.correctedText !== message.content;
  let content: React.ReactNode = message.content;

  if (message.role === 'assistant') {
    content = <BoldText text={message.content} />;
  }

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
        {changed ? (
          <CorrectionDiff
            original={message.content}
            corrected={correction.correctedText}
            language={language}
          />
        ) : (
          content
        )}
        {changed && (
          <CorrectionExplanation
            issues={correction.issues}
            language={config.nativeLanguage}
          />
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
