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
     
    console.error('CANARY DIVERGENCES DETECTED:');
    for (const d of divergences) {
       
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

// Navigate to a catalog node (coll-table / coll-function / etc.) by
// driving pgAdmin's JS tree API directly via page.evaluate. This
// completely bypasses DOM-based tree expansion (which is brittle
// against react-aspen virtualization + inconsistent click semantics
// per tree level — see project-real-table-bench-tree-nav memory).
//
// Returns the tree-node descriptor (a string id that can be passed
// to openCreateDialogViaApi).
export const navigateToCatalogNodeViaApi = async (page, catalog, database) => {
  const db = database || process.env.PGDATABASE || 'postgres';
  // pgAdmin's tree types follow a `coll-X` / `X` pattern: the
  // collection (Tables, Functions, etc.) is `coll-table`; individual
  // items are `table`. For navigating to the CATEGORY, we want the
  // collection type.
  // pgAdmin's tree types are SINGULAR (`coll-table` not
  // `coll-tables`) and a few are abbreviated (`coll-mview` for
  // Materialized Views, `coll-foreign_table` for Foreign Tables).
  // The label-based default fallback only works for labels that
  // ARE just `coll-<lowercased-label>`; add explicit mappings for
  // the others.
  const targetType = ({
    Tables: 'coll-table',
    Functions: 'coll-function',
    Views: 'coll-view',
    'Materialized Views': 'coll-mview',
    Sequences: 'coll-sequence',
    Types: 'coll-type',
    Domains: 'coll-domain',
    Procedures: 'coll-procedure',
    Aggregates: 'coll-aggregate',
    'Foreign Tables': 'coll-foreign_table',
    Collations: 'coll-collation',
    'FTS Configurations': 'coll-fts_configuration',
    'Trigger Functions': 'coll-trigger_function',
  })[catalog] || `coll-${catalog.toLowerCase()}`;

  // Walk the aspen tree (the actual virtualized tree, accessible via
  // `tree.tree.getModel().root`). Each tree level is an aspen
  // Directory with `.children` and `getMetadata('data')` returning
  // the pgAdmin node data. tree.open() expects an aspen FileEntry.
  await page.evaluate(async ({ targetType, db }) => {
    const tree = window.pgAdmin.Browser.tree;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));

    const itemData = (it) => {
      // aspen FileEntry stores metadata via getMetadata; ManageTreeNodes
      // TreeNode stores it on `.data` or `.metadata.data`. Try both.
      if (typeof it.getMetadata === 'function') {
        return it.getMetadata('data');
      }
      return it.data || it._metadata?.data || null;
    };

    const childByPredicate = (node, pred) => {
      for (const c of node.children || []) {
        if (pred(itemData(c), c)) return c;
      }
      return null;
    };

    const openAndFind = async (parent, pred, label) => {
      await tree.open(parent);
      for (let i = 0; i < 50; i++) {
        const found = childByPredicate(parent, pred);
        if (found) return found;
        await wait(200);
      }
      throw new Error(
        `navigate: ${label} not found; available: `
        + (parent.children || []).map((c) => {
          const d = itemData(c);
          return (d?._type || '?') + '/' + (d?.label || '?');
        }).join(', ')
      );
    };

    // Start from aspen's root (the actual rendered tree).
    let node = tree.tree.getModel().root;
    node = await openAndFind(
      node, (d) => d?._type === 'server_group', 'server_group'
    );
    node = await openAndFind(
      node, (d) => d?._type === 'server', 'server'
    );
    node = await openAndFind(
      node, (d) => d?._type === 'coll-database', 'coll-database'
    );
    node = await openAndFind(
      node, (d) => d?._type === 'database' && d?.label === db, db
    );
    node = await openAndFind(
      node, (d) => d?._type === 'coll-schema', 'coll-schema'
    );
    node = await openAndFind(
      node, (d) => d?._type === 'schema' && d?.label === 'public', 'public'
    );
    node = await openAndFind(
      node, (d) => d?._type === targetType, targetType
    );
    // Select the catalog node so menu actions target it.
    await tree.select(node, true);
    // pgAdmin's tree.selected() observably drifts back to a parent
    // node (typically the database) after a tree-refresh event fires
    // when the selected node's REST children land. Stash the
    // just-selected node so openCreate/EditDialogViaApi have an
    // authoritative reference instead of falling back to drifted
    // tree.selected().
    window.__pgadminLastNavigatedNode = node;
  }, { targetType, db });
};

// Navigate to a SERVER-level collection node (Login/Group Roles,
// Databases, EventTriggers, ForeignServers, Tablespaces, etc.).
// Stops at the server tier and opens the requested coll-X.
//
// `targetType` is the collection's _type as pgAdmin's tree
// registers it (e.g. 'coll-role', 'coll-database', 'coll-event_trigger').
export const navigateToServerCollectionViaApi = async (page, targetType) => {
  await page.evaluate(async ({ targetType }) => {
    const tree = window.pgAdmin.Browser.tree;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const itemData = (it) => (
      typeof it.getMetadata === 'function'
        ? it.getMetadata('data')
        : (it.data || it._metadata?.data || null)
    );
    const childByPredicate = (node, pred) => {
      for (const c of node.children || []) {
        if (pred(itemData(c), c)) return c;
      }
      return null;
    };
    const openAndFind = async (parent, pred, label) => {
      await tree.open(parent);
      for (let i = 0; i < 50; i++) {
        const found = childByPredicate(parent, pred);
        if (found) return found;
        await wait(200);
      }
      throw new Error(
        `navigate: ${label} not found; available: `
        + (parent.children || []).map((c) => {
          const d = itemData(c);
          return (d?._type || '?') + '/' + (d?.label || '?');
        }).join(', ')
      );
    };
    let node = tree.tree.getModel().root;
    node = await openAndFind(
      node, (d) => d?._type === 'server_group', 'server_group'
    );
    node = await openAndFind(
      node, (d) => d?._type === 'server', 'server'
    );
    node = await openAndFind(
      node, (d) => d?._type === targetType, targetType
    );
    await tree.select(node, true);
    window.__pgadminLastNavigatedNode = node;
  }, { targetType });
};

// Navigate to a SUB-CATALOG node nested under a specific Table
// (Triggers, Indexes, Rules, Compound Triggers, Foreign Keys, etc.).
// Picks the FIRST table under public schema and drills down to the
// requested sub-collection — same "first child of given type" pattern
// used by openEditDialogViaApi.
//
// `subCollectionType` is e.g. 'coll-trigger', 'coll-index',
// 'coll-compound_trigger'.
export const navigateToTableSubCollectionViaApi = async (
  page, subCollectionType, database
) => {
  const db = database || process.env.PGDATABASE || 'postgres';
  await page.evaluate(async ({ subCollectionType, db }) => {
    const tree = window.pgAdmin.Browser.tree;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const itemData = (it) => (
      typeof it.getMetadata === 'function'
        ? it.getMetadata('data')
        : (it.data || it._metadata?.data || null)
    );
    const childByPredicate = (node, pred) => {
      for (const c of node.children || []) {
        if (pred(itemData(c), c)) return c;
      }
      return null;
    };
    const openAndFind = async (parent, pred, label) => {
      await tree.open(parent);
      for (let i = 0; i < 50; i++) {
        const found = childByPredicate(parent, pred);
        if (found) return found;
        await wait(200);
      }
      throw new Error(
        `navigate: ${label} not found; available: `
        + (parent.children || []).map((c) => {
          const d = itemData(c);
          return (d?._type || '?') + '/' + (d?.label || '?');
        }).join(', ')
      );
    };
    let node = tree.tree.getModel().root;
    node = await openAndFind(
      node, (d) => d?._type === 'server_group', 'server_group'
    );
    node = await openAndFind(
      node, (d) => d?._type === 'server', 'server'
    );
    node = await openAndFind(
      node, (d) => d?._type === 'coll-database', 'coll-database'
    );
    node = await openAndFind(
      node, (d) => d?._type === 'database' && d?.label === db, db
    );
    node = await openAndFind(
      node, (d) => d?._type === 'coll-schema', 'coll-schema'
    );
    node = await openAndFind(
      node, (d) => d?._type === 'schema' && d?.label === 'public', 'public'
    );
    node = await openAndFind(
      node, (d) => d?._type === 'coll-table', 'coll-table'
    );
    // Prefer the CI-seeded `audit_smoke_table` (created by the
    // schemaview-ui-smoke workflow's seed step) because we know
    // it has triggers + indexes seeded. Fall back to any table if
    // the seed didn't run, but emit a clear error referencing the
    // missing seed.
    //
    // Why we can't just pick "first": local environments often have
    // pre-existing tables with names that sort alphabetically before
    // audit_smoke_table — including, observed in the wild, an
    // XSS-payload table name starting with `<`. The "first" then
    // has no triggers or indexes and the Edit-mode specs fail
    // confusingly.
    node = await openAndFind(
      node,
      (d) => d?._type === 'table' && d?.label === 'audit_smoke_table',
      'audit_smoke_table (sub-collection smoke needs the CI seed '
      + 'table; see .github/workflows/run-schemaview-ui-smoke.yml '
      + 'seed step)'
    );
    node = await openAndFind(
      node, (d) => d?._type === subCollectionType, subCollectionType
    );
    await tree.select(node, true);
    // tree.open() short-circuits if the node was previously opened
    // during the walk (very common for sub-collection nodes the
    // openAndFind loop already opened to discover them). Force the
    // children REST fetch via ensureLoaded() which goes straight to
    // the aspen FileEntry's loader, bypassing the isOpen short-
    // circuit. Then poll until children populate.
    await tree.ensureLoaded(node);
    for (let i = 0; i < 50; i++) {
      if ((node.children || []).length > 0) break;
      await wait(200);
    }
    // pgAdmin's tree.selected() observably slips back to a parent
    // node (often the database) after this helper returns — likely
    // due to a tree-refresh event triggered by the children fetch
    // completing. openEditDialogViaApi can't rely on tree.selected()
    // alone. Stash the just-selected node on window so the caller
    // can read the authoritative reference.
    window.__pgadminLastNavigatedNode = node;
  }, { subCollectionType, db });
};

// Trigger a "Create > X" dialog programmatically by invoking the
// node module's show_obj_properties callback with action='create'.
// Skips right-click + szh-menu navigation entirely.
export const openCreateDialogViaApi = async (page, nodeType) => {
  await page.evaluate((nodeType) => {
    const tree = window.pgAdmin.Browser.tree;
    // Prefer the just-navigated node stashed by navigateToXViaApi.
    // tree.selected() observably drifts to a parent node after the
    // tree-refresh event triggered when the selected collection's
    // REST children land. Without this fallback, openCreate
    // dispatches show_obj_properties against a drifted parent node;
    // the Create dialog mounts in a context that can't resolve
    // dropdown lookups and the Name textbox never renders (20s
    // wait-for-Name timeout). Same fix the Edit helper already had.
    const selected = window.__pgadminLastNavigatedNode || tree.selected();
    if (!selected) throw new Error('openCreateDialogViaApi: no node selected');
    const nodeModule = window.pgAdmin.Browser.Nodes[nodeType];
    if (!nodeModule) throw new Error(
      `openCreateDialogViaApi: no node module for "${nodeType}"`
    );
    nodeModule.callbacks.show_obj_properties.call(
      nodeModule, { action: 'create' }, selected
    );
  }, nodeType);
};

// Pick the first child of the currently-selected collection node
// (e.g. "Tables" -> first table) and open its Properties dialog
// via the show_obj_properties callback with action='edit'.
//
// Edit-mode dialogs follow a different code path from create:
//   - initialise(force=true) fetches the existing record via REST
//   - sessData lands with the persisted values + an idAttribute oid
//   - isNew(state) returns false → closures take the edit branches
// This exercises the half of every schema that create-mode never
// touches.
//
// Returns the picked child's label so the caller can identify what
// got opened in test output.
export const openEditDialogViaApi = async (page, nodeType) => {
  return await page.evaluate(async (nodeType) => {
    const tree = window.pgAdmin.Browser.tree;
    // Prefer the just-navigated node stashed by navigateToXViaApi
    // helpers. tree.selected() drifts back to parent nodes after a
    // tree-refresh event (observed when sub-collection REST fetches
    // complete after the helper returns), so the stashed reference
    // is the authoritative parent the user just navigated to.
    const selected = window.__pgadminLastNavigatedNode || tree.selected();
    if (!selected) throw new Error('openEditDialogViaApi: no node selected');
    const nodeModule = window.pgAdmin.Browser.Nodes[nodeType];
    if (!nodeModule) throw new Error(
      `openEditDialogViaApi: no node module for "${nodeType}"`
    );

    // Expand the collection node so its children populate from REST.
    // tree.open() is idempotent for already-expanded directories.
    await tree.open(selected);

    // Find a child whose _type matches the target nodeType. Tree
    // children are FileEntry instances; getMetadata('data') returns
    // the node's data including _type.
    const aspen = tree.tree.getModel();
    const fileEntry = aspen.root.children.find(
      (n) => n.path === selected.path
    ) || (() => {
      // Walk the tree to find selected — for nested catalog nodes.
      const walk = (n) => {
        if (n.path === selected.path) return n;
        for (const c of (n.children || [])) {
          const found = walk(c);
          if (found) return found;
        }
        return null;
      };
      return walk(aspen.root);
    })();
    if (!fileEntry) throw new Error('openEditDialogViaApi: file entry for selected not found');

    // Poll for children to materialise after open(). The REST call
    // usually completes in <500ms for top-level catalog nodes, but
    // sub-collections (coll-index, coll-trigger) under a table are
    // a separate REST fetch triggered ONLY when the collection node
    // itself is expanded — so they may not be loaded yet when
    // navigation just selected the parent. 10s upper bound matches
    // the other navigate-helpers' polling.
    let child = null;
    for (let i = 0; i < 50; i++) {
      const children = fileEntry.children || [];
      child = children.find((c) => {
        const meta = c.getMetadata && c.getMetadata('data');
        return meta && meta._type === nodeType;
      });
      if (child) break;
      await new Promise((r) => setTimeout(r, 200));
    }
    if (!child) {
      throw new Error(
        `openEditDialogViaApi: no child of type "${nodeType}" found `
        + 'under selected node — does the database have any?'
      );
    }

    // Select the child so the node module's callback fires against
    // it (show_obj_properties reads the currently-selected item).
    await tree.select(child);
    nodeModule.callbacks.show_obj_properties.call(
      nodeModule, { action: 'edit' }, child
    );

    const data = child.getMetadata && child.getMetadata('data');
    return data ? data.label : 'unknown';
  }, nodeType);
};

// Drill into the tree from a connected server to reach a target
// catalog node (Tables / Functions / Views / etc.). Returns once
// the catalog node is visible. Tree virtualization makes deep
// navigation brittle; failure here surfaces as a locator timeout.
//
// LEGACY DOM-based version. Kept for the Register Server test that
// doesn't need deep navigation. Use navigateToCatalogNodeViaApi for
// anything that needs Tables / Functions / etc.
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
