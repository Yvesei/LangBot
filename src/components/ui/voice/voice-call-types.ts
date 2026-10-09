import type { ChatMessage } from '@/lib/types';
import { LANGUAGES, type LanguageConfig } from '@/lib/schemas';
import type { RecognitionEvent } from '@/lib/voice/recognition';

export const MAX_VOICE_MESSAGE_LENGTH = 2000;
export const RECOGNITION_RESTART_DELAY_MS = 250;

export type VoiceMessage = ChatMessage & { replyTo?: string };
export type CallState =
  | 'starting'
  | 'listening'
  | 'transcribing'
  | 'thinking'
  | 'speaking'
  | 'paused'
  | 'error';

export interface VoiceCallProps {
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

export const LOCALES: Record<keyof typeof LANGUAGES, string> = {
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

const STATUS_LABELS: Record<CallState, string> = {
  starting: 'Starting microphone…',
  listening: 'Listening…',
  transcribing: 'Transcribing your words…',
  thinking: 'LangBot is thinking…',
  speaking: 'LangBot is speaking…',
  paused: 'Microphone paused',
  error: 'Voice paused',
};

export function getCallStatusLabel(state: CallState) {
  return STATUS_LABELS[state];
}

export function getSpeechText(text: string) {
  return text
    .replace(/[`*_#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function appendTranscriptSegments(
  event: RecognitionEvent,
  finalTranscript: { current: string },
) {
  let interimText = '';
  for (let index = event.resultIndex; index < event.results.length; index++) {
    const recognitionResult = event.results[index];
    const text = recognitionResult[0]?.transcript ?? '';
    if (recognitionResult.isFinal) {
      finalTranscript.current = `${finalTranscript.current} ${text}`.trim();
    } else {
      interimText += text;
    }
  }
  return interimText;
}

export function getUnavailableReason(isSecureConnection: boolean) {
  if (!isSecureConnection) {
    return 'Microphone access needs a secure connection. Open http://localhost:3000 on this computer, or use an HTTPS address.';
  }
  return 'Microphone recording is unavailable. Check browser permissions, or open this page directly instead of inside another app.';
}
