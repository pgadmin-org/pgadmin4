// DataGridView heavy-load + nested benchmark.
//
// Uses the synthetic __mountBenchFixture exposed by SchemaView/bench-fixture.js
// to mount: SchemaView -> DataGridView (outer / 1000 cols) -> SchemaView
// (column row) -> DataGridView (inner / N indexes).
//
// Measures:
//   1) Mount + initial render of the heavy dialog.
//   2) Typing into an outer-row Column Name cell (heavy state, heavy render).
//   3) Expand a row, type into an inner index cell.
//   4) Add a row to the inner indexes collection (nested ADD_ROW).
//
// Tunables:
//   OUTER=1000  INNER=3  M_CHARS=15

import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const PGADMIN_URL = process.env.PGADMIN_URL || 'http://127.0.0.1:5050/browser/';
const OUTER = parseInt(process.env.OUTER || '1000', 10);
const INNER = parseInt(process.env.INNER || '3', 10);
const M_CHARS = parseInt(process.env.M_CHARS || '15', 10);
// Set INCREMENTAL=1 to enable the prototype incremental option-evaluation
// path (skips collection-row option re-eval when the row's path doesn't
// overlap the changed path).
const INCREMENTAL = process.env.INCREMENTAL === '1';

fs.mkdirSync('./shots', { recursive: true });
fs.mkdirSync('./results', { recursive: true });
fs.mkdirSync('./traces', { recursive: true });

test.setTimeout(600_000);
test(`nested fixture: ${OUTER} outer × ${INNER} inner`, async ({ page, context }) => {
  page.on('pageerror', err => console.log('  [pageerror]', err.message));
  page.on('console', msg => {
    const t = msg.type();
    if (t === 'error') console.log('  [browser-error]', msg.text().slice(0, 200));
    if (msg.text().startsWith('[bench-fixture]'))
      console.log('  [browser]', msg.text());
  });

  // Auto-dismiss master password modal whenever it appears.
  await page.addLocatorHandler(
    page.locator('div[role="dialog"]', { hasText: 'Unlock Saved Passwords' }),
    async (dlg) => {
      console.log('  [auto] dismissing master password modal');
      const candidates = [
        dlg.getByRole('button', { name: 'Cancel' }),
        dlg.locator('button:has-text("Cancel")'),
      ];
      for (const c of candidates) {
        try { await c.click({ timeout: 1_000 }); return; } catch {}
      }
      await page.keyboard.press('Escape');
    },
    { times: 30, noWaitAfter: true }
  );

  await context.tracing.start({ screenshots: true, snapshots: true });
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto(PGADMIN_URL, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.waitForTimeout(3_000);

  // Sanity check the bundled hooks.
  expect(await page.evaluate(() => typeof window.__mountBenchFixture))
    .toBe('function');
  expect(await page.evaluate(() => typeof window.__perfSnapshot))
    .toBe('function');

  // --- Mount the heavy fixture and time it ---
  await page.evaluate(([incr]) => {
    window.__PERF_SCHEMA__ = true;
    window.__INCREMENTAL_OPTIONS__ = !!incr;
    window.__perfReset();
  }, [INCREMENTAL]);
  console.log(`[bench] incremental options: ${INCREMENTAL ? 'ON' : 'OFF'}`);

  console.log(`[bench] mounting ${OUTER} outer × ${INNER} inner...`);
  const mountStart = Date.now();
  await page.evaluate(({ N, M }) => window.__mountBenchFixture(N, M), { N: OUTER, M: INNER });
  // Wait for the grid to appear.
  await page.waitForSelector('[data-test="data-grid-view"]', { timeout: 500_000 });
  // Wait for the grid to settle (rows rendered).
  await page.waitForTimeout(6_000);
  const mountElapsed = Date.now() - mountStart;
  console.log(`[bench] mount + first paint: ${mountElapsed}ms`);
  await page.screenshot({ path: './shots/nest-01-mounted.png' });

  const snapAfterMount = await page.evaluate(() => window.__perfSnapshot());
  fs.writeFileSync('./results/nest-01-mount.json',
    JSON.stringify(snapAfterMount, null, 2));

  // --- Typing into an outer-row Column Name cell ---
  await page.evaluate(() => window.__perfReset());
  const outerCell = page.locator('input[value="col_0"]').first();
  await outerCell.waitFor({ state: 'visible', timeout: 10_000 });
  await outerCell.click();
  await outerCell.press('End');
  await page.waitForTimeout(200);
  await page.screenshot({ path: './shots/nest-02-outer-cell.png' });

  console.log(`[bench] typing ${M_CHARS} chars into OUTER col_0 name...`);
  const t1 = Date.now();
  const ksOuter = [];
  for (let i = 0; i < M_CHARS; i++) {
    const t0 = Date.now();
    await page.keyboard.press('z');
    await page.waitForTimeout(30);
    ksOuter.push(Date.now() - t0);
  }
  console.log(`[bench] [OUTER] ${M_CHARS} chars in ${Date.now() - t1}ms; ` +
    `per-key wallclock: ${ksOuter.join(',')}`);
  const snapOuterType = await page.evaluate(() => window.__perfSnapshot());
  fs.writeFileSync('./results/nest-02-outer-type.json',
    JSON.stringify(snapOuterType, null, 2));

  // --- Expand a row to reveal the inner indexes grid ---
  // The first row's edit pencil is the first button in that row. Use a
  // scoped locator.
  await page.locator('[data-test="expand-row"]').first().click()
    .catch(async () => {
      // fallback: any edit button near col_0
      await page.locator('button[aria-label*="Edit"]').first().click();
    });
  await page.waitForTimeout(1_500);
  await page.screenshot({ path: './shots/nest-03-expanded.png' });

  // --- Typing into an inner index Name cell ---
  await page.evaluate(() => window.__perfReset());

  const innerCell = page.locator('input[value="idx_0_0"]').first();
  const innerVisible = await innerCell.isVisible().catch(() => false);
  if (innerVisible) {
    await innerCell.click();
    await innerCell.press('End');
    await page.waitForTimeout(200);

    console.log(`[bench] typing ${M_CHARS} chars into INNER idx_0_0...`);
    const t2 = Date.now();
    const ksInner = [];
    for (let i = 0; i < M_CHARS; i++) {
      const t0 = Date.now();
      await page.keyboard.press('q');
      await page.waitForTimeout(30);
      ksInner.push(Date.now() - t0);
    }
    console.log(`[bench] [INNER] ${M_CHARS} chars in ${Date.now() - t2}ms; ` +
      `per-key wallclock: ${ksInner.join(',')}`);

    const snapInnerType = await page.evaluate(() => window.__perfSnapshot());
    fs.writeFileSync('./results/nest-03-inner-type.json',
      JSON.stringify(snapInnerType, null, 2));

    // --- Add a row to the inner indexes grid ---
    await page.evaluate(() => window.__perfReset());

    // The inner grid has its own [data-test="add-row"] button (second one,
    // since the outer grid has the first add-row button).
    const innerAdd = page.locator('[data-test="add-row"]').nth(1);
    if (await innerAdd.isVisible().catch(() => false)) {
      console.log('[bench] adding 5 rows to inner indexes...');
      const t3 = Date.now();
      for (let i = 0; i < 5; i++) {
        await innerAdd.click();
        await page.waitForTimeout(80);
      }
      console.log(`[bench] [INNER ADD] 5 rows in ${Date.now() - t3}ms`);
      const snapInnerAdd = await page.evaluate(() => window.__perfSnapshot());
      fs.writeFileSync('./results/nest-04-inner-add.json',
        JSON.stringify(snapInnerAdd, null, 2));
    } else {
      console.log('[bench] inner Add button not found, skipping');
    }
  } else {
    console.log('[bench] inner cell not visible after expand; skipping inner tests');
    await page.screenshot({ path: './shots/nest-03b-no-inner.png' });
  }

  await context.tracing.stop({ path: './traces/nested.zip' });

  console.log('\n========== MOUNT ==========');
  printSummary(snapAfterMount);
  console.log('\n========== OUTER CELL TYPING ==========');
  printSummary(snapOuterType);
});

function printSummary(snap) {
  console.log('STATS (ms):');
  console.log(
    'name'.padEnd(48),
    'count'.padStart(7),
    'total_ms'.padStart(10),
    'avg_ms'.padStart(10),
    'max_ms'.padStart(10),
  );
  for (const r of (snap.stats || [])) {
    console.log(
      r.name.padEnd(48),
      String(r.count).padStart(7),
      r.total_ms.toFixed(2).padStart(10),
      r.avg_ms.toFixed(3).padStart(10),
      r.max_ms.toFixed(3).padStart(10),
    );
  }
  if (snap.counts?.length) {
    console.log('COUNTERS:');
    for (const c of snap.counts)
      console.log(' ', c.name.padEnd(48), String(c.total).padStart(8));
  }
}
