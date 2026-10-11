import { useCallback } from 'react';
import {
  MAX_VOICE_MESSAGE_LENGTH,
  type CallState,
  type VoiceCallProps,
} from './voice-call-types';
import type { VoiceCallState } from './useVoiceCallState';

interface VoiceActionContext {
  state: VoiceCallState;
  props: VoiceCallProps;
  setCallState: (state: CallState) => void;
  startListening: () => void;
  stopListening: () => void;
  stopSpeaking: () => void;
}

function toggleMicrophone(context: VoiceActionContext) {
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

function toggleSpeaker(context: VoiceActionContext) {
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

function endVoiceCall(context: VoiceActionContext) {
  context.state.isOpen.current = false;
  context.state.shouldListen.current = false;
  context.stopListening();
  context.stopSpeaking();
  context.props.onClose();
}

function listenAgain(context: VoiceActionContext) {
  context.props.onClearError();
  context.state.shouldListen.current = true;
  context.state.setMicEnabled(true);
  context.state.setVoiceError('');
  context.setCallState('starting');
  context.startListening();
}

function showRequestError(context: VoiceActionContext) {
  context.state.shouldListen.current = false;
  context.state.setMicEnabled(false);
  context.stopListening();
  context.setCallState('error');
}

function useCallStateControl(state: VoiceCallState) {
  return useCallback(
    (nextState: CallState) => {
      state.callStateRef.current = nextState;
      state.setCallStateValue(nextState);
    },
    [state],
  );
}

function useStopSpeaking(state: VoiceCallState) {
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

function useListeningControls(
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

function useTranscriptSubmission(
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

export function useVoiceActions(state: VoiceCallState, props: VoiceCallProps) {
  const setCallState = useCallStateControl(state);
  const stopSpeaking = useStopSpeaking(state);
  const { startListening, stopListening } = useListeningControls(state, setCallState);
  const submitTranscript = useTranscriptSubmission(state, setCallState);
  const context: VoiceActionContext = {
    state,
    props,
    setCallState,
    startListening,
    stopListening,
    stopSpeaking,
  };
  const actions = {
    close: endVoiceCall.bind(null, context),
    listenAgain: listenAgain.bind(null, context),
    toggleMicrophone: toggleMicrophone.bind(null, context),
    toggleSpeaker: toggleSpeaker.bind(null, context),
  };

  return {
    context,
    actions,
    submitTranscript,
    setErrorState: showRequestError.bind(null, context),
  };
}
