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
const calculateRate = (numerator: number, denominator: number) =>
  (denominator ? numerator / denominator : null);

export function summarize(scoredCases: ScoredCase[]) {
  const completedCases = scoredCases.filter((row) => row.completed);
  const unchangedCases = completedCases.filter((row) => !row.expectedChange);
  const errorCases = completedCases.filter((row) => row.expectedChange);
  const protectedCases = completedCases.filter((row) => row.protectedCheck);
  const detectedErrorCount = errorCases.filter((row) => row.changed).length;
  const unnecessaryEditCount = unchangedCases.filter((row) => row.changed).length;
  const sortedLatencies = scoredCases.map((row) => row.latencyMs).sort((firstLatency, secondLatency) => firstLatency - secondLatency);
  return {
    cases: scoredCases.length,
    completed: completedCases.length,
    completionRate: calculateRate(completedCases.length, scoredCases.length),
    // Conditional rates must be read together with completionRate.
    unnecessaryEditRate: calculateRate(unnecessaryEditCount, unchangedCases.length),
    errorDetectionRecall: calculateRate(detectedErrorCount, errorCases.length),
    errorDetectionPrecision: calculateRate(detectedErrorCount, detectedErrorCount + unnecessaryEditCount),
    referenceMatchRate: calculateRate(
      completedCases.filter((row) => row.exactMatch).length,
      completedCases.length,
    ),
    correctionReferenceMatchRate: calculateRate(
      errorCases.filter((row) => row.exactMatch).length,
      errorCases.length,
    ),
    endToEndReferencePassRate: calculateRate(
      scoredCases.filter(
        (row) => row.completed && row.exactMatch && row.consistent && row.preserved,
      ).length,
      scoredCases.length,
    ),
    protectedTextPreservationRate: calculateRate(
      protectedCases.filter((row) => row.preserved).length,
      protectedCases.length,
    ),
    consistencyRate: calculateRate(
      completedCases.filter((row) => row.consistent).length,
      completedCases.length,
    ),
    latencyP50Ms: sortedLatencies[Math.max(0, Math.ceil(sortedLatencies.length * 0.5) - 1)] ?? null,
    latencyP95Ms: sortedLatencies[Math.max(0, Math.ceil(sortedLatencies.length * 0.95) - 1)] ?? null,
  };
}
