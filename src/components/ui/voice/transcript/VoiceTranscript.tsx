import type { LanguageConfig } from '@/lib/schemas';
import type { VoiceMessage } from '../voice-call-types';
import { TranscriptMessage } from './TranscriptMessage';

interface VoiceTranscriptProps {
  messages: VoiceMessage[];
  interimTranscript: string;
  config: LanguageConfig;
  loading: boolean;
  transcriptEnd: React.RefObject<HTMLDivElement | null>;
  onRetry: (message: VoiceMessage) => void;
}

export function VoiceTranscript(props: VoiceTranscriptProps) {
  return (
    <section
      className="voice-transcript"
      aria-label="Call transcript"
    >
      <div
        className="flex-1 space-y-4 overflow-y-auto p-5"
        aria-live="polite"
      >
        {!props.messages.length && !props.interimTranscript && (
          <p className="py-12 text-center text-base text-[var(--muted)]">
            Your conversation will appear here.
          </p>
        )}
        {props.messages.map((message) => (
          <TranscriptMessage
            key={message.id}
            message={message}
            config={props.config}
            loading={props.loading}
            onRetry={props.onRetry}
          />
        ))}
        {props.interimTranscript && (
          <article className="ml-auto max-w-[88%] opacity-70">
            <p className="mb-2 text-sm font-semibold text-[var(--muted)]">
              You’re saying
            </p>
            <p
              className="py-3 italic"
              lang={props.config.targetLanguage}
              dir="auto"
            >
              {props.interimTranscript}
            </p>
          </article>
        )}
        <div ref={props.transcriptEnd} />
      </div>
    </section>
  );
}
