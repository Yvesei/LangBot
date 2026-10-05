import { z } from 'zod';
import { ApiError } from './errors';
import { parseCompletionResponse } from './mistral-response';
import { getRetryDelay, waitForRetry } from './retry';
import type { MistralMessage } from '../types/mistral';

const MAX_ATTEMPTS = 2;
const MAX_RETRY_DELAY_MS = 2000;
const RETRYABLE_STATUSES = [429, 502, 503, 504];

interface RequestOptions<Schema extends z.ZodType> {
  apiKey: string;
  model: string;
  name: string;
  messages: MistralMessage[];
  schema: Schema;
  signal: AbortSignal;
  maxTokens: number;
}

function getRateLimitError(response: Response): ApiError {
  const delay = getRetryDelay(response.headers.get('retry-after'));
  return new ApiError(
    429,
    'The Mistral API rate limit has been reached. Check your Studio limits or try again later.',
    Math.max(1, Math.ceil(delay / 1000)),
  );
}

function assertRetryDelayAllowed(response: Response, delay: number) {
  if (delay <= MAX_RETRY_DELAY_MS) {
    return;
  }

  if (response.status === 429) {
    throw getRateLimitError(response);
  }

  throw new ApiError(
    503,
    'The AI service is busy. Please try again shortly.',
    Math.ceil(delay / 1000),
  );
}

function getResponseError(response: Response): ApiError {
  return response.status === 429
    ? getRateLimitError(response)
    : new ApiError(503, 'The AI service is temporarily unavailable. Please try again.');
}

function buildRequestBody<Schema extends z.ZodType>(options: RequestOptions<Schema>) {
  return {
    model: options.model,
    messages: options.messages,
    temperature: 0,
    max_tokens: options.maxTokens,
    stream: false,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: options.name,
        strict: true,
        schema: z.toJSONSchema(options.schema),
      },
    },
  };
}

async function getResponse<Schema extends z.ZodType>(options: RequestOptions<Schema>) {
  return fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    signal: options.signal,
    cache: 'no-store',
    headers: {
      Authorization: 'Bearer ' + options.apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildRequestBody(options)),
  });
}

export async function requestCompletion<Schema extends z.ZodType>(
  options: RequestOptions<Schema>,
) {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const response = await getResponse(options);
    const shouldRetry =
      attempt < MAX_ATTEMPTS - 1 && RETRYABLE_STATUSES.includes(response.status);

    if (shouldRetry) {
      const delay = getRetryDelay(response.headers.get('retry-after'));
      await response.body?.cancel();
      assertRetryDelayAllowed(response, delay);
      await waitForRetry(delay, options.signal);
      continue;
    }

    if (!response.ok) {
      await response.body?.cancel();
      throw getResponseError(response);
    }

    return {
      completion: await parseCompletionResponse(response, options.schema),
      attempts: attempt + 1,
    };
  }

  throw new ApiError(503, 'The AI service is busy.');
}
