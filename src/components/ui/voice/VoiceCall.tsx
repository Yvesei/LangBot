'use client';

import type { VoiceCallProps } from './voice-call-types';
import { useRecognitionSession } from './hooks/useRecognitionSession';
import { useSpeechPlayback } from './hooks/useSpeechPlayback';
import { useVoiceActions } from './hooks/useVoiceActions';
import { useVoiceCallState } from './hooks/useVoiceCallState';
import { useVoiceEffects } from './hooks/useVoiceEffects';
import { VoiceCallView } from './dialog/VoiceCallView';

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
