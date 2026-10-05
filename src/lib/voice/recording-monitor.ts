import { measureVolume } from './audio';
import {
  ANALYSER_WINDOW_SIZE,
  MAX_RECORDING_DURATION_MS,
  MIN_SPEECH_VOLUME,
  SILENCE_STOP_DELAY_MS,
  VOLUME_CHECK_INTERVAL_MS,
} from './recording-constants';

interface MonitorOptions {
  generation: number;
  stop: () => void;
  fail: (generation: number, error: string, message?: string) => void;
}

export class RecordingMonitor {
  private stream: MediaStream | null = null;
  private context: AudioContext | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;

  attach(stream: MediaStream) {
    this.stream = stream;
  }

  release() {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.timer = null;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    void this.context?.close().catch(() => undefined);
    this.context = null;
  }

  start(stream: MediaStream, options: MonitorOptions) {
    const analyser = this.createAnalyser(stream);
    const samples = new Uint8Array(ANALYSER_WINDOW_SIZE);
    const started = Date.now();
    let lastSound = started;
    let heardSpeech = false;
    this.timer = setInterval(() => {
      if (analyser && this.context?.state === 'running') {
        analyser.getByteTimeDomainData(samples);
        if (measureVolume(samples) > MIN_SPEECH_VOLUME) {
          lastSound = Date.now();
          heardSpeech = true;
        }
      }
      this.stopExpired(options, started, heardSpeech, lastSound);
    }, VOLUME_CHECK_INTERVAL_MS);
  }

  private createAnalyser(stream: MediaStream) {
    try {
      this.context = new AudioContext();
      void this.context.resume().catch(() => undefined);
      const analyser = this.context.createAnalyser();
      analyser.fftSize = ANALYSER_WINDOW_SIZE;
      this.context.createMediaStreamSource(stream).connect(analyser);
      return analyser;
    } catch {
      return null;
    }
  }

  private stopExpired(
    options: MonitorOptions,
    started: number,
    heardSpeech: boolean,
    lastSound: number,
  ) {
    if (heardSpeech && Date.now() - lastSound > SILENCE_STOP_DELAY_MS) {
      options.stop();
      return;
    }
    if (Date.now() - started <= MAX_RECORDING_DURATION_MS) {
      return;
    }
    if (!heardSpeech && this.context?.state === 'running') {
      options.fail(
        options.generation,
        'silence',
        'I didn’t hear anything. Try speaking closer to your microphone.',
      );
      return;
    }
    options.stop();
  }
}
