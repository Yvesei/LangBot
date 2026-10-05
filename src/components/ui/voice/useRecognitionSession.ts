import { useEffect } from 'react';
import { canRecord, RecordedRecognition } from '@/lib/voice/recognition';
import { configureRecognition, detachRecognition } from './recognition-handlers';
import {
  getUnavailableReason,
  type CallState,
  type VoiceCallProps,
} from './voice-call-types';
import type { VoiceCallState } from './useVoiceCallState';

interface RecognitionSessionOptions {
  state: VoiceCallState;
  props: VoiceCallProps;
  setCallState: (state: CallState) => void;
  startListening: () => void;
  stopListening: () => void;
  stopSpeaking: () => void;
  submitTranscript: (text: string) => void;
}

function prepareSession(options: RecognitionSessionOptions) {
  const { state, props, setCallState } = options;
  const isSecureConnection = window.isSecureContext !== false;
  const isRecordingAvailable = isSecureConnection && canRecord();
  const hasSpeechPlayback = Boolean(
    window.speechSynthesis && typeof SpeechSynthesisUtterance !== 'undefined',
  );
  state.setSpeakerAvailable(hasSpeechPlayback);
  state.setUnavailableReason(getUnavailableReason(isSecureConnection));
  state.setIsRecordingSupported(isRecordingAvailable);
  state.setSessionStart(props.messages.length);
  state.lastSpokenId.current =
    [...props.messages].reverse().find((message) => message.role === 'assistant')?.id ??
    null;
  state.shouldListen.current = true;
  state.setMicEnabled(true);
  state.setSpeakerEnabled(hasSpeechPlayback);
  state.setVoiceError('');
  state.setInterimTranscript('');
  setCallState(isRecordingAvailable ? 'starting' : 'error');
  state.closeButton.current?.focus();
  return isRecordingAvailable;
}

export function useRecognitionSession(options: RecognitionSessionOptions) {
  const { state, props } = options;

  useEffect(() => {
    if (!props.open) {
      return;
    }
    state.isOpen.current = true;
    if (!prepareSession(options)) {
      return () => {
        state.isOpen.current = false;
      };
    }
    const recognition = new RecordedRecognition(props.config);
    configureRecognition({
      ...options,
      recognition,
    });
    state.recognition.current = recognition;
    options.startListening();

    return () => {
      state.isOpen.current = false;
      state.shouldListen.current = false;
      detachRecognition(recognition);
      options.stopListening();
      state.recognition.current = null;
      state.recognitionActive.current = false;
      options.stopSpeaking();
    };
    // A call keeps the language it started with. Changing languages closes it in Page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.open]);
}
