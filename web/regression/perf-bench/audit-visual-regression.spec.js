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

// Animations + cursor-blink / focus-ring rendering make a naive
// `toHaveScreenshot` non-deterministic. Two knobs control sensitivity:
//   - threshold: per-pixel color delta tolerance (0.01 = 1%).
//   - maxDiffPixels: absolute count of pixels allowed to differ at all.
//     Calibrated by capturing twice on identical code and adding a
//     safety margin (~5x measured noise) — not by dialing up until
//     CI is green. Current: typical dialog renders at ~1200x800;
//     observed back-to-back drift is 0-15 px on darwin, almost all
//     cursor blink in the focused field. 100 px lets a small icon or
//     a few characters of a label move; a real layout shift (label
//     wraps, field moves) is thousands of pixels.
//   - SQL preview tab content is non-deterministic (timing-dependent
//     CodeMirror state). Specs intentionally do NOT navigate to the
//     SQL tab — they snapshot the General tab only.
const SCREENSHOT_OPTS = {
  animations: 'disabled',
  threshold: 0.01,
  maxDiffPixels: 100,
  fullPage: false,
};

// Visual baselines are environment-specific (OS, browser version, PG
// version all influence font rendering and field-availability). The
// committed baselines were captured on darwin; running on another
// platform without first capturing fresh baselines for it gives
// guaranteed false positives. Skip the suite on non-darwin until a
// per-platform snapshot strategy lands (see README-visual-regression.md
// — "Limitations to migrate away from").
test.beforeEach(() => {
  test.skip(
    process.platform !== 'darwin',
    'Visual baselines are darwin-only; see README-visual-regression.md '
    + 'for per-platform capture instructions before enabling.'
  );
});

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
  // Open Properties on the FIRST role under server. Different test
  // envs have different first-role names (postgres on a vanilla
  // install, custom role on a dev box) — so we MASK the Name input
  // and Comments multiline. Layout-shift regressions still show up
  // because the surrounding tab/header/grid pixels still diff.
  await openEditDialogViaApi(page, 'role');
  await page.getByRole('textbox', { name: 'Name' }).first().waitFor({
    state: 'visible', timeout: 20_000,
  });
  await page.waitForTimeout(2_000);
  await expect(dialogLocator(page)).toHaveScreenshot(
    'edit-role.png',
    {
      ...SCREENSHOT_OPTS,
      mask: [
        page.getByRole('textbox', { name: 'Name' }).first(),
        page.getByRole('textbox', { name: 'Comments' }).first(),
      ],
    }
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
