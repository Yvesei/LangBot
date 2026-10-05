'use client';

import {
  endVoiceCall,
  listenAgain,
  showRequestError,
  toggleMicrophone,
  toggleSpeaker,
  type VoiceActionContext,
} from './voice-actions';
import type { VoiceCallProps } from './voice-call-types';
import { useListeningControls } from './useListeningControls';
import { useRecognitionSession } from './useRecognitionSession';
import { useSpeechPlayback } from './useSpeechPlayback';
import { useTranscriptSubmission } from './useTranscriptSubmission';
import { useCallStateControl, useStopSpeaking } from './useVoiceControls';
import { useVoiceCallState } from './useVoiceCallState';
import { useVoiceEffects } from './useVoiceEffects';
import { VoiceCallView } from './VoiceCallView';

export function VoiceCall(props: VoiceCallProps) {
  const state = useVoiceCallState(props);
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

  useRecognitionSession({
    ...context,
    submitTranscript,
  });
  useSpeechPlayback(context);
  useVoiceEffects({
    state,
    props,
    stopListening,
    stopSpeaking,
    setErrorState: showRequestError.bind(null, context),
    endCall: actions.close,
  });

  return (
    <VoiceCallView
      state={state}
      props={props}
      actions={actions}
    />
  );
}
