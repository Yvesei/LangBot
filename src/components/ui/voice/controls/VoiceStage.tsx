import { ArrowUp, AudioLines } from 'lucide-react';
import { getListeningHint } from '@/lib/voice/messages';
import type { LanguageConfig } from '@/lib/schemas';
import { getCallStatusLabel, type CallState } from '../voice-call-types';
import { VoiceCallControls } from './VoiceCallControls';
import { VoiceError } from './VoiceError';

interface VoiceStageProps {
  callState: CallState;
  config: LanguageConfig;
  interimTranscript: string;
  speakerAvailable: boolean;
  speakerEnabled: boolean;
  micEnabled: boolean;
  loading: boolean;
  error: string;
  onSendTurn: () => void;
  onListenAgain: () => void;
  onToggleMicrophone: () => void;
  onToggleSpeaker: () => void;
  onClose: () => void;
}

export function VoiceStage(props: VoiceStageProps) {
  return (
    <section className="flex min-h-[300px] flex-col items-center justify-center p-6 text-center">
      <div
        className="voice-orb"
        data-state={props.callState}
        aria-hidden="true"
      >
        <div data-theme-content="original" />
        <AudioLines
          data-theme-content="neo"
          size={64}
          strokeWidth={2.5}
        />
      </div>
      <p
        className="voice-status mt-6 text-xl font-extrabold"
        role="status"
        aria-live="polite"
      >
        {getCallStatusLabel(props.callState)}
      </p>
      <p
        className="mt-3 min-h-14 max-w-md text-pretty text-base text-[var(--muted)]"
        lang={props.config.targetLanguage}
        dir="auto"
      >
        {props.interimTranscript || getListeningHint(props.callState === 'listening')}
      </p>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--muted)]">
        Audio is sent to Mistral. Your words appear after each turn, in either selected
        language.
      </p>
      {!props.speakerAvailable && (
        <p className="mt-2 text-sm text-[var(--muted)]">
          Spoken playback is unavailable. Replies will appear in the transcript.
        </p>
      )}
      {props.callState === 'listening' && (
        <button
          type="button"
          onClick={props.onSendTurn}
          className="primary-button mt-4 inline-flex items-center gap-2"
          aria-label="Send spoken turn"
        >
          <ArrowUp size={16} /> Send turn
        </button>
      )}
      <VoiceError
        error={props.error}
        loading={props.loading}
        onListenAgain={props.onListenAgain}
      />
      <VoiceCallControls {...props} />
    </section>
  );
}
