import { z } from 'zod';
import { ApiError } from './errors';
import { requestCompletion } from './mistral-request';
import type { MistralMessage } from '../types/mistral';

const PROVIDER_TIMEOUT_MS = 25000;

function getProviderError(error: unknown, signal: AbortSignal): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (signal.aborted) {
    return new ApiError(504, 'The request timed out or was cancelled. Please retry.');
  }

  return new ApiError(502, 'Could not reach the AI service. Please retry.');
}

function logCompletion(name: string, metrics: object) {
  console.info(
    JSON.stringify({
      event: 'ai_completion',
      task: name,
      ...metrics,
    }),
  );
}

export async function complete<Schema extends z.ZodType>(
  ...parameters: [
    schema: Schema,
    name: string,
    messages: MistralMessage[],
    callerSignal: AbortSignal,
    maxTokens?: number,
  ]
) {
  return (await completeWithMetrics(...parameters)).data;
}

export async function completeWithMetrics<Schema extends z.ZodType>(
  ...parameters: [
    schema: Schema,
    name: string,
    messages: MistralMessage[],
    callerSignal: AbortSignal,
    maxTokens?: number,
  ]
) {
  const [schema, name, messages, callerSignal, maxTokens = 2200] = parameters;
  const apiKey = process.env.MISTRAL_API_KEY;

  if (!apiKey) {
    throw new ApiError(503, 'The AI service is not configured.');
  }

  const signal = AbortSignal.any([
    AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    callerSignal,
  ]);
  const startedAt = Date.now();
  const model = process.env.MISTRAL_MODEL || 'ministral-8b-latest';

  try {
    const { completion, attempts } = await requestCompletion({
      apiKey,
      model,
      name,
      messages,
      schema,
      signal,
      maxTokens,
    });
    const metrics = {
      model: completion.model || model,
      latencyMs: Date.now() - startedAt,
      usage: completion.usage,
      attempts,
    };
    logCompletion(name, metrics);
    return {
      data: completion.data,
      metrics,
    };
  } catch (error) {
    throw getProviderError(error, signal);
  }
}
