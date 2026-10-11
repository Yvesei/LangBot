# Graphify for AI harnesses

[Graphify](https://github.com/Graphify-Labs/graphify) maps the application code
and tests into a queryable graph. Coding agents use it automatically through
`AGENTS.md` to understand dependencies, plan changes, and refresh the graph
after edits. The setup instructions below are for new checkouts or rebuilding
the tool cache; agents handle those commands when needed.

This repository pins `graphifyy[mcp]` to
`0.9.85` in `scripts/graphify.mjs`. It runs in an isolated uv tool environment;
its cache lives in the ignored `.graphify/` directory.
Setup downloads the runtime; subsequent commands use uv's offline mode, so
queries, rebuilds, and MCP access work in network-restricted agent sandboxes.

`scripts/graphify-constraints.txt` caps the MCP cryptography dependency below
49 on Intel macOS, where newer releases do not publish prebuilt wheels. Other
platforms use the normal dependency resolution.

## Setup

Install [uv](https://docs.astral.sh/uv/getting-started/installation/) and Python
3.10 or later, then run from the repository root:

```sh
pnpm graphify:setup
pnpm graphify:build
```

The first command downloads the pinned Python tool and verifies its version.
The second extracts code with tree-sitter locally, without API keys or a model
call, then generates the report and HTML with `cluster-only --no-label`.
Community labels start as numeric IDs. `.graphifyignore` excludes dependencies,
build output, environment files, media, and harness configuration.

Generated artifacts are local and ignored by Git:

- `graphify-out/graph.json`: the graph queried by the CLI and MCP server.
- `graphify-out/GRAPH_REPORT.md`: an architecture overview.
- `graphify-out/graph.html`: an interactive graph to open in a browser.

Each clone builds its own graph so branch changes cannot leave a committed map
out of sync. Run `pnpm graphify:update` after changing source, pulling, or merging.
Use `pnpm graphify:check` to inspect freshness.

Build and update share the incremental code-only extraction and report pipeline.
This keeps extraction, deduplication, and clustering consistent between runs.
The generated graph may shrink when deduplication removes redundant nodes or
source is deleted; the pipeline enables Graphify's `--allow-dedup-shrink` flag.

## Agent use

`AGENTS.md` gives harnesses the repository map and graph query guidance. The
official project skill lives at `.agents/skills/graphify/SKILL.md` with its
reference files. Skill-aware harnesses can discover it there. Agents consult
the graph without a special user command; `$graphify` is also available for
explicit requests in Codex. Always use the repository wrapper for shell commands
in the skill, for example:

```sh
pnpm graphify query "How are chat responses corrected?" --budget 1500
pnpm graphify explain "normalizeCorrection"
pnpm graphify affected "normalizeCorrection"
pnpm graphify path "chat/route.ts" "normalizeCorrection"
pnpm graphify diagnose multigraph
```

Queries select source context; agents should inspect the cited source before
making changes. This initial graph covers code and tests. Semantic indexing of
README files, other documents, and media is optional and is not part of the
default build.

## MCP

`.mcp.json` registers a local stdio server for clients that read that file and
launch commands from the repository root. Build the graph before connecting.
The server command is:

```sh
node scripts/graphify.mjs mcp
```

For a harness that needs manual MCP registration, use `node` as the command and
the absolute path to `scripts/graphify.mjs`, followed by `mcp`, as its arguments.
The wrapper resolves the graph from its own location, so this works regardless
of the harness's working directory. Do not use `pnpm graphify:mcp` as an MCP
command unless script banners are silenced; stdout must contain only MCP data.

The MCP dependency is included in the pin. Available tools include
`query_graph`, `get_node`, `get_neighbors`, `shortest_path`, and `graph_stats`.
Registration is client-specific; `AGENTS.md` and CLI access also work without MCP.

## Maintenance

Use `GRAPHIFY_OUT` to select another output directory if needed. Relative paths
are resolved from the repository root. Ordinary Git worktrees already have
separate output and cache directories.

To upgrade, change the package pin in `scripts/graphify.mjs`, run setup, refresh
the official skill, and rebuild:

```sh
pnpm graphify:setup
pnpm graphify install --project --platform agents
pnpm graphify:build --force
```

Keep the skill and package on the same version. The wrapper disables Graphify's
automatic refresh of user-global skills and query logs. Git hooks are managed
by the existing Husky setup; graph refreshes use the explicit pnpm commands.
