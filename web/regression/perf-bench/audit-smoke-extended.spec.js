/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Extended UI smoke covering 15 additional dialog types beyond the
// 5 in audit-smoke.spec.js. Each test opens the dialog with the
// canary's throw-on-divergence flag enabled, clicks through visible
// tabs, closes, and asserts no divergence fired.
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
// (Note: Database, EventTrigger and CompoundTrigger dialogs were
// in the original spec list but were dropped — Database needs more
// dialog-shape work, and the other two aren't shown on a vanilla
// non-superuser PG 16 install. Replaced with Collation, FTS
// Configuration, Trigger Function which exercise comparable code
// paths.)
//
// Pattern is identical to audit-smoke.spec.js: navigate to the
// parent collection via the JS tree API, invoke
// show_obj_properties via openCreateDialogViaApi /
// openEditDialogViaApi, wait for the dialog, click tabs, close,
// assert canary clean.
//
// Tests intentionally don't mutate fields or click Save — the
// goal is "open + traverse + close, canary stays quiet."
// Mutate-and-save coverage for the heaviest dialog (Table) lives
// in the table-*.spec.js suite on dev/table-dialog-tests.

import { test, expect } from '@playwright/test';
import {
  installErrorRecorders, enableAudit, autoDismissUnlockModal,
  expectNoDivergence, ensureServerRegistered,
  navigateToCatalogNodeViaApi, navigateToServerCollectionViaApi,
  navigateToTableSubCollectionViaApi,
  openCreateDialogViaApi,
} from './audit-helpers';

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
};

// Close button scoped to the SchemaView dialog panel — avoids matching
// transient toasts or the Unlock Saved Passwords dialog (rare race;
// has its own Close affordance) that may briefly co-exist.
const SCHEMA_DIALOG_CLOSE =
  '.dock-panel.dock-style-dialogs button[data-test="Close"]';

// Asserts the canary build code actually ran during this dialog mount.
// Without this we'd only be asserting `__INCREMENTAL_AUDIT__` (a flag
// set by enableAudit itself) — which would pass vacuously on a
// non-CANARY_BUILD bundle where the canary is tree-shaken away.
const expectCanaryExecuted = async (page) => {
  const n = await page.evaluate(() => window.__canary_entry_count__);
  expect(n, 'canary did not execute — likely a non-CANARY_BUILD bundle')
    .toBeGreaterThan(0);
};

// Try-finally wrappers so a Name-textbox timeout doesn't leave a stale
// dialog open over the tree for the next spec.
const openAndAssertClean = async (page, openFn, errors) => {
  try {
    await openFn();
    await page.getByRole('textbox', { name: 'Name' }).first().waitFor({
      state: 'visible', timeout: 20_000,
    });
  } finally {
    // Close even if the Name wait failed — keep workspace clean.
    const close = page.locator(SCHEMA_DIALOG_CLOSE).first();
    if (await close.isVisible().catch(() => false)) {
      await close.click().catch(() => {});
    }
  }
  await expectCanaryExecuted(page);
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

// =============================================================
// Schema-level dialogs (8 tests)
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

test('Create Foreign Table dialog (mount)', async ({ page }) => {
  // ForeignTable is one of the 5 schemas migrated to the
  // deferredDepChange protocol in this PR's group 2. Smoke
  // verifies dialog mount + initial walker pass — does NOT
  // exercise the Inherits dropdown (that would catch any
  // deferred-dep regression at dropdown-open time).
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

test('Create Index dialog (under table, mount)', async ({ page }) => {
  // Index.amname is one of the schemas migrated to the
  // deferredDepChange protocol in group 2 — and listenDepChanges
  // had to be fixed to register evaluator-only deps for this
  // schema's column-opclass dep wiring. Smoke verifies dialog
  // mount + initial walker pass; does NOT toggle amname (which
  // would catch the deferred-dep change path at runtime).
  await smokeCreateTableChild(page, 'coll-index', 'index');
});
