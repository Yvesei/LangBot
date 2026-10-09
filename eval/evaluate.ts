import type { EvaluationCase, EvaluationVariant } from './config';
import { VARIANTS } from './config';
import { runCase } from './run-case';
import type { EvaluationPrices, EvaluationRow } from './types';

function delay() {
  return new Promise((resolve) => setTimeout(resolve, 1000));
}

function orderedVariants(index: number, repetition: number): EvaluationVariant[] {
  return (index + repetition) % 2 ? [...VARIANTS].reverse() : [...VARIANTS];
}

async function evaluateCase(
  item: EvaluationCase,
  index: number,
  repetition: number,
  prices: EvaluationPrices,
) {
  const rows: EvaluationRow[] = [];
  for (const variant of orderedVariants(index, repetition)) {
    rows.push(await runCase(item, variant, repetition, prices));
    await delay();
  }
  return rows;
}

async function evaluateRepetition(
  cases: EvaluationCase[],
  repetition: number,
  prices: EvaluationPrices,
) {
  const rows: EvaluationRow[] = [];
  for (const [index, item] of cases.entries()) {
    rows.push(...(await evaluateCase(item, index, repetition, prices)));
  }
  return rows;
}

export async function evaluate(
  cases: EvaluationCase[],
  repeat: number,
  prices: EvaluationPrices,
) {
  const rows: EvaluationRow[] = [];
  for (let repetition = 0; repetition < repeat; repetition++) {
    rows.push(...(await evaluateRepetition(cases, repetition, prices)));
  }
  return rows;
}
