'use client';

import type { VoiceCallProps } from './voice-call-types';
import { useRecognitionSession } from './useRecognitionSession';
import { useSpeechPlayback } from './useSpeechPlayback';
import { useVoiceActions } from './useVoiceActions';
import { useVoiceCallState } from './useVoiceCallState';
import { useVoiceEffects } from './useVoiceEffects';
import { VoiceCallView } from './VoiceCallView';

export function VoiceCall(props: VoiceCallProps) {
  const state = useVoiceCallState(props);
  const { context, actions, submitTranscript, setErrorState } = useVoiceActions(
    state,
    props,
  );

  useRecognitionSession({
    ...context,
    submitTranscript,
  });
  useSpeechPlayback(context);
  useVoiceEffects({
    state,
    props,
    stopListening: context.stopListening,
    stopSpeaking: context.stopSpeaking,
    setErrorState,
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
