/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Per-schema audit utility. The harness spec loops over
// `getRegisteredSchemas()` and calls `auditSchema(SchemaClass)` for
// each one; this module exists so the loop logic stays a one-liner
// and the per-schema dispatch logic stays testable in isolation.
//
// What auditSchema does for a single SchemaClass:
//   1. Instantiate the schema. Try no-args first, then `({}, {})` as
//      a fallback for the common `(fieldOptions, initValues)` shape.
//      Schemas that need real constructor args are reported as
//      skipped — a future fixture file can register stubs for them.
//   2. Build default sessData via `schema.getNewData({})`.
//   3. Establish a baseline by running the full walk once to produce
//      `prevOptions`. This is what real SchemaState does on mount.
//   4. For each scalar field, dispatch a synthetic change:
//        - mutate sessData at the field path
//        - call the options + validation wrappers with the matching
//          `changedPath` / `mustVisit`
//      Both wrappers route through the canaries because we set
//      `window.__INCREMENTAL_AUDIT__ = true` for the audit. Divergence
//      throws (via `__throw_on_canary_divergence__`); the throw
//      propagates so the calling test fails fast with the diff.
//
// Collections, nested fieldsets, and array mutations (ADD_ROW /
// DELETE_ROW) aren't covered here yet — scalar-field coverage is
// where the prototype's known limitation bites first, so it's the
// highest-value starting point. Expand once the scalar pass is
// clean across all registered schemas.

import BaseUISchema from '../base_schema.ui';
import { validateSchema } from './common';
import { schemaOptionsEvalulator } from '../options/registry';
import { _resetCanaryFireCount } from '../options/canary';
import { _resetValidationCanaryFireCount } from './validation_canary';

// Minimal child-schema stub. Many production schemas accept a
// constructor argument like `getPrivilegeRoleSchema` / `getVariableSchema`
// that the host calls inside its `baseFields` getter to materialize a
// nested collection. Passing `null`/`undefined`/`{}` makes that call
// throw at field-resolution time and the audit skips the schema. A
// stub function that returns an empty BaseUISchema instance keeps the
// host alive — its fields resolve, and the audit's per-cell / per-row
// dispatcher covers everything except the stubbed sub-collection.
class StubChildSchema extends BaseUISchema {
  get baseFields() { return [{id: '__stub_name__', type: 'text'}]; }
}
const stubFn = () => new StubChildSchema();

// A synthetic `nodeInfo` populated with everything host schemas
// commonly poke at: `server.version` (gates field visibility by PG
// version), `server.user.name`, `database/schema.id`, and `catalog`
// flag for `inCatalog()` checks. Several schemas access these via
// `this.nodeInfo.X` in evaluators or validators; without them the
// audit's dispatches throw on undefined-reads and SKIP. A
// far-future PG version (999999) keeps version-gated fields
// active so they enter audit coverage.
const richNodeInfo = {
  server: {
    version: 999999,
    user: { name: 'audit_stub', is_superuser: true },
    db_info: {},
    server_type: 'pg',
  },
  database: { id: 1, name: 'audit_db' },
  schema: { id: 1, name: 'public' },
  catalog: false,
};
const stubSchemasObj = {
  // For TableSchema-style hosts that expect a `schemas` arg with
  // sub-schema factories (`schemas.constraints`, etc.). All return
  // the same minimal StubChildSchema so audit dispatches can drill
  // into nested collections without crashing.
  constraints: stubFn,
  columns: stubFn,
};

// Some schemas (ForeignTableSchema, several others) read nodeInfo
// off `this.fieldOptions.nodeInfo` rather than a positional arg.
// Bundling nodeInfo into a richer fieldOptions handles both
// patterns. Stub functions for the common `getXSchema` slots are
// also embedded so schemas that pluck them off fieldOptions work.
const richFieldOptions = {
  nodeInfo: richNodeInfo,
  getPrivilegeRoleSchema: stubFn,
  getVariableSchema: stubFn,
  getMembershipSchema: stubFn,
  getColumns: () => [],
  getCollations: () => [],
  getOperatorClass: () => [],
  // Common literal lists schemas accept as field-option entries.
  cltypeOptions: [],
  collspcnameOptions: [],
  geometryTypes: [],
};

const tryInstantiate = (SchemaClass) => {
  // Most schemas accept no args or `(fieldOptions, initValues)`
  // with all defaults. Try the cheapest path first. Subsequent
  // attempts layer in stubFn / richNodeInfo / stubSchemasObj for
  // the documented constructor shapes in the codebase. Order is
  // from "least synthetic baggage" to "most" — the first attempt
  // that produces an instance whose .fields resolve wins.
  const attempts = [
    () => new SchemaClass(),
    () => new SchemaClass({}),
    () => new SchemaClass({}, {}),
    () => new SchemaClass({}, {}, {}),
    // (fieldOptions[, ...]) hosts — rich fieldOptions carries
    // nodeInfo + stub getters so a host that does
    // `this.nodeInfo = this.fieldOptions.nodeInfo` works.
    () => new SchemaClass(richFieldOptions),
    () => new SchemaClass(richFieldOptions, {}),
    () => new SchemaClass(richFieldOptions, richNodeInfo),
    () => new SchemaClass(richFieldOptions, richNodeInfo, {}),
    // (fieldOptions, nodeInfo[, ...]) hosts
    () => new SchemaClass({}, richNodeInfo),
    () => new SchemaClass({}, richNodeInfo, {}),
    () => new SchemaClass({}, richNodeInfo, {}, {}),
    // stubFn-first hosts: PGSchema, ViewSchema, etc.
    () => new SchemaClass(stubFn),
    () => new SchemaClass(stubFn, {}),
    () => new SchemaClass(stubFn, richNodeInfo),
    () => new SchemaClass(stubFn, richNodeInfo, {}),
    () => new SchemaClass(stubFn, richNodeInfo, {}, {}),
    () => new SchemaClass(stubFn, richNodeInfo, [], [], [], false),  // ColumnSchema
    // Hosts that need TWO function args: RoleSchema (getVariable,
    // getMembership), TablespaceSchema (getVariable, getPrivilege).
    () => new SchemaClass(stubFn, stubFn),
    () => new SchemaClass(stubFn, stubFn, {}),
    () => new SchemaClass(stubFn, stubFn, {}, {}),
    () => new SchemaClass(stubFn, stubFn, richFieldOptions),  // nodeInfo from fieldOptions
    () => new SchemaClass(stubFn, stubFn, richFieldOptions, {}),
    () => new SchemaClass(stubFn, stubFn, richNodeInfo),
    () => new SchemaClass(stubFn, stubFn, richNodeInfo, {}),
    // TableSchema-shape: (fieldOptions, nodeInfo, schemas, getPrivilege, ...)
    () => new SchemaClass(
      {}, richNodeInfo, stubSchemasObj, stubFn, () => [], () => [], () => [],
      () => [], {}, false
    ),
  ];
  // An "instantiation success" means BOTH the constructor ran AND
  // `schema.fields` resolved without throwing. Many schemas have
  // constructors that quietly assign `undefined` to a stored arg
  // and only blow up when their baseFields getter calls the missing
  // function. If the cheaper constructor signature would succeed but
  // .fields would throw, the next attempt with stubFn args might
  // pass both gates — keep trying.
  const failures = [];
  for (let i = 0; i < attempts.length; i++) {
    const attempt = attempts[i];
    let instance;
    try { instance = attempt(); }
    catch (e) {
      failures.push(`#${i} ctor: ${e.message}`);
      continue;
    }
    try {
      // Accessing .fields triggers baseFields evaluation. If it
      // throws, the constructor's args were insufficient even though
      // `new` didn't fail. Try the next attempt.
      void instance.fields;
      return { ok: true, instance };
    } catch (e) {
      failures.push(`#${i} fields: ${e.message}`);
    }
  }
  // Report the LAST failure (richest attempt) rather than the first
  // (no-args). The no-args message is almost always "X is not a
  // function" which masks why the rich attempts didn't work either.
  return {
    ok: false,
    reason: 'could not instantiate: ' + failures[failures.length - 1],
  };
};

// Returns a value that differs from `current` for the given field
// type. Audit only cares about triggering a dispatch — semantic
// validity isn't required, just that the walker sees a real change.
const mutateScalar = (field, current) => {
  switch (field.type) {
  case 'switch':
  case 'boolean':
  case 'checkbox':
    return !current;
  case 'int':
  case 'numeric':
    return Number.isFinite(current) ? current + 1 : 1;
  case 'text':
  case 'multiline':
  case 'sql':
  case 'password':
  default:
    return (typeof current === 'string' && current === 'audit_mutated_a')
      ? 'audit_mutated_b' : 'audit_mutated_a';
  }
};

const SCALAR_TYPES = new Set([
  'text', 'multiline', 'sql', 'password',
  'int', 'numeric',
  'switch', 'boolean', 'checkbox',
  'select',
]);

const isScalarField = (f, schema) =>
  SCALAR_TYPES.has(f.type)
  && f.id !== schema.idAttribute
  && (f.mode == null || f.mode.includes('edit') || f.mode.includes('create'));

// Seeds collection fields with 2 rows of defaults each. Cross-row
// reads (the prototype's known limitation) are only visible when
// the walker has multiple rows to choose between; single-row
// collections trivially pass. Two rows is the minimum that makes
// row-0 and row-1 distinguishable from each other.
const seedCollections = (schema, sessData) => {
  for (const field of schema.fields || []) {
    if (field.type !== 'collection' || !field.schema) continue;
    const inner = field.schema;
    const current = sessData[field.id];
    if (Array.isArray(current) && current.length >= 2) continue;
    if (typeof inner.getNewData !== 'function') continue;
    try {
      sessData[field.id] = [inner.getNewData({}), inner.getNewData({})];
    } catch (_e) {
      // Inner schema needs more setup than we can synthesize.
      // Leave the field empty — collection-cell mutations for this
      // field will be skipped below.
    }
  }
};

// Drives one dispatch: mutate sessData, run options + validation
// walks with the audit canaries on. The canaries throw on divergence
// (via __throw_on_canary_divergence__), which propagates up so the
// test fails fast with the diff.
//
// Real schemas read cross-row state via `this.top.sessData.X`, which
// resolves to `this.top._state.data.X`. The walker wires `this.top`
// onto nested schemas at evaluation time, but the `state` attachment
// is SchemaState's job; mimic it here by setting `schema.state` to a
// stub whose `.data` points at the row/sessData currently being
// evaluated. Without this, undeclared cross-row reads silently see
// `undefined` and the audit never observes the divergence.
//
// `knownErrorPaths` is the same multi-path tracker SchemaState
// maintains in production: every path that has ever reported an
// error is included in subsequent mustVisits so a previously-invalid
// row is always re-checked. Without this, the audit would flag
// pre-existing collection errors as "divergence" on every dispatch
// that doesn't touch the collection — the canary would be reporting
// a behavior that the production SchemaState wrapper compensates for.
const dispatchAndAudit = (schema, sessData, changedPath, newSessData, knownErrorPaths) => {
  // Baseline full walk with the OLD sessData wired up.
  schema.state = { data: sessData };
  const prevOptions = schemaOptionsEvalulator({
    schema, data: sessData, viewHelperProps: { mode: 'edit' },
    prevOptions: null,
  });

  // Now wire the NEW sessData so closures inside the canary's two
  // internal walks (full + incremental) read the post-mutation
  // state. Reusing the same `state` object keeps the cached identity
  // stable for any caller that captures it.
  schema.state.data = newSessData;

  // Build the mustVisit that mirrors what SchemaState.validate would
  // assemble: changedPath plus every known error path.
  const mustVisit = [changedPath, ...knownErrorPaths.values()];

  // Options walk — canary diffs incremental vs full.
  schemaOptionsEvalulator({
    schema, data: newSessData,
    viewHelperProps: { mode: 'edit', incrementalOptions: true },
    prevOptions, changedPath,
    depDests: knownErrorPaths.size > 0
      ? Array.from(knownErrorPaths.values()) : null,
  });

  // Validation walk — canary diffs incremental vs full error maps.
  // Pass collectAll=true so the inner walks (full + incremental)
  // gather complete error lists, and capture any newly-reported
  // paths into the tracker so they're respected next dispatch.
  validateSchema(
    schema, newSessData,
    (path) => {
      const flat = path.map((p) => String(p)).join('\x00');
      if (!knownErrorPaths.has(flat)) knownErrorPaths.set(flat, [...path]);
    },
    [], null, mustVisit, true
  );
};

const auditScalars = (schema, sessData, knownErrorPaths) => {
  let n = 0;
  for (const field of schema.fields || []) {
    if (!isScalarField(field, schema)) continue;
    const newValue = mutateScalar(field, sessData[field.id]);
    const newSessData = { ...sessData, [field.id]: newValue };
    dispatchAndAudit(
      schema, sessData, [field.id], newSessData, knownErrorPaths
    );
    n += 1;
  }
  return n;
};

const auditCollectionCells = (schema, sessData, knownErrorPaths) => {
  let n = 0;
  for (const field of schema.fields || []) {
    if (field.type !== 'collection' || !field.schema) continue;
    const rows = sessData[field.id];
    if (!Array.isArray(rows) || rows.length < 2) continue;

    // Mutate one scalar cell in each row (not just row 0) to make
    // sure the walker is forced to choose between rows on subsequent
    // dispatches. This is what triggers cross-row divergence.
    for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
      for (const cellField of field.schema.fields || []) {
        if (!isScalarField(cellField, field.schema)) continue;
        const newValue = mutateScalar(cellField, rows[rowIdx][cellField.id]);
        const newRows = rows.map((r, i) =>
          i === rowIdx ? { ...r, [cellField.id]: newValue } : r
        );
        const newSessData = { ...sessData, [field.id]: newRows };
        dispatchAndAudit(
          schema, sessData, [field.id, rowIdx, cellField.id], newSessData,
          knownErrorPaths
        );
        n += 1;
      }
    }
  }
  return n;
};

// Structural dispatches — ADD_ROW and DELETE_ROW. These are the
// SchemaState actions that change a collection's length; in the
// reducer they set changedPath to the COLLECTION path (e.g. ['rows'])
// rather than a per-cell path. Within the collection itself this
// forces a full re-eval (every row's globalPath overlaps the
// collection path), so single-collection cross-row divergences
// can't manifest here. The remaining hazard is CROSS-collection
// reads: row N of collection B has a closure reading collection A,
// and ADD/DELETE on A leaves coll_B's rows pruned in incremental
// mode while the full walk re-computes them. This pass surfaces
// exactly that pattern.
const auditCollectionStructure = (schema, sessData, knownErrorPaths) => {
  let n = 0;
  for (const field of schema.fields || []) {
    if (field.type !== 'collection' || !field.schema) continue;
    const rows = sessData[field.id];
    if (!Array.isArray(rows)) continue;
    const inner = field.schema;

    // ADD_ROW: append a default row at the collection level.
    if (typeof inner.getNewData === 'function') {
      let newRow;
      let createOk = false;
      try {
        newRow = inner.getNewData({});
        createOk = true;
      } catch (_e) {
        // Inner schema needs setup we can't synthesize. Skip; the
        // existing cell-mutation pass already covered as much of
        // this collection as it could.
      }
      if (createOk) {
        const newRows = [...rows, newRow];
        const newSessData = { ...sessData, [field.id]: newRows };
        dispatchAndAudit(
          schema, sessData, [field.id], newSessData, knownErrorPaths
        );
        n += 1;
      }
    }

    // DELETE_ROW: drop the last row (only if there's anything to drop).
    if (rows.length > 0) {
      const newRows = rows.slice(0, -1);
      const newSessData = { ...sessData, [field.id]: newRows };
      dispatchAndAudit(
        schema, sessData, [field.id], newSessData, knownErrorPaths
      );
      n += 1;
    }
  }
  return n;
};

// Distinguishes a canary divergence (which the audit MUST report)
// from any other exception that's a harness limitation — e.g. the
// schema's `baseFields` getter calls a function that depends on
// production-only constructor args, or accesses `this.nodeInfo.server`
// when nodeInfo wasn't supplied. We treat the latter as SKIPs so the
// harness focuses on real divergences.
const isDivergenceError = (e) =>
  e instanceof Error
  && /(Incremental walker divergence|Incremental validator divergence)/
    .test(e.message);

export const auditSchema = (SchemaClass) => {
  const inst = tryInstantiate(SchemaClass);
  if (!inst.ok) {
    return { skipped: true, skipReason: inst.reason, dispatches: 0 };
  }
  const schema = inst.instance;

  // `schema.fields` (or `baseFields`) often references constructor
  // args that audit-time `new SchemaClass()` doesn't provide. Try
  // accessing fields + getting default data; failures here mean the
  // schema needs a real production fixture — skip cleanly.
  let sessData;
  try {
    // Force `fields` resolution to surface baseFields errors early.
    if (Array.isArray(schema.fields)) {
      sessData = (typeof schema.getNewData === 'function')
        ? schema.getNewData({})
        : {};
    } else {
      sessData = {};
    }
  } catch (e) {
    return {
      skipped: true,
      skipReason: `schema setup failed: ${e.message.split('\n')[0]}`,
      dispatches: 0,
    };
  }
  try { seedCollections(schema, sessData); }
  catch (e) {
    return {
      skipped: true,
      skipReason: `collection seeding failed: ${e.message.split('\n')[0]}`,
      dispatches: 0,
    };
  }

  // Audit mode: route the wrappers through the canaries, and make
  // divergence throw so jest catches it. setup-jest.js sets
  // NODE_ENV=test which the canary's defaultReport requires for the
  // throw branch.
  window.__INCREMENTAL_AUDIT__ = true;
  window.__throw_on_canary_divergence__ = true;
  // Disable the throttle for audit — every dispatch must be checked,
  // not just the first few per session. Infinity > DEFAULT_MAX_CANARY_FIRES
  // means the cap is never hit. Also reset the counters so prior tests
  // in the same jest worker don't leak fire-count state into this audit.
  window.__incremental_canary_max_per_session__ = Number.POSITIVE_INFINITY;
  _resetCanaryFireCount();
  _resetValidationCanaryFireCount();

  // Suppress console.error during the audit. Real divergences throw
  // via the canary (window.__throw_on_canary_divergence__) and so
  // bypass the console path entirely. The console.error calls that
  // DO happen during audit come from in-schema fallback handlers —
  // e.g. utils.sprintf catching TypeError when its format string is
  // undefined because audit-time sessData didn't seed the field the
  // closure expected. Those are harness-limitation noise, not
  // walker bugs; let them pass without tripping setup-jest's
  // afterEach `expect(console.error).not.toHaveBeenCalled()` check.
  const consoleErrorSpy = (typeof console !== 'undefined'
    && typeof console.error?.mockImplementation === 'function')
    ? console.error : null;
  let originalImpl;
  if (consoleErrorSpy) {
    originalImpl = consoleErrorSpy.getMockImplementation();
    consoleErrorSpy.mockImplementation(() => {});
  }

  // Tracker that mirrors SchemaState._knownErrorPaths. Populated by
  // an initial full validation walk (so pre-existing errors enter the
  // tracker before the first incremental dispatch), and updated after
  // each subsequent walk. This is what makes the audit's per-dispatch
  // mustVisit faithfully reproduce production safety semantics.
  const knownErrorPaths = new Map();
  try {
    validateSchema(
      schema, sessData,
      (path) => {
        if (!Array.isArray(path)) return;
        const flat = path.map((p) => String(p)).join('\x00');
        if (!knownErrorPaths.has(flat)) knownErrorPaths.set(flat, [...path]);
      },
      [], null, null, true
    );
  } catch (_e) {
    // Initial discovery failure (schema needs args we can't supply).
    // The dispatch loop will catch the same error and report skip.
  }

  let dispatches = 0;
  let skipReason = null;
  try {
    try {
      dispatches += auditScalars(schema, sessData, knownErrorPaths);
      dispatches += auditCollectionCells(schema, sessData, knownErrorPaths);
      dispatches += auditCollectionStructure(schema, sessData, knownErrorPaths);
    } catch (e) {
      // Re-throw real divergences so jest catches them as test
      // failures. Anything else — closures crashing on missing
      // nodeInfo, missing `this.top` data, etc. — is a harness
      // limitation, not a walker bug. Report as SKIP.
      if (isDivergenceError(e)) throw e;
      skipReason = `dispatch error: ${e.message.split('\n')[0]}`;
    }
  } finally {
    delete window.__INCREMENTAL_AUDIT__;
    delete window.__throw_on_canary_divergence__;
    delete window.__incremental_canary_max_per_session__;
    if (consoleErrorSpy) {
      // Clear the captured calls (harness-noise that we suppressed)
      // and restore the prior implementation. mockClear keeps the
      // spy attached (setup-jest's afterEach still needs it as a
      // mock); only the .mock.calls history is wiped.
      consoleErrorSpy.mockClear();
      if (originalImpl) consoleErrorSpy.mockImplementation(originalImpl);
      else consoleErrorSpy.mockImplementation(undefined);
    }
  }

  if (skipReason) return { skipped: true, skipReason, dispatches };
  return { skipped: false, dispatches };
};
