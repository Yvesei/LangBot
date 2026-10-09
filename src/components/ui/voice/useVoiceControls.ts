import { useCallback } from 'react';
import type { CallState } from './voice-call-types';
import type { VoiceCallState } from './useVoiceCallState';

export function useCallStateControl(state: VoiceCallState) {
  return useCallback(
    (nextState: CallState) => {
      state.callStateRef.current = nextState;
      state.setCallStateValue(nextState);
    },
    [state],
  );
}

export function useStopSpeaking(state: VoiceCallState) {
  return useCallback(() => {
    if (state.activeSpeech.current) {
      state.activeSpeech.current.onstart = null;
      state.activeSpeech.current.onend = null;
      state.activeSpeech.current.onerror = null;
      state.activeSpeech.current = null;
    }
    window.speechSynthesis?.cancel();
  }, [state.activeSpeech]);
}
