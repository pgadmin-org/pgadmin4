# SchemaView / DataGridView performance benchmark

A Playwright-driven benchmark that measures per-keystroke and per-action costs
inside pgAdmin's `SchemaView` and `DataGridView`. Couples with the
`__PERF_SCHEMA__` instrumentation baked into the SchemaView code so we can see
exactly where time goes when a heavy dialog feels slow.

## What's instrumented

All instrumentation is gated by `window.__PERF_SCHEMA__`. When the flag is
false (default), each wrapper does a single boolean check and falls through —
no measurable overhead in normal use.

The hot paths covered, from `web/pgadmin/static/js/SchemaView/`:

| Where | Metric label | What it counts |
|---|---|---|
| `SchemaState.js` | `SchemaState.validate` | full validate cycle per keystroke |
|   | `SchemaState.validate.setError` | per-error setError cost |
|   | `SchemaState.validate.setErrorCalls` *(counter)* | number of error paths set per validate |
|   | `SchemaState.validate.clearError` | the no-error setError({}) call |
|   | `SchemaState.validate.dataAssign` | `state.data = sessData` (dataStore write) |
|   | `SchemaState.validate.onDataChange` | user-supplied `onDataChange` callback |
|   | `SchemaState.updateOptions` | re-evaluate all field options |
|   | `SchemaState.updateOptions.cloneDeep` | clone of the option tree |
|   | `SchemaState.changes` | dirty-diff |
| `SchemaState/common.js` | `validateSchema` | recursive schema-wide validate walk (outermost only) |
|   | `getSchemaDataDiff` | dirty-diff helper |
| `options/registry.js` | `schemaOptionsEvalulator` | per-field option evaluation walk (outermost only) |
| `SchemaState/reducer.js` | `reducer.<ACTION>` | per-action total (`set_value`, `add_row`, `delete_row`, …) |
|   | `reducer.cloneDeep` | the top-level `_.cloneDeep(state)` |
| `SchemaState/store.js` | `store.<storeName>.setState` | total time inside a setState |
|   | `store.<storeName>.topEqualityCheck` | upfront `isValueEqual(state, prevState)` |
|   | `store.<storeName>.subscribers` *(sample)* | path-subscriber count at notification time |
|   | `store.<storeName>.fanout` *(sample)* | listeners that actually fired |

Action log (`__perfSnapshot().actions`) records the last 500 reducer actions
with their wallclock cost and dispatched path.

## What's bundled — synthetic fixture

`bench-fixture.js` exposes `window.__mountBenchFixture(outerRows, innerRows)`
which opens a dialog with three nested layers:

```
SchemaView  →  DataGridView (outer collection: columns)
            →  SchemaView (per-row column form)
            →  DataGridView (inner collection: indexes)
```

It uses pgAdmin's existing `pgadmin:utility:show` event so the dialog runs
inside the real provider tree (theme, PgAdmin context, docker) — same code
paths a real Table dialog hits. Outer rows look like Postgres columns
(`col_<i>`, `text`, NOT NULL switch); inner rows look like indexes
(`idx_<i>_<j>`, expression, unique switch).

## Console / interactive usage

In pgAdmin's DevTools console, with a heavy dialog open:

```js
window.__PERF_SCHEMA__ = true     // turn on instrumentation
window.__perfReset()              // clear counters
// ... interact (type, click, add rows) ...
window.__perfDump()               // console.table summary
window.__perfSnapshot()           // raw object {stats, counts, actions}
```

To stress test with the synthetic fixture (no Postgres needed):

```js
window.__mountBenchFixture(1000, 3)   // 1000 columns × 3 indexes each
```

## Automated benchmark — Playwright

This directory is a standalone Node project. Install once:

```
cd web/regression/perf-bench
npm install
npx playwright install chromium
```

Then run with pgAdmin already running locally at `http://127.0.0.1:5050`:

```
# Real-dialog scenario: Register Server > Parameters
N_ROWS=100 M_CHARS=15 npx playwright test datagridview.spec.js --reporter=line

# Heavy synthetic fixture
OUTER=500 INNER=3 M_CHARS=15 npx playwright test nested.spec.js --reporter=line
```

Tunables:

| Var | Default | Meaning |
|---|---|---|
| `PGADMIN_URL` | `http://127.0.0.1:5050/browser/` | where pgAdmin is reachable |
| `N_ROWS` | 100 | rows added in `datagridview.spec.js` |
| `M_CHARS` | 20 (datagridview) / 15 (nested) | characters typed per keystroke test |
| `OUTER` | 1000 | outer rows for `nested.spec.js` |
| `INNER` | 3 | inner rows per outer |
| `INCREMENTAL` | `0` | when `1`, sets `window.__INCREMENTAL_OPTIONS__=true` to enable the prototype incremental `schemaOptionsEvalulator` walk (skips collection-row option re-eval when the row's path doesn't overlap the changed path). |

### Known limitation of incremental mode

The walker also unions in DepListener dest paths whose source overlaps
the change, so cross-row deps that are *declared* via `field.deps`
remain correct. What stays broken: a field whose `visible` / `disabled`
/ `readonly` / `editable` evaluator reads data from a SIBLING row
(e.g. `column[5].name` flips a flag on `column[2]`) WITHOUT declaring
the sibling sources in `field.deps`. That sibling row's path won't
appear in the must-visit set and its options will go stale.

The synthetic bench fixture has no undeclared cross-row deps so it's
safe to measure here. Before turning incremental on for a production
dialog, audit its schema for closures that read outside their own
row+ancestors and declare those sources via `field.deps`.

Outputs (gitignored):

- `results/` — JSON snapshots from `__perfSnapshot()` at each test phase.
- `shots/` — screenshots at key steps.
- `traces/` — Playwright traces (`.zip`). Open via
  `npx playwright show-trace traces/<file>.zip`.
- `test-results/` — Playwright's own per-test artifacts on failure.

## Interpreting the output

Each spec prints `STATS (ms)` and `COUNTERS` blocks at the end. Read them as:

- `count` — how many times this code path ran during the measured window.
- `total_ms` — summed wall time inside the wrapper.
- `avg_ms`, `max_ms` — per-call averages.
- `subscribers` / `fanout` are recorded as samples per `setState`; treat the
  `total` field there as a sum of counts, not milliseconds.

For per-keystroke analysis, **subtract the 30 ms idle wait** between
keystrokes from the wall-clock number to get real work time, then compare
that against the sum of measured functions to see what fraction is "in the
instrumented zone" vs "elsewhere" (React reconcile, MUI, react-table, paint).

Anchor numbers on this machine (headless Chromium, Apple Silicon):

| Scenario | Per keystroke (wall) | `SchemaState.validate` | `schemaOptionsEvalulator` |
|---|---:|---:|---:|
| Register Server > Parameters @ 102 rows | 59 ms | 3.85 ms | 1.65 ms |
| Synthetic fixture @ 100 × 3 | ~60 ms | 10.18 ms | 4.57 ms |
| Synthetic fixture @ 500 × 3 | 155–180 ms | 48.41 ms | 21.67 ms |

Everything in `SchemaState.validate` scales linearly with collection size.

## Files

| Path | Purpose |
|---|---|
| `package.json` / `package-lock.json` | Standalone Playwright project |
| `playwright.config.js` | Headless, single worker, 3-min default test timeout |
| `datagridview.spec.js` | Real-dialog benchmark via Register Server > Parameters |
| `nested.spec.js` | Synthetic 3-layer benchmark via `__mountBenchFixture` |

Companion source files (in pgAdmin proper):

| Path | Purpose |
|---|---|
| `web/pgadmin/static/js/SchemaView/perf.js` | Instrumentation helpers + global hooks |
| `web/pgadmin/static/js/SchemaView/bench-fixture.js` | Synthetic nested schema + `window.__mountBenchFixture` |
| `web/pgadmin/static/js/SchemaView/SchemaState/{SchemaState,reducer,store,common}.js` | `measure`/`record`/`count` call sites |
| `web/pgadmin/static/js/SchemaView/options/registry.js` | `measure` around the top-level `schemaOptionsEvalulator` |
