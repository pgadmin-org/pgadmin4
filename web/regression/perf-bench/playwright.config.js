import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 180_000,
  reporter: 'line',
  // Parallel-by-default after the tree.selected() drift fix landed.
  // Validation runs (workers=1 and workers=4) both hit 10 iterations
  // x 30 specs = 300/300 with zero flakes. workers=4 finishes each
  // 30-spec suite in ~45s vs ~162s serial (3.6x). PG default
  // max_connections is 100 and per-worker pool is ~5-6 connections,
  // so 4 workers stays comfortably under the ceiling. Higher worker
  // counts haven't been measured; override on the CLI with
  // `--workers=N` to experiment.
  workers: 4,
  // No globalSetup/globalTeardown. pgAdmin's connection_manager is
  // keyed by Flask session (psycopg3 driver:78); each Playwright
  // worker has its own session and therefore its own pool. A single
  // "connect at start / disconnect at end" can't share its pool with
  // workers, so it doesn't actually save work. Per-test afterEach
  // disconnect (in the spec) cleans each worker's pool independently
  // and is the right shape for parallel runs.
  use: {
    headless: true,
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
    viewport: { width: 1600, height: 1000 },
  },
});
