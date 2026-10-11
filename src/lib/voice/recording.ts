import {
  AUDIO_BIT_RATE,
  MAX_RECORDING_BYTES,
  RECORDER_CHUNK_INTERVAL_MS,
} from './recording-constants';
import type { RecordingMonitor } from './recording-monitor';

const RECORDING_FORMATS = [
  'audio/ogg;codecs=opus',
  'audio/mp4',
  'audio/webm;codecs=opus',
];

interface RecorderOptions {
  recorder: MediaRecorder;
  isCurrent: () => boolean;
  fail: (error: string, message?: string) => void;
  finish: (audio: Blob) => void;
}

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

function getSupportedRecordingType(): string | undefined {
  return RECORDING_FORMATS.find((format) => MediaRecorder.isTypeSupported(format));
}

function configureRecorder(options: RecorderOptions) {
  const chunks: Blob[] = [];
  let bytes = 0;

  options.recorder.ondataavailable = (event) => {
    if (!options.isCurrent()) {
      return;
    }
    bytes += event.data.size;
    if (bytes > MAX_RECORDING_BYTES) {
      options.fail('size', 'That recording was too large. Try a shorter turn.');
      return;
    }
    if (event.data.size) {
      chunks.push(event.data);
    }
  };

  options.recorder.onerror = () => options.fail('audio-capture');

  options.recorder.onstop = () => {
    if (!options.isCurrent()) {
      return;
    }
    options.finish(new Blob(chunks, { type: options.recorder.mimeType }));
  };
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
