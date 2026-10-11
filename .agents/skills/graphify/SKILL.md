---
name: graphify
description: Navigate LangBot's codebase using its local Graphify graph. Use for architecture, dependencies, callers, data flow, and impact analysis before code changes.
---

# Graphify for LangBot

Repository adaptation of the upstream Graphify 0.9.85 skill. Use the local code
graph to choose which source files to investigate and understand their
relationships. Agents handle setup and refreshes without a special user command.

## Runtime and graph

Run shell commands from the repository root through `pnpm graphify`. The wrapper
in `scripts/graphify.mjs` manages the pinned Python package, local uv cache, and
offline execution after setup. uv and Python 3.10+ are prerequisites.

- If the runtime cache is missing, run `pnpm graphify:setup`.
- If `graphify-out/graph.json` is missing, run `pnpm graphify:build`.
- Check freshness with `pnpm graphify:check`; refresh with
  `pnpm graphify:update` when source has changed, including after pulls or merges.

Build and update use the same incremental code-only extraction and clustering
pipeline. `.graphifyignore` excludes dependencies, credentials, generated files,
media, and harness instructions. The graph and runtime cache are ignored by Git.
Keep the existing Husky hooks; graph refreshes use the pnpm commands above.

## Investigate the codebase

Read [references/query.md](references/query.md) for vocabulary matching, traversal
choices, and interpreting results. Start with a scoped query or an exact symbol:

```sh
pnpm graphify query "correction normalizeCorrection" --budget 1500
pnpm graphify explain "normalizeCorrection"
pnpm graphify path "chat/route.ts" "normalizeCorrection"
pnpm graphify affected "normalizeCorrection"
```

Follow the returned source locations to inspect the implementation before
answering behavior questions or editing. Treat graph edges as structural
evidence; runtime behavior and completeness still need source verification.
For broad architecture reviews, read `graphify-out/GRAPH_REPORT.md`. The HTML
visualization is `graphify-out/graph.html`.

If coverage is missing or a query is unhelpful, use `rg` and direct source reads.
Harness configuration and this skill are excluded from the graph, so inspect
their files directly. Refresh the graph after source changes.

## MCP access

When connected, use Graphify's `query_graph`, `get_node`, `get_neighbors`,
`get_community`, `shortest_path`, and `graph_stats` tools. CLI access works when
MCP is unavailable. `.mcp.json` configures clients that launch from this root.
For manual registration, use `node`, the absolute path to
`scripts/graphify.mjs`, and `mcp`; the wrapper resolves the graph location.

## Maintenance

This skill covers local code navigation. The upstream media extraction, external
corpus import, database exports, and hook installation procedures are omitted.
See [the repository guide](../../../docs/graphify.md) for runtime maintenance.
When upgrading Graphify, review changes against these tailored instructions and
update `.graphify_version` with the package pin. Preserve the bundled licenses
and NOTICE; `graphify install --project` would replace this adaptation with the
full upstream skill.
