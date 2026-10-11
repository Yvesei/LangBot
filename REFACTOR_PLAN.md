# Completed cleanup plan

This plan reflects the decisions made while reviewing PRs #2–#8. The current implementation is on main; PR #9 updates its documentation.

## Decisions kept

- Use Next.js 15.5.27.
- Keep request protection simple: an in-memory counter with five requests per minute.
- Return the tutor reply and correction together from one chat completion.
- Use one correction object for grammar, spelling, and native-language word translations.
- Save corrections as simple click-to-flip flashcards with manual browsing and removal.
- Remove practice exercises, topic tracking, separate vocabulary objects, review scheduling, self-grading, and the end-session control.
- Keep chat coordination in the existing five chat files.
- Group UI components by feature and purpose.
- Consolidate related voice actions, recording handlers, and server transcription functions.
- Let Vercel's Git integration handle deployments; keep GitHub Actions for checks.
- Enforce formatting and blank lines between functions, tests, and setup blocks.
- Keep automated verification mocked; the evaluation PR was skipped.

## Documentation work

- [x] Resolve conflicts using the merged application and tooling.
- [x] Update the README's chat, cards, voice, setup, API, and folder guidance.
- [x] Update lint thresholds to match the configuration.
- [x] Replace outdated feature descriptions and validation claims in the reports.
- [x] Keep the PR diff limited to four Markdown files.

For the resulting behavior, read [README.md](README.md). For the cleanup's purpose, read [REFACTOR_REPORT.md](REFACTOR_REPORT.md).
