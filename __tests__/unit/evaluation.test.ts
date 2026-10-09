import { summarize } from '../../eval/metrics';

test('failed generations lower end-to-end scores rather than disappearing', () => {
  const base = {
    expectedChange: false,
    completed: true,
    changed: false,
    exactMatch: true,
    preserved: true,
    protectedCheck: false,
    consistent: true,
    latencyMs: 100,
  };
  const result = summarize([
    base,
    { ...base, completed: false, changed: null, exactMatch: false, latencyMs: 200 },
    { ...base, changed: true, exactMatch: false, latencyMs: 300 },
  ]);
  expect(result.completionRate).toBeCloseTo(2 / 3);
  expect(result.unnecessaryEditRate).toBe(0.5);
  expect(result.endToEndReferencePassRate).toBeCloseTo(1 / 3);
  expect(result.latencyP95Ms).toBe(300);
});
