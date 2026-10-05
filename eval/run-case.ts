import { tutorOutputSchema, validateCorrection } from '../src/lib/schemas';
import { completeWithMetrics } from '../src/lib/server/mistral';
import type { EvaluationCase, EvaluationVariant } from './config';
import { getSystemPrompt } from './prompt';
import type { EvaluationPrices, EvaluationRow } from './types';

interface CaseContext {
  item: EvaluationCase;
  variant: EvaluationVariant;
  repetition: number;
  prices: EvaluationPrices;
  started: number;
}

function getBase(context: CaseContext) {
  const { item, variant, repetition } = context;
  return {
    id: item.id,
    variant,
    repetition,
    targetLanguage: item.languageConfig.targetLanguage,
    input: item.input,
    accepted: item.accepted,
    expectedChange: !item.accepted.includes(item.input),
    protectedCheck: item.preserve.length > 0,
  };
}

async function requestCompletion(context: CaseContext) {
  const { item, variant } = context;
  return completeWithMetrics(
    tutorOutputSchema,
    `eval_${variant}`,
    [
      {
        role: 'system',
        content: getSystemPrompt(item, variant),
      },
      {
        role: 'user',
        content: JSON.stringify({ learnerMessage: item.input, learningFocus: [] }),
      },
    ],
    new AbortController().signal,
  );
}

async function completeCase(context: CaseContext): Promise<EvaluationRow> {
  const { item, prices } = context;
  const { data, metrics } = await requestCompletion(context);
  const estimatedUsd =
    metrics.usage && prices.input !== null && prices.output !== null
      ? (metrics.usage.prompt_tokens * prices.input +
          metrics.usage.completion_tokens * prices.output) /
        1e6
      : null;
  return {
    ...getBase(context),
    completed: true,
    output: data,
    error: null,
    model: metrics.model,
    usage: metrics.usage,
    latencyMs: metrics.latencyMs,
    estimatedUsd,
    changed: data.correction.correctedText !== item.input,
    exactMatch: item.accepted.includes(data.correction.correctedText),
    preserved: item.preserve.every((text) =>
      data.correction.correctedText.includes(text),
    ),
    consistent: validateCorrection(item.input, data.correction),
  };
}

function failedCase(context: CaseContext, error: unknown): EvaluationRow {
  return {
    ...getBase(context),
    completed: false,
    output: null,
    error: error instanceof Error ? error.message : 'Request failed',
    model: null,
    usage: null,
    estimatedUsd: null,
    latencyMs: Date.now() - context.started,
    changed: null,
    exactMatch: false,
    preserved: false,
    consistent: false,
  };
}

export async function runCase(
  item: EvaluationCase,
  variant: EvaluationVariant,
  repetition: number,
  prices: EvaluationPrices,
) {
  const context = { item, variant, repetition, prices, started: Date.now() };
  try {
    return await completeCase(context);
  } catch (error) {
    return failedCase(context, error);
  }
}
