// DataGridView profiling — Register Server > Parameters
//
// Scenario:
//   1. Load pgAdmin
//   2. Open the Register Server dialog (no DB connection needed)
//   3. Switch to the Parameters tab (DataGridView with 'variables' collection)
//   4. Add N rows (measures ADD_ROW cost)
//   5. Type M chars into a cell (measures SET_VALUE cost per keystroke)
//   6. Delete a row (measures DELETE_ROW cost)
//   7. Dump aggregated measures + a Playwright trace
//
// Tunables via env:
//   N_ROWS=20  M_CHARS=20  HEADLESS=true  PGADMIN_URL=http://127.0.0.1:5050/browser/

import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const PGADMIN_URL =
  process.env.PGADMIN_URL || 'http://127.0.0.1:5050/browser/';
const N_ROWS = parseInt(process.env.N_ROWS || '100', 10);
const M_CHARS = parseInt(process.env.M_CHARS || '20', 10);

fs.mkdirSync('./shots', { recursive: true });
fs.mkdirSync('./traces', { recursive: true });
fs.mkdirSync('./results', { recursive: true });

test('DataGridView: Register Server > Parameters', async ({ page, context }) => {
  page.on('pageerror', err =>
    console.log('  [pageerror]', err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('  [browser-error]', msg.text());
  });

  await context.tracing.start({ screenshots: true, snapshots: true });

  // --- Load ---
  await page.setViewportSize({ width: 1600, height: 1000 });

  // Persistent auto-dismiss handler for the "Unlock Saved Passwords" modal.
  // pgAdmin can re-show this whenever a server-related action happens; we
  // just want to skip the master password every time.
  await page.addLocatorHandler(
    page.locator('div[role="dialog"]', { hasText: 'Unlock Saved Passwords' }),
    async (dlg) => {
      console.log('  [auto] dismissing Unlock Saved Passwords modal');
      // Try several Cancel locators within the modal
      const candidates = [
        dlg.getByRole('button', { name: 'Cancel' }),
        dlg.locator('button:has-text("Cancel")'),
        dlg.locator('[aria-label="Cancel"]'),
        dlg.locator('text=Cancel').locator('xpath=ancestor-or-self::*[self::button or @role="button"][1]'),
      ];
      for (const c of candidates) {
        try {
          await c.click({ timeout: 1_000 });
          return;
        } catch { /* try next */ }
      }
      // Fallback: press Escape
      await page.keyboard.press('Escape');
    },
    { times: 30, noWaitAfter: true }
  );

  await page.goto(PGADMIN_URL, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.waitForTimeout(3_000);
  await page.screenshot({ path: './shots/00-after-load.png' });

  // Confirm our instrumentation hook is present.
  expect(await page.evaluate(() => typeof window.__perfSnapshot))
    .toBe('function');

  // The locator handler registered above will dismiss any Unlock Saved
  // Passwords modal that pops up. Give it a moment to fire on initial load.
  await page.waitForTimeout(2_000);
  await page.screenshot({ path: './shots/00b-after-modal-dismiss.png' });

  // --- Open Register Server dialog ---
  // The tree uses class-based selectors (no ARIA tree roles).
  // Right-click on the "Servers" directory node, then choose Register > Server.
  await page.screenshot({ path: './shots/01b-before-open.png' });

  const serversNode = page.locator('.file-entry.directory', { hasText: 'Servers' }).first();
  await serversNode.waitFor({ state: 'visible', timeout: 10_000 });
  await serversNode.click({ button: 'right' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: './shots/01c-context-menu.png' });

  // Context menu uses szh-menu library. Items have role="menuitem".
  // Hover Register to open submenu, then click Server...
  await page.locator('.szh-menu__item', { hasText: /^Register$/ }).first().hover();
  await page.waitForTimeout(800);
  await page.screenshot({ path: './shots/01d-register-hover.png' });
  // Click the submenu item "Server...". Use exact text match without anchor.
  await page.getByText('Server...', { exact: true }).first().click();

  // Find the Register Server dialog. Title contains "Register" + "Server",
  // but the dialog itself doesn't have role=dialog — pgAdmin renders dialogs
  // in dockable panes. Look for the form by the "Parameters" tab presence.
  await page.waitForTimeout(2_000);
  const dialog = page.locator('div').filter({
    has: page.getByRole('tab', { name: 'Parameters' })
  }).first();
  await dialog.waitFor({ state: 'visible', timeout: 15_000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: './shots/02-dialog-open.png' });

  // --- Switch to Parameters tab ---
  await dialog.getByRole('tab', { name: 'Parameters' }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: './shots/03-parameters-tab.png' });

  // --- Enable instrumentation + reset counters ---
  await page.evaluate(() => {
    window.__PERF_SCHEMA__ = true;
    window.__perfReset && window.__perfReset();
  });

  // --- Add N_ROWS rows (measures ADD_ROW cost) ---
  // The DataGridView header's Add button has data-test="add-row".
  const addBtn = dialog.locator('[data-test="add-row"]').first();

  console.log(`[bench] Adding ${N_ROWS} rows...`);
  const addStart = Date.now();
  for (let i = 0; i < N_ROWS; i++) {
    await addBtn.click({ force: true });
    // Tiny pause so React can commit between dispatches.
    await page.waitForTimeout(50);
  }
  const addElapsed = Date.now() - addStart;
  console.log(`[bench] Added ${N_ROWS} rows in ${addElapsed}ms ` +
    `(avg ${(addElapsed / N_ROWS).toFixed(1)}ms / row, includes 50ms idle)`);

  await page.screenshot({ path: './shots/04-rows-added.png' });

  // Snapshot perf after adding rows
  const snapAfterAdd = await page.evaluate(() => window.__perfSnapshot());
  fs.writeFileSync('./results/01-after-add.json',
    JSON.stringify(snapAfterAdd, null, 2));

  // --- Typing in Parameters tab grid (Connection timeout Value cell) ---
  // This cell holds "10" and is a real number/text input. Typing here
  // exercises SET_VALUE inside a DataGridView with ~100 rows behind it,
  // so it captures the state-cascade cost AND the grid re-render cost.
  await page.evaluate(() => window.__perfReset());

  // Scroll to top of grid so the original SSL mode / Connection timeout
  // rows are visible.
  await dialog.locator('[data-test="data-grid-view"]').first().evaluate(el => {
    const scrollable = el.querySelector('[class*="DataGridView-table"]')?.parentElement
      || el;
    scrollable.scrollTop = 0;
  });
  await page.waitForTimeout(300);

  // The Value cell of the Connection timeout row contains "10".
  const valueCell = dialog.locator('input[value="10"]').first();
  await valueCell.waitFor({ state: 'visible', timeout: 5_000 });
  await valueCell.click();
  await valueCell.press('End');
  await page.waitForTimeout(200);
  await page.screenshot({ path: './shots/05a-grid-cell-focused.png' });

  console.log(`[bench] Typing ${M_CHARS} chars into GRID Value cell...`);
  const typeStart = Date.now();
  const perKeystroke = [];
  for (let i = 0; i < M_CHARS; i++) {
    const t0 = Date.now();
    await page.keyboard.press('1');
    await page.waitForTimeout(30);
    perKeystroke.push(Date.now() - t0);
  }
  const typeElapsed = Date.now() - typeStart;
  console.log(`[bench] [GRID] Typed ${M_CHARS} chars in ${typeElapsed}ms ` +
    `(avg ${(typeElapsed / M_CHARS).toFixed(1)}ms / char, includes 30ms idle)`);
  console.log('[bench] [GRID] per-keystroke wallclock ms:', perKeystroke.join(','));

  const snapAfterGridType = await page.evaluate(() => window.__perfSnapshot());
  fs.writeFileSync('./results/02-after-grid-type.json',
    JSON.stringify(snapAfterGridType, null, 2));
  await page.screenshot({ path: './shots/05b-after-grid-type.png' });

  // --- Typing in General tab Name field (no grid rendering) ---
  // Same SchemaView state machinery, but the heavy grid isn't on screen.
  // Difference between this and the grid case tells us how much of the
  // per-keystroke cost is render vs state cascade.
  await dialog.getByRole('tab', { name: 'General' }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: './shots/05d-general-tab.png' });
  await page.evaluate(() => window.__perfReset());

  // Find the Name input by label — most robust.
  const nameInput = dialog.getByLabel(/^Name$/).first();
  await nameInput.waitFor({ state: 'visible', timeout: 5_000 });
  await nameInput.click();
  await page.waitForTimeout(200);

  console.log(`[bench] Typing ${M_CHARS} chars into GENERAL Name field (no grid render)...`);
  const typeStart2 = Date.now();
  const perKeystroke2 = [];
  for (let i = 0; i < M_CHARS; i++) {
    const t0 = Date.now();
    await page.keyboard.press('a');
    await page.waitForTimeout(30);
    perKeystroke2.push(Date.now() - t0);
  }
  const typeElapsed2 = Date.now() - typeStart2;
  console.log(`[bench] [GENERAL] Typed ${M_CHARS} chars in ${typeElapsed2}ms ` +
    `(avg ${(typeElapsed2 / M_CHARS).toFixed(1)}ms / char, includes 30ms idle)`);
  console.log('[bench] [GENERAL] per-keystroke wallclock ms:', perKeystroke2.join(','));

  const snapAfterGeneralType = await page.evaluate(() => window.__perfSnapshot());
  fs.writeFileSync('./results/03-after-general-type.json',
    JSON.stringify(snapAfterGeneralType, null, 2));
  await page.screenshot({ path: './shots/05c-after-general-type.png' });

  await context.tracing.stop({ path: './traces/datagridview.zip' });

  // --- Summary printed to stdout ---
  console.log('\n========== AFTER ADD ROWS ==========');
  printSummary(snapAfterAdd);

  console.log('\n========== AFTER GRID CELL TYPING (' + M_CHARS + ' chars) ==========');
  printSummary(snapAfterGridType);

  console.log('\n========== AFTER GENERAL FIELD TYPING (' + M_CHARS + ' chars, no grid render) ==========');
  printSummary(snapAfterGeneralType);
});

function printSummary(snap) {
  const rows = snap.stats || [];
  const fmt = (s) => s.toString().padStart(10);
  console.log(
    'name'.padEnd(48),
    'count'.padStart(7),
    'total_ms'.padStart(10),
    'avg_ms'.padStart(10),
    'max_ms'.padStart(10),
  );
  for (const r of rows) {
    console.log(
      r.name.padEnd(48),
      fmt(r.count).padStart(7),
      fmt(r.total_ms.toFixed(2)),
      fmt(r.avg_ms.toFixed(3)),
      fmt(r.max_ms.toFixed(3)),
    );
  }
  if (snap.actions?.length) {
    console.log(`(${snap.actions.length} reducer actions logged)`);
  }
}
