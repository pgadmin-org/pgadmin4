/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Visual-regression smoke for the highest-impact SchemaView
// dialogs. Catches subtle rendering breakage the canary CAN'T see
// — the canary checks the walker's option-tree output, not what
// React renders from it. A field whose options compute correctly
// but renders with wrong styling/layout slips past every other
// test in this PR.
//
// Workflow for PR validation:
//
//   1. Capture baselines on MASTER (pre-PR), BEFORE this PR's
//      changes are applied:
//        a. git checkout master
//        b. cd web && CANARY_BUILD=true NODE_ENV=production \
//             ./node_modules/.bin/webpack --config webpack.config.js
//        c. python pgAdmin4.py &
//        d. cd web/regression/perf-bench
//        e. PGADMIN_URL=http://127.0.0.1:5050/browser/ \
//             ./node_modules/.bin/playwright test audit-visual-regression \
//             --update-snapshots --workers=1
//        f. The auto-captured PNGs land in
//           audit-visual-regression.spec.js-snapshots/
//        g. Cherry-pick that snapshot directory commit onto the
//           PR branch.
//
//   2. Run on PR — Playwright diffs against baselines:
//        a. Switch to the PR branch.
//        b. Rebuild bundle + restart pgAdmin.
//        c. PGADMIN_URL=http://127.0.0.1:5050/browser/ \
//             ./node_modules/.bin/playwright test audit-visual-regression \
//             --workers=1
//        d. Any visual change fails the test with a side-by-side
//           image diff at test-results/.../.
//
// Dialogs covered (5):
//   1. Edit Table (the heaviest dialog)
//   2. Create Function (function/trigger schema)
//   3. Create Type (sub-schema variations — composite default)
//   4. Edit Role (privileges + membership grids — heavy)
//   5. Create Index (amname deferred + with-clause nested-fieldset)
//
// NOT covered intentionally — bloats baseline maintenance:
//   - Every Create variant when Edit covers the same render
//   - Animated/transient UI states
//   - Tabs that only differ by sub-collection content (the SQL
//     preview tab regenerates differently each session)

import { test, expect } from '@playwright/test';
import {
  installErrorRecorders, enableAudit, autoDismissUnlockModal,
  ensureServerRegistered, navigateToCatalogNodeViaApi,
  navigateToServerCollectionViaApi, navigateToTableSubCollectionViaApi,
  openCreateDialogViaApi, openEditDialogViaApi,
} from './audit-helpers';

const PGADMIN_URL =
  process.env.PGADMIN_URL || 'http://127.0.0.1:5050/browser/';

// Animations + the SQL CodeMirror's blinking cursor make a naive
// `toHaveScreenshot` non-deterministic. The options below get us
// to a stable snapshot:
//   - disableAnimations: 'allow' is the closest Playwright provides
//     for SchemaView's MUI transitions; the explicit
//     animations: 'disabled' option works for any CSS animation.
//   - mask the CodeMirror SQL preview (test runs at varying speeds
//     so its content varies by single chars). Mask removes that
//     region from the diff.
//   - threshold: 0.01 is forgiving enough for sub-pixel font
//     rendering differences across machines (CI Linux vs macOS).
// `threshold` controls per-pixel color sensitivity; `maxDiffPixelRatio`
// caps how many pixels are allowed to diff at all. Even back-to-back
// runs on identical code show a few px of cursor-blink / focus-ring
// noise — 0.5% (≈100 px on a 900×550 dialog) absorbs that without
// missing a real layout shift (which spans thousands of px).
const SCREENSHOT_OPTS = {
  animations: 'disabled',
  threshold: 0.01,
  maxDiffPixelRatio: 0.005,
  fullPage: false,
};

const bootPage = async (page) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await autoDismissUnlockModal(page);
  await page.goto(PGADMIN_URL, { waitUntil: 'load', timeout: 60_000 });
  await page.locator('.file-entry').first().waitFor({
    state: 'visible', timeout: 30_000,
  });
  await page.waitForTimeout(1_000);
  await enableAudit(page);
};

// Locate the dialog content area. pgAdmin uses rc-dock (not a
// raw role="dialog" modal) — property dialogs render inside a
// `.dock-panel.dock-style-dialogs` panel. Snapshotting just the
// dialog, not the full page, avoids noise from the tree (which
// can have unrelated state).
const dialogLocator = (page) =>
  page.locator('.dock-panel.dock-style-dialogs').first();

test('Visual: Edit Table dialog', async ({ page }) => {
  installErrorRecorders(page);
  await bootPage(page);
  await ensureServerRegistered(page);
  await navigateToCatalogNodeViaApi(page, 'Tables');
  await openEditDialogViaApi(page, 'table');
  await page.getByRole('textbox', { name: 'Name' }).first().waitFor({
    state: 'visible', timeout: 20_000,
  });
  // Settle: any post-mount fixedRows promises (vacuum_table /
  // vacuum_toast) need to land before snapshotting.
  await page.waitForTimeout(2_000);
  await expect(dialogLocator(page)).toHaveScreenshot(
    'edit-table.png', SCREENSHOT_OPTS
  );
});

test('Visual: Create Function dialog', async ({ page }) => {
  installErrorRecorders(page);
  await bootPage(page);
  await ensureServerRegistered(page);
  await navigateToCatalogNodeViaApi(page, 'Functions');
  await openCreateDialogViaApi(page, 'function');
  await page.getByRole('textbox', { name: 'Name' }).first().waitFor({
    state: 'visible', timeout: 20_000,
  });
  await page.waitForTimeout(1_500);
  await expect(dialogLocator(page)).toHaveScreenshot(
    'create-function.png', SCREENSHOT_OPTS
  );
});

test('Visual: Create Type dialog (composite default)', async ({ page }) => {
  installErrorRecorders(page);
  await bootPage(page);
  await ensureServerRegistered(page);
  await navigateToCatalogNodeViaApi(page, 'Types');
  await openCreateDialogViaApi(page, 'type');
  await page.getByRole('textbox', { name: 'Name' }).first().waitFor({
    state: 'visible', timeout: 20_000,
  });
  await page.waitForTimeout(1_500);
  await expect(dialogLocator(page)).toHaveScreenshot(
    'create-type.png', SCREENSHOT_OPTS
  );
});

test('Visual: Edit Role dialog', async ({ page }) => {
  installErrorRecorders(page);
  await bootPage(page);
  await ensureServerRegistered(page);
  await navigateToServerCollectionViaApi(page, 'coll-role');
  // Open Properties on the FIRST role under server.
  await openEditDialogViaApi(page, 'role');
  await page.getByRole('textbox', { name: 'Name' }).first().waitFor({
    state: 'visible', timeout: 20_000,
  });
  await page.waitForTimeout(2_000);
  await expect(dialogLocator(page)).toHaveScreenshot(
    'edit-role.png', SCREENSHOT_OPTS
  );
});

test('Visual: Create Index dialog (under table)', async ({ page }) => {
  installErrorRecorders(page);
  await bootPage(page);
  await ensureServerRegistered(page);
  await navigateToTableSubCollectionViaApi(page, 'coll-index');
  await openCreateDialogViaApi(page, 'index');
  await page.getByRole('textbox', { name: 'Name' }).first().waitFor({
    state: 'visible', timeout: 20_000,
  });
  await page.waitForTimeout(1_500);
  await expect(dialogLocator(page)).toHaveScreenshot(
    'create-index.png', SCREENSHOT_OPTS
  );
});
