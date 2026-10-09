# LangBot

A language-practice app built with Next.js 15, React 19, TypeScript, and Mistral. Each message produces a conversational reply and a separate, structured correction.

## Conversation and corrections

1. Choose your native and target languages and select your proficiency level.
2. Send a message with the **Send** button or Enter (Shift+Enter adds a line; IME composition is supported), or start a **Voice call**.
3. Read the tutor's reply in your target language. The text inside your original message updates in place: **green additions** and **red struck-through deletions**, without background highlights or a separate correction box.
4. Expand **Why these changes?** for explanations in your native language. Use **Copy corrected** to copy the clean sentence.
5. Open **Review cards** for saved mistakes and vocabulary. Reveal an answer, then choose **I remembered** or **Practise again**. Repeated edits are grouped and shown first. Cards open at the end of a session or voice call, and when you return with reviews due.

Corrections are limited to grammar, spelling, and necessary punctuation. Valid sentences, slang, profanity, and anatomical vocabulary should stay unchanged; the tutor must not replace the learner's intended meaning or simplify their words to match their level. Model-generated corrections, topic labels, and vocabulary are suggestions, not guaranteed linguistic judgments.

Translation has visible loading/error states and can be toggled back to the original. Failed messages can be retried. Stop cancels pending work, and late replies are ignored after a reset. Deleting a user turn removes the original, its direct reply, and its saved review cards from app state. Remaining messages may still refer to earlier conversation; deleting does not retract text already sent to the provider.

## Voice calls

Open a voice call with the waveform icon beside Send. The call screen shows an animated orb, recognized user turns, readable AI replies, and correction diffs. Each completed turn appears after transcription. You can mix the two languages selected in settings within one sentence. Microphone and spoken replies can be muted independently. Ending the call returns to the same text conversation, so its transcript and review cards remain available. Ending a call does not cancel an AI reply already in progress; it will appear in the text chat when ready and can be cancelled there with **Stop**.

All supported browsers, including Firefox, use `getUserMedia` + `MediaRecorder`, sending audio through `/api/transcribe` to Mistral Voxtral with the existing server-side `MISTRAL_API_KEY`. `MISTRAL_BILINGUAL_MODEL` defaults to `voxtral-small-latest`; the key must have access to that audio-capable model. Its audio chat endpoint receives both language settings and instructions to preserve code-switching verbatim. If the model reports speech in an unselected language, the app asks you to use the selected pair. Recognition can still mishear words or language switches; these instructions are not an accuracy guarantee. Recorded turns end after a pause, after 30 seconds, or with **Send turn**. This mode shows the transcript after each turn rather than word by word. Audio is held in memory, not saved by LangBot, and uploads stop when you mute or close the call. Mistral processes the uploaded audio under its service policies. Transcription requests share the app's usage limits and have a 2 MiB body limit and 25-second provider timeout.

Use **http://localhost:3000** on the development computer or **HTTPS** when accessing it from another device; an HTTP LAN address cannot access the microphone. Allow microphone access when prompted. Spoken replies use an installed browser/system voice matching the target language when available. Missing speech playback no longer blocks voice input; replies remain readable. Closing the call releases microphone tracks and cancels pending transcription/playback.

For example, a French speaker learning English can say “I need une cuillère.” The transcript keeps those words. The tutor can explain “spoon” and save a vocabulary card without treating French words as grammar errors. Vocabulary is returned in the same tutor response, without a separate vocabulary API call.

**End session & review** and **New chat** clear the conversation while preserving review cards. Language changes start a new chat. Cards are separated by native/target language pair, capped at the latest 100 saved occurrences, and stored locally in this browser. Identical edits across sentences are grouped, with a count of distinct source messages. Cards can be forgotten. Corrections and vocabulary gaps can become review cards. Conversation history is in memory and clears on refresh. There are no accounts or cross-device sync.

## Local setup

Requires Node.js 20.9+ and pnpm 9.

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
# Set MISTRAL_API_KEY in .env.local.
pnpm dev
```

Open http://localhost:3000. Request counters are stored in the server process's memory.

Configuration:

| Variable                  | Purpose                                                                                      |
| ------------------------- | -------------------------------------------------------------------------------------------- |
| `MISTRAL_API_KEY`         | Server-only provider credential                                                              |
| `MISTRAL_MODEL`           | Defaults to `ministral-8b-latest`; use a supported pinned model for reproducible evaluations |
| `MISTRAL_BILINGUAL_MODEL` | Defaults to `voxtral-small-latest` for transcription with both selected languages            |

Mistral Free mode provides limited API usage. A model's listed API price does not mean Free mode has been removed; whether requests are billed depends on your account configuration. Check your Mistral usage and limits. Switching models does not guarantee unlimited free access.

For Vercel production and preview deployments, configure the Mistral key in the project's environment settings. The app allows five requests per minute across all API endpoints. The limit is defined in `src/lib/server/limits.ts`.

Vercel's platform-supplied client IP header gives each IP a separate counter. Other hosts and requests without that header share a counter. Counters reset when the server process restarts and are separate on each server instance. Invalid requests consume the allowance, and each permitted AI operation can retry once.

## API and reliability

Text endpoints accept JSON POSTs. The transcription endpoint accepts a raw audio POST with its recording MIME type and `X-Native-Language` and `X-Target-Language` headers. All endpoints return `{ success: true, ... }` or `{ success: false, error }`. Languages use supported codes (`en`, `fr`, `es`, `de`, `it`, `pt`, `ru`, `ja`, `ko`, `zh`, `ar`, `hi`).

| Endpoint          | Request fields                                                              | Success fields                                |
| ----------------- | --------------------------------------------------------------------------- | --------------------------------------------- |
| `/api/chat`       | `prompt`, `history`, `languageConfig`, `userLevel`, `learningFocus`         | `reply`, `correction`, `topics`, `vocabulary` |
| `/api/correct`    | `content`, `languageConfig`, `userLevel`                                    | `correction`                                  |
| `/api/translate`  | `content`, `languageConfig`                                                 | `translation`                                 |
| `/api/transcribe` | Raw Ogg/WebM/MP4 audio, `X-Native-Language` and `X-Target-Language` headers | `text`                                        |

Example chat request:

```json
{
  "prompt": "I has a apple.",
  "history": [],
  "languageConfig": { "nativeLanguage": "fr", "targetLanguage": "en" },
  "userLevel": "beginner",
  "learningFocus": []
}
```

Vocabulary is an array of up to three items with `original`, `translation`, `example`, and `explanation`. Only phrases present in the latest user message are saved as vocabulary cards. The server discards a correction that only substitutes these vocabulary translations, keeping the original sentence. If a larger rewrite also removes a reported native phrase, it leaves the original visible with correction unavailable while keeping the reply and vocabulary. This guard depends on the model reporting the vocabulary phrase; it is not a general semantic-equivalence check.

Correction data contains `correctedText` and an array of `issues` (`category` and `explanation`). For unchanged text, the server clears stray issues. If the model changes text without explaining an error, the API returns `correction: null`: the original stays visible with a correction-unavailable notice and the chat reply is kept.

- Zod validates field types, language/level allowlists, roles, lengths, and output structure at runtime.
- Request bodies are bounded to 32 KiB and have a five-second read deadline. Chat input is limited to 2,000 characters, history to 12 messages and 20,000 total prompt/history characters. The client also trims history against the UTF-8 byte budget.
- Client-supplied `system` roles and unknown request fields are rejected. Learner data is separated from system instructions. Prompt instructions reduce unwanted behavior but do not make prompt injection impossible.
- Mistral returns schema-constrained JSON, which is validated again. Truncated and malformed responses fail explicitly. Correction metadata is normalized separately so recoverable inconsistencies do not discard a valid reply.
- Chat and correction arrive together in one non-streaming completion, avoiding two separate paid calls per message. A failed completion can be retried from the user message.
- Provider calls have a 25-second total deadline and at most one retry for 429/502/503/504. Retry-After is respected when it fits a two-second retry wait; longer waits return a visible busy error. Ambiguous network failures are not automatically retried.
- Text is rendered as React text, never raw HTML. Trimming is normalization, not injection prevention.
- Server logs contain operational metadata (model, latency, attempts, token usage, request IDs/status), not chat content, provider error bodies, or keys.
- Inputs and outputs are capped, but model token counts vary by language. Large outputs that hit the provider token limit return an error rather than a partial correction.

## Code map

- `src/app/page.tsx`: conversation state, cancellation, language/level selection, deletion, retry, and review cards.
- `src/components/ui/voice/VoiceCall.tsx`: recorded speech input, spoken replies, animated call state, and the readable call transcript.
- `src/lib/voice/recognition.ts`: browser audio recording, pause detection, and microphone/upload cleanup.
- `src/app/api/transcribe/route.ts`: bounded audio uploads to Mistral Voxtral using the shared request protections.
- `src/components/ui/chat/CorrectionDiff.tsx` and `src/lib/diff.ts`: lossless word-level diff, Unicode segmentation, and accessible markup. Very large token grids fall back to a bounded prefix/suffix diff.
- `src/lib/learning.ts`: validated local study cards, storage migration defaults, and review scheduling.
- `src/lib/review.ts`: vocabulary cards and grouping repeated edits across messages.
- `src/components/ui/panels/ReviewDialog.tsx`: accessible review popup and self-grading.
- `src/lib/server/transcription.ts`: bilingual audio instructions, provider call, and transcript validation.
- `src/lib/schemas/`: language, correction, chat, and vocabulary contracts. `schemas.ts` re-exports them for existing callers.
- `src/lib/chat/conversation.ts`: conversation history limits, request preparation, and message updates.
- `src/lib/api/transcribe.ts`: recorded-audio upload and transcript validation.
- `src/lib/server/`: prompts, provider handling, HTTP boundaries, and shared usage controls.
- `eval/`: authored fixtures, baseline comparison, metrics, and a human-review rubric.

## Verification and evaluation

```sh
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm eval
pnpm build
```

Unit tests cover diff reconstruction, correction consistency, request bounds, scheduling, UI interactions, API client validation/cancellation/timeouts, limiter behavior, provider failure handling, and scoring. Voice tests cover recording, pause detection, silence, permission failure, upload limits, transcription failure, cancellation, and microphone cleanup. Review tests cover persistence across reloads, language isolation, repeated-error grouping, vocabulary cards, reveal/self-grading, and forgetting cards. Transcription tests verify both language settings, mixed and single-language transcripts, unrelated-language rejection, and quota failures. Integration tests call route handlers with mocked Mistral responses; they do not start a server or spend API credits. Network calls are blocked by default in Jest. CI runs lint, type checks, tests, offline evaluation and the production build. Vercel's Git integration handles preview and production deployments separately.

Run `pnpm test:coverage` for a local coverage report. Passing mocked tests does not verify microphone hardware, speech quality, live Mistral access, or production capacity. No live benchmark or load-test results are claimed.

Code uses named handlers, explicit control-flow blocks, and separate helpers for request preparation and validation. Keep one statement per line and avoid nested ternaries. ESLint enforces these rules in `src`; `.prettierrc.json` defines the formatting used by the editor.

ESLint also requires a blank line before function definitions across the project, including named arrow functions and methods. Documentation comments stay attached to their functions. Apply spacing fixes with `pnpm exec eslint . --fix` and format the project with `pnpm exec prettier --write .`.

Maintainability rules apply to all linted JavaScript and TypeScript files. The thresholds are project choices; blank lines and comment-only lines are excluded from line limits. Tests keep the same structural rules with bounded allowances of 400 lines per file and 100 lines per test function so browser and audio lifecycle scenarios can share their setup.

| Rule                                                                                  | Limit or requirement                                         |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| [max-lines](https://eslint.org/docs/latest/rules/max-lines)                           | 100 code lines per file                                      |
| [max-params](https://eslint.org/docs/latest/rules/max-params)                         | 4 parameters per function (under 5)                          |
| [max-lines-per-function](https://eslint.org/docs/latest/rules/max-lines-per-function) | 50 code lines per function                                   |
| [max-depth](https://eslint.org/docs/latest/rules/max-depth)                           | 2 levels of nested control-flow blocks                       |
| [complexity](https://eslint.org/docs/latest/rules/complexity)                         | Cyclomatic complexity at most 10                             |
| [max-nested-callbacks](https://eslint.org/docs/latest/rules/max-nested-callbacks)     | 3 levels of nested callbacks                                 |
| [no-else-return](https://eslint.org/docs/latest/rules/no-else-return)                 | Use guard clauses instead of `else` after a returning branch |

These rules report errors and block affected commits. The application and evaluation code currently pass every maintainability rule. Run `pnpm lint` to verify the project.

`pnpm install` enables the Husky pre-commit hook. Each commit runs ESLint fixes and Prettier on staged JavaScript and TypeScript files, then checks ESLint again to verify the formatted code. Other supported staged files are formatted with Prettier; generated files and the dependency lockfile are excluded. lint-staged stages the fixes and preserves unstaged edits. Remaining lint errors block the commit. Run `pnpm lint:staged` to run the same checks manually.

`pnpm eval` validates the authored fixtures without API calls. `pnpm eval --live` explicitly runs paid baseline/production-prompt comparisons and records outputs, reference matches, unnecessary edits, consistency, latency, tokens, and optional cost estimates. Read [the evaluation guide](eval/README.md) before interpreting or publishing results.

## Current limits

The learner selects their level; the app does not claim to infer CEFR proficiency or prove learning gains. Review scheduling is a simple fixed schedule, not a validated adaptive curriculum. Voice recognition depends on Mistral’s audio model and recording quality; spoken reply pronunciation depends on installed system voices. No attachments or inactive controls are exposed. The evaluation set needs proficient human review and broader coverage, including multi-turn and voice-transcription behavior and vocabulary review, before making quality claims.
