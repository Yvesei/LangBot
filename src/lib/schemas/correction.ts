import { z } from 'zod';
import { MAX_MESSAGE_LENGTH } from '../config/limits';
import { languageConfigSchema, levelSchema } from './language';

export const exerciseSchema = z
  .object({
    instruction: z.string().min(1).max(400),
    sentence: z.string().min(1).max(500),
    answer: z.string().min(1).max(500),
  })
  .strict();

const correctionIssueSchema = z
  .object({
    category: z.enum(['grammar', 'spelling', 'punctuation']),
    explanation: z.string().min(1).max(500),
  })
  .strict();

export const correctionSchema = z
  .object({
    correctedText: z.string().min(1).max(4000),
    issues: z.array(correctionIssueSchema).max(6),
    exercise: exerciseSchema.nullable(),
  })
  .strict();

export const correctionRequestSchema = z
  .object({
    content: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
    languageConfig: languageConfigSchema,
    userLevel: levelSchema,
  })
  .strict();

export type Correction = z.infer<typeof correctionSchema>;
export type Exercise = z.infer<typeof exerciseSchema>;

export function validateCorrection(original: string, correction: Correction): boolean {
  const sentenceChanged = original !== correction.correctedText;
  const hasIssues = correction.issues.length > 0;
  const hasExercise = correction.exercise !== null;

  if (sentenceChanged) {
    return hasIssues;
  }

  return !hasIssues && !hasExercise;
}
