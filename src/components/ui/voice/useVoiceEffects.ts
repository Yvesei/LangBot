import { useEffect } from 'react';
import type { VoiceCallProps } from './voice-call-types';
import type { VoiceCallState } from './useVoiceCallState';

interface VoiceEffectsOptions {
  state: VoiceCallState;
  props: VoiceCallProps;
  stopListening: () => void;
  stopSpeaking: () => void;
  setErrorState: () => void;
  endCall: () => void;
}

function trapFocus(state: VoiceCallState, event: KeyboardEvent) {
  if (event.key !== 'Tab') {
    return;
  }
  const focusable = [
    ...(state.dialog.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), select:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ) ?? []),
  ].filter((element) => element.getClientRects().length > 0);
  if (!focusable.length) {
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export function useVoiceEffects(options: VoiceEffectsOptions) {
  const { state, props } = options;
  useEffect(() => {
    state.isRequestBusy.current = props.loading;
  }, [props.loading, state.isRequestBusy]);
  useEffect(() => {
    state.onSendRef.current = props.onSend;
  }, [props.onSend, state.onSendRef]);
  useEffect(() => {
    if (!props.open) {
      return;
    }
    state.previousFocus.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      state.previousFocus.current?.focus();
    };
  }, [props.open, state.previousFocus]);
  useEffect(() => {
    if (props.open && props.error) {
      options.setErrorState();
    }
  }, [options, props.error, props.open]);
  useEffect(() => {
    if (props.open) {
      state.transcriptEnd.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [props.messages, props.open, state.interimTranscript, state.transcriptEnd]);
  useEffect(() => {
    if (!props.open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        options.endCall();
        return;
      }
      trapFocus(state, event);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [options, props.open, state]);
}
