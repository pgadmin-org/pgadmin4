# SchemaView — developer guide

## What this module does

`SchemaView` is the framework behind every property/edit dialog in
pgAdmin. You hand it a `BaseUISchema` subclass; it renders a form,
runs validation on every keystroke, evaluates per-field options
(`disabled`, `visible`, `readonly`, `editable`) on every keystroke,
and dispatches user input back as immutable state mutations.

The framework's two performance-critical walkers are:

| Walker | What it computes | Run on every dispatch |
|---|---|---|
| **schemaOptionsEvalulator** (`options/registry.js`) | per-field options tree | yes |
| **validateSchema** (`SchemaState/common.js`) | per-field error map | yes |

Both can run in either of two modes:

- **Full walk** — recurses every field in every row in every
  collection. Always correct. O(total fields).
- **Incremental walk** — prunes rows whose subtree the current
  dispatch cannot affect. Falls back to keeping previous options for
  pruned rows via structural sharing. O(visited fields).

Incremental is **on by default** for every schema (the opt-out flag
is `incrementalOptions: false` on the schema instance, used by tests).

## When the walker is correct vs. when it's not

Incremental prunes a row when no path in `mustVisit` overlaps the
row's globalPath. `mustVisit` is the union of:

1. `changedPath` — the path of the action being dispatched.
2. Every additional path batched into the same React render commit
   (collected via `__pendingChangedPaths` in
   `useSchemaState.sessDispatchWithListener`).
3. Every `field.deps` declaration's dest path whose source overlaps
   any of the above.
4. Every path that has ever reported an error during this dialog's
   lifetime (`_knownErrorPaths` in `SchemaState`, bounded LRU).

**Cross-row reads that are NOT declared as `field.deps` are the only
correctness hazard.** A `disabled` / `editable` / `visible` /
`readonly` / `validate` closure that does:

```js
editable(state) {
  return obj.top.sessData.someOtherCollection.some((r) => r.foo);
}
```

…will produce stale results when the user mutates
`someOtherCollection` because the closure's row is pruned.

### How to fix a cross-row read

Add the source as an explicit `deps`:

```js
{
  id: 'name', type: 'text',
  deps: [['someOtherCollection']],   // double-array = absolute path
  editable: function(state) { ... },
}
```

A `dep` entry is either:

- A **string** `'sibling_field_id'` — resolved relative to the
  current schema level (the closure's own row, then the row's
  parent collection).
- An **array** `['absolute', 'path', 'segments']` — resolved as an
  absolute path from the top of the schema.

`listenDepChanges` (see `utils/listenDepChanges.js`) registers EVERY
declared `dep` as a `DepListener` entry — even when the field has no
`depChange` callback — so the walker's
`_collectDepDestsForPath` can resolve them into `mustVisit`. If you
forget the dep, the canary will tell you (see next section).

## The canary

The walker can run in two modes side-by-side and diff their
output. This is a build-time-gated debug feature.

- **In canary builds** (`CANARY_BUILD=true yarn run bundle`): every
  walker invocation runs BOTH the incremental and the full walk,
  diffs the resulting options/errors trees, and:
  - in tests with `window.__throw_on_canary_divergence__ = true`,
    throws (fails the test loudly with the diff),
  - in browser dev, logs to `console.error` with the divergence
    paths,
  - in production canary, ships to `window.__incremental_canary_endpoint__`
    if configured (currently not wired).

- **In normal production builds** (no `CANARY_BUILD` env var):
  webpack's DefinePlugin substitutes
  `process.env.__CANARY_BUILD__` with the literal `false`, and the
  entire canary branch + its `require('./canary')` is dead-code
  eliminated. `scripts/verify-canary-treeshake.sh` asserts this.

## Tests that run against the canary

Three layers:

| Test | What it covers | Where |
|---|---|---|
| **registered_schemas_audit.spec.js** | Every registered schema (87) × 2 modes (create + edit) × scalar / cell / structure / batched dispatches. Driven by `auditSchema()`. | `regression/javascript/SchemaView/` |
| **audit_harness.spec.js** | Unit-level tests for the audit harness itself + synthetic schemas that intentionally diverge. | same |
| **audit-smoke.spec.js** (Playwright) | Register Server / Create Table / Create Function dialogs in a real browser. | `regression/perf-bench/` |

To run them:

```bash
# Jest (auto-injects __CANARY_BUILD__=true via setup-jest.js):
cd web && yarn run test:js-once --testPathPattern=registered_schemas_audit

# Playwright (needs canary build + running pgAdmin):
cd web && CANARY_BUILD=true ./node_modules/.bin/webpack --config webpack.config.js
python pgAdmin4.py &
cd regression/perf-bench && ./node_modules/.bin/playwright test audit-smoke
```

## Adding a new schema

1. Subclass `BaseUISchema`, define `baseFields`.
2. Export via `registerSchema(YourSchema)` — an ESLint rule will
   error if you forget. This puts the class into the registry that
   `registered_schemas_audit.spec.js` iterates over.
3. If your schema needs constructor args that the audit can't
   synthesize, add an entry to `PER_SCHEMA_FIXTURES` in
   `SchemaState/audit_harness.js`. Without it the audit reports
   SKIP and your schema gets no synthetic coverage.
4. If your schema reads sibling state in any closure, declare the
   source as `field.deps`. Run the audit (`yarn run test:js-once
   --testPathPattern=registered_schemas_audit`) — divergences mean
   you have a missing `deps`.

## Dispatching schema changes

The ONLY supported way to dispatch from React event handlers is via
the `dataDispatch` returned by `useSchemaState`. That function is
`sessDispatchWithListener` under the hood; it:

- stamps every action with `__viaListener: true` (a sentinel the
  reducer checks under canary builds),
- pushes `action.path` into `state.__pendingChangedPaths` so the
  next `validate()` cycle knows what changed,
- forwards to React's reducer.

Direct calls to `sessDispatch({ type: SET_VALUE, path: [...] })`
**bypass** the accumulator. The reducer's bypass guard
(`reducer.js`, canary-only) calls `console.error` if you do this,
which fails CI through setup-jest's afterEach assertion.

### Action types

The reducer recognizes the following action types
(`SCHEMA_STATE_ACTIONS` in `common.js`):

| Type | Path-bearing? | Bypass-guarded? | Notes |
|---|---|---|---|
| `INIT` | no | no | resets sessData; safe to dispatch directly |
| `SET_VALUE` | yes | **yes** | scalar / cell mutations |
| `ADD_ROW` | yes | **yes** | collection append/prepend |
| `DELETE_ROW` | yes | **yes** | collection splice |
| `MOVE_ROW` | yes | **yes** | DataGridView drag-reorder |
| `BULK_UPDATE` | yes | **yes** | clear a column across all rows |
| `DEFERRED_DEPCHANGE` | yes | **yes** | drainDeferredQueue must use `sessDispatchWithListener` |
| `CLEAR_DEFERRED_QUEUE` | no | no | internal plumbing |
| `RERENDER` | unused | reserved | declared in the enum but no reducer case + no production dispatch site. If you start using it, add it to `PATH_BEARING_ACTIONS` in `reducer.js`. |

## Reading canary divergence output

When the canary detects a mismatch between the full and incremental
walks, it throws (in tests) or logs to `console.error` (in canary
dev builds). The diff shape:

```
Incremental walker divergence in TableSchema:
  vacuum_table.0 — incremental=undefined full={"canEditRow":true,"canDeleteRow":true}
  vacuum_table.0.label — incremental=undefined full={"disabled":false,"visible":true,"readonly":false,"editable":true}
  vacuum_table.0.setting — incremental=undefined full={"disabled":false,"visible":true,"readonly":false,"editable":true}
  vacuum_table.0.value — incremental=undefined full={"disabled":false,"visible":true,"readonly":false,"editable":false}
  vacuum_table.1 — incremental=undefined full={...}
  ...
```

How to read this:

- **`incremental=X full=Y`**: the incremental walker returned `X`
  for this path, the full walk returned `Y`. They differ; the full
  walk is the source of truth.
- **`incremental=undefined`**: the incremental walker DIDN'T VISIT
  this path — it inherited a `prev[path]` that was undefined. Most
  common cause: the row was just created (via ADD_ROW or fixedRows
  resolution) and the prev snapshot doesn't include it, AND the
  current changedPath doesn't overlap the row's globalPath, so the
  walker pruned it.
- **Many rows at the same level (e.g. `vacuum_table.0` through
  `vacuum_table.N`) all `incremental=undefined`**: structural
  divergence — the entire collection grew between prev and current
  but the current dispatch's `mustVisit` doesn't reach that
  collection. Look for sibling fixedRows / depChange / async data
  fetch that resolves in the SAME React commit as the current
  dispatch.

Three production root-cause patterns surfaced by the canary so far,
all fixed:

1. **Evaluator-only deps not registering listeners**
   (`utils/listenDepChanges.js`). A field declared
   `deps: [['sibling']]` but no `depChange` callback registered NO
   listener — the walker couldn't tell which fields should ride
   `mustVisit` when `sibling` changed.

2. **Batched changedPath dropped**
   (`hooks/useSchemaState.js`, `SchemaState/SchemaState.js`).
   `state.__lastChangedPath` was a single scalar; React batching
   overwrote the first dispatch's path with the second's. Fixed
   via `__pendingChangedPaths` accumulator.

3. **Drain bypassed the listener wrapper**
   (`hooks/useSchemaState.js`). `drainDeferredQueue` dispatched raw
   `sessDispatch`, dropping the path from the accumulator AND
   tripping the bypass guard.

When you see a new divergence, your first hypothesis should be one
of these three patterns. If none fits, check:

- Does the diverging field's closure read a sibling without
  declaring it as `field.deps`?
- Does the dispatch chain that produced the diverging state run
  through `sessDispatchWithListener`?
- Is the schema instance being reused across dialog lifecycles
  (carrying stale `top` / `state` references)?

## Common pitfalls

- **Async fixedRows on sibling collections**: if two collections in
  the same schema both call `fixedRows: () => Promise<...>`, the
  promises may resolve in the same microtask tick. React batches
  the two `setUnpreparedData` dispatches; the accumulator catches
  both paths. If you bypass the accumulator (see above) the second
  collection's rows go stale.
- **Custom dispatches in feature classes**: any new `DataGridView`
  feature that dispatches must use `dataDispatch`, not the raw
  `dispatch` it sees in context.
- **Deferred dep changes**: must return a Promise that always
  resolves (with a `(tmpstate) => deltaObj` callback) or returns
  `undefined`. A Promise that never resolves leaks into
  `data.__deferred__`. See the `listenDepChanges` JSDoc.

## File map

```
SchemaView/
  base_schema.ui.js         - BaseUISchema (extend this)
  hooks/useSchemaState.js   - the dispatch entry point
  SchemaState/
    SchemaState.js          - validate(), updateOptions(), DepListener integration
    common.js               - validateSchema, action types
    reducer.js              - sessDataReducer (bypass guard lives here)
    audit_harness.js        - the synthetic dispatch runner
    schema_registry.js      - registerSchema / getRegisteredSchemas
    validation_canary.js    - error-map diff canary
  options/
    registry.js             - schemaOptionsEvalulator
    canary.js               - options-tree diff canary
  utils/listenDepChanges.js - field.deps → DepListener registry wiring
  DataGridView/
    features/               - DataGrid extensions (fixedRows, reorder, ...)
```
