/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Shared helpers for the audit-smoke Playwright specs. Keeps every
// spec's setup boilerplate identical so a divergence flagged by one
// dialog can be triaged the same way as the others.

import { expect } from '@playwright/test';

// Records every browser-side error so a divergence (thrown by the
// canary's defaultReport under the audit flags) is collected and
// asserted on at the end of the test.
export const installErrorRecorders = (page) => {
  const errors = [];
  page.on('pageerror', (err) => {
    errors.push({ kind: 'pageerror', message: err.message });
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push({ kind: 'console.error', message: msg.text() });
    }
  });
  return errors;
};

// Enables the canary's throw-on-divergence path. Without
// CANARY_BUILD=true at bundle time the canary is tree-shaken and
// these flags are no-ops — the smoke passes vacuously. The
// `__INCREMENTAL_AUDIT__` flag is also asserted later to confirm
// the page didn't reload mid-test.
export const enableAudit = async (page) => {
  await page.evaluate(() => {
    window.__INCREMENTAL_AUDIT__ = true;
    window.__throw_on_canary_divergence__ = true;
    window.__incremental_canary_max_per_session__ = Number.POSITIVE_INFINITY;
  });
};

// Auto-dismiss the "Unlock Saved Passwords" modal pgAdmin re-shows
// on any server-touching action. Matches the pattern in
// datagridview.spec.js so the new specs play nicely with it.
export const autoDismissUnlockModal = async (page) => {
  await page.addLocatorHandler(
    page.locator('div[role="dialog"]', { hasText: 'Unlock Saved Passwords' }),
    async (dlg) => {
      const candidates = [
        dlg.getByRole('button', { name: 'Cancel' }),
        dlg.locator('button:has-text("Cancel")'),
      ];
      for (const c of candidates) {
        try { await c.click({ timeout: 1_000 }); return; }
        catch { /* try next */ }
      }
      await page.keyboard.press('Escape');
    },
    { times: 30, noWaitAfter: true }
  );
};

// Assert no canary divergence surfaced during the test. Real test
// failures (selectors missing, etc.) will fail earlier — this is
// specifically for catching incremental-walker bugs the audit
// harness didn't synthesize.
export const expectNoDivergence = (errors) => {
  const divergences = errors.filter(
    (e) => /(Incremental walker divergence|Incremental validator divergence)/
      .test(e.message)
  );
  if (divergences.length > 0) {
    // eslint-disable-next-line no-console
    console.error('CANARY DIVERGENCES DETECTED:');
    for (const d of divergences) {
      // eslint-disable-next-line no-console
      console.error(`  [${d.kind}] ${d.message}`);
    }
  }
  expect(divergences).toEqual([]);
};

// pgAdmin's tree uses class-based selectors (no ARIA roles).
// Directory entries are `.file-entry.directory`; leaf entries are
// `.file-entry`. Context menus come from szh-menu — items use
// `.szh-menu__item` with the visible label as the text.
//
// These helpers mirror the patterns in datagridview.spec.js, which
// is the working reference for tree + dialog interaction on this
// codebase.

// Open the right-click context menu on a tree directory node by
// name, then click through Register → Server… or Create → <child>.
const openTreeContextMenu = async (page, parentName) => {
  const node = page.locator(
    '.file-entry.directory', { hasText: parentName }
  ).first();
  await node.waitFor({ state: 'visible', timeout: 15_000 });
  await node.click({ button: 'right' });
  await page.waitForTimeout(500);
};

// Ensure a server tree node exists and is connected. Strategy:
//
//   1. If the desired server name (env PGADMIN_SERVER_NAME, default
//      'PG18') is already in the tree, just click it to connect.
//   2. Otherwise pick the FIRST `.file-entry` under Servers as a
//      fallback — most local pgAdmin installs have a development
//      server already registered.
//
// The connect prompt for the saved password is auto-filled.
// Registration via the dialog flow was tried but is too brittle:
// the Save button stays disabled until every field passes inline
// validation and figuring out which field is missing in a real
// browser is harder than just reusing whatever's already there.
export const ensureServerRegistered = async (page, opts = {}) => {
  const preferredName = opts.name
    || process.env.PGADMIN_SERVER_NAME || 'PG18';
  const password = opts.password || process.env.PGPASSWORD || 'edb';

  // Always expand Servers first — its children aren't in the DOM
  // until the parent is open. pgAdmin's tree wants a double-click
  // to expand a directory; a single click only selects it.
  const serversNode = page.locator(
    '.file-entry.directory', { hasText: /^Servers$/ }
  ).first();
  await serversNode.dblclick();
  await page.waitForTimeout(2_000);

  // Look for the preferred name. If absent, pick whatever's visible
  // (most local installs have a development server pre-registered).
  let name = preferredName;
  let node = page.locator(
    '.file-entry.directory', { hasText: preferredName }
  ).first();
  if (!(await node.count())) {
    const candidates = page.locator('.file-entry.directory');
    const total = await candidates.count();
    for (let i = 0; i < total; i++) {
      const txt = (await candidates.nth(i).textContent() || '').trim();
      if (txt && txt !== 'Servers') { name = txt; break; }
    }
    node = page.locator(
      '.file-entry.directory', { hasText: name }
    ).first();
  }

  // Connect: dblclick the server node to trigger Connect. With no
  // saved password, pgAdmin shows the "Connect to Server" modal
  // asking for the user's password. Auto-fill it.
  await node.dblclick({ force: true });
  // Wait for either the Connect prompt or the Databases child to
  // appear. Whichever comes first wins.
  const connectPrompt = page.locator(
    'div[role="dialog"]', { hasText: 'Connect to Server' }
  ).first();
  try {
    await connectPrompt.waitFor({ state: 'visible', timeout: 8_000 });
    const pw = connectPrompt.locator('input[type="password"]').first();
    await pw.fill(password);
    await connectPrompt.locator('button:has-text("OK")').first().click(
      { force: true }
    );
  } catch {
    // No connect prompt — pgAdmin used a cached connection or saved
    // password worked. Either way, we proceed and wait for Databases.
  }
  // Wait until the server's "Databases" child appears (signals
  // connected). pgAdmin renders the row count as a sibling so the
  // file-entry's text is e.g. "Databases (1)" — don't anchor.
  await page.locator(
    '.file-entry.directory', { hasText: 'Databases' }
  ).first().waitFor({ state: 'visible', timeout: 30_000 });
  return name;
};

// Drill into the tree from a connected server to reach a target
// catalog node (Tables / Functions / Views / etc.). Returns once
// the catalog node is visible. Tree virtualization makes deep
// navigation brittle; failure here surfaces as a locator timeout.
export const navigateToCatalogNode = async (page, serverName, catalog, database) => {
  const db = database || process.env.PGDATABASE || 'postgres';

  // Each tree directory needs a click + keyboard expand. Click
  // focuses the node; ArrowRight expands it (idempotent — no toggle
  // on already-expanded). dblclick is unsafe because expanded
  // directories collapse on the second click. Single-click + key
  // is a no-op for already-expanded directories.
  const expand = async (matcher, settle = 1_500) => {
    const node = page.locator('.file-entry.directory', { hasText: matcher }).first();
    await node.waitFor({ state: 'attached', timeout: 15_000 });
    await node.scrollIntoViewIfNeeded({ timeout: 10_000 });
    await node.click();
    await page.waitForTimeout(200);
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(settle);
  };

  await expand('Databases', 4_000);
  // The DB node click triggers a connection — wait longer for it
  // to settle before checking for Schemas. Schemas may take time
  // to fetch from the DB too.
  await expand(new RegExp('^' + db + '$'), 8_000);
  await expand('Schemas', 6_000);
  await expand(/^public$/, 5_000);

  const node = page.locator(
    '.file-entry.directory', { hasText: new RegExp('^' + catalog + '$') }
  ).first();
  await node.waitFor({ state: 'visible', timeout: 15_000 });
  return node;
};

// Right-click a category (Tables / Functions / …) and click
// Create → <child> in the szh-menu context menu.
export const openCreateDialog = async (page, categoryName, childName) => {
  const node = page.locator(
    '.file-entry.directory', { hasText: new RegExp('^' + categoryName + '$') }
  ).first();
  await node.click({ button: 'right' });
  await page.waitForTimeout(500);
  await page.locator(
    '.szh-menu__item', { hasText: /^Create$/ }
  ).first().hover();
  await page.waitForTimeout(500);
  await page.getByText(childName, { exact: true }).first().click();
};
