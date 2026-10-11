# Graphify queries for LangBot

Repository adaptation of the upstream Graphify 0.9.85 query reference. Use after
the runtime and graph checks in `SKILL.md`. Run CLI commands from the repository
root through `pnpm graphify`; the wrapper manages the Python environment.

## Match the graph's vocabulary

The query CLI uses case-insensitive substring matching and IDF ranking. It does
not resolve synonyms, word stems, or translations. Prefer an exact symbol when
known. For a natural-language question, choose a few relevant terms from actual
node labels before traversal.

Inspect labels directly in `graphify-out/graph.json`, or extract their vocabulary
using Python's standard library:

```sh
python3 - <<'PY'
import json
import re
from pathlib import Path

data = json.loads(Path('graphify-out/graph.json').read_text(encoding='utf-8'))
vocab = set()
for node in data['nodes']:
    for chunk in re.findall(r'[^\W\d_]+', node.get('label', '') or '', re.UNICODE):
        parts = re.findall(r'[A-Z]+(?=[A-Z][a-z])|[A-Z]?[a-z]+|[A-Z]+', chunk) or [chunk]
        for part in parts:
            token = part.lower()
            if 3 <= len(token) <= 30:
                vocab.add(token)
print('\n'.join(sorted(vocab)))
PY
```

Select only terms present in those labels or vocabulary. Match the question's
meaning rather than substituting vaguely related terms. If none apply, use
source search and explain the coverage gap. When expansion changes the wording,
briefly state the selected terms so the query is understandable.

## Choose the traversal

| Goal                                     | Command                                             |
| ---------------------------------------- | --------------------------------------------------- |
| Nearby context and relationships         | `pnpm graphify query "<terms>" --budget 1500`       |
| Explore a deeper dependency chain        | `pnpm graphify query "<terms>" --dfs --budget 1500` |
| Inspect one symbol and its neighbors     | `pnpm graphify explain "<symbol>"`                  |
| Find a path between two symbols          | `pnpm graphify path "<A>" "<B>"`                    |
| Identify potential impact before editing | `pnpm graphify affected "<symbol>"`                 |

Use exact symbols or file names for `explain`, `path`, and `affected`. For
example, `normalizeCorrection` connects correction behavior to its callers and
tests. A query's budget can be exceeded when Graphify preserves all result
edges; narrow the terms or use `explain` to reduce the context.

When MCP is connected, the corresponding tools provide graph access without
shell commands. `query_graph` retrieves context, `get_node` and `get_neighbors`
inspect symbols, and `shortest_path` traces relationships.

## Interpret the results

- Read the cited `source_file` and `source_location` before asserting behavior
  or changing code. Cite the relevant source in the answer.
- Check edge direction and relation, such as `calls`, `imports`, or `contains`.
  A graph path alone does not establish execution order.
- Use communities as navigation aids. The default build uses numeric community
  labels; their meaning comes from member symbols and the source.
- If results are empty, irrelevant, or stale, check freshness, narrow the query,
  or use `rg` and direct file reads. Files excluded by `.graphifyignore`, including
  this skill and harness configuration, require direct inspection.

If the CLI is unavailable, inspect node and edge records in `graph.json` using
standard JSON tools or Python while resolving the runtime problem. Source
search can continue independently; do not rebuild a valid graph just to query it.

## Optional investigation memory

For findings worth reusing, save a short source-backed result with an outcome:

```sh
pnpm graphify save-result --question "<question>" --answer "<finding and sources>" --type query --nodes "<symbol>" --outcome useful
```

Use `dead_end` for an unhelpful query or `corrected` with `--correction` for a
revised finding. To consult past investigations, run
`pnpm graphify reflect --if-stale` and read
`graphify-out/reflections/LESSONS.md`. These local memories are ignored by Git;
verify remembered findings against current source.
