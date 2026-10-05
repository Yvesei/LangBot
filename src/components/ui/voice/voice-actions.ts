import type { CallState, VoiceCallProps } from './voice-call-types';
import type { VoiceCallState } from './useVoiceCallState';

export interface VoiceActionContext {
  state: VoiceCallState;
  props: VoiceCallProps;
  setCallState: (state: CallState) => void;
  startListening: () => void;
  stopListening: () => void;
  stopSpeaking: () => void;
}

export function toggleMicrophone(context: VoiceActionContext) {
  const { state, props, setCallState } = context;
  const isEnabled = !state.micEnabled;
  state.setMicEnabled(isEnabled);
  state.shouldListen.current = isEnabled;
  if (!isEnabled) {
    context.stopListening();
    if (state.callStateRef.current !== 'speaking') {
      setCallState(props.loading ? 'thinking' : 'paused');
    }
    return;
  }
  props.onClearError();
  state.setVoiceError('');
  if (state.callStateRef.current === 'speaking') {
    return;
  }
  setCallState(props.loading ? 'thinking' : 'starting');
  if (!props.loading) {
    context.startListening();
  }
}

export function toggleSpeaker(context: VoiceActionContext) {
  const { state, setCallState } = context;
  const isEnabled = !state.speakerEnabled;
  state.setSpeakerEnabled(isEnabled);
  if (!isEnabled && state.callStateRef.current === 'speaking') {
    context.stopSpeaking();
    setCallState(state.micEnabled ? 'starting' : 'paused');
    if (state.micEnabled) {
      context.startListening();
    }
  }
}

export function endVoiceCall(context: VoiceActionContext) {
  context.state.isOpen.current = false;
  context.state.shouldListen.current = false;
  context.stopListening();
  context.stopSpeaking();
  context.props.onClose();
}

export function listenAgain(context: VoiceActionContext) {
  context.props.onClearError();
  context.state.shouldListen.current = true;
  context.state.setMicEnabled(true);
  context.state.setVoiceError('');
  context.setCallState('starting');
  context.startListening();
}

export function showRequestError(context: VoiceActionContext) {
  context.state.shouldListen.current = false;
  context.state.setMicEnabled(false);
  context.stopListening();
  context.setCallState('error');
}
