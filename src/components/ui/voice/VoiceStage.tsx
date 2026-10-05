import { ArrowUp, RotateCcw } from 'lucide-react';
import { getListeningHint } from '@/lib/voice/messages';
import type { LanguageConfig } from '@/lib/schemas';
import { getCallStatusLabel, type CallState } from './voice-call-types';
import { VoiceCallControls } from './VoiceCallControls';

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

function VoiceError(props: VoiceStageProps) {
  if (!props.error) {
    return null;
  }
  return (
    <div
      className="mt-4 max-w-md"
      role="alert"
    >
      <p className="text-sm text-rose-300">{props.error}</p>
      {!props.loading && (
        <button
          type="button"
          onClick={props.onListenAgain}
          className="mt-2 inline-flex items-center gap-2 text-sm underline"
        >
          <RotateCcw className="h-4 w-4" /> Listen again
        </button>
      )}
    </div>
  );
}

export function VoiceStage(props: VoiceStageProps) {
  return (
    <section className="flex min-h-[300px] flex-col items-center justify-center p-6 text-center">
      <div
        className="voice-orb"
        data-state={props.callState}
        aria-hidden="true"
      >
        <div />
      </div>
      <p
        className="mt-8 text-lg font-medium"
        role="status"
        aria-live="polite"
      >
        {getCallStatusLabel(props.callState)}
      </p>
      <p
        className="mt-3 min-h-14 max-w-md text-pretty text-slate-300"
        lang={props.config.targetLanguage}
        dir="auto"
      >
        {props.interimTranscript || getListeningHint(props.callState === 'listening')}
      </p>
      <p className="mt-2 max-w-xs text-xs leading-5 text-slate-400">
        Audio is sent to Mistral. Your words appear after each turn, in either selected
        language.
      </p>
      {!props.speakerAvailable && (
        <p className="mt-2 text-xs text-slate-400">
          Spoken playback is unavailable. Replies will appear in the transcript.
        </p>
      )}
      {props.callState === 'listening' && (
        <button
          type="button"
          onClick={props.onSendTurn}
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm"
          aria-label="Send spoken turn"
        >
          <ArrowUp size={16} /> Send turn
        </button>
      )}
      <VoiceError {...props} />
      <VoiceCallControls {...props} />
    </section>
  );
}
