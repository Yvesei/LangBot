import type { VoiceCallViewProps } from './VoiceCallView';
import { VoiceStage } from '../controls/VoiceStage';
import { VoiceTranscript } from '../transcript/VoiceTranscript';

export function AvailableVoiceCall({ state, props, actions }: VoiceCallViewProps) {
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
