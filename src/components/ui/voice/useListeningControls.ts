import { useCallback } from 'react';
import type { CallState } from './voice-call-types';
import type { VoiceCallState } from './useVoiceCallState';

function cannotStartListening(state: VoiceCallState) {
  return (
    !state.isOpen.current ||
    !state.shouldListen.current ||
    state.isRequestBusy.current ||
    state.recognitionActive.current ||
    state.callStateRef.current === 'speaking' ||
    !state.recognition.current
  );
}

export function useListeningControls(
  state: VoiceCallState,
  setCallState: (state: CallState) => void,
) {
  const stopListening = useCallback(() => {
    if (state.restartTimer.current) {
      clearTimeout(state.restartTimer.current);
    }
    state.restartTimer.current = null;
    state.finalTranscript.current = '';
    state.setInterimTranscript('');
    state.recognitionActive.current = false;
    try {
      state.recognition.current?.abort();
    } catch {
      // The recognition instance is already stopped.
    }
  }, [state]);

  const startListening = useCallback(() => {
    if (cannotStartListening(state)) {
      return;
    }
    state.setVoiceError('');
    try {
      state.recognitionActive.current = true;
      state.recognition.current?.start();
    } catch {
      state.recognitionActive.current = false;
      state.shouldListen.current = false;
      state.setMicEnabled(false);
      setCallState('error');
      state.setVoiceError(
        'The microphone could not be started. Check your browser permissions and try again.',
      );
    }
  }, [state, setCallState]);

  return {
    startListening,
    stopListening,
  };
}
