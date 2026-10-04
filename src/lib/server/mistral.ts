import { z } from 'zod';
import { ApiError } from './errors';
import { parseCompletionResponse } from './mistral-response';
import { getRetryDelay, waitForRetry } from './retry';
import type { MistralMessage } from '../types/mistral';

const PROVIDER_TIMEOUT_MS = 25000;
const MAX_ATTEMPTS = 2;
const MAX_RETRY_DELAY_MS = 2000;
const RETRYABLE_STATUSES = [429, 502, 503, 504];

function getRateLimitError(response: Response): ApiError {
  const delay = getRetryDelay(response.headers.get('retry-after'));

  return new ApiError(
    429,
    'The Mistral API rate limit has been reached. Check your Studio limits or try again later.',
    Math.max(1, Math.ceil(delay / 1000)),
  );
}

function assertRetryDelayAllowed(response: Response, delay: number) {
  if (delay > MAX_RETRY_DELAY_MS) {
    if (response.status === 429) {
      throw getRateLimitError(response);
    }
    throw new ApiError(
      503,
      'The AI service is busy. Please try again shortly.',
      Math.ceil(delay / 1000),
    );
  }
}

function getProviderResponseError(response: Response): ApiError {
  if (response.status === 429) {
    return getRateLimitError(response);
  }
  return new ApiError(
    503,
    'The AI service is temporarily unavailable. Please try again.',
  );
}

function getProviderError(error: unknown, signal: AbortSignal): ApiError {
  if (error instanceof ApiError) {
    return error;
  }
  if (signal.aborted) {
    return new ApiError(504, 'The request timed out or was cancelled. Please retry.');
  }
  return new ApiError(502, 'Could not reach the AI service. Please retry.');
}

export async function complete<Schema extends z.ZodType>(
  schema: Schema,
  name: string,
  messages: MistralMessage[],
  callerSignal: AbortSignal,
  maxTokens = 2200,
) {
  const completion = await completeWithMetrics(
    schema,
    name,
    messages,
    callerSignal,
    maxTokens,
  );

  return completion.data;
}

export async function completeWithMetrics<Schema extends z.ZodType>(
  schema: Schema,
  name: string,
  messages: MistralMessage[],
  callerSignal: AbortSignal,
  maxTokens = 2200,
) {
  const apiKey = process.env.MISTRAL_API_KEY;

  if (!apiKey) {
    throw new ApiError(503, 'The AI service is not configured.');
  }

  const deadline = AbortSignal.timeout(PROVIDER_TIMEOUT_MS);
  const signal = AbortSignal.any([deadline, callerSignal]);
  const startedAt = Date.now();
  const model = process.env.MISTRAL_MODEL || 'ministral-8b-latest';

  const requestBody = {
    model,
    messages,
    temperature: 0,
    max_tokens: maxTokens,
    stream: false,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name,
        strict: true,
        schema: z.toJSONSchema(schema),
      },
    },
  };

  try {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        signal,
        cache: 'no-store',
        headers: {
          Authorization: 'Bearer ' + apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const canRetry = attempt < MAX_ATTEMPTS - 1;
      const shouldRetry = canRetry && RETRYABLE_STATUSES.includes(response.status);

      if (shouldRetry) {
        const delay = getRetryDelay(response.headers.get('retry-after'));
        await response.body?.cancel();
        assertRetryDelayAllowed(response, delay);
        await waitForRetry(delay, signal);
        continue;
      }

      if (!response.ok) {
        await response.body?.cancel();
        throw getProviderResponseError(response);
      }

      const completion = await parseCompletionResponse(response, schema);
      const metrics = {
        model: completion.model || model,
        latencyMs: Date.now() - startedAt,
        usage: completion.usage,
        attempts: attempt + 1,
      };

      console.info(
        JSON.stringify({
          event: 'ai_completion',
          task: name,
          ...metrics,
        }),
      );

      return {
        data: completion.data,
        metrics,
      };
    }

    throw new ApiError(503, 'The AI service is busy.');
  } catch (error) {
    throw getProviderError(error, signal);
  }
}
