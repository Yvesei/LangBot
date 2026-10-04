import { z } from 'zod';
import { MAX_MESSAGE_LENGTH } from '../config/limits';
import type { LanguageConfig } from '../schemas';

const transcriptSchema = z.object({ text: z.string().max(MAX_MESSAGE_LENGTH) });

const errorSchema = z.object({ error: z.string() });

export async function transcribeAudio(
  audio: Blob,
  config: LanguageConfig,
  signal: AbortSignal,
): Promise<string> {
  const response = await fetch('/api/transcribe', {
    method: 'POST',
    body: audio,
    signal,
    headers: {
      'Content-Type': audio.type,
      'X-Native-Language': config.nativeLanguage,
      'X-Target-Language': config.targetLanguage,
    },
  });

  const responseBody: unknown = await response.json();

  if (!response.ok) {
    const parsedError = errorSchema.safeParse(responseBody);

    if (parsedError.success) {
      throw new Error(parsedError.data.error);
    }

    throw new Error('Transcription failed. Please try again.');
  }

  const transcript = transcriptSchema.safeParse(responseBody);

  if (!transcript.success) {
    throw new Error('Transcription returned an invalid response. Please try again.');
  }

  const text = transcript.data.text.trim();

  if (!text) {
    throw new Error('I didn’t catch that. Please try again.');
  }

  return text;
}
