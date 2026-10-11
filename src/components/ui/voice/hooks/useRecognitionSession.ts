import { useEffect } from 'react';
import { getRecognitionErrorMessage } from '@/lib/voice/messages';
import { canRecord, RecordedRecognition } from '@/lib/voice/recognition';
import {
  appendTranscriptSegments,
  getUnavailableReason,
  RECOGNITION_RESTART_DELAY_MS,
  type CallState,
  type VoiceCallProps,
} from '../voice-call-types';
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

interface RecognitionContext {
  state: VoiceCallState;
  recognition: RecordedRecognition;
  setCallState: (state: CallState) => void;
  startListening: () => void;
  submitTranscript: (text: string) => void;
}

function handleRecognitionEnd(context: RecognitionContext) {
  const { state } = context;
  if (
    !state.isOpen.current ||
    !state.shouldListen.current ||
    !state.recognitionActive.current
  ) {
    return;
  }
  state.recognitionActive.current = false;
  const text = state.finalTranscript.current.trim();
  state.finalTranscript.current = '';
  state.setInterimTranscript('');
  if (text) {
    context.submitTranscript(text);
    return;
  }
  const shouldRestart =
    state.isOpen.current &&
    state.shouldListen.current &&
    !state.isRequestBusy.current &&
    state.callStateRef.current !== 'speaking';
  if (shouldRestart) {
    state.restartTimer.current = setTimeout(
      context.startListening,
      RECOGNITION_RESTART_DELAY_MS,
    );
  }
}

function configureRecognition(context: RecognitionContext) {
  const { recognition, state, setCallState } = context;

  recognition.onprocessing = () => {
    if (state.isOpen.current) {
      setCallState('transcribing');
    }
  };

  recognition.onstart = () => {
    if (!state.isOpen.current || !state.shouldListen.current) {
      recognition.abort();
      return;
    }
    state.recognitionActive.current = true;
    setCallState('listening');
  };

  recognition.onresult = (event) => {
    if (
      !state.isOpen.current ||
      !state.shouldListen.current ||
      !state.recognitionActive.current
    ) {
      return;
    }
    const interimText = appendTranscriptSegments(event, state.finalTranscript);
    state.setInterimTranscript(`${state.finalTranscript.current} ${interimText}`.trim());
  };

  recognition.onerror = (event) => {
    if (event.error === 'aborted' || event.error === 'no-speech') {
      return;
    }
    state.recognitionActive.current = false;
    state.finalTranscript.current = '';
    state.shouldListen.current = false;
    state.setMicEnabled(false);
    setCallState('error');
    state.setVoiceError(getRecognitionErrorMessage(event));
  };

  recognition.onend = () => handleRecognitionEnd(context);
}

function detachRecognition(recognition: RecordedRecognition) {
  recognition.onstart = null;
  recognition.onresult = null;
  recognition.onerror = null;
  recognition.onend = null;
  recognition.onprocessing = null;
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
