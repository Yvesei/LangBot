import type { LanguageConfig } from '../schemas';
import { RecordingMonitor } from './recording-monitor';
import { RecordingTranscriber } from './recording-transcriber';
import type { Recognition } from './recognition-types';
import { startRecording } from './start-recording';

export class RecordedRecognition implements Recognition {
  onstart: Recognition['onstart'] = null;
  onresult: Recognition['onresult'] = null;
  onerror: Recognition['onerror'] = null;
  onend: Recognition['onend'] = null;
  onprocessing: (() => void) | null = null;
  private generation = 0;
  private busy = false;
  private recorder: MediaRecorder | null = null;
  private monitor = new RecordingMonitor();
  private transcriber = new RecordingTranscriber();

  constructor(private config: LanguageConfig) {}

  start = () => {
    if (this.busy) {
      return;
    }
    this.busy = true;
    const generation = ++this.generation;
    void startRecording({
      generation,

      isCurrent: () => generation === this.generation,
      monitor: this.monitor,
      stop: this.stop,

      setRecorder: (recorder) => {
        this.recorder = recorder;
      },

      onStart: () => this.onstart?.(),

      finish: (recorder, audio) => this.finishRecording(recorder, generation, audio),

      fail: (error, message) => this.fail(generation, error, message),
    });
  };

  stop = () => {
    if (this.recorder?.state === 'recording') {
      this.recorder.stop();
    }
  };

  abort = () => {
    this.generation++;
    this.busy = false;
    this.transcriber.abort();
    if (this.recorder) {
      this.recorder.onstop = null;
      this.recorder.ondataavailable = null;
      this.recorder.onerror = null;
      if (this.recorder.state === 'recording') {
        this.recorder.stop();
      }
    }
    this.recorder = null;
    this.monitor.release();
  };

  private fail(generation: number, error: string, message?: string) {
    if (generation !== this.generation) {
      return;
    }
    this.abort();
    this.onerror?.({
      error,
      message,
    });
    this.onend?.();
  }

  private finishRecording(recorder: MediaRecorder, generation: number, audio: Blob) {
    this.monitor.release();
    this.recorder = null;
    this.onprocessing?.();
    void this.transcriber.transcribe({
      audio,
      config: this.config,

      isCurrent: () => generation === this.generation,

      complete: (text) => this.completeTranscription(text),

      fail: (message) => this.fail(generation, 'transcription', message),
    });
  }

  private completeTranscription(text: string) {
    this.busy = false;
    this.onresult?.({
      resultIndex: 0,
      results: {
        length: 1,
        0: {
          isFinal: true,
          length: 1,
          0: { transcript: text },
        },
      },
    });
    this.onend?.();
  }
}
