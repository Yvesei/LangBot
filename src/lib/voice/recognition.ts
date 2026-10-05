export type { Recognition, RecognitionEvent } from './recognition-types';
export { RecordedRecognition } from './recorded-recognition';

export function canRecord() {
  return (
    typeof navigator.mediaDevices?.getUserMedia === 'function' &&
    typeof MediaRecorder !== 'undefined'
  );
}
