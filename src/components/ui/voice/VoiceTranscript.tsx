import type { LanguageCode } from '@/lib/schemas';
import type { VoiceMessage } from './voice-call-types';
import { TranscriptMessage } from './TranscriptMessage';

interface VoiceTranscriptProps {
  messages: VoiceMessage[];
  interimTranscript: string;
  language: LanguageCode;
  loading: boolean;
  transcriptEnd: React.RefObject<HTMLDivElement | null>;
  onRetry: (message: VoiceMessage) => void;
}

export function VoiceTranscript(props: VoiceTranscriptProps) {
  return (
    <section
      className="flex min-h-[360px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] lg:min-h-0"
      aria-label="Call transcript"
    >
      <div className="border-b border-white/10 px-5 py-4">
        <h3 className="font-semibold">Live transcript</h3>
        <p className="text-xs text-slate-400">
          Your words, inline corrections, and LangBot’s replies.
        </p>
      </div>
      <div
        className="flex-1 space-y-4 overflow-y-auto p-5"
        aria-live="polite"
      >
        {!props.messages.length && !props.interimTranscript && (
          <p className="py-12 text-center text-sm text-slate-500">
            Your conversation will appear here.
          </p>
        )}
        {props.messages.map((message) => (
          <TranscriptMessage
            key={message.id}
            message={message}
            language={props.language}
            loading={props.loading}
            onRetry={props.onRetry}
          />
        ))}
        {props.interimTranscript && (
          <article className="ml-auto max-w-[88%] opacity-70">
            <p className="mb-1 text-xs text-slate-500">You’re saying</p>
            <p
              className="py-3 italic"
              lang={props.language}
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
