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
// Dialogs covered (20 — 1:1 with audit-smoke-extended + relevant
// audit-smoke originals; matches the smoke set's distinct dialogs):
//
//   Schema-level (15):
//     Edit Table              Create Table           Create Function
//     Edit Function           Create View            Create MView
//     Create Sequence         Create Type            Create Domain
//     Create Procedure        Create Aggregate       Create Foreign Table
//     Create Collation        Create FTS Config      Create Trigger Function
//
//   Server-level (3):
//     Edit Role               Create Role            Create Tablespace
//
//   Sub-catalog (2):
//     Create Index            Create Trigger
//
// NOT covered intentionally:
//   - Register Server (right-click + multi-tab fills make for a noisy
//     baseline — covered by audit-smoke.spec.js instead).
//   - SQL preview tab (CodeMirror state is timing-dependent).
//   - Animated/transient UI states.
//
// Per-test disconnect in afterEach releases pgAdmin's PG connection
// pool after each spec, so 20 sequential specs don't approach PG
// max_connections.

import { test, expect } from '@playwright/test';
import {
  installErrorRecorders, enableAudit, autoDismissUnlockModal,
  expectNoDivergence,
  ensureServerRegistered, navigateToCatalogNodeViaApi,
  navigateToServerCollectionViaApi, navigateToTableSubCollectionViaApi,
  openCreateDialogViaApi, openEditDialogViaApi,
  disconnectServerViaApi,
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

// Per-test disconnect — releases this spec's pgAdmin server-side
// PG connection pool so 20 specs in sequence don't approach PG's
// max_connections. Same shape as audit-smoke-extended.
test.afterEach(async ({ page }) => {
  await disconnectServerViaApi(page);
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
  // Asserts the audit flag survived page load — if pgAdmin reloaded
  // the SPA between goto and now (rare, but possible after a server
  // connect prompt), audit would be off, the canary tree-shaken
  // branch wouldn't run, and the visual snapshot would match an
  // unaudited render. Fail loud instead.
  expect(await page.evaluate(() => window.__INCREMENTAL_AUDIT__)).toBe(true);
};

// Locate the dialog content area. pgAdmin uses rc-dock (not a
// raw role="dialog" modal) — property dialogs render inside a
// `.dock-panel.dock-style-dialogs` panel. Snapshotting just the
// dialog, not the full page, avoids noise from the tree (which
// can have unrelated state).
const dialogLocator = (page) =>
  page.locator('.dock-panel.dock-style-dialogs').first();

// Common dialog-snapshot helpers. The 20 specs converge on the same
// shape (navigate → open → wait Name → settle → snapshot), so they
// share helpers rather than 20x copy-paste.
//
// Each helper asserts BOTH the pixel diff and the walker-canary
// cleanliness. Visual diff catches CSS/layout regressions; canary
// catches walker regressions; the two surfaces are orthogonal and
// both signals are free to collect once the dialog is open.
const waitDialogReady = async (page, settleMs = 1_500) => {
  await page.getByRole('textbox', { name: 'Name' }).first().waitFor({
    state: 'visible', timeout: 20_000,
  });
  await page.waitForTimeout(settleMs);
};

const snapshotSchemaChild = async (
  page, catalogLabel, nodeType, snapshotName,
  { editMode = false, settleMs = 1_500, opts = {} } = {}
) => {
  const errors = installErrorRecorders(page);
  await bootPage(page);
  await ensureServerRegistered(page);
  await navigateToCatalogNodeViaApi(page, catalogLabel);
  if (editMode) await openEditDialogViaApi(page, nodeType);
  else await openCreateDialogViaApi(page, nodeType);
  await waitDialogReady(page, settleMs);
  await expect(dialogLocator(page)).toHaveScreenshot(
    snapshotName, { ...SCREENSHOT_OPTS, ...opts }
  );
  expectNoDivergence(errors);
};

const snapshotServerChild = async (
  page, collectionType, nodeType, snapshotName,
  { editMode = false, settleMs = 1_500, opts = {} } = {}
) => {
  const errors = installErrorRecorders(page);
  await bootPage(page);
  await ensureServerRegistered(page);
  await navigateToServerCollectionViaApi(page, collectionType);
  if (editMode) await openEditDialogViaApi(page, nodeType);
  else await openCreateDialogViaApi(page, nodeType);
  await waitDialogReady(page, settleMs);
  await expect(dialogLocator(page)).toHaveScreenshot(
    snapshotName, { ...SCREENSHOT_OPTS, ...opts }
  );
  expectNoDivergence(errors);
};

const snapshotTableChild = async (
  page, subCollectionType, nodeType, snapshotName,
  { settleMs = 1_500, opts = {} } = {}
) => {
  const errors = installErrorRecorders(page);
  await bootPage(page);
  await ensureServerRegistered(page);
  await navigateToTableSubCollectionViaApi(page, subCollectionType);
  await openCreateDialogViaApi(page, nodeType);
  await waitDialogReady(page, settleMs);
  await expect(dialogLocator(page)).toHaveScreenshot(
    snapshotName, { ...SCREENSHOT_OPTS, ...opts }
  );
  expectNoDivergence(errors);
};

// =============================================================
// Schema-level dialogs (15)
// =============================================================

test('Visual: Edit Table dialog', async ({ page }) => {
  // Heaviest dialog. settleMs=2000 so vacuum_table/vacuum_toast
  // fixedRows promises land before snapshot.
  await snapshotSchemaChild(
    page, 'Tables', 'table', 'edit-table.png',
    { editMode: true, settleMs: 2_000 }
  );
});

test('Visual: Create Table dialog', async ({ page }) => {
  await snapshotSchemaChild(
    page, 'Tables', 'table', 'create-table.png',
    { settleMs: 2_000 }
  );
});

test('Visual: Create Function dialog', async ({ page }) => {
  await snapshotSchemaChild(page, 'Functions', 'function', 'create-function.png');
});

test('Visual: Edit Function dialog', async ({ page }) => {
  // First function in the schema. Mask Name (env-specific).
  // Locator scoped to the dialog panel — Playwright `.getByRole` at
  // page level would also match Name fields in unrelated overlays
  // (none today, but defensive against future schema changes).
  await snapshotSchemaChild(
    page, 'Functions', 'function', 'edit-function.png',
    {
      editMode: true,
      settleMs: 2_000,
      opts: {
        mask: [
          dialogLocator(page).getByRole('textbox', { name: 'Name' }).first(),
        ],
      },
    }
  );
});

test('Visual: Create View dialog', async ({ page }) => {
  await snapshotSchemaChild(page, 'Views', 'view', 'create-view.png');
});

test('Visual: Create Materialized View dialog', async ({ page }) => {
  await snapshotSchemaChild(page, 'Materialized Views', 'mview', 'create-mview.png');
});

test('Visual: Create Sequence dialog', async ({ page }) => {
  await snapshotSchemaChild(page, 'Sequences', 'sequence', 'create-sequence.png');
});

test('Visual: Create Type dialog (composite default)', async ({ page }) => {
  await snapshotSchemaChild(page, 'Types', 'type', 'create-type.png');
});

test('Visual: Create Domain dialog', async ({ page }) => {
  await snapshotSchemaChild(page, 'Domains', 'domain', 'create-domain.png');
});

test('Visual: Create Procedure dialog', async ({ page }) => {
  await snapshotSchemaChild(page, 'Procedures', 'procedure', 'create-procedure.png');
});

test('Visual: Create Aggregate dialog', async ({ page }) => {
  await snapshotSchemaChild(page, 'Aggregates', 'aggregate', 'create-aggregate.png');
});

test('Visual: Create Foreign Table dialog', async ({ page }) => {
  await snapshotSchemaChild(
    page, 'Foreign Tables', 'foreign_table', 'create-foreign-table.png'
  );
});

test('Visual: Create Collation dialog', async ({ page }) => {
  await snapshotSchemaChild(page, 'Collations', 'collation', 'create-collation.png');
});

test('Visual: Create FTS Configuration dialog', async ({ page }) => {
  await snapshotSchemaChild(
    page, 'FTS Configurations', 'fts_configuration', 'create-fts-config.png'
  );
});

test('Visual: Create Trigger Function dialog', async ({ page }) => {
  await snapshotSchemaChild(
    page, 'Trigger Functions', 'trigger_function', 'create-trigger-function.png'
  );
});

// =============================================================
// Server-level dialogs (3)
// =============================================================

test('Visual: Edit Role dialog', async ({ page }) => {
  // Different test envs have different first-role names — mask Name +
  // Comments. Layout-shift regressions still show up because the
  // surrounding tab/header/grid pixels still diff.
  // Locators scoped to the dialog panel so privileges/membership
  // grid headers that happen to be ARIA-labeled "Comments" can't
  // collide with the actual General-tab Comments textarea.
  await snapshotServerChild(
    page, 'coll-role', 'role', 'edit-role.png',
    {
      editMode: true,
      settleMs: 2_000,
      opts: {
        mask: [
          dialogLocator(page).getByRole('textbox', { name: 'Name' }).first(),
          dialogLocator(page).getByRole('textbox', { name: 'Comments' }).first(),
        ],
      },
    }
  );
});

test('Visual: Create Role dialog', async ({ page }) => {
  await snapshotServerChild(page, 'coll-role', 'role', 'create-role.png');
});

test('Visual: Create Tablespace dialog', async ({ page }) => {
  await snapshotServerChild(
    page, 'coll-tablespace', 'tablespace', 'create-tablespace.png'
  );
});

// =============================================================
// Sub-catalog dialogs (2)
// =============================================================

test('Visual: Create Index dialog (under table)', async ({ page }) => {
  await snapshotTableChild(
    page, 'coll-index', 'index', 'create-index.png'
  );
});

test('Visual: Create Trigger dialog (under table)', async ({ page }) => {
  await snapshotTableChild(
    page, 'coll-trigger', 'trigger', 'create-trigger.png'
  );
});
