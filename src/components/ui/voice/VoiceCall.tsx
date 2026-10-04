'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUp,
  Mic,
  MicOff,
  PhoneOff,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { ChatMessage } from '@/lib/types';
import { LANGUAGES, type LanguageConfig } from '@/lib/schemas';
import { CorrectionDiff } from '@/components/ui/chat/CorrectionDiff';
import { getListeningHint, getRecognitionErrorMessage } from '@/lib/voice/messages';
import {
  canRecord,
  RecordedRecognition,
  type Recognition,
} from '@/lib/voice/recognition';

type VoiceMessage = ChatMessage & { replyTo?: string };
type CallState =
  | 'starting'
  | 'listening'
  | 'transcribing'
  | 'thinking'
  | 'speaking'
  | 'paused'
  | 'error';

const LOCALES: Record<keyof typeof LANGUAGES, string> = {
  en: 'en-US',
  fr: 'fr-FR',
  es: 'es-ES',
  de: 'de-DE',
  it: 'it-IT',
  pt: 'pt-PT',
  ru: 'ru-RU',
  ja: 'ja-JP',
  ko: 'ko-KR',
  zh: 'zh-CN',
  ar: 'ar-SA',
  hi: 'hi-IN',
};

function readableStatus(state: CallState) {
  if (state === 'listening') {
    return 'Listening…';
  }
  if (state === 'thinking') {
    return 'LangBot is thinking…';
  }
  if (state === 'transcribing') {
    return 'Transcribing your words…';
  }
  if (state === 'speaking') {
    return 'LangBot is speaking…';
  }
  if (state === 'paused') {
    return 'Microphone paused';
  }
  if (state === 'error') {
    return 'Voice paused';
  }
  return 'Starting microphone…';
}

function speechText(text: string) {
  return text
    .replace(/[`*_#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getUnavailableReason(secure: boolean): string {
  if (!secure) {
    return 'Microphone access needs a secure connection. Open http://localhost:3000 on this computer, or use an HTTPS address.';
  }

  return 'Microphone recording is unavailable. Check browser permissions, or open this page directly instead of inside another app.';
}

interface VoiceCallProps {
  open: boolean;
  config: LanguageConfig;
  messages: VoiceMessage[];
  loading: boolean;
  error: string;
  onSend: (text: string) => void;
  onRetry: (message: VoiceMessage) => void;
  onClearError: () => void;
  onClose: () => void;
}

export function VoiceCall({
  open,
  config,
  messages,
  loading,
  error,
  onSend,
  onRetry,
  onClearError,
  onClose,
}: VoiceCallProps) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [callState, setCallState] = useState<CallState>('starting');
  const [micEnabled, setMicEnabled] = useState(true);
  const [speakerEnabled, setSpeakerEnabled] = useState(true);
  const [speakerAvailable, setSpeakerAvailable] = useState(true);
  const [unavailableReason, setUnavailableReason] = useState('');
  const [interim, setInterim] = useState('');
  const [voiceError, setVoiceError] = useState('');
  const [sessionStart, setSessionStart] = useState(0);
  const recognition = useRef<Recognition | null>(null);
  const recognitionActive = useRef(false);
  const finalTranscript = useRef('');
  const shouldListen = useRef(true);
  const isOpen = useRef(open);
  const isBusy = useRef(loading);
  const stateRef = useRef<CallState>('starting');
  const lastSpokenId = useRef<string | null>(null);
  const restartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const transcriptEnd = useRef<HTMLDivElement>(null);
  const onSendRef = useRef(onSend);
  const previousFocus = useRef<HTMLElement | null>(null);
  const activeSpeech = useRef<SpeechSynthesisUtterance | null>(null);

  const stopSpeaking = useCallback(() => {
    if (activeSpeech.current) {
      activeSpeech.current.onstart = null;
      activeSpeech.current.onend = null;
      activeSpeech.current.onerror = null;
      activeSpeech.current = null;
    }
    window.speechSynthesis?.cancel();
  }, []);

  const setState = useCallback((next: CallState) => {
    stateRef.current = next;
    setCallState(next);
  }, []);

  const stopListening = useCallback(() => {
    if (restartTimer.current) {
      clearTimeout(restartTimer.current);
    }
    restartTimer.current = null;
    finalTranscript.current = '';
    setInterim('');
    recognitionActive.current = false;
    try {
      recognition.current?.abort();
    } catch {
      /* already stopped */
    }
  }, []);

  const startListening = useCallback(() => {
    if (
      !isOpen.current ||
      !shouldListen.current ||
      isBusy.current ||
      recognitionActive.current ||
      stateRef.current === 'speaking' ||
      !recognition.current
    ) {
      return;
    }
    setVoiceError('');
    try {
      recognitionActive.current = true;
      recognition.current.start();
    } catch {
      recognitionActive.current = false;
      shouldListen.current = false;
      setMicEnabled(false);
      setState('error');
      setVoiceError(
        'The microphone could not be started. Check your browser permissions and try again.',
      );
    }
  }, [setState]);

  useEffect(() => {
    isBusy.current = loading;
  }, [loading]);
  useEffect(() => {
    onSendRef.current = onSend;
  }, [onSend]);
  useEffect(() => {
    if (!open) {
      return;
    }
    previousFocus.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
      previousFocus.current?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    isOpen.current = true;
    const secure = window.isSecureContext !== false;
    const available = secure && canRecord();
    const playback = Boolean(
      window.speechSynthesis && typeof SpeechSynthesisUtterance !== 'undefined',
    );
    setSpeakerAvailable(playback);
    setUnavailableReason(getUnavailableReason(secure));
    setSupported(available);
    setSessionStart(messages.length);
    lastSpokenId.current =
      [...messages].reverse().find((message) => message.role === 'assistant')?.id ?? null;
    shouldListen.current = true;
    setMicEnabled(true);
    setSpeakerEnabled(playback);
    setVoiceError('');
    setInterim('');
    setState(available ? 'starting' : 'error');
    closeButton.current?.focus();

    if (!available) {
      return () => {
        isOpen.current = false;
      };
    }
    const instance = new RecordedRecognition(config);
    instance.onprocessing = () => {
      if (isOpen.current) {
        setState('transcribing');
      }
    };
    instance.onstart = () => {
      if (!isOpen.current || !shouldListen.current) {
        instance.abort();
        return;
      }
      recognitionActive.current = true;
      setState('listening');
    };
    instance.onresult = (event) => {
      if (!isOpen.current || !shouldListen.current || !recognitionActive.current) {
        return;
      }
      let live = '';
      for (let index = event.resultIndex; index < event.results.length; index++) {
        const result = event.results[index];
        const text = result[0]?.transcript ?? '';
        if (result.isFinal) {
          finalTranscript.current = `${finalTranscript.current} ${text}`.trim();
        } else {
          live += text;
        }
      }
      setInterim(`${finalTranscript.current} ${live}`.trim());
    };
    instance.onerror = (event) => {
      if (event.error === 'aborted' || event.error === 'no-speech') {
        return;
      }
      recognitionActive.current = false;
      finalTranscript.current = '';
      shouldListen.current = false;
      setMicEnabled(false);
      setState('error');
      setVoiceError(getRecognitionErrorMessage(event));
    };
    instance.onend = () => {
      if (!isOpen.current || !shouldListen.current || !recognitionActive.current) {
        return;
      }
      recognitionActive.current = false;
      const text = finalTranscript.current.trim();
      finalTranscript.current = '';
      setInterim('');
      if (text) {
        if (text.length > 2000) {
          shouldListen.current = false;
          setMicEnabled(false);
          setState('error');
          setVoiceError('That was too long to send. Please speak in shorter turns.');
          return;
        }
        setState('thinking');
        isBusy.current = true;
        onSendRef.current(text);
        return;
      }
      if (
        isOpen.current &&
        shouldListen.current &&
        !isBusy.current &&
        stateRef.current !== 'speaking'
      ) {
        restartTimer.current = setTimeout(startListening, 250);
      }
    };
    recognition.current = instance;
    startListening();

    return () => {
      isOpen.current = false;
      shouldListen.current = false;
      instance.onstart = null;
      instance.onresult = null;
      instance.onerror = null;
      instance.onend = null;
      instance.onprocessing = null;
      stopListening();
      recognition.current = null;
      recognitionActive.current = false;
      stopSpeaking();
    };
    // A call keeps the language it started with. Changing languages closes it in Page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || !error) {
      return;
    }
    shouldListen.current = false;
    setMicEnabled(false);
    stopListening();
    setState('error');
  }, [error, open, setState, stopListening]);

  useEffect(() => {
    if (!open || loading || !supported) {
      return;
    }
    const latest = [...messages.slice(sessionStart)]
      .reverse()
      .find((message) => message.role === 'assistant');
    if (!latest || latest.id === lastSpokenId.current) {
      return;
    }
    lastSpokenId.current = latest.id;
    if (!speakerEnabled || !speakerAvailable) {
      setState(micEnabled ? 'starting' : 'paused');
      if (micEnabled) {
        startListening();
      }
      return;
    }
    setState('speaking');
    stopListening();
    stopSpeaking();
    const utterance = new SpeechSynthesisUtterance(speechText(latest.content));
    activeSpeech.current = utterance;
    utterance.lang = LOCALES[config.targetLanguage];
    const language = utterance.lang.toLowerCase().split('-')[0];
    utterance.voice =
      window.speechSynthesis
        .getVoices()
        .find((voice) => voice.lang.toLowerCase().startsWith(language)) ?? null;
    utterance.onstart = () => {
      if (isOpen.current && activeSpeech.current === utterance) {
        setState('speaking');
      }
    };
    utterance.onend = () => {
      if (!isOpen.current || activeSpeech.current !== utterance) {
        return;
      }
      activeSpeech.current = null;
      setState(shouldListen.current ? 'starting' : 'paused');
      if (shouldListen.current) {
        startListening();
      }
    };
    utterance.onerror = () => {
      if (!isOpen.current || activeSpeech.current !== utterance) {
        return;
      }
      activeSpeech.current = null;
      setState(shouldListen.current ? 'starting' : 'paused');
      if (shouldListen.current) {
        startListening();
      }
      setVoiceError('The spoken reply could not be played. You can still read it below.');
    };
    setState('speaking');
    window.speechSynthesis.speak(utterance);
  }, [
    config.targetLanguage,
    loading,
    messages,
    micEnabled,
    open,
    sessionStart,
    speakerEnabled,
    speakerAvailable,
    supported,
    setState,
    startListening,
    stopListening,
    stopSpeaking,
  ]);

  useEffect(() => {
    if (!open) {
      return;
    }
    transcriptEnd.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
  }, [interim, messages, open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        isOpen.current = false;
        shouldListen.current = false;
        stopListening();
        stopSpeaking();
        onClose();
        return;
      }
      if (event.key !== 'Tab') {
        return;
      }
      const focusable = [
        ...(dialog.current?.querySelectorAll<HTMLElement>(
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
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, open, stopListening, stopSpeaking]);

  const sessionMessages = useMemo(
    () => (supported === null ? [] : messages.slice(sessionStart)),
    [messages, sessionStart, supported],
  );

  function toggleMicrophone() {
    const next = !micEnabled;
    setMicEnabled(next);
    shouldListen.current = next;
    if (!next) {
      stopListening();
      if (stateRef.current !== 'speaking') {
        setState(loading ? 'thinking' : 'paused');
      }
    } else {
      onClearError();
      setVoiceError('');
      if (stateRef.current === 'speaking') {
        return;
      }
      setState(loading ? 'thinking' : 'starting');
      if (!loading) {
        startListening();
      }
    }
  }

  function toggleSpeaker() {
    const next = !speakerEnabled;
    setSpeakerEnabled(next);
    if (!next && stateRef.current === 'speaking') {
      stopSpeaking();
      setState(micEnabled ? 'starting' : 'paused');
      if (micEnabled) {
        startListening();
      }
    }
  }

  function endCall() {
    isOpen.current = false;
    shouldListen.current = false;
    stopListening();
    stopSpeaking();
    onClose();
  }

  function handleListenAgain() {
    onClearError();
    shouldListen.current = true;
    setMicEnabled(true);
    setVoiceError('');
    setState('starting');
    startListening();
  }

  if (!open) {
    return null;
  }

  return (
    <div
      ref={dialog}
      className="voice-dialog fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-call-title"
    >
      <div className="mx-auto flex h-full max-w-6xl flex-col px-4 py-4 sm:px-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h2
              id="voice-call-title"
              className="text-lg font-semibold"
            >
              Voice call with LangBot
            </h2>
            <p className="text-sm text-slate-400">
              {LANGUAGES[config.nativeLanguage]} + {LANGUAGES[config.targetLanguage]} ·
              Mix both as you speak
            </p>
          </div>
          <button
            ref={closeButton}
            type="button"
            onClick={endCall}
            className="rounded-full border border-white/20 p-3 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            aria-label="End voice call"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {supported === false ? (
          <div className="m-auto max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
            <MicOff className="mx-auto h-10 w-10 text-slate-400" />
            <h3 className="mt-4 text-xl font-semibold">
              Voice calls aren’t available in this browser
            </h3>
            <p className="mt-2 text-sm text-slate-300">{unavailableReason}</p>
            <button
              type="button"
              onClick={endCall}
              className="mt-6 rounded-full bg-white px-5 py-2.5 font-medium text-slate-950"
            >
              Back to chat
            </button>
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto py-5 lg:grid-cols-[minmax(280px,0.8fr)_minmax(360px,1.2fr)] lg:overflow-hidden">
            <section className="flex min-h-[300px] flex-col items-center justify-center p-6 text-center">
              <div
                className="voice-orb"
                data-state={callState}
                aria-hidden="true"
              >
                <div />
              </div>
              <p
                className="mt-8 text-lg font-medium"
                role="status"
                aria-live="polite"
              >
                {readableStatus(callState)}
              </p>
              <p
                className="mt-3 min-h-14 max-w-md text-pretty text-slate-300"
                lang={config.targetLanguage}
                dir="auto"
              >
                {interim || getListeningHint(callState === 'listening')}
              </p>
              <p className="mt-2 max-w-xs text-xs leading-5 text-slate-400">
                Audio is sent to Mistral. Your words appear after each turn, in either
                selected language.
              </p>
              {!speakerAvailable && (
                <p className="mt-2 text-xs text-slate-400">
                  Spoken playback is unavailable. Replies will appear in the transcript.
                </p>
              )}
              {callState === 'listening' && (
                <button
                  type="button"
                  onClick={() => recognition.current?.stop()}
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm"
                  aria-label="Send spoken turn"
                >
                  <ArrowUp size={16} /> Send turn
                </button>
              )}
              {(voiceError || error) && (
                <div
                  className="mt-4 max-w-md"
                  role="alert"
                >
                  <p className="text-sm text-rose-300">{voiceError || error}</p>
                  {!loading && (
                    <button
                      type="button"
                      onClick={handleListenAgain}
                      className="mt-2 inline-flex items-center gap-2 text-sm underline"
                    >
                      <RotateCcw className="h-4 w-4" /> Listen again
                    </button>
                  )}
                </div>
              )}
              <div className="mt-8 flex items-center gap-4">
                <button
                  type="button"
                  onClick={toggleMicrophone}
                  className="rounded-full border border-white/15 bg-white/10 p-4 hover:bg-white/15"
                  aria-label={micEnabled ? 'Mute microphone' : 'Unmute microphone'}
                >
                  {micEnabled ? (
                    <Mic className="h-5 w-5" />
                  ) : (
                    <MicOff className="h-5 w-5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={endCall}
                  className="rounded-full bg-rose-600 p-5 hover:bg-rose-500"
                  aria-label="End voice call"
                >
                  <PhoneOff className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={toggleSpeaker}
                  disabled={!speakerAvailable}
                  className="rounded-full border border-white/15 bg-white/10 p-4 hover:bg-white/15"
                  aria-label={
                    speakerEnabled ? 'Mute spoken replies' : 'Play spoken replies'
                  }
                >
                  {speakerEnabled ? (
                    <Volume2 className="h-5 w-5" />
                  ) : (
                    <VolumeX className="h-5 w-5" />
                  )}
                </button>
              </div>
            </section>

            <section
              className="flex min-h-[360px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] lg:min-h-0"
              aria-label="Call transcript"
            >
              <div className="border-b border-white/10 px-5 py-4">
                <h3 className="font-semibold">Live transcript</h3>
                <p className="text-xs text-slate-400">
                  Your words, inline corrections, and LangBot’s replies.
                </p>
              </div>
              <div
                className="flex-1 space-y-4 overflow-y-auto p-5"
                aria-live="polite"
              >
                {!sessionMessages.length && !interim && (
                  <p className="py-12 text-center text-sm text-slate-500">
                    Your conversation will appear here.
                  </p>
                )}
                {sessionMessages.map((message) => {
                  const changed =
                    message.role === 'user' &&
                    message.correction &&
                    message.correction.correctedText !== message.content;
                  return (
                    <article
                      key={message.id}
                      className={
                        message.role === 'user'
                          ? 'ml-auto max-w-[88%]'
                          : 'mr-auto max-w-[88%]'
                      }
                    >
                      <p className="mb-1 text-xs text-slate-500">
                        {message.role === 'user' ? 'You said' : 'LangBot said'}
                      </p>
                      <div
                        className={
                          message.role === 'user'
                            ? 'py-3 [&_del]:text-red-400 [&_ins]:text-green-400'
                            : 'rounded-2xl rounded-bl-sm bg-white/5 px-4 py-3'
                        }
                        lang={config.targetLanguage}
                        dir="auto"
                      >
                        <p className="whitespace-pre-wrap">
                          {changed && message.correction ? (
                            <CorrectionDiff
                              original={message.content}
                              corrected={message.correction.correctedText}
                              language={config.targetLanguage}
                            />
                          ) : (
                            message.content
                          )}
                        </p>
                        {message.role === 'user' && message.correction === null && (
                          <p className="mt-2 text-xs text-slate-400">
                            Correction unavailable for this message.
                          </p>
                        )}
                        {message.status === 'pending' && (
                          <p className="mt-2 text-xs text-blue-100">
                            Checking your sentence…
                          </p>
                        )}
                      </div>
                      {message.status === 'failed' && (
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => onRetry(message)}
                          className="mt-2 text-xs text-rose-300 underline disabled:opacity-40"
                        >
                          Retry this turn
                        </button>
                      )}
                    </article>
                  );
                })}
                {interim && (
                  <article className="ml-auto max-w-[88%] opacity-70">
                    <p className="mb-1 text-xs text-slate-500">You’re saying</p>
                    <p
                      className="py-3 italic"
                      lang={config.targetLanguage}
                      dir="auto"
                    >
                      {interim}
                    </p>
                  </article>
                )}
                <div ref={transcriptEnd} />
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
