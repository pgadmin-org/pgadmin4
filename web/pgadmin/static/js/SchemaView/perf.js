/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// SchemaView profiling helper.
//
// All instrumentation is gated on `window.__PERF_SCHEMA__`. When the flag is
// false (default), `measure(name, fn)` just returns `fn()` with one boolean
// check of overhead.
//
// Usage from the browser console:
//   __PERF_SCHEMA__ = true   // turn on
//   ... interact with a dialog ...
//   __perfDump()             // console.table summary
//   __perfReset()            // clear counters
//
// Or via Playwright: read the buffers via `window.__perfSnapshot()`.

const enabled = () => (
  typeof window !== 'undefined' && window.__PERF_SCHEMA__ === true
);

const stats = new Map();
const counts = new Map();
const actionsLog = [];
const MAX_ACTION_LOG = 500;

export function measure(name, fn) {
  if (!enabled()) return fn();

  const t0 = performance.now();
  try {
    return fn();
  } finally {
    const dt = performance.now() - t0;
    let s = stats.get(name);
    if (!s) {
      s = { count: 0, total: 0, max: 0 };
      stats.set(name, s);
    }
    s.count++;
    s.total += dt;
    if (dt > s.max) s.max = dt;
  }
}

export function record(name, dt) {
  if (!enabled()) return;
  let s = stats.get(name);
  if (!s) {
    s = { count: 0, total: 0, max: 0 };
    stats.set(name, s);
  }
  s.count++;
  s.total += dt;
  if (dt > s.max) s.max = dt;
}

// Pure counter (not a duration). Use for "how many times did X happen per
// keystroke" metrics. Kept in a separate map so they don't pollute the
// timing table.
export function count(name, n = 1) {
  if (!enabled()) return;
  counts.set(name, (counts.get(name) || 0) + n);
}

export function logAction(actionType, dt, extra = {}) {
  if (!enabled()) return;
  if (actionsLog.length >= MAX_ACTION_LOG) actionsLog.shift();
  actionsLog.push({
    t: +performance.now().toFixed(2),
    actionType,
    dt: +dt.toFixed(3),
    ...extra,
  });
}

export function snapshot() {
  const rows = [...stats.entries()].map(([name, s]) => ({
    name,
    count: s.count,
    total_ms: +s.total.toFixed(2),
    avg_ms: +(s.total / s.count).toFixed(3),
    max_ms: +s.max.toFixed(3),
  })).sort((a, b) => b.total_ms - a.total_ms);
  const countRows = [...counts.entries()].map(([name, c]) => ({ name, total: c }))
    .sort((a, b) => b.total - a.total);
  return { stats: rows, counts: countRows, actions: actionsLog.slice() };
}

export function dump() {
  const snap = snapshot();
  // eslint-disable-next-line no-console
  console.table(snap.stats);
  // eslint-disable-next-line no-console
  console.log('Counters:');
  // eslint-disable-next-line no-console
  console.table(snap.counts);
  // eslint-disable-next-line no-console
  console.log(`Last ${Math.min(snap.actions.length, 25)} actions:`);
  // eslint-disable-next-line no-console
  console.table(snap.actions.slice(-25));
  return snap;
}

export function reset() {
  stats.clear();
  counts.clear();
  actionsLog.length = 0;
}

if (typeof window !== 'undefined') {
  window.__perfDump = dump;
  window.__perfReset = reset;
  window.__perfSnapshot = snapshot;
}

// Side-effect import to register window.__mountBenchFixture. Kept at the
// bottom so it can pull in BaseUISchema after perf has set its globals.
// eslint-disable-next-line import/no-unassigned-import
import './bench-fixture';

