import { getSupportedRecordingType } from './audio';
import { AUDIO_BIT_RATE, RECORDER_CHUNK_INTERVAL_MS } from './recording-constants';
import type { RecordingMonitor } from './recording-monitor';
import { configureRecorder } from './recording-recorder';

interface StartRecordingOptions {
  generation: number;
  isCurrent: () => boolean;
  monitor: RecordingMonitor;
  stop: () => void;
  setRecorder: (recorder: MediaRecorder) => void;
  onStart: () => void;
  finish: (recorder: MediaRecorder, audio: Blob) => void;
  fail: (error: string, message?: string) => void;
}

export async function startRecording(options: StartRecordingOptions) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    if (!options.isCurrent()) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    options.monitor.attach(stream);
    const mimeType = getSupportedRecordingType();
    if (!mimeType) {
      options.fail('format', 'This browser cannot record a supported audio format.');
      return;
    }
    const recorder = new MediaRecorder(stream, {
      mimeType,
      audioBitsPerSecond: AUDIO_BIT_RATE,
    });
    options.setRecorder(recorder);
    configureRecorder({
      recorder,
      isCurrent: options.isCurrent,
      fail: options.fail,

      finish: (audio) => options.finish(recorder, audio),
    });
    recorder.start(RECORDER_CHUNK_INTERVAL_MS);
    options.onStart();
    options.monitor.start(stream, {
      generation: options.generation,
      stop: options.stop,

      fail: (generation, error, message) => options.fail(error, message),
    });
  } catch (error) {
    options.fail(
      error instanceof Error && error.name === 'NotAllowedError'
        ? 'not-allowed'
        : 'audio-capture',
    );
  }
}
