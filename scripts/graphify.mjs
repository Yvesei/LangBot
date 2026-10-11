import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const env = {
  ...process.env,
  UV_CACHE_DIR: join(root, '.graphify', 'uv-cache'),
  UV_TOOL_DIR: join(root, '.graphify', 'tools'),
  UV_TOOL_BIN_DIR: join(root, '.graphify', 'bin'),
  UV_NO_PROGRESS: '1',
  GRAPHIFY_OUT: process.env.GRAPHIFY_OUT || join(root, 'graphify-out'),
  GRAPHIFY_NO_AUTO_REFRESH: '1',
  GRAPHIFY_QUERY_LOG_DISABLE: '1',
  PYTHONHASHSEED: '0',
};
const args = process.argv.slice(2);
const toolArgs = [
  'tool',
  'run',
  ...(args[0] === 'setup' ? [] : ['--offline']),
  '--constraints',
  'scripts/graphify-constraints.txt',
  '--from',
  'graphifyy[mcp]==0.9.85',
];

// Keep the Python tool isolated from the app and pinned across AI harnesses.
function run(command, commandArgs) {
  const result = spawnSync('uv', [...toolArgs, command, ...commandArgs], {
    cwd: root,
    env,
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(
      result.error.code === 'ENOENT'
        ? 'Graphify requires uv on PATH. Install it: https://docs.astral.sh/uv/getting-started/installation/'
        : `Unable to start Graphify: ${result.error.message}`,
    );
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (args[0] === 'setup') {
  run('graphify', ['--version']);
} else if (args[0] === 'build') {
  run('graphify', [
    'extract',
    '.',
    '--code-only',
    '--allow-dedup-shrink',
    ...args.slice(1),
  ]);
  run('graphify', ['cluster-only', '.', '--no-label']);
} else if (args[0] === 'mcp') {
  run('graphify-mcp', [
    '--graph',
    join(resolve(root, env.GRAPHIFY_OUT), 'graph.json'),
    ...args.slice(1),
  ]);
} else {
  run('graphify', args);
}
