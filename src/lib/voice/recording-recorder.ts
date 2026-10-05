import { MAX_RECORDING_BYTES } from './recording-constants';

interface RecorderOptions {
  recorder: MediaRecorder;
  isCurrent: () => boolean;
  fail: (error: string, message?: string) => void;
  finish: (audio: Blob) => void;
}

export function configureRecorder(options: RecorderOptions) {
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
