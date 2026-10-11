interface RecognitionError {
  error: string;
  message?: string;
}

export function getRecognitionErrorMessage(event: RecognitionError): string {
  if (event.message) {
    return event.message;
  }

  if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
    return 'Microphone permission was denied. Allow microphone access in your browser, then try again.';
  }

  if (event.error === 'audio-capture') {
    return 'No microphone is available. Check your device and browser settings.';
  }

  return 'Speech recognition stopped. Check your connection and try again.';
}

export function getTranscriptionErrorMessage(
  error: unknown,
  signal: AbortSignal,
): string {
  if (signal.aborted) {
    return 'Transcription timed out. Please try again.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Transcription failed. Please try again.';
}

export function getListeningHint(isListening: boolean): string {
  if (!isListening) {
    return '';
  }

  return 'Speak naturally. Pause to send, or tap the arrow.';
}
