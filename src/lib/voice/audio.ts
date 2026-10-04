const RECORDING_FORMATS = [
  'audio/ogg;codecs=opus',
  'audio/mp4',
  'audio/webm;codecs=opus',
];

export function getSupportedRecordingType(): string | undefined {
  return RECORDING_FORMATS.find((format) => MediaRecorder.isTypeSupported(format));
}

export function measureVolume(samples: Uint8Array): number {
  let sumOfSquares = 0;

  for (const sample of samples) {
    const normalizedSample = (sample - 128) / 128;
    sumOfSquares += normalizedSample * normalizedSample;
  }

  const meanSquare = sumOfSquares / samples.length;
  return Math.sqrt(meanSquare);
}
