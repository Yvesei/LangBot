import { mkdir, writeFile } from 'node:fs/promises';
import { VARIANTS } from './config';
import { summarize } from './metrics';
import type { EvaluationPrices, EvaluationRow } from './types';

function summarizeVariant(rows: EvaluationRow[], variant: string) {
  const subset = rows.filter((row) => row.variant === variant);
  const languages = [...new Set(subset.map((row) => row.targetLanguage))];
  return {
    ...summarize(subset),
    estimatedUsd: subset.every((row) => row.estimatedUsd !== null)
      ? subset.reduce((total, row) => total + row.estimatedUsd!, 0)
      : null,
    byLanguage: Object.fromEntries(
      languages.map((language) => [
        language,
        summarize(subset.filter((row) => row.targetLanguage === language)),
      ]),
    ),
  };
}

export async function writeReport(
  rows: EvaluationRow[],
  prices: EvaluationPrices,
  startedAt: string,
) {
  const summaries = Object.fromEntries(
    VARIANTS.map((variant) => [variant, summarizeVariant(rows, variant)]),
  );
  const report = {
    startedAt,
    finishedAt: new Date().toISOString(),
    configuredModel: process.env.MISTRAL_MODEL || 'ministral-8b-latest',
    pricing: { inputUsdPerMillion: prices.input, outputUsdPerMillion: prices.output },
    summaries,
    rows,
    limitations:
      'Small authored fixture set; exact references are not semantic correctness. Human review required. Token cost excludes unreported usage from failed attempts.',
  };
  await mkdir('eval/results', { recursive: true });
  const destination = `eval/results/${startedAt.replace(/[:.]/g, '-')}.json`;
  await writeFile(destination, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(summaries, null, 2));
  console.log(`Saved full outputs for human review to ${destination}`);
}
