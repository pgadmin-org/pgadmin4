/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Real-browser smoke tests for the incremental walker + audit canary.
//
// The Jest-driven `registered_schemas_audit.spec.js` covers 65 of 86
// schemas via synthetic instantiation + per-field dispatches. The
// remaining 13 SKIPs have bespoke constructor quirks that work fine
// in a real browser where pgAdmin provides their full production
// wiring — this file exercises them via real dialogs.
//
// Each test sets `window.__INCREMENTAL_AUDIT__ = true` and
// `__throw_on_canary_divergence__ = true`. Any divergence between the
// incremental walker and the full walk surfaces as a `pageerror`
// event, which is collected and asserted-empty at the end.
//
// Setup required (NOT done by the spec):
//
//   1. Build pgAdmin with the canary kept in the bundle:
//        cd web && CANARY_BUILD=true yarn run bundle
//   2. Start pgAdmin (web server or desktop runtime).
//   3. Have a local PostgreSQL reachable. Default connection used
//      by ensureServerRegistered():
//        postgresql://ashesh.vashi:edb@127.0.0.1:5432/pem
//      Override via env: PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE.
//   4. Set PGADMIN_URL env var if not on the default
//      http://127.0.0.1:5050/browser/.
//
// Tests:
//   - Register Server dialog (ServerSchema, VariableSchema, MembershipSchema)
//   - Create Table dialog (TableSchema, ColumnSchema, ConstraintSchemas)
//   - Create Function dialog (FunctionSchema, NodeVariableSchema)
//
// Tree navigation in the Create Table / Function tests uses
// best-effort selectors. The codebase's react-aspen tree
// virtualization can defeat them on deep paths; if a navigation
// step fails, the test is reported (and the canary errors that
// might have surfaced are still in the recorded list).

import { test, expect } from '@playwright/test';
import {
  installErrorRecorders, enableAudit, autoDismissUnlockModal,
  expectNoDivergence, ensureServerRegistered,
  navigateToCatalogNodeViaApi, openCreateDialogViaApi,
  openEditDialogViaApi,
} from './audit-helpers';

const PGADMIN_URL =
  process.env.PGADMIN_URL || 'http://127.0.0.1:5050/browser/';

const bootPage = async (page) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await autoDismissUnlockModal(page);
  // `load` instead of `networkidle` — pgAdmin keeps long-polling
  // notification connections open, so networkidle never fires.
  await page.goto(PGADMIN_URL, { waitUntil: 'load', timeout: 60_000 });
  // Wait for the tree to render — its `.file-entry` markers are
  // the most reliable "ready" signal across the codebase's pages.
  await page.locator('.file-entry').first().waitFor({
    state: 'visible', timeout: 30_000,
  });
  await page.waitForTimeout(1_000);
  await enableAudit(page);
  expect(await page.evaluate(() => window.__INCREMENTAL_AUDIT__)).toBe(true);
};

test('Register Server dialog under default-on incremental', async ({ page }) => {
  const errors = installErrorRecorders(page);
  await bootPage(page);

  const serversNode = page.locator(
    '.file-entry.directory', { hasText: 'Servers' }
  ).first();
  await serversNode.waitFor({ state: 'visible', timeout: 15_000 });
  await serversNode.click({ button: 'right' });
  await page.waitForTimeout(500);
  await page.locator('.szh-menu__item', { hasText: /^Register$/ }).first().hover();
  await page.waitForTimeout(500);
  await page.getByText('Server...', { exact: true }).first().click();
  await page.getByRole('textbox', { name: 'Name' }).first().waitFor({
    state: 'visible', timeout: 15_000,
  });

  // General tab — top-level scalar SET_VALUE
  await page.getByRole('textbox', { name: 'Name' }).first().fill('audit-smoke-server');

  // Connection tab — more top-level scalars across a tab switch
  await page.locator('button[data-test="Connection"]').click();
  await page.getByRole('textbox', { name: /Host name|Host/ }).first().fill('127.0.0.1');
  await page.getByRole('textbox', { name: /^Port$/ }).first().fill('5432');
  await page.getByRole('textbox', { name: /Username/ }).first().fill('audit');

  // Parameters tab — DataGridView ADD_ROW / SET_VALUE / DELETE_ROW
  await page.locator('button[data-test="Parameters"]').click();
  await page.locator('[data-test="add-row"]').first().click({ force: true });
  await page.waitForTimeout(300);
  const cell = page.locator('table input').first();
  if (await cell.count()) await cell.fill('audit_param');
  const del = page.locator('[data-test="delete-row"]').first();
  if (await del.count()) {
    await del.click({ force: true });
    await page.waitForTimeout(300);
    // Confirm the "Delete Row" modal that pops up.
    const yes = page.locator('div[role="dialog"]').locator(
      'button:has-text("Yes")'
    ).first();
    if (await yes.count()) await yes.click({ force: true });
    await page.waitForTimeout(200);
  }

  // Tags tab (best-effort — some pgAdmin builds put tags in a
  // different group; skip if not present).
  const tagsTab = page.locator('button[data-test="Tags"]').first();
  if (await tagsTab.count()) {
    await tagsTab.click({ force: true });
    await page.waitForTimeout(200);
  }

  await page.locator('button:has-text("Close")').first().click();
  expect(await page.evaluate(() => window.__INCREMENTAL_AUDIT__)).toBe(true);
  expectNoDivergence(errors);
});

test('Create Table dialog (TableSchema + ColumnSchema)', async ({ page }) => {
  const errors = installErrorRecorders(page);
  await bootPage(page);

  await ensureServerRegistered(page);
  await navigateToCatalogNodeViaApi(page, 'Tables');
  await openCreateDialogViaApi(page, 'table');
  await page.getByRole('textbox', { name: 'Name' }).first().waitFor({
    state: 'visible', timeout: 20_000,
  });

  // General tab — name (top-level scalar SET_VALUE)
  await page.getByRole('textbox', { name: 'Name' }).first().fill('audit_smoke_t');

  // Columns tab — the heaviest collection in the dialog
  await page.getByRole('tab', { name: 'Columns', exact: true }).click();
  await page.waitForTimeout(300);
  // ADD_ROW on the columns DataGridView
  await page.locator('[data-test="add-row"]').first().click({ force: true });
  await page.waitForTimeout(300);
  // SET_VALUE on column name + type
  const colName = page.locator('table input').first();
  if (await colName.count()) await colName.fill('audit_col_a');
  await page.waitForTimeout(200);
  // ADD a second column to exercise multi-row state
  await page.locator('[data-test="add-row"]').first().click({ force: true });
  await page.waitForTimeout(300);

  // Constraints tab — primary key sub-collection (ConstraintsSchemas)
  await page.getByRole('tab', { name: 'Constraints', exact: true }).click();
  await page.waitForTimeout(300);

  // Partition tab — switches the layout, exercises partition fields
  // (the schema with the actual cross-row dep fix we made)
  const partitionTab = page.getByRole('tab', { name: 'Partition', exact: true });
  if (await partitionTab.count()) {
    await partitionTab.click();
    await page.waitForTimeout(300);
  }

  await page.locator('button:has-text("Close")').first().click();
  expect(await page.evaluate(() => window.__INCREMENTAL_AUDIT__)).toBe(true);
  expectNoDivergence(errors);
});

test('Create Function dialog (FunctionSchema)', async ({ page }) => {
  const errors = installErrorRecorders(page);
  await bootPage(page);

  await ensureServerRegistered(page);
  await navigateToCatalogNodeViaApi(page, 'Functions');
  await openCreateDialogViaApi(page, 'function');
  await page.getByRole('textbox', { name: 'Name' }).first().waitFor({
    state: 'visible', timeout: 20_000,
  });

  // Definition tab — name + return type
  await page.getByRole('textbox', { name: 'Name' }).first().fill('audit_smoke_fn');

  // Arguments tab — Parameters collection (NodeVariableSchema is the
  // SKIP'd inner that this dialog provides in production)
  const argsTab = page.getByRole('tab', { name: 'Arguments', exact: true });
  if (await argsTab.count()) {
    await argsTab.click();
    await page.waitForTimeout(300);
    await page.locator('[data-test="add-row"]').first().click({ force: true });
    await page.waitForTimeout(300);
  }

  // Options tab
  const optsTab = page.getByRole('tab', { name: 'Options', exact: true });
  if (await optsTab.count()) {
    await optsTab.click();
    await page.waitForTimeout(200);
  }

  // Parameters tab (the GUC vars collection — VariableSchema, also
  // a SKIP candidate in the Jest harness)
  const paramsTab = page.getByRole('tab', { name: 'Parameters', exact: true });
  if (await paramsTab.count()) {
    await paramsTab.click();
    await page.waitForTimeout(200);
  }

  await page.locator('button:has-text("Close")').first().click();
  expect(await page.evaluate(() => window.__INCREMENTAL_AUDIT__)).toBe(true);
  expectNoDivergence(errors);
});

// Edit-mode dialogs exercise a different half of every schema than
// create-mode does:
//   - getInitData fetches an existing record (REST GET) instead of
//     using getNewData({}) defaults
//   - sessData lands populated; isNew(state) returns false
//   - fields filtered by mode:['edit'] (NOT mode:['create']) appear
//   - many closures branch on "the user has changed a value from
//     initial" — only meaningful with a non-default baseline

test('Edit Table Properties (TableSchema edit mode)', async ({ page }) => {
  const errors = installErrorRecorders(page);
  await bootPage(page);

  await ensureServerRegistered(page);
  await navigateToCatalogNodeViaApi(page, 'Tables');
  const opened = await openEditDialogViaApi(page, 'table');
  expect(opened).toBeTruthy();

  await page.getByRole('textbox', { name: 'Name' }).first().waitFor({
    state: 'visible', timeout: 20_000,
  });

  const name = page.getByRole('textbox', { name: 'Name' }).first();
  await name.click();
  await name.press('End');
  await name.type('_x');

  await page.getByRole('tab', { name: 'Columns', exact: true }).click();
  await page.waitForTimeout(300);
  await page.getByRole('tab', { name: 'Constraints', exact: true }).click();
  await page.waitForTimeout(300);

  await page.locator('button:has-text("Close")').first().click();
  expect(await page.evaluate(() => window.__INCREMENTAL_AUDIT__)).toBe(true);
  expectNoDivergence(errors);
});

test('Edit Function Properties (FunctionSchema edit mode)', async ({ page }) => {
  const errors = installErrorRecorders(page);
  await bootPage(page);

  await ensureServerRegistered(page);
  await navigateToCatalogNodeViaApi(page, 'Functions');
  const opened = await openEditDialogViaApi(page, 'function');
  expect(opened).toBeTruthy();

  await page.getByRole('textbox', { name: 'Name' }).first().waitFor({
    state: 'visible', timeout: 20_000,
  });

  const tabs = ['Definition', 'Code', 'Options', 'Parameters', 'Security'];
  for (const label of tabs) {
    const tab = page.getByRole('tab', { name: label, exact: true });
    if (await tab.count()) {
      await tab.click();
      await page.waitForTimeout(200);
    }
  }

  await page.locator('button:has-text("Close")').first().click();
  expect(await page.evaluate(() => window.__INCREMENTAL_AUDIT__)).toBe(true);
  expectNoDivergence(errors);
});
