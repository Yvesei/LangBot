import type { ScoredCase } from './metrics';

export type EvaluationRow = ScoredCase & {
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
};

export interface EvaluationPrices {
  input: number | null;
  output: number | null;
}
