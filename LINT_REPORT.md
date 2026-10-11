# Lint and formatting rules

The current rules are defined in [eslint.config.mjs](eslint.config.mjs). Formatting is defined in [.prettierrc.json](.prettierrc.json).

## Limits

- Code files: at most 250 lines; functions: at most 100 lines.
- Jest test files: at most 400 lines; functions: at most 150 lines.
- Blank lines and comment-only lines do not count toward these limits.
- Functions accept at most four parameters.
- Control-flow nesting is limited to two levels, complexity to ten, and nested callbacks to three.
- Use guard clauses instead of an `else` after a returning branch.
- Application code uses explicit braces, one statement per line, and no nested ternaries.

These limits allow related small helpers to share a file while keeping larger functions readable.

## Blank lines

The local rule in [eslint-function-spacing.mjs](eslint-function-spacing.mjs) requires blank lines between functions, including named arrow functions and methods.

It also handles `test()`, `it()`, `describe()`, and setup/cleanup blocks such as `beforeEach()`. Table-driven tests and `.only`/`.skip` variants are covered. Documentation comments stay attached to their functions.

The rule has 26 automated cases in [function-spacing.test.mjs](tests/lint/function-spacing.test.mjs). Run them with `pnpm test:lint`.

## Pre-commit checks

`pnpm install` enables Husky. On commit, lint-staged runs ESLint fixes, formats staged JavaScript/TypeScript with Prettier, then checks ESLint again. Other supported staged files are formatted with Prettier.

Generated files and the dependency lockfile are ignored by Prettier. Remaining lint errors block the commit.

Use `pnpm lint` to check the project or `pnpm lint:staged` to run the staged-file checks manually. GitHub Actions also runs lint and the spacing-rule tests.
