# Maintainability lint report

Date: 2026-10-05 (Europe/Paris).

The whole-project lint run now passes with no errors or warnings. The initial strict-rule audit reported 67 errors across 27 files; all production, evaluation, configuration, and component violations were resolved through targeted extraction and naming changes.

Production JavaScript and TypeScript retain these limits:

| Rule                   | Limit |
| ---------------------- | ----: |
| max-lines              |   100 |
| max-params             |     4 |
| max-lines-per-function |    50 |
| max-depth              |     2 |
| complexity             |    10 |
| max-nested-callbacks   |     3 |

Tests use bounded limits of 400 lines per file and 100 lines per function. This keeps lifecycle-heavy behavior suites together with their shared mocks while the same parameter, depth, complexity, callback, spacing, and guard-clause rules continue to apply.

## Verification

| Check                          | Result                      |
| ------------------------------ | --------------------------- |
| `pnpm lint`                    | PASS, no errors or warnings |
| `pnpm exec prettier --check .` | PASS                        |
| `pnpm run typecheck`           | PASS                        |
| `pnpm test`                    | PASS, 18 suites / 160 tests |
| `pnpm run build`               | PASS                        |

The first sandboxed build could not open Turbopack's local worker port. Running the same build with the required process permission passed.
