import type { VoiceCallProps } from './voice-call-types';
import type { VoiceCallState } from './useVoiceCallState';
import { VoiceCallHeader } from './VoiceCallHeader';
import { VoiceStage } from './VoiceStage';
import { VoiceTranscript } from './VoiceTranscript';
import { VoiceUnavailable } from './VoiceUnavailable';

export interface VoiceCallActions {
  close: () => void;
  listenAgain: () => void;
  toggleMicrophone: () => void;
  toggleSpeaker: () => void;
}

interface VoiceCallViewProps {
  state: VoiceCallState;
  props: VoiceCallProps;
  actions: VoiceCallActions;
}

function AvailableVoiceCall({ state, props, actions }: VoiceCallViewProps) {
  const sessionMessages =
    state.isRecordingSupported === null ? [] : props.messages.slice(state.sessionStart);

  return (
    <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto py-5 lg:grid-cols-[minmax(280px,0.8fr)_minmax(360px,1.2fr)] lg:overflow-hidden">
      <VoiceStage
        callState={state.callState}
        config={props.config}
        interimTranscript={state.interimTranscript}
        speakerAvailable={state.speakerAvailable}
        speakerEnabled={state.speakerEnabled}
        micEnabled={state.micEnabled}
        loading={props.loading}
        error={state.voiceError || props.error}
        onSendTurn={() => state.recognition.current?.stop()}
        onListenAgain={actions.listenAgain}
        onToggleMicrophone={actions.toggleMicrophone}
        onToggleSpeaker={actions.toggleSpeaker}
        onClose={actions.close}
      />
      <VoiceTranscript
        messages={sessionMessages}
        interimTranscript={state.interimTranscript}
        language={props.config.targetLanguage}
        loading={props.loading}
        transcriptEnd={state.transcriptEnd}
        onRetry={props.onRetry}
      />
    </div>
  );
}

export function VoiceCallView({ state, props, actions }: VoiceCallViewProps) {
  if (!props.open) {
    return null;
  }
  return (
    <div
      ref={state.dialog}
      className="voice-dialog fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-call-title"
    >
      <div className="mx-auto flex h-full max-w-6xl flex-col px-4 py-4 sm:px-6">
        <VoiceCallHeader
          config={props.config}
          closeButton={state.closeButton}
          onClose={actions.close}
        />
        {state.isRecordingSupported === false ? (
          <VoiceUnavailable
            reason={state.unavailableReason}
            onClose={actions.close}
          />
        ) : (
          <AvailableVoiceCall
            state={state}
            props={props}
            actions={actions}
          />
        )}
      </div>
    </div>
  );
}
