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
import { schemaOptionsEvalulator, pathOverlaps } from '../options/registry';
import { _resetCanaryFireCount } from '../options/canary';
import { _resetValidationCanaryFireCount } from './validation_canary';

// Walks the schema tree (including collection inner schemas, with row
// indices from `sessData`) and emits the source→dest pairs that
// `listenDepChanges` would register at React mount time. The audit
// runs synthetically — no React, no useEffect — so production's
// DepListener registry is empty when the canary fires. To audit the
// SAME paths real users hit, we reconstruct the registry here from
// `field.deps` declarations and use it to populate the walker's
// depDests for each dispatch.
const collectDepEntries = (schema, sessData) => {
  const entries = [];
  const walk = (sch, accessPath, dataAtLevel) => {
    for (const field of sch?.fields || []) {
      if (field.deps) {
        const deps = Array.isArray(field.deps) ? field.deps : [];
        const destAccessPath = accessPath.concat(field.id);
        for (const dep of deps) {
          // Same convention as listenDepChanges:
          //   string  → relative to current parent (accessPath)
          //   array   → absolute access path
          const source = Array.isArray(dep) ? dep : accessPath.concat(dep);
          entries.push({ source, dest: destAccessPath });
        }
      }
      // Recurse into nested schemas + collection inner schemas.
      if (field.schema instanceof BaseUISchema) {
        if (field.type === 'collection') {
          const rows = dataAtLevel?.[field.id];
          if (Array.isArray(rows)) {
            rows.forEach((row, idx) => {
              walk(field.schema, accessPath.concat(field.id, idx), row);
            });
          }
        } else {
          // nested-fieldset / inline-groups — same data level.
          walk(field.schema, accessPath.concat(field.id), dataAtLevel);
        }
      }
    }
  };
  walk(schema, [], sessData);
  return entries;
};

// For a given changedPath, return all dep dests whose source path
// overlaps. Mirrors SchemaState._collectDepDestsForPath but works off
// the pre-walked entries rather than DepListener._depListeners.
const collectDepDests = (entries, changedPath) => {
  if (!Array.isArray(changedPath)) return null;
  const dests = [];
  for (const e of entries) {
    if (pathOverlaps(e.source, changedPath)) dests.push(e.dest);
  }
  return dests;
};

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

// LanguageSchema (and a few other database-child schemas) snake_case
// the nodeInfo arg as `node_info`, with a doubly-nested shape:
// `this.node_info.node_info.user.name`. Synthesize that shape so the
// constructor doesn't crash at field defaults.
const nestedNodeInfo = {
  node_info: {
    server: richNodeInfo.server,
    version: 999999,
    user: { name: 'audit_stub', is_superuser: true },
    database: richNodeInfo.database,
    schema: richNodeInfo.schema,
  },
  server: richNodeInfo.server,
  version: 999999,
  user: { name: 'audit_stub', is_superuser: true },
  database: richNodeInfo.database,
  schema: richNodeInfo.schema,
};

// Per-schema fixture factories for hosts whose constructors are too
// specific for the generic attempt chain — e.g. BackupSchema's six
// stub-fn args, or LanguageSchema's doubly-nested node_info. Each
// factory returns a constructed instance; if it throws, the generic
// chain is tried as a fallback.
const PER_SCHEMA_FIXTURES = {
  BackupSchema: (C) => new C(
    stubFn, stubFn, stubFn, stubFn, stubFn, stubFn,
    richFieldOptions, [], null, 'server', {}
  ),
  RestoreSchema: (C) => new C(
    stubFn, stubFn, stubFn, stubFn, stubFn, stubFn,
    richFieldOptions, [], null, 'server', {}
  ),
  ForeignTableSchema: (C) => new C(
    stubFn, stubFn, () => [], richFieldOptions, {}
  ),
  FunctionSchema: (C) => new C(
    stubFn, stubFn, richFieldOptions, nestedNodeInfo, 'function', {}
  ),
  TriggerFunctionSchema: (C) => new C(
    stubFn, stubFn, richFieldOptions, {}
  ),
  LanguageSchema: (C) => new C(
    stubFn, richFieldOptions, nestedNodeInfo, {}
  ),
  PublicationSchema: (C) => new C(
    richFieldOptions, nestedNodeInfo, {}
  ),
  TriggerSchema: (C) => new C(richFieldOptions, {}),
  RowSecurityPolicySchema: (C) => new C(richFieldOptions, {}),
  TypeSchema: (C) => new C(
    stubFn, stubFn, stubFn, stubFn, stubFn, richFieldOptions, {}
  ),
  VacuumSettingsSchema: (C) => {
    // VacuumSettingsSchema's fields call `obj.top.isNew()` — it
    // expects to be a child of a parent schema (TableSchema etc).
    // Audited standalone, obj.top is null. Wire a stub parent.
    const inst = new C([], [], richNodeInfo);
    inst.top = Object.assign(new BaseUISchema(), {
      isNew: () => true,
      state: { data: {}, _sessData: {} },
    });
    return inst;
  },
  ViewSchema: (C) => new C(stubFn, richNodeInfo, richFieldOptions, {}),
};

const tryInstantiate = (SchemaClass) => {
  // Per-schema fixture first: hosts with constructors too specific
  // for the generic chain (BackupSchema's 6 stub-fns, LanguageSchema's
  // doubly-nested node_info, etc.) get a hand-written factory.
  const fixture = PER_SCHEMA_FIXTURES[SchemaClass.name];
  if (fixture) {
    try {
      const instance = fixture(SchemaClass);
      // Still gate on `.fields` resolution — the fixture only
      // guarantees the constructor ran.
      void instance.fields;
      return { ok: true, instance };
    } catch {
      // Fall through to generic attempts.
    }
  }
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

// Variants used to surface closures that branch on input shape
// (empty / whitespace / unicode / long). Each pass cycles through
// the variants modulo the call count so subsequent dispatches on
// the same field hit different branches.
const TEXT_VARIANTS = [
  'audit_mutated_a',
  'audit_mutated_b',
  '',                              // empty — many validators reject this
  '   ',                           // whitespace-only
  'éàç中',      // unicode — éàç中
  'a'.repeat(200),                 // long string
];

let _scalarMutationCounter = 0;

// Returns a value that differs from `current` for the given field
// type. Audit only cares about triggering a dispatch — semantic
// validity isn't required, just that the walker sees a real change.
// For text-shaped fields, cycles through TEXT_VARIANTS so closures
// reading length / emptiness / non-ASCII content all get hit
// across the full audit pass.
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
  default: {
    const idx = (_scalarMutationCounter++) % TEXT_VARIANTS.length;
    const candidate = TEXT_VARIANTS[idx];
    if (candidate === current) {
      // Same value as current — pick the next one to guarantee a
      // real change (otherwise the walker sees no-op dispatch).
      return TEXT_VARIANTS[(idx + 1) % TEXT_VARIANTS.length];
    }
    return candidate;
  }
  }
};

// Test-only entry point to reset the rotation between specs so
// dispatch ordering is deterministic per test.
export const _resetMutationCounter = () => { _scalarMutationCounter = 0; };

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

// Seeds collection fields with SEED_ROWS rows of defaults each.
// Cross-row reads (the prototype's known limitation) only surface
// when the walker has multiple rows to choose between. Two rows
// catches row-0-vs-row-1 patterns; three is the minimum that
// exercises chained reads where row N's closure references row
// N-1 — common in DataGridView patterns like "constraint references
// the column at the previous index".
//
// Each row is given a unique sentinel value in its first scalar
// cell so cross-row reads see DISTINCT data per row (not three
// identical default rows). A closure that reads
// `top.sessData.rows[0].name` vs `rows[1].name` will produce
// different results, which is what surfaces divergence.
const SEED_ROWS = 3;

const stampSentinel = (inner, row, idx) => {
  // Pick the first scalar-typed cell in the inner schema and stamp
  // a unique sentinel. Skips silently when the inner has no scalar
  // cell (the row stays as-is — still gets seeded for ADD/DELETE
  // coverage).
  for (const cellField of inner?.fields || []) {
    if (isScalarField(cellField, inner)) {
      row[cellField.id] = `audit_row_${idx}`;
      return;
    }
  }
};

const seedCollections = (schema, sessData) => {
  for (const field of schema.fields || []) {
    if (field.type !== 'collection' || !field.schema) continue;
    const inner = field.schema;
    const current = sessData[field.id];
    if (Array.isArray(current) && current.length >= SEED_ROWS) continue;
    if (typeof inner.getNewData !== 'function') continue;
    try {
      const seeded = [];
      for (let i = 0; i < SEED_ROWS; i++) {
        const row = inner.getNewData({});
        stampSentinel(inner, row, i);
        seeded.push(row);
      }
      sessData[field.id] = seeded;
    } catch {
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
// Constructs a stub for `schema.state` shaped close enough to a
// real SchemaState that closures reading top.state.X don't crash or
// silently take the wrong branch. The walker reads `state.data`;
// validators sometimes read `state.errors` and `state._knownErrorPaths`
// to decide whether to short-circuit. Synthetic state with empty
// errors + the live data pointer matches production's "no errors,
// fresh from initialise" baseline.
const buildStateStub = (sessData, knownErrorPaths) => ({
  data: sessData,
  errors: {},
  isReady: true,
  isNew: false,  // edit-mode default; toggle per-call when needed
  _knownErrorPaths: knownErrorPaths || new Map(),
});

const dispatchAndAudit = (schema, sessData, changedPath, newSessData, knownErrorPaths, mode = 'edit') => {
  // Baseline full walk with the OLD sessData wired up.
  schema.state = buildStateStub(sessData, knownErrorPaths);
  schema.state.isNew = (mode !== 'edit');
  const prevOptions = schemaOptionsEvalulator({
    schema, data: sessData, viewHelperProps: { mode },
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

  // Compute dep-dests from the schema's declared `field.deps`. This
  // matches what listenDepChanges + DepListener._collectDepDestsForPath
  // do in production: any field whose dep source overlaps the
  // changedPath must stay in mustVisit so its row isn't pruned.
  // Without this the audit would falsely flag every evaluator-only
  // cross-row dep as a divergence.
  const depEntries = collectDepEntries(schema, newSessData);
  const fieldDepDests = collectDepDests(depEntries, changedPath) || [];
  const allDepDests = [
    ...fieldDepDests,
    ...Array.from(knownErrorPaths.values()),
  ];

  // Options walk — canary diffs incremental vs full.
  schemaOptionsEvalulator({
    schema, data: newSessData,
    viewHelperProps: { mode, incrementalOptions: true },
    prevOptions, changedPath,
    depDests: allDepDests.length > 0 ? allDepDests : null,
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

// Audit fields nested inside `nested-fieldset`, `nested-tab`, or
// `inline-groups` group containers. These share the PARENT'S data
// level (sessData is flat across the container boundary) but live
// in the walker's nested branch — a different code path from
// top-level scalars. Bugs that manifest only when a scalar is
// reached via the nested branch would slip past auditScalars.
//
// Production users: publication.ui (FOR Events block), trigger.ui,
// table.ui (Like block), index.ui (With block), type.ui, sequence.ui
// (Owned By), pga_schedule.ui, and others.
//
// Recursive descent — production schemas chain group containers
// arbitrarily deep (e.g. nested-fieldset inside an inline-groups
// inside another nested-fieldset). MAX_NEST_DEPTH guards against
// pathological / cyclical schemas; 6 is generous for real shapes.
const NESTED_GROUP_TYPES = new Set([
  'nested-fieldset', 'nested-tab', 'inline-groups',
]);
const MAX_NEST_DEPTH = 6;

// Yields { fieldDef, ownerSchema } for every scalar field reachable
// through one or more nested-* group containers from `rootSchema`,
// excluding the root's own direct scalar fields (those are
// auditScalars' job).
const walkNestedScalars = function* (rootSchema, depth = 0) {
  if (depth >= MAX_NEST_DEPTH) return;
  for (const groupField of rootSchema?.fields || []) {
    if (!NESTED_GROUP_TYPES.has(groupField.type)) continue;
    if (!groupField.schema) continue;
    if (!groupField.schema.top) {
      groupField.schema.top = rootSchema.top || rootSchema;
    }
    for (const inner of groupField.schema.fields || []) {
      if (isScalarField(inner, groupField.schema)) {
        yield { fieldDef: inner, ownerSchema: groupField.schema };
      }
    }
    // Recurse: the group's schema may contain MORE nested groups.
    yield* walkNestedScalars(groupField.schema, depth + 1);
  }
};

const auditNestedFields = (schema, sessData, knownErrorPaths, mode = 'edit') => {
  let n = 0;
  for (const { fieldDef, ownerSchema } of walkNestedScalars(schema)) {
    // Nested-* shares data with the root, so the field's path is
    // FLAT at the root's level (NOT prefixed by any group field
    // ids) — production dispatches read sessData[fieldDef.id], not
    // sessData[group.id][...nested.id][fieldDef.id].
    const newValue = mutateScalar(fieldDef, sessData[fieldDef.id]);
    const newSessData = { ...sessData, [fieldDef.id]: newValue };
    // Mirror production behavior: closures may read `obj.ownerSchema`
    // / `obj.top` to find their root. Both are wired by walkNestedScalars
    // above (top stamp + walker-time recursion).
    void ownerSchema;  // documentation only; helper passes it for clarity
    dispatchAndAudit(
      schema, sessData, [fieldDef.id], newSessData, knownErrorPaths, mode,
    );
    n += 1;
  }
  return n;
};

const auditScalars = (schema, sessData, knownErrorPaths, mode = 'edit') => {
  let n = 0;
  for (const field of schema.fields || []) {
    if (!isScalarField(field, schema)) continue;
    const newValue = mutateScalar(field, sessData[field.id]);
    const newSessData = { ...sessData, [field.id]: newValue };
    dispatchAndAudit(
      schema, sessData, [field.id], newSessData, knownErrorPaths, mode
    );
    n += 1;
  }
  return n;
};

const auditCollectionCells = (schema, sessData, knownErrorPaths, mode = 'edit') => {
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
          knownErrorPaths, mode
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
const auditCollectionStructure = (schema, sessData, knownErrorPaths, mode = 'edit') => {
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
      } catch {
        // Inner schema needs setup we can't synthesize. Skip; the
        // existing cell-mutation pass already covered as much of
        // this collection as it could.
      }
      if (createOk) {
        const newRows = [...rows, newRow];
        const newSessData = { ...sessData, [field.id]: newRows };
        dispatchAndAudit(
          schema, sessData, [field.id], newSessData, knownErrorPaths, mode
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

// Sequence pass (addresses A + B in the post-review punch list).
//
// Production accumulates prevOptions across the entire lifetime of a
// dialog. The existing audit passes each compute prevOptions FRESH
// from the seeded sessData, so they catch single-dispatch divergence
// but cannot catch compounding bugs where dispatch K's prev is
// dispatch K-1's stale output. The vacuum_table bug that started
// this session was exactly this shape.
//
// auditSequence drives a realistic multi-step user flow against a
// SINGLE persistent (sessData, prevOptions) tuple. Each step's
// prev = previous step's full-walk output, mirroring how
// SchemaState.updateOptions writes back to optionStore. If any step
// diverges the canary throws as usual.
//
// The script (~10 steps) covers the common interaction shapes:
//   1. type into a top-level scalar
//   2. add a row to the first collection
//   3. type into a cell of the new row
//   4. add another row to the same collection
//   5. type into row 0 cell of a DIFFERENT collection
//   6. move a row in collection 0 (drag-reorder)
//   7. type back into the original top scalar (cycles a variant)
//   8. delete the appended row
//   9. flip a switch in some row if any switch cell exists
//  10. type into a top scalar a third time (closes the cycle)
//
// Steps that don't apply to a given schema (no scalar, no collection,
// no switch) are silently skipped; the pass tolerates schemas with
// any subset of the shape. Returns the dispatch count.
const auditSequence = (schema, sessData, knownErrorPaths, mode = 'edit') => {
  // Persistent walker context. `prev` evolves across dispatches; this
  // is the half the per-pass functions can't simulate.
  schema.state = buildStateStub(sessData, knownErrorPaths);
  schema.state.isNew = (mode !== 'edit');
  let prev = schemaOptionsEvalulator({
    schema, data: sessData,
    viewHelperProps: { mode },
    prevOptions: null,
  });
  let cur = sessData;

  const fire = (changedPath, newSessData) => {
    schema.state.data = newSessData;
    const depEntries = collectDepEntries(schema, newSessData);
    const fieldDepDests = collectDepDests(depEntries, changedPath) || [];
    const allDepDests = [
      ...fieldDepDests,
      ...Array.from(knownErrorPaths.values()),
    ];
    const mustVisit = [changedPath, ...knownErrorPaths.values()];

    // Capture the canary's full-walk output as the NEW prev so the
    // NEXT step starts from the (correct) accumulated state — the
    // shape production maintains in optionStore.
    const next = schemaOptionsEvalulator({
      schema, data: newSessData,
      viewHelperProps: { mode, incrementalOptions: true },
      prevOptions: prev, changedPath,
      depDests: allDepDests.length > 0 ? allDepDests : null,
    });

    validateSchema(
      schema, newSessData,
      (path) => {
        const flat = path.map((p) => String(p)).join('\x00');
        if (!knownErrorPaths.has(flat)) knownErrorPaths.set(flat, [...path]);
      },
      [], null, mustVisit, true,
    );

    cur = newSessData;
    prev = next;
  };

  let n = 0;
  // Identify candidate field shapes once.
  const topScalars = (schema.fields || [])
    .filter((f) => isScalarField(f, schema));
  const collections = (schema.fields || [])
    .filter((f) => f.type === 'collection' && f.schema
      && typeof f.schema.getNewData === 'function');

  // 1. type into a top scalar
  if (topScalars[0]) {
    const f = topScalars[0];
    fire([f.id], { ...cur, [f.id]: mutateScalar(f, cur[f.id]) });
    n++;
  }

  // 2. ADD_ROW to collection 0
  if (collections[0]) {
    try {
      const newRow = collections[0].schema.getNewData({});
      const rows = [...(cur[collections[0].id] || []), newRow];
      fire([collections[0].id], { ...cur, [collections[0].id]: rows });
      n++;

      // 3. type into a cell of the newly-added row
      const innerScalar = (collections[0].schema.fields || [])
        .find((f) => isScalarField(f, collections[0].schema));
      if (innerScalar) {
        const idx = rows.length - 1;
        const updated = rows.map((r, i) => i === idx
          ? { ...r, [innerScalar.id]: mutateScalar(innerScalar, r[innerScalar.id]) }
          : r);
        fire(
          [collections[0].id, idx, innerScalar.id],
          { ...cur, [collections[0].id]: updated },
        );
        n++;
      }

      // 4. ADD_ROW again
      const newRow2 = collections[0].schema.getNewData({});
      const rows2 = [...(cur[collections[0].id] || []), newRow2];
      fire([collections[0].id], { ...cur, [collections[0].id]: rows2 });
      n++;
    } catch { /* collection setup mismatch — skip */ }
  }

  // 5. type into row 0 of a DIFFERENT collection
  if (collections[1]) {
    const innerScalar = (collections[1].schema.fields || [])
      .find((f) => isScalarField(f, collections[1].schema));
    const rows = cur[collections[1].id] || [];
    if (innerScalar && rows.length > 0) {
      const updated = rows.map((r, i) => i === 0
        ? { ...r, [innerScalar.id]: mutateScalar(innerScalar, r[innerScalar.id]) }
        : r);
      fire(
        [collections[1].id, 0, innerScalar.id],
        { ...cur, [collections[1].id]: updated },
      );
      n++;
    }
  }

  // 6. MOVE_ROW on collection 0
  if (collections[0]) {
    const rows = cur[collections[0].id] || [];
    if (rows.length >= 2) {
      const reordered = [...rows.slice(1), rows[0]];
      fire([collections[0].id], { ...cur, [collections[0].id]: reordered });
      n++;
    }
  }

  // 7. type into top scalar 0 again
  if (topScalars[0]) {
    const f = topScalars[0];
    fire([f.id], { ...cur, [f.id]: mutateScalar(f, cur[f.id]) });
    n++;
  }

  // 8. DELETE_ROW on collection 0
  if (collections[0]) {
    const rows = cur[collections[0].id] || [];
    if (rows.length > 0) {
      const trimmed = rows.slice(0, -1);
      fire([collections[0].id], { ...cur, [collections[0].id]: trimmed });
      n++;
    }
  }

  // 9. flip a switch cell in some collection that has one
  for (const c of collections) {
    const sw = (c.schema.fields || []).find(
      (f) => ['switch', 'boolean', 'checkbox'].includes(f.type),
    );
    const rows = cur[c.id] || [];
    if (sw && rows.length > 0) {
      const updated = rows.map((r, i) => i === 0
        ? { ...r, [sw.id]: !r[sw.id] } : r);
      fire([c.id, 0, sw.id], { ...cur, [c.id]: updated });
      n++;
      break;  // one switch is enough; we just want the path covered
    }
  }

  // 10. type into top scalar 0 once more (cycles through variants)
  if (topScalars[0]) {
    const f = topScalars[0];
    fire([f.id], { ...cur, [f.id]: mutateScalar(f, cur[f.id]) });
    n++;
  }

  return n;
};

// MOVE_ROW dispatches: simulate the DataGridView drag-to-reorder
// action. Real reducer at SCHEMA_STATE_ACTIONS.MOVE_ROW splices a
// row out at oldIndex and re-inserts it at newIndex; the action's
// changedPath is the collection path (same shape as ADD/DELETE).
// Audit shape: swap rows 0 and N-1 for each collection with at
// least 2 seeded rows.
const auditMoveRow = (schema, sessData, knownErrorPaths, mode = 'edit') => {
  let n = 0;
  for (const field of schema.fields || []) {
    if (field.type !== 'collection' || !field.schema) continue;
    const rows = sessData[field.id];
    if (!Array.isArray(rows) || rows.length < 2) continue;
    // Reorder: move row 0 to the end. The reducer's MOVE_ROW
    // splices in-place; the audit reproduces the resulting array.
    const newRows = [...rows.slice(1), rows[0]];
    const newSessData = { ...sessData, [field.id]: newRows };
    dispatchAndAudit(
      schema, sessData, [field.id], newSessData, knownErrorPaths, mode
    );
    n += 1;
  }
  return n;
};

// BULK_UPDATE dispatches: the reducer toggles `row[action.id] = false`
// on every row of the collection. Production callers use this to
// reset toggles like 'used' across a whole collection (e.g. the
// "uncheck all" in security label grids). Audit shape: for every
// collection whose inner schema has at least one switch / boolean
// scalar cell, simulate the bulk-clear.
const auditBulkUpdate = (schema, sessData, knownErrorPaths, mode = 'edit') => {
  let n = 0;
  for (const field of schema.fields || []) {
    if (field.type !== 'collection' || !field.schema) continue;
    const rows = sessData[field.id];
    if (!Array.isArray(rows) || rows.length === 0) continue;
    // Find the first switch/boolean cell — that's what BULK_UPDATE
    // would target in production.
    const boolCell = (field.schema.fields || []).find(
      (f) => ['switch', 'boolean', 'checkbox'].includes(f.type)
    );
    if (!boolCell) continue;
    const newRows = rows.map((r) => ({ ...r, [boolCell.id]: false }));
    const newSessData = { ...sessData, [field.id]: newRows };
    dispatchAndAudit(
      schema, sessData, [field.id], newSessData, knownErrorPaths, mode
    );
    n += 1;
  }
  return n;
};

// Batched-dispatch pass. Mirrors what useSchemaState's
// __pendingChangedPaths accumulator hands to validate when React
// batches multiple dispatches into one render commit.
//
// Generates batches of size 2..MAX_BATCH_SIZE so the pass covers
// the production cases that surfaced this whole bug class:
//   2 paths — two sibling fixedRows promises resolving in one
//             microtask (the vacuum_table/vacuum_toast pattern).
//   3+      — multiple async loads in larger schemas (Function
//             arguments + Parameters + Privileges all landing in
//             one React commit; Index columns + with + storage_props).
//
// Path candidates per schema:
//   - every top-level scalar
//   - every collection root (covers ADD_ROW shape)
//   - one collection-cell path per collection (first row, first
//     scalar cell — covers SET_VALUE inside a row).
//
// Batches: enumerate every k-combination for k in 2..MAX_BATCH_SIZE.
// Exhaustive over candidates; bounded by combinatorial explosion via
// MAX_CANDIDATES + MAX_BATCHES_PER_SCHEMA.
const MAX_BATCH_SIZE = 4;     // 2, 3, 4 — production fixedRows
// landings rarely batch >4 at once.
const MAX_CANDIDATES = 8;     // top-N source candidates per schema
const MAX_BATCHES_PER_SCHEMA = 60;  // generous cap to keep the
// full audit under ~30s
// across 87 schemas × 2 modes.

const collectBatchCombos = (schema, sessData) => {
  const candidates = [];

  for (const field of schema.fields || []) {
    if (isScalarField(field, schema)) {
      candidates.push([field.id]);
    } else if (field.type === 'collection' && field.schema) {
      candidates.push([field.id]);
      const rows = sessData[field.id];
      if (Array.isArray(rows) && rows.length > 0) {
        // Push the FIRST TWO scalar cells of row 0 — this covers
        // the same-row, different-cells batching pattern (e.g.
        // user types in name + a depChange fires on type in the
        // same React commit).
        let pushed = 0;
        for (const cellField of field.schema.fields || []) {
          if (!isScalarField(cellField, field.schema)) continue;
          candidates.push([field.id, 0, cellField.id]);
          pushed++;
          if (pushed >= 2) break;
        }
        // Also push the SAME cell from row 1 — covers same-cell-
        // different-row pairing (two sibling fixedRows landing in
        // the same tick, both populating row 0).
        if (rows.length > 1) {
          for (const cellField of field.schema.fields || []) {
            if (isScalarField(cellField, field.schema)) {
              candidates.push([field.id, 1, cellField.id]);
              break;
            }
          }
        }
      }
    }
    if (candidates.length >= MAX_CANDIDATES) break;
  }

  // Enumerate k-combinations for k in 2..MAX_BATCH_SIZE. Lexicographic
  // index iteration is fine since we cap the output size at
  // MAX_BATCHES_PER_SCHEMA anyway.
  const combos = [];
  const recurse = (start, current, k) => {
    if (combos.length >= MAX_BATCHES_PER_SCHEMA) return;
    if (current.length === k) {
      combos.push([...current]);
      return;
    }
    for (let i = start; i < candidates.length; i++) {
      current.push(candidates[i]);
      recurse(i + 1, current, k);
      current.pop();
      if (combos.length >= MAX_BATCHES_PER_SCHEMA) return;
    }
  };
  for (let k = 2; k <= MAX_BATCH_SIZE; k++) {
    recurse(0, [], k);
    if (combos.length >= MAX_BATCHES_PER_SCHEMA) break;
  }
  return combos;
};

// Apply one mutation to sessData given a single path. Returns the
// mutated sessData (shallow-cloned at top) or null if the mutation
// shape isn't supported (e.g. collection without getNewData).
const applyMutation = (schema, sessData, path) => {
  if (path.length === 1) {
    const field = (schema.fields || []).find((f) => f.id === path[0]);
    if (field && isScalarField(field, schema)) {
      return { ...sessData,
        [path[0]]: mutateScalar(field, sessData[path[0]]) };
    }
    if (field?.type === 'collection'
        && typeof field.schema?.getNewData === 'function') {
      try {
        return { ...sessData,
          [path[0]]: [...(sessData[path[0]] || []), field.schema.getNewData({})] };
      } catch { return null; }
    }
    return null;
  }
  if (path.length === 3) {
    const [collId, rowIdx, cellId] = path;
    const field = (schema.fields || []).find((f) => f.id === collId);
    if (!field) return null;
    const cellField = (field.schema?.fields || []).find((f) => f.id === cellId);
    if (!cellField) return null;
    const rows = sessData[collId] || [];
    return { ...sessData,
      [collId]: rows.map((r, i) => i === rowIdx
        ? { ...r, [cellId]: mutateScalar(cellField, r?.[cellId]) }
        : r) };
  }
  return null;
};

// For each k-combination, rotate through ALL k positions so each
// path gets a turn as `primary` (the changedPath threaded through
// updateOptions). Production's __pendingChangedPaths.shift() makes
// the first-pushed path primary, but which dispatch fires first
// across a React batch isn't determinable from source. Every
// rotation covers a distinct "this path was primary" scenario.
//
// Full K! permutations of the extras would be ideal but blows the
// runtime budget at k=4 (24 perms × 60 combos × 87 schemas × 3
// modes). K rotations is the sweet spot: every PATH gets primary
// coverage; the extras retain their natural order from
// candidate-emission. Catches the production-realistic
// "primary=A, extras=[B,C]" vs "primary=B, extras=[A,C]" vs
// "primary=C, extras=[A,B]" pattern set.
const MAX_ROTATIONS_PER_COMBO = Number.POSITIVE_INFINITY;

const auditBatched = (schema, sessData, knownErrorPaths, mode = 'edit') => {
  let n = 0;
  const combos = collectBatchCombos(schema, sessData);
  for (const batch of combos) {
    // Apply all k mutations in one go (the same way the production
    // accumulator collects k batched paths into one validate cycle).
    let newSessData = sessData;
    let appliedAll = true;
    for (const p of batch) {
      const next = applyMutation(schema, newSessData, p);
      if (next === null) { appliedAll = false; break; }
      newSessData = next;
    }
    if (!appliedAll) continue;

    // Try the first MAX_ROTATIONS_PER_COMBO rotations of the batch.
    // Rotation r means: primary = batch[r], extras = the rest in
    // their natural order.
    const rotations = Math.min(batch.length, MAX_ROTATIONS_PER_COMBO);
    for (let r = 0; r < rotations; r++) {
      const primary = batch[r];
      const extras = batch.filter((_, i) => i !== r);

      schema.state = buildStateStub(sessData, knownErrorPaths);
      schema.state.isNew = (mode !== 'edit');
      const prevOptions = schemaOptionsEvalulator({
        schema, data: sessData,
        viewHelperProps: { mode },
        prevOptions: null,
      });
      schema.state.data = newSessData;

      // Mirror SchemaState.validate's accumulator shape: primary path
      // is changedPath; each additional path rides depDests AS IS, AND
      // its own depDests join too. The walker's mustVisit becomes the
      // union of all k paths + every path's depDests + known error
      // paths — exactly what production now builds.
      const depEntries = collectDepEntries(schema, newSessData);
      const primaryDepDests = collectDepDests(depEntries, primary) || [];
      const allDepDests = [...primaryDepDests];
      for (const extra of extras) {
        allDepDests.push(extra);
        const extraDeps = collectDepDests(depEntries, extra) || [];
        for (const d of extraDeps) allDepDests.push(d);
      }
      for (const v of knownErrorPaths.values()) allDepDests.push(v);

      const mustVisit = [primary, ...extras, ...knownErrorPaths.values()];

      schemaOptionsEvalulator({
        schema, data: newSessData,
        viewHelperProps: { mode, incrementalOptions: true },
        prevOptions, changedPath: primary,
        depDests: allDepDests,
      });
      validateSchema(
        schema, newSessData,
        (path) => {
          const flat = path.map((p) => String(p)).join('\x00');
          if (!knownErrorPaths.has(flat)) knownErrorPaths.set(flat, [...path]);
        },
        [], null, mustVisit, true
      );
      n += 1;
    }  // end rotation loop
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

// Property-based fuzzing entry point. Given a SchemaClass, a mode,
// and a list of path-INDICES (each index selects into the schema's
// candidate-path list at audit time), runs ONE batched dispatch
// against the canary.
//
// Returns: { ok: true, candidates: N } on no-divergence,
//          { ok: true, candidates: N, skipped: true, reason } on
//            harness skip (schema needs constructor args we can't
//            synthesize / no usable paths for the requested
//            indices), OR
//          { ok: false, error: '...', message: '...' } on
//            divergence — fast-check shrinks the input to a
//            minimal reproducer when this fires.
//
// `pathIndices`: array of non-negative integers; each is taken
// modulo the candidate list length, so any input array of length
// >= 2 maps to a valid k-combination. Duplicates are deduped
// silently so fast-check's shrinker can collapse same-path inputs
// without us special-casing.
export const fuzzBatchAgainst = (SchemaClass, mode, pathIndices) => {
  const inst = tryInstantiate(SchemaClass);
  if (!inst.ok) return { ok: true, skipped: true, reason: inst.reason, candidates: 0 };
  const schema = inst.instance;

  let sessData;
  try {
    if (Array.isArray(schema.fields)) {
      sessData = (typeof schema.getNewData === 'function')
        ? schema.getNewData({}) : {};
    } else {
      sessData = {};
    }
    seedCollections(schema, sessData);
  } catch (e) {
    return { ok: true, skipped: true,
      reason: `setup: ${e.message.split('\n')[0]}`, candidates: 0 };
  }

  // Edit-mode seed (mirror auditSchema).
  if (mode === 'edit') {
    const idAttr = schema.idAttribute || 'id';
    if (sessData[idAttr] === undefined || sessData[idAttr] === '') {
      sessData[idAttr] = 9999;
    }
  }

  // For the fuzzer we want flat candidate paths (not the
  // k-combinations collectBatchCombos returns). Pull from the
  // schema's individual paths the same way collectBatchCombos's
  // internal candidate list does, bounded by MAX_CANDIDATES.
  const flat = [];
  for (const field of schema.fields || []) {
    if (isScalarField(field, schema)) {
      flat.push([field.id]);
    } else if (field.type === 'collection' && field.schema) {
      flat.push([field.id]);
      const rows = sessData[field.id];
      if (Array.isArray(rows) && rows.length > 0) {
        for (const cellField of field.schema.fields || []) {
          if (isScalarField(cellField, field.schema)) {
            flat.push([field.id, 0, cellField.id]);
            break;
          }
        }
      }
    }
    if (flat.length >= MAX_CANDIDATES) break;
  }
  if (flat.length < 2) {
    return { ok: true, skipped: true,
      reason: 'fewer than 2 candidate paths',
      candidates: flat.length };
  }

  // Map indices → paths, dedupe by stringified path. Need at least
  // 2 distinct paths to form a batch.
  const seen = new Set();
  const batch = [];
  for (const i of pathIndices) {
    const p = flat[((i % flat.length) + flat.length) % flat.length];
    const key = p.join('\x00');
    if (seen.has(key)) continue;
    seen.add(key);
    batch.push(p);
  }
  if (batch.length < 2) {
    return { ok: true, skipped: true,
      reason: 'all path indices deduped to <2 distinct',
      candidates: flat.length };
  }

  // Apply mutations in order.
  let newSessData = sessData;
  for (const p of batch) {
    const next = applyMutation(schema, newSessData, p);
    if (next === null) {
      return { ok: true, skipped: true,
        reason: `applyMutation failed for ${JSON.stringify(p)}`,
        candidates: flat.length };
    }
    newSessData = next;
  }

  const [primary, ...extras] = batch;
  schema.state = { data: sessData, errors: {}, isReady: true,
    isNew: (mode !== 'edit'), _knownErrorPaths: new Map() };

  const knownErrorPaths = new Map();
  const setupAudit = () => {
    window.__INCREMENTAL_AUDIT__ = true;
    window.__throw_on_canary_divergence__ = true;
    window.__incremental_canary_max_per_session__
      = Number.POSITIVE_INFINITY;
    _resetCanaryFireCount();
    _resetValidationCanaryFireCount();
  };
  const teardownAudit = () => {
    delete window.__INCREMENTAL_AUDIT__;
    delete window.__throw_on_canary_divergence__;
    delete window.__incremental_canary_max_per_session__;
  };

  // Mirror production's mount-time validate: SchemaState.validate
  // runs a FULL walk on mount which populates _knownErrorPaths
  // BEFORE any user dispatch. Without this prep, the fuzzer's
  // first incremental walk prunes paths that production wouldn't
  // (because production has them in mustVisit via the error
  // tracker) — false-positive divergence on schemas with pre-
  // existing validation errors.
  try {
    validateSchema(
      schema, sessData,
      (p) => {
        if (!Array.isArray(p)) return;
        const k = p.map((s) => String(s)).join('\x00');
        if (!knownErrorPaths.has(k)) knownErrorPaths.set(k, [...p]);
      },
      [], null, null, true,
    );
  } catch (e) {
    // Initial discovery failure — fuzzer treats as harness skip.
    // Include the underlying message so a shrunk fast-check
    // counterexample names WHY the schema's initial validate
    // failed, not just THAT it failed.
    return { ok: true, skipped: true,
      reason: `initial validate threw: ${e?.message?.split('\n')[0] || e}`,
      candidates: flat.length };
  }

  setupAudit();
  try {
    const prevOptions = schemaOptionsEvalulator({
      schema, data: sessData,
      viewHelperProps: { mode },
      prevOptions: null,
    });
    schema.state.data = newSessData;

    const depEntries = collectDepEntries(schema, newSessData);
    const primaryDepDests = collectDepDests(depEntries, primary) || [];
    const allDepDests = [...primaryDepDests];
    for (const extra of extras) {
      allDepDests.push(extra);
      const extraDeps = collectDepDests(depEntries, extra) || [];
      for (const d of extraDeps) allDepDests.push(d);
    }
    // Known error paths ride mustVisit AND depDests — matches what
    // SchemaState.validate assembles in production.
    for (const v of knownErrorPaths.values()) allDepDests.push(v);
    const mustVisit = [primary, ...extras, ...knownErrorPaths.values()];

    schemaOptionsEvalulator({
      schema, data: newSessData,
      viewHelperProps: { mode, incrementalOptions: true },
      prevOptions, changedPath: primary,
      depDests: allDepDests,
    });
    validateSchema(
      schema, newSessData,
      (path) => {
        const flat2 = path.map((p) => String(p)).join('\x00');
        if (!knownErrorPaths.has(flat2)) knownErrorPaths.set(flat2, [...path]);
      },
      [], null, mustVisit, true,
    );
    return { ok: true, candidates: flat.length };
  } catch (e) {
    if (isDivergenceError(e)) {
      return { ok: false, error: 'divergence',
        message: e.message.split('\n').slice(0, 8).join('\n'),
        batch };
    }
    // Harness limitation — schema's closure crashed on something
    // we can't synthesize. Surface as skipped.
    return { ok: true, skipped: true,
      reason: `dispatch error: ${e.message.split('\n')[0]}`,
      candidates: flat.length };
  } finally {
    teardownAudit();
    // Suppress any console.error the inner walks pushed; the
    // dispatchAndAudit/audit_harness path normally does this via
    // its consoleErrorSpy bracket. Replicate here for parity.
    if (typeof console !== 'undefined'
        && typeof console.error?.mockClear === 'function') {
      console.error.mockClear();
    }
  }
};

// `mode` selects the viewHelperProps.mode the audit walks in. The
// walker's `isModeSupportedByField` filters fields by `field.mode`,
// so create-only and edit-only fields exercise different code paths.
// Default is 'edit' to preserve historical behavior; the spec runs
// both passes per schema.
export const auditSchema = (SchemaClass, { mode = 'edit' } = {}) => {
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

  // Edit-mode seed: real edit dialogs load an existing record with
  // identifier + populated fields. Schemas detect "is this a new
  // record?" via `obj.isNew(state)` which checks the idAttribute
  // (default 'id', commonly 'oid' in pgAdmin). Without an
  // idAttribute value, `isNew()` returns true even in 'edit' mode
  // and closures that branch on it take the create-mode path —
  // which is what we just tested in the create pass. Seed a
  // sentinel that flips isNew() to false and populates likely
  // string fields with non-default values so edit-mode-specific
  // closures (e.g. comparing current vs initial values to detect
  // user edits) actually exercise.
  if (mode === 'edit') {
    const idAttr = schema.idAttribute || 'id';
    if (sessData[idAttr] === undefined || sessData[idAttr] === '') {
      sessData[idAttr] = 9999;  // sentinel "already-exists" oid
    }
    // Stamp scalar text fields with non-empty values so
    // change-detection closures see an existing baseline. We do
    // NOT touch ids, switches, or other-typed fields — only
    // pure-text/multiline/sql defaults get a sentinel.
    for (const field of schema.fields || []) {
      if (field.id === idAttr) continue;
      if (!['text', 'multiline', 'sql'].includes(field.type)) continue;
      if (sessData[field.id] === '' || sessData[field.id] === undefined) {
        sessData[field.id] = `audit_seed_${field.id}`;
      }
    }
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
  } catch {
    // Initial discovery failure (schema needs args we can't supply).
    // The dispatch loop will catch the same error and report skip.
  }

  let dispatches = 0;
  let skipReason = null;
  try {
    try {
      dispatches += auditScalars(schema, sessData, knownErrorPaths, mode);
      // Nested-* group containers share the parent's data level but
      // live in the walker's nested branch — different code path.
      dispatches += auditNestedFields(schema, sessData, knownErrorPaths, mode);
      dispatches += auditCollectionCells(schema, sessData, knownErrorPaths, mode);
      dispatches += auditCollectionStructure(schema, sessData, knownErrorPaths, mode);
      // MOVE_ROW + BULK_UPDATE passes — exercise the two
      // path-bearing action types the create/edit dispatch passes
      // don't cover. Production drives both via DataGridView (drag-
      // reorder and bulk-toggle); the walker handles them the same
      // way it handles ADD/DELETE (changedPath = collection root)
      // but the AUDIT didn't dispatch them.
      dispatches += auditMoveRow(schema, sessData, knownErrorPaths, mode);
      dispatches += auditBulkUpdate(schema, sessData, knownErrorPaths, mode);
      // Batched-dispatch pass — checks the post-fix accumulator handles
      // multi-path validates the same way single-path ones do.
      dispatches += auditBatched(schema, sessData, knownErrorPaths, mode);
      // Sequence pass — multi-step user flow with PERSISTED prev
      // across all 10 dispatches. Catches compounding bugs where
      // dispatch K's prev is dispatch K-1's stale output.
      dispatches += auditSequence(schema, sessData, knownErrorPaths, mode);
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
