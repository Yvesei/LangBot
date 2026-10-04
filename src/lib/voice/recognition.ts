import { getTranscriptionErrorMessage } from './messages';
import { getSupportedRecordingType, measureVolume } from './audio';
import { transcribeAudio } from '../api/transcribe';
import type { LanguageConfig } from '../schemas';

const MAX_RECORDING_BYTES = 2 * 1024 * 1024;
const AUDIO_BIT_RATE = 64000;
const RECORDER_CHUNK_INTERVAL_MS = 250;
const ANALYSER_WINDOW_SIZE = 2048;
const MIN_SPEECH_VOLUME = 0.018;
const SILENCE_STOP_DELAY_MS = 1400;
const MAX_RECORDING_DURATION_MS = 30000;
const VOLUME_CHECK_INTERVAL_MS = 100;
const TRANSCRIPTION_TIMEOUT_MS = 35000;

export type RecognitionEvent = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      length: number;
      [index: number]: { transcript: string };
    };
  };
};
export type Recognition = {
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string; message?: string }) => void) | null;
  onend: (() => void) | null;
};

export function canRecord() {
  return (
    typeof navigator.mediaDevices?.getUserMedia === 'function' &&
    typeof MediaRecorder !== 'undefined'
  );
}

// Audio stays in memory and is discarded after each turn or cancellation.
export class RecordedRecognition implements Recognition {
  onstart: Recognition['onstart'] = null;
  onresult: Recognition['onresult'] = null;
  onerror: Recognition['onerror'] = null;
  onend: Recognition['onend'] = null;
  onprocessing: (() => void) | null = null;
  private generation = 0;
  private busy = false;
  private recorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private context: AudioContext | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private upload: AbortController | null = null;

  constructor(private config: LanguageConfig) {}

  start = () => {
    if (this.busy) {
      return;
    }
    this.busy = true;
    void this.record(++this.generation);
  };

  stop = () => {
    if (this.recorder?.state === 'recording') {
      this.recorder.stop();
    }
  };

  abort = () => {
    this.generation++;
    this.busy = false;
    this.upload?.abort();
    this.upload = null;
    if (this.recorder) {
      this.recorder.onstop = null;
      this.recorder.ondataavailable = null;
      this.recorder.onerror = null;
      if (this.recorder.state === 'recording') {
        this.recorder.stop();
      }
    }
    this.recorder = null;
    this.release();
  };

  private release() {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.timer = null;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    void this.context?.close().catch(() => undefined);
    this.context = null;
  }

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

  private configureRecorderCallbacks(recorder: MediaRecorder, generation: number) {
    const chunks: Blob[] = [];
    let bytes = 0;
    recorder.ondataavailable = (event) => {
      if (generation !== this.generation) {
        return;
      }
      bytes += event.data.size;
      if (bytes > MAX_RECORDING_BYTES) {
        this.fail(
          generation,
          'size',
          'That recording was too large. Try a shorter turn.',
        );
        return;
      }
      if (event.data.size) {
        chunks.push(event.data);
      }
    };
    recorder.onerror = () => this.fail(generation, 'audio-capture');
    recorder.onstop = () => {
      if (generation !== this.generation) {
        return;
      }
      this.release();
      this.recorder = null;
      this.onprocessing?.();
      void this.transcribe(new Blob(chunks, { type: recorder.mimeType }), generation);
    };
  }

  private createVolumeAnalyser(stream: MediaStream): AnalyserNode | null {
    let analyser: AnalyserNode | null = null;
    try {
      this.context = new AudioContext();
      void this.context.resume().catch(() => undefined);
      analyser = this.context.createAnalyser();
      analyser.fftSize = ANALYSER_WINDOW_SIZE;
      this.context.createMediaStreamSource(stream).connect(analyser);
    } catch {
      /* use explicit send or the 30-second turn limit */
    }
    return analyser;
  }

  private monitorSilence(stream: MediaStream, generation: number) {
    // Stop after a short pause. The send-turn button also works when Web Audio
    // is unavailable or suspended by autoplay settings.
    const analyser = this.createVolumeAnalyser(stream);
    const samples = new Uint8Array(ANALYSER_WINDOW_SIZE);
    const started = Date.now();
    let lastSound = started;
    let heardSpeech = false;
    this.timer = setInterval(() => {
      if (analyser && this.context?.state === 'running') {
        analyser.getByteTimeDomainData(samples);
        const volume = measureVolume(samples);
        if (volume > MIN_SPEECH_VOLUME) {
          lastSound = Date.now();
          heardSpeech = true;
        }
      }
      this.stopExpiredRecording(generation, started, heardSpeech, lastSound);
    }, VOLUME_CHECK_INTERVAL_MS);
  }

  private stopExpiredRecording(
    generation: number,
    started: number,
    heardSpeech: boolean,
    lastSound: number,
  ) {
    if (heardSpeech && Date.now() - lastSound > SILENCE_STOP_DELAY_MS) {
      this.stop();
      return;
    }
    const hasReachedTurnLimit = Date.now() - started > MAX_RECORDING_DURATION_MS;
    if (!hasReachedTurnLimit) {
      return;
    }
    // Avoid uploading a silent recording when silence detection is active.
    if (!heardSpeech && this.context?.state === 'running') {
      this.fail(
        generation,
        'silence',
        'I didn’t hear anything. Try speaking closer to your microphone.',
      );
      return;
    }
    this.stop();
  }

  private async record(generation: number) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      if (generation !== this.generation) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      this.stream = stream;
      const mimeType = getSupportedRecordingType();
      if (!mimeType) {
        this.fail(
          generation,
          'format',
          'This browser cannot record a supported audio format.',
        );
        return;
      }
      const recorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: AUDIO_BIT_RATE,
      });
      this.recorder = recorder;
      this.configureRecorderCallbacks(recorder, generation);
      recorder.start(RECORDER_CHUNK_INTERVAL_MS);
      this.onstart?.();
      this.monitorSilence(stream, generation);
    } catch (error) {
      this.fail(
        generation,
        error instanceof Error && error.name === 'NotAllowedError'
          ? 'not-allowed'
          : 'audio-capture',
      );
    }
  }

  private async transcribe(audio: Blob, generation: number) {
    const controller = new AbortController();
    this.upload = controller;
    const timer = setTimeout(() => controller.abort(), TRANSCRIPTION_TIMEOUT_MS);
    try {
      const text = await transcribeAudio(audio, this.config, controller.signal);

      if (generation !== this.generation) {
        return;
      }

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
    } catch (error) {
      this.fail(
        generation,
        'transcription',
        getTranscriptionErrorMessage(error, controller.signal),
      );
    } finally {
      clearTimeout(timer);
      if (this.upload === controller) {
        this.upload = null;
      }
    }
  }
}
