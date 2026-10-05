import { ApiError } from './errors';
import { requestTranscription } from './transcription-request';
import { validateTranscript } from './transcription-validation';
import type { LanguageConfig } from '../schemas';

export async function transcribeRecording(
  audio: Uint8Array,
  config: LanguageConfig,
  callerSignal: AbortSignal,
): Promise<string> {
  const apiKey = process.env.MISTRAL_API_KEY;

  if (!apiKey) {
    throw new ApiError(503, 'The AI service is not configured.');
  }

  const signal = AbortSignal.any([callerSignal, AbortSignal.timeout(25000)]);

  try {
    const transcript = await requestTranscription({
      apiKey,
      audio,
      config,
      signal,
    });
    return validateTranscript(transcript, config);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (signal.aborted) {
      throw new ApiError(
        504,
        'Transcription timed out or was cancelled. Please try again.',
      );
    }

    throw new ApiError(502, 'Could not reach voice transcription. Please try again.');
  }
}
