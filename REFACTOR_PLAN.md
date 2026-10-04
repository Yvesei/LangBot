# Refactor plan

## Scope and decisions

- Treat the unstaged changes and untracked application/test/evaluation files present at the start as the requested scope; the template's paths, stack, layering, and reference examples were not filled in.
- Preserve the behavior of that working tree, not the older `main` implementation. It is saved as baseline commit `249714a` on `refactor/cleanup`.
- Follow the existing Next.js/React/TypeScript layout: routes validate requests, server modules call the provider, API clients validate responses, and components coordinate browser state.
- Do not modify dependencies, configuration, workflows, schemas, public signatures, prompts, markup, or styles. Existing changes to these files are included only in the recovery baseline commit.
- Every implementation file selected below already has coverage in the baseline suite. Add focused characterization tests before cleanup to protect exact diff output, response parsing, conversation limits, review grouping, and voice callbacks.
- Keep naming changes separate from function extractions. Each implementation step includes this plan's status update, so no step changes more than three files.
- Final review found an async-helper extraction could change which error wins when cancellation is queued immediately after JSON decoding. Add steps 13–14 to retain the baseline's await boundaries throughout the API client, provider retries, body reader, and shared limits. Step 13 changes two implementation files and one test file; record its plan status in step 14 to keep the three-file limit.

## Baseline and verification

- Tests: `pnpm run test:coverage` — PASS, 17 suites / 137 tests.
- Lint: `pnpm run lint` — PASS.
- Types: `pnpm run typecheck` — PASS when run sequentially after the build. The initial concurrent run failed on disappearing `.next/types` files.
- Build: `pnpm run build` — PASS outside the sandbox. The initial sandbox attempt failed because the Turbopack CSS worker could not bind a local port.
- Evaluation: `pnpm eval` — PASS, 28 fixtures validated, no API calls.
- For each step run full tests, lint, build, then type checking after build-generated types settle. Tests and lint can run together; build/type checking stay sequential.
- Step 6's first build/type run failed on duplicate generated declarations in `.next/types/routes.d 2.ts` and `routes.d 3.ts`. Move the ignored generated copies into `/tmp/chatbot-refactor-generated-conflicts` and retry once; do not change source configuration.
- If a check fails, allow one targeted correction and retry. If it still fails, reset only the fully committed current step to the preceding commit, record SKIPPED here, and continue. Stop after two consecutive reverted steps.

## Ordered steps

1. **DONE — Name diff and completion-parsing values precisely.** Files: `src/lib/diff.ts`, `src/lib/server/mistral-response.ts`, `REFACTOR_PLAN.md`. Only rename internal variables.
2. **DONE — Name review and limit-store values precisely.** Files: `src/lib/review.ts`, `src/lib/server/limits.ts`, `REFACTOR_PLAN.md`. Only rename internal variables/functions; keep response property names.
3. **DONE — Name page and voice-call values precisely.** Files: `src/app/page.tsx`, `src/components/ui/voice/VoiceCall.tsx`, `REFACTOR_PLAN.md`. Only rename internal values/functions; preserve props and state timing.
4. **DONE — Extract diff table construction and bounded fallback.** Files: `src/lib/diff.ts`, `REFACTOR_PLAN.md`. Retain tokenization, tie breaking, merged parts, and the memory threshold.
5. **DONE — Extract completion parsing and provider retry/error decisions.** Files: `src/lib/server/mistral-response.ts`, `src/lib/server/mistral.ts`, `REFACTOR_PLAN.md`. Retain error messages, cancellation order, retry delays, logs, and metrics.
6. **DONE — Extract HTTP byte collection and limit-store operations.** Files: `src/lib/server/http.ts`, `src/lib/server/limits.ts`, `REFACTOR_PLAN.md`. Retain streaming limits, timer/resource cleanup, Redis validation, and in-memory expiry.
7a. **DONE — Name API response payloads precisely.** Files: `src/lib/api/request.ts`, `src/lib/api/transcribe.ts`, `REFACTOR_PLAN.md`. Naming-only prerequisite added during the audit to keep renames separate from extraction.
7b. **DONE — Extract API response validation.** Files: `src/lib/api/request.ts`, `src/lib/api/transcribe.ts`, `REFACTOR_PLAN.md`. Retain JSON failures, schema transformations, error precedence, and trimming.
8. **DONE — Extract review edit keys and occurrence aggregation.** Files: `src/lib/review.ts`, `REFACTOR_PLAN.md`. Retain ordering, mutation of internal groups, newest representative cards, and source-message deduplication.
9. **DONE — Extract page request preparation and completion application.** Files: `src/app/page.tsx`, `REFACTOR_PLAN.md`. Keep request guards, React updater timing, card ordering, and late-response handling.
10. **DONE — Extract recorded-recognition setup and silence monitoring.** Files: `src/lib/voice/recognition.ts`, `REFACTOR_PLAN.md`. Keep resource ownership, generation checks, timer thresholds, and callback order.
11. **DONE — Extract voice transcript aggregation and speech completion.** Files: `src/components/ui/voice/VoiceCall.tsx`, `REFACTOR_PLAN.md`. Keep live/final transcripts, ignored late callbacks, microphone controls, and speech-error messages.
12. **DONE — Name evaluation metrics precisely.** Files: `eval/metrics.ts`, `REFACTOR_PLAN.md`. Only rename internal values/functions; keep all output fields and percentile formulas.
13. **DONE — Preserve API-client and provider await boundaries.** Files: `src/lib/api/request.ts`, `src/lib/server/mistral.ts`, `__tests__/unit/api-client.test.ts`. Keep awaited operations in their original caller and extract synchronous decisions; characterize queued cancellation against the original client before correcting the extraction.
14. **DONE — Preserve streaming and shared-limit await boundaries.** Files: `src/lib/server/http.ts`, `src/lib/server/limits.ts`, `REFACTOR_PLAN.md`. Keep stream/Redis awaited operations in their original caller and retain synchronous assembly/validation helpers.

## Completion

**COMPLETE.** Final coverage tests passed: 18 suites / 160 tests, versus 17 suites / 137 tests at baseline. Lint, build, type checking, and all 28 evaluation fixtures passed. The final type check required moving recurring numbered generated declarations out of `.next/types`, as in step 6; no source/configuration change was needed. All 15 implementation steps completed without a skipped or reset step. Exact diff comparisons (4,408), declared public API checks (12 files), and awaited-operation ownership/order checks (seven modules) passed. See `REFACTOR_REPORT.md` for commits, corrections, deliberately unchanged issues, and autonomous judgment calls.
