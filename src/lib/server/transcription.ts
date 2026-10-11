import { z } from 'zod';
import { MAX_MESSAGE_LENGTH } from '../config/limits';
import { LANGUAGES, type LanguageConfig } from '../schemas';
import { ApiError } from './errors';
import { parseCompletionResponse } from './mistral-response';
import { transcriptionPrompt } from './prompts';

const transcriptSchema = z.object({
  text: z.string().trim().max(MAX_MESSAGE_LENGTH),
  languages: z.array(z.string().min(2).max(20)).max(12),
});

type Transcript = z.infer<typeof transcriptSchema>;

interface TranscriptionOptions {
  apiKey: string;
  audio: Uint8Array;
  config: LanguageConfig;
  signal: AbortSignal;
}

function buildRequestBody(options: TranscriptionOptions) {
  return {
    model: process.env.MISTRAL_TRANSCRIPTION_MODEL || 'voxtral-small-latest',
    temperature: 0,
    max_tokens: 1200,
    messages: [
      {
        role: 'system',
        content: transcriptionPrompt(options.config),
      },
      {
        role: 'user',
        content: [
          {
            type: 'input_audio',
            input_audio: Buffer.from(options.audio).toString('base64'),
          },
        ],
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'transcript',
        strict: true,
        schema: z.toJSONSchema(transcriptSchema),
      },
    },
  };
}

function getResponseError(status: number) {
  return status === 429
    ? new ApiError(429, 'Mistral’s voice limit has been reached. Try again later.')
    : new ApiError(503, 'Voice transcription is unavailable. Please try again.');
}

async function requestTranscription(options: TranscriptionOptions) {
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildRequestBody(options)),
    signal: options.signal,
    cache: 'no-store',
  });

  if (!response.ok) {
    await response.body?.cancel();
    throw getResponseError(response.status);
  }

  return (await parseCompletionResponse(response, transcriptSchema)).data;
}

function validateTranscript(data: Transcript, config: LanguageConfig): string {
  const allowedLanguages = [config.nativeLanguage, config.targetLanguage];
  const hasOtherLanguage = data.languages.some((language) => {
    return !allowedLanguages.some((allowed) => allowed === language);
  });

  if (hasOtherLanguage) {
    throw new ApiError(
      422,
      `Please speak ${LANGUAGES[config.nativeLanguage]} or ${LANGUAGES[config.targetLanguage]}, or change your language settings.`,
    );
  }

  if (!data.text || data.languages.length === 0) {
    throw new ApiError(422, 'I didn’t catch that. Please try again.');
  }

  return data.text;
}

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
