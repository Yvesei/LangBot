import type { LanguageConfig } from '../schemas';
import { transcribeAudio } from '../api/transcribe';
import { getTranscriptionErrorMessage } from './messages';
import { TRANSCRIPTION_TIMEOUT_MS } from './recording-constants';

interface TranscriptionOptions {
  audio: Blob;
  config: LanguageConfig;
  isCurrent: () => boolean;
  complete: (text: string) => void;
  fail: (message: string) => void;
}

export class RecordingTranscriber {
  private upload: AbortController | null = null;

  abort() {
    this.upload?.abort();
    this.upload = null;
  }

  async transcribe(options: TranscriptionOptions) {
    const controller = new AbortController();
    this.upload = controller;
    const timer = setTimeout(() => controller.abort(), TRANSCRIPTION_TIMEOUT_MS);
    try {
      const text = await transcribeAudio(
        options.audio,
        options.config,
        controller.signal,
      );
      if (options.isCurrent()) {
        options.complete(text);
      }
    } catch (error) {
      options.fail(getTranscriptionErrorMessage(error, controller.signal));
    } finally {
      clearTimeout(timer);
      if (this.upload === controller) {
        this.upload = null;
      }
    }
  }
}
