import { z } from 'zod';
import { ApiError } from './errors';
import { parseCompletionResponse } from './mistral-response';
import type { LanguageConfig } from '../schemas';
import { transcriptSchema } from './transcription-schema';
import { transcriptionPrompt } from './prompts';

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

export async function requestTranscription(options: TranscriptionOptions) {
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
