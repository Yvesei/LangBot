import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { languageConfigSchema, levelSchema } from '../src/lib/schemas';

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

export type EvaluationCase = z.infer<typeof fixtureSchema>[number];
export const VARIANTS = ['baseline', 'tutor'] as const;
export type EvaluationVariant = (typeof VARIANTS)[number];

export async function loadCases() {
  const cases = fixtureSchema.parse(
    JSON.parse(await readFile(path.join(process.cwd(), 'eval/cases.json'), 'utf8')),
  );
  if (new Set(cases.map((evaluationCase) => evaluationCase.id)).size !== cases.length) {
    throw new Error('Duplicate fixture IDs.');
  }
  return cases;
}

export function getRepeatCount() {
  const repeat = Number(process.env.EVAL_REPEATS || 1);
  if (!Number.isInteger(repeat) || repeat < 1 || repeat > 3) {
    throw new Error('EVAL_REPEATS must be 1–3.');
  }
  return repeat;
}

export function getPrice(name: string) {
  const value = process.env[name];
  if (!value?.trim()) {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${name} must be a nonnegative number.`);
  }
  return parsed;
}
