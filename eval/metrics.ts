export type ScoredCase = {
  expectedChange: boolean;
  completed: boolean;
  changed: boolean | null;
  exactMatch: boolean;
  preserved: boolean;
  protectedCheck: boolean;
  consistent: boolean;
  latencyMs: number;
};
const rate = (n: number, d: number) => (d ? n / d : null);

export function summarize(rows: ScoredCase[]) {
  const completed = rows.filter((row) => row.completed);
  const valid = completed.filter((row) => !row.expectedChange);
  const errors = completed.filter((row) => row.expectedChange);
  const protectedRows = completed.filter((row) => row.protectedCheck);
  const detected = errors.filter((row) => row.changed).length;
  const falsePositives = valid.filter((row) => row.changed).length;
  const latency = rows.map((row) => row.latencyMs).sort((a, b) => a - b);
  return {
    cases: rows.length,
    completed: completed.length,
    completionRate: rate(completed.length, rows.length),
    // Conditional rates must be read together with completionRate.
    unnecessaryEditRate: rate(falsePositives, valid.length),
    errorDetectionRecall: rate(detected, errors.length),
    errorDetectionPrecision: rate(detected, detected + falsePositives),
    referenceMatchRate: rate(
      completed.filter((row) => row.exactMatch).length,
      completed.length,
    ),
    correctionReferenceMatchRate: rate(
      errors.filter((row) => row.exactMatch).length,
      errors.length,
    ),
    endToEndReferencePassRate: rate(
      rows.filter(
        (row) => row.completed && row.exactMatch && row.consistent && row.preserved,
      ).length,
      rows.length,
    ),
    protectedTextPreservationRate: rate(
      protectedRows.filter((row) => row.preserved).length,
      protectedRows.length,
    ),
    consistencyRate: rate(
      completed.filter((row) => row.consistent).length,
      completed.length,
    ),
    latencyP50Ms: latency[Math.max(0, Math.ceil(latency.length * 0.5) - 1)] ?? null,
    latencyP95Ms: latency[Math.max(0, Math.ceil(latency.length * 0.95) - 1)] ?? null,
  };
}
