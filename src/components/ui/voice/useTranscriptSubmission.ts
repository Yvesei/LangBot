import { MAX_VOICE_MESSAGE_LENGTH, type CallState } from './voice-call-types';
import type { VoiceCallState } from './useVoiceCallState';

export function useTranscriptSubmission(
  state: VoiceCallState,
  setCallState: (state: CallState) => void,
) {
  return (text: string) => {
    if (text.length > MAX_VOICE_MESSAGE_LENGTH) {
      state.shouldListen.current = false;
      state.setMicEnabled(false);
      setCallState('error');
      state.setVoiceError('That was too long to send. Please speak in shorter turns.');
      return;
    }
    setCallState('thinking');
    state.isRequestBusy.current = true;
    state.onSendRef.current(text);
  };
}
