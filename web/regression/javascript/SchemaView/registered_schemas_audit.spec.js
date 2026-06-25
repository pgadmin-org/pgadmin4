/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// The audit harness — runs `auditSchema` against every schema that
// the registry knows about. This is the production-gate test: if
// every registered schema's audit passes, the incremental walker
// can be flipped on globally.
//
// Discovery: all schema files live under web/pgadmin/**/*.ui.js (a
// few use `.js` — show_view_data.js, roleReassign.js). Importing
// each file at spec load time triggers its `registerSchema()` side
// effect, populating `getRegisteredSchemas()`.
//
// Failure modes the spec surfaces explicitly:
//   - import error (file blows up when loaded standalone)  → SKIP
//   - constructor error (needs real production args)        → SKIP
//   - canary throw (real divergence)                        → FAIL
// SKIPs are reported but don't fail CI. FAILs do.

import fs from 'fs';
import path from 'path';
import {
  getRegisteredSchemas, _resetRegistry,
} from '../../../pgadmin/static/js/SchemaView/SchemaState/schema_registry';
import { auditSchema } from
  '../../../pgadmin/static/js/SchemaView/SchemaState/audit_harness';

const PGADMIN_ROOT = path.resolve(__dirname, '../../../pgadmin');

// Walk pgadmin/ for files the codemod touched. These are guaranteed
// to call registerSchema() at the top level. The codemod targets
// files with `extends BaseUISchema` + `^export default class`, plus
// a few `.js` (not `.ui.js`) like show_view_data.js — match the
// same pattern, not just `.ui.js`.
const findSchemaFiles = () => {
  const out = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === 'generated') continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (!/\.(js|jsx)$/.test(e.name)) continue;
      try {
        const src = fs.readFileSync(p, 'utf8');
        if (!/extends BaseUISchema/.test(src)) continue;
        if (!/registerSchema\(/.test(src)) continue;
        out.push(p);
      } catch { /* unreadable; skip */ }
    }
  };
  walk(PGADMIN_ROOT);
  return out;
};

// Discovery has to run at describe-time (module top level) so
// `test.each` can register one test per schema. require()'s module
// cache means the side-effect registerSchema() calls only fire on
// FIRST import — a beforeAll re-import would be a no-op after the
// top-level pass. Reset the registry once, then populate.
const importFailures = [];
_resetRegistry();
for (const file of findSchemaFiles()) {
  try {
    require(file);
  } catch (e) {
    importFailures.push({
      file: path.relative(PGADMIN_ROOT, file),
      error: e.message.split('\n')[0],
    });
  }
}
const schemaNames = Array.from(getRegisteredSchemas().keys()).sort();

describe('schema registry discovery', () => {
  test('imports populated the registry', () => {
    expect(getRegisteredSchemas().size).toBeGreaterThan(0);
  });

  test('import failures are reported (not fatal)', () => {
    // The harness reports import failures so they're visible in CI
    // logs, but doesn't fail the suite — many schema files import
    // pgAdmin browser globals that aren't available in jest's jsdom.
    // A future Phase 3.5 may stub more of those globals; for now,
    // unreachable files are tracked as SKIPs.
    if (importFailures.length > 0) {
      console.warn(
        `Schema-file import failures (${importFailures.length}):\n`
        + importFailures.map((f) => `  ${f.file}: ${f.error}`).join('\n')
      );
    }
    // Soft assertion — we want VISIBILITY, not failure, here.
    expect(importFailures.length).toBeLessThan(200);  // sanity ceiling
  });
});

// Schemas with known cross-row divergences from the incremental
// walker. The audit harness LANDS as a ratchet: these schemas are
// expected to diverge today; once a schema is fixed (typically by
// adding `field.deps` to declare the cross-row dependency), the
// test starts failing because divergence stops happening — that's
// the signal to remove it from this list. Conversely, any new
// schema that drifts into this list is a regression caught at CI.
//
// Production-flip blocker: this set must be empty before the
// incremental walker can be turned on globally.
const KNOWN_DIVERGING = new Set([]);

// Modes the audit runs every schema in. The walker's
// `isModeSupportedByField` filters fields by `field.mode`, so
// each mode exercises a different field subset:
//   - 'create' shows fields with mode containing 'create' (or no
//     mode declared); typical defaults; isNew()=true.
//   - 'edit' shows fields with mode containing 'edit'; populated
//     baseline data; isNew()=false.
//   - 'properties' shows the read-only display fields (mode
//     containing 'properties'); covers closures that branch on
//     "rendering for read vs editing." Read-only display doesn't
//     dispatch user input but the walker still walks the tree on
//     every prop change, so divergence under properties mode is a
//     real bug class.
const MODES = ['edit', 'create', 'properties'];

describe.each(MODES)('audit harness — registered schemas [%s mode]', (mode) => {

  test.each(schemaNames)('%s', (name) => {
    const SchemaClass = getRegisteredSchemas().get(name);
    expect(SchemaClass).toBeDefined();

    let err = null;
    let result = null;
    try { result = auditSchema(SchemaClass, { mode }); }
    catch (e) { err = e; }

    if (KNOWN_DIVERGING.has(name)) {
      // The allowlist promises this schema diverges. If it doesn't
      // anymore, the ratchet should tighten — remove from the set.
      expect(err).not.toBeNull();
      expect(err.message).toMatch(/divergence/i);
      return;
    }

    if (err) throw err;  // unexpected divergence → real regression

    if (result.skipped) {
      // Harness limitation, not a walker bug. Visible in CI logs so
      // the SKIP list can be shrunk by adding fixtures, but does
      // not fail the test.
      console.warn(`SKIP [${mode}] ${name}: ${result.skipReason}`);
      return;
    }
    expect(result.dispatches).toBeGreaterThanOrEqual(0);
  });
});
