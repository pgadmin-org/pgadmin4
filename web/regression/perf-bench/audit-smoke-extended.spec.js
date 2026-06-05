/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Extended UI smoke covering 15 dialog types beyond the 5 in
// audit-smoke.spec.js. Each spec opens the dialog, exercises it with
// real dispatches (SET_VALUE on Name, tab-switch through every tab,
// ADD_ROW on the first DataGridView, SET_VALUE on the new row's
// first cell), closes (auto-dismissing any "discard changes?"
// prompt), and asserts the walker canary stayed quiet.
//
// Coverage by category (each = one dialog type, picked from the
// most production-relevant of create / edit per dialog):
//
//   Schema-level (10): View, MaterializedView, Sequence, Type,
//                      Domain, Procedure, Aggregate, ForeignTable,
//                      Collation, FTS Configuration
//   Trigger Function (1): server-supported function variant
//   Server-level  (2): Role, Tablespace
//   Sub-catalog   (2): Trigger, Index
//
// (Note: Database, EventTrigger and CompoundTrigger dialogs were in
// the original spec list but were dropped — Database needs more
// dialog-shape work, and the other two aren't shown on a vanilla
// non-superuser PG 16 install. Replaced with Collation, FTS
// Configuration, Trigger Function which exercise comparable code
// paths.)
//
// Why interaction-level, not mount-only: a walker bug that triggers
// only on ADD_ROW or tab-switch (i.e. anything beyond initial
// validation pass) would slip past a mount-only smoke. The
// `exerciseDialog` helper below fires real dispatches so the canary
// has something to disagree about. Best-effort — dialogs without a
// DataGrid or Name field silently skip those steps; validation
// errors raised by the typed values aren't confused with canary
// divergences (expectNoDivergence filters on canary-specific
// messages only).
//
// Does NOT click Save (no DB writes; no teardown). Save-path
// coverage for the heaviest dialog (Table) lives in the
// table-*.spec.js suite on dev/table-dialog-tests.

import { test, expect } from '@playwright/test';
import {
  installErrorRecorders, enableAudit, autoDismissUnlockModal,
  expectNoDivergence, ensureServerRegistered,
  navigateToCatalogNodeViaApi, navigateToServerCollectionViaApi,
  navigateToTableSubCollectionViaApi,
  openCreateDialogViaApi, openEditDialogViaApi,
  auditDebug, disconnectServerViaApi,
} from './audit-helpers.js';

// Each spec is self-contained (its own browser context, its own
// pgAdmin session). The worker-scoped page experiment (per-worker
// shared page + ensureServerRegistered fast-path) was DROPPED:
// tests interfered with each other through pgAdmin's per-session
// tree-state cache (pre-cached collection children invalidated by
// later spec navigations), surfacing as 30%-50% "no child of type X
// found" flakes regardless of worker count. Test-scoped page +
// per-test afterEach disconnect is the working shape.
test.describe.configure({ mode: 'parallel' });

const PGADMIN_URL =
  process.env.PGADMIN_URL || 'http://127.0.0.1:5050/browser/';

const bootPage = async (page) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await autoDismissUnlockModal(page);
  await page.goto(PGADMIN_URL, { waitUntil: 'load', timeout: 60_000 });
  await page.locator('.file-entry').first().waitFor({
    state: 'visible', timeout: 30_000,
  });
  await page.waitForTimeout(1_000);
  await enableAudit(page);
  expect(await page.evaluate(() => window.__INCREMENTAL_AUDIT__)).toBe(true);
};

// eslint-disable-next-line no-empty-pattern
test.beforeEach(({}, testInfo) => {
  auditDebug(`=== spec start === ${testInfo.title}`);
});
test.afterEach(async ({ page }, testInfo) => {
  await disconnectServerViaApi(page);
  auditDebug(
    `=== spec end ===   ${testInfo.title} `
    + `[${testInfo.status}] in ${testInfo.duration}ms`
  );
});

// Close button scoped to the SchemaView dialog panel — avoids matching
// transient toasts or the Unlock Saved Passwords dialog (rare race;
// has its own Close affordance) that may briefly co-exist.
const SCHEMA_DIALOG_CLOSE =
  '.dock-panel.dock-style-dialogs button[data-test="Close"]';

// Asserts the canary build code actually ran during this dialog mount.
// Without this we'd only be asserting `__INCREMENTAL_AUDIT__` (a flag
// set by enableAudit itself) — which would pass vacuously on a
// non-CANARY_BUILD bundle where the canary is tree-shaken away.
//
// Caller passes the *baseline* count taken before opening the dialog;
// we assert it strictly increased. Delta-check (rather than > 0)
// defends against future configurations that share a page across
// tests (e.g. `test.describe.configure({ mode: 'serial' })` with a
// worker-scoped page fixture) where a stale leftover count would
// silently pass a > 0 check.
const readCanaryCount = (page) =>
  page.evaluate(() => window.__canary_entry_count__ || 0);
const expectCanaryExecuted = async (page, baselineCount) => {
  const n = await readCanaryCount(page);
  expect(
    n, 'canary did not execute — likely a non-CANARY_BUILD bundle '
       + 'or the dialog never mounted'
  ).toBeGreaterThan(baselineCount);
};

// Exercise the open dialog beyond just "did it mount" so the walker
// canary sees real dispatches. Mount-only smoke catches the narrow
// "schema crashes at construction" regression; the broader walker
// bugs (collection ADD_ROW, tab-switch field recomputation,
// cross-tab dep evaluation) only fire when the user actually
// interacts. Each interaction below maps to a real dispatch type:
//
//   - fill Name        → SET_VALUE on top-level scalar
//   - click each tab   → renders OTHER tab's fields, exercises their
//                        deps + initial validate pass
//   - click add-row    → ADD_ROW dispatch on a DataGridView
//   - fill first cell  → SET_VALUE on a collection row
//
// Best-effort: dialogs without a DataGrid skip the add-row step,
// dialogs without a Name skip the fill. Validation errors raised by
// the interactions are NOT confused with canary divergences —
// expectNoDivergence filters to canary-specific messages only.
const exerciseDialog = async (page, { editMode = false } = {}) => {
  auditDebug('exerciseDialog: start');
  const dialog = page.locator('.dock-panel.dock-style-dialogs').first();

  // 1. SET_VALUE on Name. Some dialogs may have a disabled or
  // missing Name field — silent-skip rather than fail the helper.
  //
  // Defensive: skip the Name fill in EDIT mode. The seeded objects
  // (audit_smoke_table, audit_smoke_view, etc.) are looked up by
  // name by subsequent specs in the same iteration; if the close
  // path ever shifts from "Discard changes" to "Save" (e.g. a future
  // pgAdmin change to the confirm-prompt verb), filling Name in
  // Edit mode would rename the seeded fixture mid-suite and break
  // every subsequent Edit-mode test. Create mode is safe — the dialog
  // mounts with no persisted record, save would create a NEW object.
  auditDebug('exerciseDialog.1 Name fill: start');
  const _t1 = Date.now();
  if (!editMode) {
    const nameBox = dialog.getByRole('textbox', { name: 'Name' }).first();
    if (await nameBox.isEditable().catch(() => false)) {
      await nameBox.fill('audit_smoke_x').catch(() => {});
      await page.waitForTimeout(150);
    }
  }
  auditDebug('exerciseDialog.1 Name fill: complete', `${Date.now() - _t1}ms`);

  // 2. Click each tab button. pgAdmin's SchemaView tabs render as
  // <button data-test="<TabName>">. Skip action buttons that share
  // the same selector (Close / Save / Reset / Help / Delete).
  auditDebug('exerciseDialog.2 tab-switch: start');
  const _t2 = Date.now();
  const SKIP = new Set(['Close', 'Save', 'Reset', 'Help', 'Delete', 'Add']);
  const tabBtns = await dialog.locator('button[data-test]').all();
  let tabsClicked = 0;
  for (const btn of tabBtns) {
    const dt = await btn.getAttribute('data-test').catch(() => null);
    if (!dt || SKIP.has(dt)) continue;
    if (!(await btn.isVisible().catch(() => false))) continue;
    await btn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(120);
    tabsClicked += 1;
  }
  auditDebug(
    'exerciseDialog.2 tab-switch: complete',
    `${tabsClicked} tabs in ${Date.now() - _t2}ms`
  );

  // 3. ADD_ROW on the first DataGridView found anywhere in the
  // dialog. Dialogs with no grids skip cleanly.
  auditDebug('exerciseDialog.3 add-row: start');
  const _t3 = Date.now();
  const addRow = dialog.locator('[data-test="add-row"]').first();
  let addedRow = false;
  if (await addRow.isVisible().catch(() => false)) {
    await addRow.click({ force: true }).catch(() => {});
    await page.waitForTimeout(250);
    addedRow = true;

    // 4. SET_VALUE on whatever `table input` Playwright resolves to
    // FIRST in the dialog — typically the first cell of the first
    // grid (NOT necessarily the row just added, which is appended
    // at the bottom). Best-effort: the goal is a SET_VALUE dispatch
    // somewhere in a grid; identity of the target cell is
    // secondary. Many grids render the first cell as a typeahead/
    // dropdown that swallows the fill — we don't fail if it does.
    auditDebug('exerciseDialog.4 cell fill: start');
    const _t4 = Date.now();
    const firstInput = dialog.locator('table input').first();
    if (await firstInput.isVisible().catch(() => false)) {
      await firstInput.fill('audit_x').catch(() => {});
      await page.waitForTimeout(150);
    }
    auditDebug(
      'exerciseDialog.4 cell fill: complete', `${Date.now() - _t4}ms`
    );
  }
  auditDebug(
    'exerciseDialog.3 add-row: complete',
    `${addedRow ? 'added 1 row' : 'skipped (no grid)'} in `
    + `${Date.now() - _t3}ms`
  );
};

// Try-finally wrappers so a Name-textbox timeout doesn't leave a stale
// dialog open over the tree for the next spec.
const openAndAssertClean = async (page, openFn, errors, opts = {}) => {
  const baseline = await readCanaryCount(page);
  try {
    auditDebug('openFn: start');
    const _t = Date.now();
    await openFn();
    auditDebug('openFn: returned', `${Date.now() - _t}ms`);
    auditDebug('wait Name textbox: start');
    const _tName = Date.now();
    await page.getByRole('textbox', { name: 'Name' }).first().waitFor({
      state: 'visible', timeout: 20_000,
    });
    auditDebug('wait Name textbox: complete', `${Date.now() - _tName}ms`);
    const _tExercise = Date.now();
    await exerciseDialog(page, { editMode: opts.editMode === true });
    auditDebug('exerciseDialog: complete', `${Date.now() - _tExercise}ms total`);
  } finally {
    // Close even if the Name wait or interaction failed — keep
    // workspace clean.
    auditDebug('close: start');
    const _tClose = Date.now();
    const close = page.locator(SCHEMA_DIALOG_CLOSE).first();
    if (await close.isVisible().catch(() => false)) {
      await close.click().catch(() => {});
      // Close may pop a "Discard changes?" confirm if we mutated
      // fields. Auto-accept it so the next spec starts clean.
      const yes = page.locator(
        'div[role="dialog"] button:has-text("Yes")'
      ).first();
      if (await yes.isVisible().catch(() => false)) {
        await yes.click({ force: true }).catch(() => {});
      }
    }
    auditDebug('close: complete', `${Date.now() - _tClose}ms`);
  }
  const finalCanaryCount = await readCanaryCount(page);
  auditDebug(
    'canary tally', `baseline=${baseline} final=${finalCanaryCount} `
    + `delta=${finalCanaryCount - baseline}`
  );
  await expectCanaryExecuted(page, baseline);
  expectNoDivergence(errors);
};

// Generic: navigate → open Create dialog for `nodeType` → wait for
// the dialog → close → assert canary clean. Used for the schema-
// level Create-mode specs that all share this shape.
const smokeCreateSchemaChild = async (page, catalogLabel, nodeType) => {
  const errors = installErrorRecorders(page);
  await bootPage(page);
  await ensureServerRegistered(page);
  await navigateToCatalogNodeViaApi(page, catalogLabel);
  await openAndAssertClean(
    page, () => openCreateDialogViaApi(page, nodeType), errors
  );
};

// Same shape but for SERVER-level collections (Roles, Databases,
// EventTriggers, Tablespaces — they don't live under a database/schema).
const smokeCreateServerChild = async (page, collectionType, nodeType) => {
  const errors = installErrorRecorders(page);
  await bootPage(page);
  await ensureServerRegistered(page);
  await navigateToServerCollectionViaApi(page, collectionType);
  await openAndAssertClean(
    page, () => openCreateDialogViaApi(page, nodeType), errors
  );
};

// Same shape but for SUB-COLLECTIONS under a table (Triggers,
// Indexes, Constraints, Compound Triggers).
const smokeCreateTableChild = async (page, subCollectionType, nodeType) => {
  const errors = installErrorRecorders(page);
  await bootPage(page);
  await ensureServerRegistered(page);
  await navigateToTableSubCollectionViaApi(page, subCollectionType);
  await openAndAssertClean(
    page, () => openCreateDialogViaApi(page, nodeType), errors
  );
};

// Edit-mode variants. These open Properties on the FIRST node of the
// given type under the parent collection. They require the object to
// already exist — vanilla PG installs are missing most of these in
// `public` schema, so the spec will fail with "any X not found" if
// the seed wasn't run. That failure mode IS the diagnostic: re-run
// CI's seed step (or for local dev, create one instance of each).
//
// Why Edit mode matters beyond Create: it exercises
// `initialise(force=true)` against persisted data, populated dropdowns
// resolving to specific values, and validators running on real state
// (not empty defaults). Walker bugs that only trigger when collections
// start with rows (Edit) vs are empty + grown (Create) slip past
// Create-only smoke.
const smokeEditSchemaChild = async (page, catalogLabel, nodeType) => {
  const errors = installErrorRecorders(page);
  await bootPage(page);
  await ensureServerRegistered(page);
  await navigateToCatalogNodeViaApi(page, catalogLabel);
  await openAndAssertClean(
    page, () => openEditDialogViaApi(page, nodeType), errors,
    { editMode: true }
  );
};

const smokeEditServerChild = async (page, collectionType, nodeType) => {
  const errors = installErrorRecorders(page);
  await bootPage(page);
  await ensureServerRegistered(page);
  await navigateToServerCollectionViaApi(page, collectionType);
  await openAndAssertClean(
    page, () => openEditDialogViaApi(page, nodeType), errors,
    { editMode: true }
  );
};

const smokeEditTableChild = async (page, subCollectionType, nodeType) => {
  const errors = installErrorRecorders(page);
  await bootPage(page);
  await ensureServerRegistered(page);
  await navigateToTableSubCollectionViaApi(page, subCollectionType);
  await openAndAssertClean(
    page, () => openEditDialogViaApi(page, nodeType), errors,
    { editMode: true }
  );
};

// =============================================================
// Schema-level dialogs (10 tests)
// =============================================================

test('Create View dialog', async ({ page }) => {
  await smokeCreateSchemaChild(page, 'Views', 'view');
});

test('Create Materialized View dialog', async ({ page }) => {
  await smokeCreateSchemaChild(page, 'Materialized Views', 'mview');
});

test('Create Sequence dialog', async ({ page }) => {
  await smokeCreateSchemaChild(page, 'Sequences', 'sequence');
});

test('Create Type dialog (composite/enum/range routing)', async ({ page }) => {
  // Type has the heaviest sub-schema variation: composite / enum /
  // range / shell / base each load different baseFields. Just
  // opening the dialog exercises the default routing.
  await smokeCreateSchemaChild(page, 'Types', 'type');
});

test('Create Domain dialog', async ({ page }) => {
  await smokeCreateSchemaChild(page, 'Domains', 'domain');
});

test('Create Procedure dialog', async ({ page }) => {
  await smokeCreateSchemaChild(page, 'Procedures', 'procedure');
});

test('Create Aggregate dialog', async ({ page }) => {
  await smokeCreateSchemaChild(page, 'Aggregates', 'aggregate');
});

test('Create Foreign Table dialog', async ({ page }) => {
  // ForeignTable is one of the schemas migrated to the
  // deferredDepChange protocol. exerciseDialog fires Name SET_VALUE,
  // tab-switches, and ADD_ROWs the first DataGridView (the Columns
  // grid) — exercises the schema's collection dispatchers. Does NOT
  // open the Inherits dropdown (that would catch deferred-dep
  // regressions at dropdown-open time; out of scope here).
  await smokeCreateSchemaChild(page, 'Foreign Tables', 'foreign_table');
});

test('Create Collation dialog', async ({ page }) => {
  // Collation has a typeahead `copy_collation` field that loads
  // its options via an async fetch — exercises the fixedRows
  // + deferred-dep paths in a non-Table dialog.
  await smokeCreateSchemaChild(page, 'Collations', 'collation');
});

test('Create FTS Configuration dialog', async ({ page }) => {
  // FTS Configuration has a nested mapping grid (token → dictionary)
  // — a DataGridView with typeahead cells. Smoke that the dialog
  // mounts without divergence.
  await smokeCreateSchemaChild(page, 'FTS Configurations', 'fts_configuration');
});

// =============================================================
// Function-like dialogs (1 test) — these live under schemas too,
// but are listed separately for clarity (Function is in the main
// audit-smoke.spec.js suite; this is the trigger-function variant).
// =============================================================

test('Create Trigger Function dialog', async ({ page }) => {
  // Trigger Function uses the same FunctionSchema as Function but
  // restricts return type to 'trigger'. Smoke ensures the
  // restricted-return-type path through getNewData + walker
  // produces no divergence.
  await smokeCreateSchemaChild(page, 'Trigger Functions', 'trigger_function');
});

// =============================================================
// Server-level dialogs (2 tests)
// =============================================================

test('Create Login/Group Role dialog', async ({ page }) => {
  await smokeCreateServerChild(page, 'coll-role', 'role');
});

test('Create Tablespace dialog', async ({ page }) => {
  await smokeCreateServerChild(page, 'coll-tablespace', 'tablespace');
});

// =============================================================
// Sub-catalog dialogs (2 tests)
// =============================================================

test('Create Trigger dialog (under table)', async ({ page }) => {
  // Trigger has cross-row deps on tgtype (BEFORE/AFTER/INSTEAD OF
  // sub-tabs vary by event type). Real walker stress.
  await smokeCreateTableChild(page, 'coll-trigger', 'trigger');
});

test('Create Index dialog (under table)', async ({ page }) => {
  // Index.amname is one of the schemas migrated to the
  // deferredDepChange protocol — and listenDepChanges had to be
  // fixed to register evaluator-only deps for this schema's
  // column-opclass dep wiring. exerciseDialog covers SET_VALUE +
  // tab-switch + ADD_ROW (Index has a Columns collection). Does
  // NOT toggle amname directly (that would catch the deferred-dep
  // change path at runtime; out of scope here).
  await smokeCreateTableChild(page, 'coll-index', 'index');
});

// =============================================================
// Edit-mode variants (15 tests) — each requires one instance of the
// target type to already exist under the server. CI seed must
// provide; on a vanilla local PG these may skip with "any X not
// found" depending on what's been created.
// =============================================================

// Schema-level edits (10)

test('Edit View dialog', async ({ page }) => {
  await smokeEditSchemaChild(page, 'Views', 'view');
});

test('Edit Materialized View dialog', async ({ page }) => {
  await smokeEditSchemaChild(page, 'Materialized Views', 'mview');
});

test('Edit Sequence dialog', async ({ page }) => {
  await smokeEditSchemaChild(page, 'Sequences', 'sequence');
});

test('Edit Type dialog', async ({ page }) => {
  // Edit on Type follows the sub-schema routing path picked by the
  // EXISTING type's variant (composite / enum / range / shell / base).
  // Walker re-validates the chosen sub-schema's fields against the
  // saved values — different from Create's default-composite path.
  await smokeEditSchemaChild(page, 'Types', 'type');
});

test('Edit Domain dialog', async ({ page }) => {
  await smokeEditSchemaChild(page, 'Domains', 'domain');
});

test('Edit Procedure dialog', async ({ page }) => {
  await smokeEditSchemaChild(page, 'Procedures', 'procedure');
});

test('Edit Aggregate dialog', async ({ page }) => {
  await smokeEditSchemaChild(page, 'Aggregates', 'aggregate');
});

test('Edit Foreign Table dialog', async ({ page }) => {
  // Edit mode populates Inherits + Columns from persisted state;
  // exerciseDialog's ADD_ROW on Columns then runs against a non-empty
  // grid — catches walker regressions specific to "grid already has
  // entries" path.
  await smokeEditSchemaChild(page, 'Foreign Tables', 'foreign_table');
});

test('Edit Collation dialog', async ({ page }) => {
  await smokeEditSchemaChild(page, 'Collations', 'collation');
});

test('Edit FTS Configuration dialog', async ({ page }) => {
  // FTS Configuration has a nested token→dictionary mapping grid
  // that's POPULATED in Edit mode — exerciseDialog's ADD_ROW
  // appends to that grid, more interesting than Create's empty.
  await smokeEditSchemaChild(page, 'FTS Configurations', 'fts_configuration');
});

// Function-like edit (1)

test('Edit Trigger Function dialog', async ({ page }) => {
  await smokeEditSchemaChild(page, 'Trigger Functions', 'trigger_function');
});

// Server-level edits (2)

test('Edit Login/Group Role dialog', async ({ page }) => {
  // Role always has at least `postgres` so this should pass on any
  // PG install. Privileges + Membership grids start populated.
  await smokeEditServerChild(page, 'coll-role', 'role');
});

test('Edit Tablespace dialog', async ({ page }) => {
  // pg_default + pg_global always exist; openEditDialogViaApi picks
  // the first child — typically pg_default. Edit dialog's Variables
  // grid renders the persisted tablespace_options.
  await smokeEditServerChild(page, 'coll-tablespace', 'tablespace');
});

// Sub-catalog edits (2)

test('Edit Trigger dialog (under table)', async ({ page }) => {
  // Requires the seeded table to have a trigger. If not, "any
  // trigger not found".
  await smokeEditTableChild(page, 'coll-trigger', 'trigger');
});

test('Edit Index dialog (under table)', async ({ page }) => {
  // Most tables with a primary key have at least one index (the PK
  // itself). Edit dialog's Columns grid is non-empty — ADD_ROW
  // exercises the "grid has entries" walker path.
  await smokeEditTableChild(page, 'coll-index', 'index');
});
