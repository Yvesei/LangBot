import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';
import {
  languageConfigSchema,
  levelSchema,
  tutorOutputSchema,
  validateCorrection,
} from '../src/lib/schemas';
import { completeWithMetrics } from '../src/lib/server/mistral';
import { learnerPrompt, tutorPrompt } from '../src/lib/server/prompts';
import { summarize, type ScoredCase } from './metrics';

const fixtureSchema = z
  .array(
    z.object({
      id: z.string(),
      input: z.string().min(1).max(2000),
      accepted: z.array(z.string().min(1)).min(1),
      languageConfig: languageConfigSchema,
      userLevel: levelSchema,
      tags: z.array(z.string()),
      preserve: z.array(z.string()),
    }),
  )
  .min(1)
  .max(100);
const baseline = `You are a friendly language tutor. Respond to the learner and correct their mistakes.
Return reply, correction (correctedText, issues with category and explanation, exercise with instruction/sentence/answer or null), and topics.
For unchanged text, issues is [] and exercise is null. For errors, give an explanation and one exercise.
Use the target language for the reply and native language for explanations. The last message is JSON; correct learnerMessage.`;

async function main() {
  dotenv.config({ path: '.env.local', quiet: true });
  const cases = fixtureSchema.parse(
    JSON.parse(await readFile(path.join(process.cwd(), 'eval/cases.json'), 'utf8')),
  );
  if (new Set(cases.map((item) => item.id)).size !== cases.length)
    throw new Error('Duplicate fixture IDs.');
  const variants = ['baseline', 'tutor'] as const;
  const repeat = Number(process.env.EVAL_REPEATS || 1);
  if (!Number.isInteger(repeat) || repeat < 1 || repeat > 3)
    throw new Error('EVAL_REPEATS must be 1–3.');
  if (!process.argv.includes('--live')) {
    console.log(
      `Validated ${cases.length} fixtures. No API calls made. --live runs ${cases.length * variants.length * repeat} logical requests (each can retry once).`,
    );
    return;
  }
  if (!process.env.MISTRAL_API_KEY)
    throw new Error('MISTRAL_API_KEY is required for --live.');
  function price(name: string) {
    const value = process.env[name];
    if (!value?.trim()) return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0)
      throw new Error(`${name} must be a nonnegative number.`);
    return parsed;
  }
  const inputPrice = price('EVAL_INPUT_USD_PER_MILLION'),
    outputPrice = price('EVAL_OUTPUT_USD_PER_MILLION');
  const rows: Array<
    ScoredCase & {
      id: string;
      variant: string;
      repetition: number;
      targetLanguage: string;
      input: string;
      accepted: string[];
      output: unknown;
      error: string | null;
      model: string | null;
      usage: { prompt_tokens: number; completion_tokens: number } | null;
      estimatedUsd: number | null;
    }
  > = [];
  const startedAt = new Date().toISOString();
  // Alternate order to reduce systematic provider-load bias.
  for (let repetition = 0; repetition < repeat; repetition++) {
    for (const [index, item] of cases.entries()) {
      const order = (index + repetition) % 2 ? [...variants].reverse() : [...variants];
      for (const variant of order) {
        const started = Date.now();
        const base = {
          id: item.id,
          variant,
          repetition,
          targetLanguage: item.languageConfig.targetLanguage,
          input: item.input,
          accepted: item.accepted,
          expectedChange: !item.accepted.includes(item.input),
          protectedCheck: item.preserve.length > 0,
        };
        try {
          const { data, metrics } = await completeWithMetrics(
            tutorOutputSchema,
            `eval_${variant}`,
            [
              {
                role: 'system',
                content:
                  variant === 'tutor'
                    ? tutorPrompt(item.languageConfig, item.userLevel)
                    : baseline +
                      '\n' +
                      learnerPrompt(item.languageConfig, item.userLevel),
              },
              {
                role: 'user',
                content: JSON.stringify({
                  learnerMessage: item.input,
                  learningFocus: [],
                }),
              },
            ],
            new AbortController().signal,
          );
          rows.push({
            ...base,
            completed: true,
            output: data,
            error: null,
            model: metrics.model,
            usage: metrics.usage,
            latencyMs: metrics.latencyMs,
            changed: data.correction.correctedText !== item.input,
            exactMatch: item.accepted.includes(data.correction.correctedText),
            preserved: item.preserve.every((text) =>
              data.correction.correctedText.includes(text),
            ),
            consistent: validateCorrection(item.input, data.correction),
            estimatedUsd:
              metrics.usage && inputPrice !== null && outputPrice !== null
                ? (metrics.usage.prompt_tokens * inputPrice +
                    metrics.usage.completion_tokens * outputPrice) /
                  1000000
                : null,
          });
        } catch (error) {
          rows.push({
            ...base,
            completed: false,
            output: null,
            error: error instanceof Error ? error.message : 'Request failed',
            model: null,
            usage: null,
            estimatedUsd: null,
            latencyMs: Date.now() - started,
            changed: null,
            exactMatch: false,
            preserved: false,
            consistent: false,
          });
        }
        // Keep the optional paid run sequential and modest.
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }
  const summaries = Object.fromEntries(
    variants.map((variant) => {
      const subset = rows.filter((row) => row.variant === variant);
      return [
        variant,
        {
          ...summarize(subset),
          estimatedUsd: subset.every((row) => row.estimatedUsd !== null)
            ? subset.reduce((n, row) => n + row.estimatedUsd!, 0)
            : null,
          byLanguage: Object.fromEntries(
            [...new Set(subset.map((row) => row.targetLanguage))].map((language) => [
              language,
              summarize(subset.filter((row) => row.targetLanguage === language)),
            ]),
          ),
        },
      ];
    }),
  );
  const report = {
    startedAt,
    finishedAt: new Date().toISOString(),
    configuredModel: process.env.MISTRAL_MODEL || 'ministral-8b-latest',
    pricing: { inputUsdPerMillion: inputPrice, outputUsdPerMillion: outputPrice },
    summaries,
    rows,
    limitations:
      'Small authored fixture set; exact references are not semantic correctness. Human review required. Token cost excludes unreported usage from failed attempts.',
  };
  await mkdir('eval/results', { recursive: true });
  const destination = `eval/results/${startedAt.replace(/[:.]/g, '-')}.json`;
  await writeFile(destination, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(summaries, null, 2));
  console.log(`Saved full outputs for human review to ${destination}`);
  if (rows.some((row) => !row.completed)) process.exitCode = 1;
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Evaluation failed');
  process.exitCode = 1;
});
