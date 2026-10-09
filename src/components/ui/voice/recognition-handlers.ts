import { getRecognitionErrorMessage } from '@/lib/voice/messages';
import type { RecordedRecognition } from '@/lib/voice/recognition';
import {
  appendTranscriptSegments,
  RECOGNITION_RESTART_DELAY_MS,
  type CallState,
} from './voice-call-types';
import type { VoiceCallState } from './useVoiceCallState';

export interface RecognitionContext {
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

export function configureRecognition(context: RecognitionContext) {
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

export function detachRecognition(recognition: RecordedRecognition) {
  recognition.onstart = null;
  recognition.onresult = null;
  recognition.onerror = null;
  recognition.onend = null;
  recognition.onprocessing = null;
}
