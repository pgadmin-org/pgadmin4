/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Divergence canary for the incremental schemaOptionsEvalulator.
//
// Runs the walker twice — once with the actual `changedPath` (incremental
// mode), once with `changedPath = null` (full walk) — and diffs the two
// result objects. Any mismatch points at a row whose options changed under
// the full walk but were silently pruned by the incremental walk; that's
// the "undeclared cross-row closure read" pattern the prototype's known
// limitation warns about.
//
// The walker (`schemaOptionsEvalulator`) is FUNCTIONAL — both calls
// receive the same `prevOptions` baseline and return independent new
// option trees. No cloning required; no shared mutation possible.
//
// This module is build-time-gated by the `process.env.__CANARY_BUILD__`
// substitution in registry.js's `schemaOptionsEvalulator` wrapper. In
// production builds (without CANARY_BUILD=true) the conditional is
// dead-code-eliminated and the import of this module is tree-shaken —
// resulting in zero canary code in the production bundle.

import _ from 'lodash';
import { FIELD_OPTIONS } from './common';
import { schemaOptionsEvalulator } from './registry';

// ---------------------------------------------------------------------
// Walk-throttle (H3): production sampling pays the cost of a second
// full walk per dispatch. In a sampled session that lasts thousands of
// keystrokes, this would noticeably degrade user experience.
// Throttle the canary itself: after MAX_CANARY_FIRES per session, just
// run the full walk and skip the comparison. Callers that pass an
// explicit onDivergence callback bypass the throttle (tests).
// ---------------------------------------------------------------------
let _canaryFireCount = 0;
const DEFAULT_MAX_CANARY_FIRES = 5;

const getMaxCanaryFires = () => {
  if (typeof window !== 'undefined'
      && Number.isFinite(window.__incremental_canary_max_per_session__)) {
    return window.__incremental_canary_max_per_session__;
  }
  return DEFAULT_MAX_CANARY_FIRES;
};

// Walk both option trees recursively, collecting any field whose
// FIELD_OPTIONS subtree differs.
//
// Implementation note (M1): the walker stores collection rows as an
// object indexed by numeric-string keys (e.g. `{0: rowOpts, 1: rowOpts,
// __fieldOptions: collOpts}`), NOT as a real array. We rely on
// `Object.keys` returning the row-index strings. If the walker ever
// shifts to real arrays for rows, this diff function would silently
// recurse into array's `length` and miss row comparisons — add a guard
// here at that point.
const diffOptions = (incremental, full, prefix = []) => {
  const diffs = [];

  // FIELD_OPTIONS holds the evaluated option dict for a leaf field /
  // collection / row at this level. Compare directly when present.
  const incHas = incremental
    && Object.prototype.hasOwnProperty.call(incremental, FIELD_OPTIONS);
  const fullHas = full
    && Object.prototype.hasOwnProperty.call(full, FIELD_OPTIONS);
  if (incHas || fullHas) {
    if (!_.isEqual(incremental?.[FIELD_OPTIONS], full?.[FIELD_OPTIONS])) {
      diffs.push({
        path: [...prefix],
        incremental: incremental?.[FIELD_OPTIONS],
        full: full?.[FIELD_OPTIONS],
      });
    }
  }

  // Recurse into nested keys (per-field option dicts, or per-row dicts
  // for collections — indexed by row number).
  const keys = new Set([
    ...Object.keys(incremental || {}),
    ...Object.keys(full || {}),
  ]);
  keys.delete(FIELD_OPTIONS);
  for (const k of keys) {
    const incChild = incremental?.[k];
    const fullChild = full?.[k];
    // Skip non-object children — they're not part of the recursive
    // option tree (rare; possible if a schema adds non-standard keys).
    const incIsObj = incChild && typeof incChild === 'object';
    const fullIsObj = fullChild && typeof fullChild === 'object';
    if (!incIsObj && !fullIsObj) continue;
    diffs.push(...diffOptions(incChild, fullChild, [...prefix, k]));
  }
  return diffs;
};

// Filter diffs against the schema's allowlist (per design D6). Each
// entry is `{fieldPath, reason, addedAt?, expiresAt?}` where fieldPath
// segments may include '*' wildcards.
const applyAllowlist = (diffs, allowlist) => {
  if (!allowlist || allowlist.length === 0) return diffs;
  return diffs.filter((d) => !allowlist.some((entry) => {
    const ap = entry.fieldPath;
    if (!Array.isArray(ap) || ap.length !== d.path.length) return false;
    return ap.every((seg, i) => seg === '*' || seg === String(d.path[i]));
  }));
};

// (M2) Treat unparseable `expiresAt` as expired. The design's 90-day TTL
// constraint depends on CI being able to identify expired entries —
// silently keeping a typo'd date as "no expiry" would defeat that. The
// CI script that enforces the cap should also surface NaN-expired
// entries as malformed config.
const isExpired = (entry) => {
  if (!entry.expiresAt) return false;
  const t = Date.parse(entry.expiresAt);
  if (Number.isNaN(t)) return true; // malformed → treat as expired
  return t < Date.now();
};

const formatDivergence = (schema, diffs) => {
  const schemaName = schema?.constructor?.name || 'UnknownSchema';
  // (M3) Sort by path for stable, readable output across runs.
  const sorted = [...diffs].sort((a, b) =>
    a.path.join('.').localeCompare(b.path.join('.'))
  );
  const lines = sorted.slice(0, 20).map((d) => (
    `  ${d.path.join('.')} — incremental=${JSON.stringify(d.incremental)} `
    + `full=${JSON.stringify(d.full)}`
  ));
  const extra = sorted.length > 20 ? `\n  ... ${sorted.length - 20} more` : '';
  return (
    `Incremental walker divergence in ${schemaName}:\n${lines.join('\n')}${extra}`
  );
};

// (H2) Default reporter routes to ONE mode at a time. Branches are
// mutually exclusive — no double-logging that would trip
// `setup-jest.js`'s "expect(console.error).not.toHaveBeenCalled()"
// afterEach assertion.
//
// Routing priority:
//   1. Production: if endpoint configured, send beacon and return.
//   2. Test + throw flag: throw and return.
//   3. Otherwise (dev): console.error.
const defaultReport = (report) => {
  // Production sampling path: configured endpoint + browser sendBeacon.
  if (typeof window !== 'undefined'
      && typeof navigator !== 'undefined'
      && navigator.sendBeacon
      && window.__incremental_canary_endpoint__) {
    try {
      navigator.sendBeacon(
        window.__incremental_canary_endpoint__,
        JSON.stringify({
          tag: 'canary:incremental-divergence',
          schema: report.schemaName,
          paths: report.diffs.map((d) => d.path.join('.')),
        }),
      );
    } catch (_e) {
      // sendBeacon throws synchronously on payload-too-large; swallow.
    }
    return;
  }

  // Test environment with throw flag: throw and bail (no console).
  if (typeof process !== 'undefined'
      && process?.env?.NODE_ENV === 'test'
      && typeof window !== 'undefined'
      && window.__throw_on_canary_divergence__) {
    throw new Error(report.message);
  }

  // Dev (or test without throw flag): browser console only.
  if (typeof console !== 'undefined') {
    console.error(report.message);
  }
};

// Test-only entry point to reset the throttle counter between tests.
// Not exported via the public `options/index.js`; consumers shouldn't
// touch it.
export const _resetCanaryFireCount = () => { _canaryFireCount = 0; };

// Public entry point.
//
// Params (same shape as schemaOptionsEvalulator + onDivergence hook):
//
//   schema, data, viewHelperProps, prevOptions, parentOptions,
//   accessPath, inGrid, changedPath, globalPath, depDests
//     — passed through to schemaOptionsEvalulator for both walks.
//
//   onDivergence (optional) — callback fired with {schemaName, diffs,
//     message} for each divergence report. If provided, the throttle
//     (H3) is bypassed since tests need every divergence observed. If
//     not provided, defaultReport handles routing (production /
//     test-throw / dev).
//
// Returns: the full-walk result. Callers should use this as the
// authoritative options tree.
//
// (L1) `viewHelperProps` is treated as a flat config object. The
// canary spreads it shallowly to add `incrementalOptions: true` for the
// incremental walk. If pgAdmin ever introduces nested mutable state
// inside viewHelperProps (currently {mode, inCatalog, serverInfo} —
// all read-only), revisit this spread.
//
// (L2) Recursion: when the OUTER canary runs the walks, they recurse
// into nested-fieldset / collection branches via the public
// `schemaOptionsEvalulator` wrapper. The recursive calls inherit
// `viewHelperProps` (including the forced `incrementalOptions: true`)
// and `changedPath` — so deeper levels behave consistently. V1-V4 test
// 2-level schemas; deeper nesting is exercised by real production
// schemas during Phase 1 audit.
//
// (L3) `globalPath: []` is the convention for top-level callers. The
// walker uses globalPath internally to track absolute paths through
// recursion. Callers that pass a non-empty initial globalPath are
// asserting that this options subtree lives at that location in the
// global tree; the canary accepts the assertion without validation.
export const runOptionsCanary = ({
  schema, data, viewHelperProps, prevOptions = null, parentOptions = null,
  accessPath = [], inGrid = false,
  changedPath = null, globalPath = [], depDests = null,
  onDivergence = null,
}) => {
  // Always run the full walk. This is the authoritative result the
  // caller receives.
  const fullResult = schemaOptionsEvalulator({
    schema, data, viewHelperProps, prevOptions, parentOptions,
    accessPath, inGrid,
    changedPath: null, globalPath, depDests: null,
  });

  // When changedPath is null (initial mount / INIT / no-path dispatch),
  // both walks produce identical output — short-circuit. V3 idempotency.
  if (changedPath === null) {
    return fullResult;
  }

  // (H3) Throttle: in production sampling, cap canary fires per session
  // to avoid paying the second-walk cost on every keystroke. Tests that
  // supply an explicit onDivergence callback bypass the throttle.
  if (!onDivergence && _canaryFireCount >= getMaxCanaryFires()) {
    return fullResult;
  }
  _canaryFireCount += 1;

  // Incremental walk — same baseline, different changedPath. Force
  // incremental mode for THIS walk regardless of caller's
  // viewHelperProps; without the force, the walker doesn't prune and
  // both walks behave identically (canary becomes a no-op).
  const incrementalViewHelperProps = {
    ...(viewHelperProps || {}),
    incrementalOptions: true,
  };
  const incrementalResult = schemaOptionsEvalulator({
    schema, data, viewHelperProps: incrementalViewHelperProps,
    prevOptions, parentOptions,
    accessPath, inGrid,
    changedPath, globalPath, depDests,
  });

  // Diff and report.
  const allowlist = (schema?.constructor?.canaryAllowedDivergences || [])
    .filter((e) => !isExpired(e));
  const allDiffs = diffOptions(incrementalResult, fullResult);
  const diffs = applyAllowlist(allDiffs, allowlist);

  if (diffs.length > 0) {
    const schemaName = schema?.constructor?.name || 'UnknownSchema';
    const message = formatDivergence(schema, diffs);
    const report = { schemaName, diffs, message };
    if (onDivergence) {
      onDivergence(report);
    } else {
      defaultReport(report);
    }
  }

  return fullResult;
};
