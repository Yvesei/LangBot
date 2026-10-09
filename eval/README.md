# LangBot evaluation

No benchmark results are claimed or checked in. The fixtures and runner have been authored but not executed.

The 28 cases cover actual mistakes, valid informal phrasing, ambiguous meaning, explicit slang and anatomical vocabulary, profanity, negation, protected names/numbers, formatting, instruction-like text, and seven target languages. They are a starter set, not expert-reviewed ground truth or proof of broad language coverage.

## Commands

- `pnpm eval`: validate fixtures and print the request count; no network calls.
- `pnpm eval --live`: call Mistral for a simple baseline and the production tutor prompt, using the same structured output schema, model, and temperature.
- Set `EVAL_REPEATS=3` to repeat cases. The default run makes 48 logical requests; each can retry once. The runner calls the provider directly, independently of web route quotas.
- Set `MISTRAL_MODEL` to a supported pinned version for reproducible comparisons. Run separately with another model to compare models.
- Optionally supply current `EVAL_INPUT_USD_PER_MILLION` and `EVAL_OUTPUT_USD_PER_MILLION` for that model. Missing pricing produces null cost, not a fabricated estimate.
- Reports (including outputs, resolved model names, errors, tokens, per-language scores, and p50/p95 latency) go to ignored `eval/results/`.

The runner loads local environment variables but never prints credentials. It sends only the synthetic fixtures. No live evaluation runs in CI.

## Interpretation

Read completion rate alongside conditional quality metrics. The end-to-end reference pass rate includes failed and inconsistent responses in its denominator. Reference match measures one of the listed acceptable strings, not all possible valid corrections. Protected-text checks catch obvious preservation failures but do not establish semantic equivalence.

Before publishing numbers, review every output against this rubric:

| Criterion            | 0                                  | 1                      | 2                                     |
| -------------------- | ---------------------------------- | ---------------------- | ------------------------------------- |
| Meaning preservation | Changes facts, negation, or intent | Unnecessary rephrasing | Minimal edit, same meaning            |
| Explanation          | Wrong or absent                    | Partly useful          | Correct and clear in native language  |
| Reply language       | Wrong language                     | Unnecessary mixing     | Target language                       |
| Level fit            | Clearly unsuitable                 | Partly suitable        | Appropriate vocabulary and complexity |

Use a proficient reviewer for each language. Record disagreements and add acceptable variants without tuning against a held-out final set. Repeated runs describe output variability; they do not increase the number of independent examples.

Before a hiring demo, add human-reviewed held-out examples, multi-turn conversations, translation evaluations, and real learner feedback. Do not present this small suite as evidence of learning outcomes.
