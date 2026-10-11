import type { VoiceCallProps } from './voice-call-types';
import type { VoiceCallState } from './useVoiceCallState';
import { VoiceCallHeader } from './VoiceCallHeader';
import { VoiceUnavailable } from './VoiceUnavailable';
import { AvailableVoiceCall } from './AvailableVoiceCall';

export interface VoiceCallActions {
  close: () => void;
  listenAgain: () => void;
  toggleMicrophone: () => void;
  toggleSpeaker: () => void;
}

export interface VoiceCallViewProps {
  state: VoiceCallState;
  props: VoiceCallProps;
  actions: VoiceCallActions;
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
