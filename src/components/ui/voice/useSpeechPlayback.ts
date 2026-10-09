import { useEffect } from 'react';
import type { VoiceMessage, CallState, VoiceCallProps } from './voice-call-types';
import { getSpeechText, LOCALES } from './voice-call-types';
import type { VoiceCallState } from './useVoiceCallState';

interface SpeechOptions {
  state: VoiceCallState;
  props: VoiceCallProps;
  setCallState: (state: CallState) => void;
  startListening: () => void;
  stopListening: () => void;
  stopSpeaking: () => void;
}

function getLatestReply(options: SpeechOptions): VoiceMessage | undefined {
  return [...options.props.messages.slice(options.state.sessionStart)]
    .reverse()
    .find((message) => message.role === 'assistant');
}

function playReply(options: SpeechOptions, message: VoiceMessage) {
  const { state, props, setCallState } = options;
  setCallState('speaking');
  options.stopListening();
  options.stopSpeaking();
  const utterance = new SpeechSynthesisUtterance(getSpeechText(message.content));
  state.activeSpeech.current = utterance;
  utterance.lang = LOCALES[props.config.targetLanguage];
  const language = utterance.lang.toLowerCase().split('-')[0];
  utterance.voice =
    window.speechSynthesis
      .getVoices()
      .find((voice) => voice.lang.toLowerCase().startsWith(language)) ?? null;

  utterance.onstart = () => {
    if (state.isOpen.current && state.activeSpeech.current === utterance) {
      setCallState('speaking');
    }
  };

  function finishSpeaking() {
    if (!state.isOpen.current || state.activeSpeech.current !== utterance) {
      return false;
    }
    state.activeSpeech.current = null;
    setCallState(state.shouldListen.current ? 'starting' : 'paused');
    if (state.shouldListen.current) {
      options.startListening();
    }
    return true;
  }

  utterance.onend = () => {
    finishSpeaking();
  };

  utterance.onerror = () => {
    if (finishSpeaking()) {
      state.setVoiceError(
        'The spoken reply could not be played. You can still read it below.',
      );
    }
  };
  setCallState('speaking');
  window.speechSynthesis.speak(utterance);
}

export function useSpeechPlayback(options: SpeechOptions) {
  const { state, props, setCallState, startListening } = options;

  useEffect(() => {
    if (!props.open || props.loading || !state.isRecordingSupported) {
      return;
    }
    const latestReply = getLatestReply(options);
    if (!latestReply || latestReply.id === state.lastSpokenId.current) {
      return;
    }
    state.lastSpokenId.current = latestReply.id;
    if (!state.speakerEnabled || !state.speakerAvailable) {
      setCallState(state.micEnabled ? 'starting' : 'paused');
      if (state.micEnabled) {
        startListening();
      }
      return;
    }
    playReply(options, latestReply);
  }, [
    props.config.targetLanguage,
    props.loading,
    props.messages,
    props.open,
    state.isRecordingSupported,
    state.micEnabled,
    state.sessionStart,
    state.lastSpokenId,
    state.speakerAvailable,
    state.speakerEnabled,
    setCallState,
    startListening,
    options,
  ]);
}
