import { useRef, useState } from 'react';
import type { Recognition } from '@/lib/voice/recognition';
import type { CallState, VoiceCallProps } from './voice-call-types';

function useVoiceDisplayState() {
  const [isRecordingSupported, setIsRecordingSupported] = useState<boolean | null>(null);
  const [callState, setCallStateValue] = useState<CallState>('starting');
  const [micEnabled, setMicEnabled] = useState(true);
  const [speakerEnabled, setSpeakerEnabled] = useState(true);
  const [speakerAvailable, setSpeakerAvailable] = useState(true);
  const [unavailableReason, setUnavailableReason] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [voiceError, setVoiceError] = useState('');
  const [sessionStart, setSessionStart] = useState(0);

  return {
    isRecordingSupported,
    setIsRecordingSupported,
    callState,
    setCallStateValue,
    micEnabled,
    setMicEnabled,
    speakerEnabled,
    setSpeakerEnabled,
    speakerAvailable,
    setSpeakerAvailable,
    unavailableReason,
    setUnavailableReason,
    interimTranscript,
    setInterimTranscript,
    voiceError,
    setVoiceError,
    sessionStart,
    setSessionStart,
  };
}

function useVoiceReferences(props: VoiceCallProps) {
  return {
    recognition: useRef<Recognition | null>(null),
    recognitionActive: useRef(false),
    finalTranscript: useRef(''),
    shouldListen: useRef(true),
    isOpen: useRef(props.open),
    isRequestBusy: useRef(props.loading),
    callStateRef: useRef<CallState>('starting'),
    lastSpokenId: useRef<string | null>(null),
    restartTimer: useRef<ReturnType<typeof setTimeout> | null>(null),
    dialog: useRef<HTMLDivElement>(null),
    closeButton: useRef<HTMLButtonElement>(null),
    transcriptEnd: useRef<HTMLDivElement>(null),
    onSendRef: useRef(props.onSend),
    previousFocus: useRef<HTMLElement | null>(null),
    activeSpeech: useRef<SpeechSynthesisUtterance | null>(null),
  };
}

export function useVoiceCallState(props: VoiceCallProps) {
  return {
    ...useVoiceDisplayState(),
    ...useVoiceReferences(props),
  };
}

export type VoiceCallState = ReturnType<typeof useVoiceCallState>;
