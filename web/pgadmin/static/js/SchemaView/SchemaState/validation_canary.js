/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Divergence canary for the incremental validateSchema walker.
//
// Mirrors the options canary (SchemaView/options/canary.js). Runs
// validateSchema twice — once with the actual `mustVisit` (incremental
// mode), once with `mustVisit = null` (full walk) — and diffs the two
// error maps produced via setError. Any path where the messages differ
// (or that's present in one walk but not the other) is a divergence;
// it points at a row whose validator would have set/cleared an error
// under the full walk but was silently pruned by the incremental walk.
//
// The walker is functional-with-side-effects: the setError callback
// accumulates results into an external map. Each canary walk uses its
// OWN capturing setError so the two runs don't pollute each other or
// the caller's real setError. After comparison, the canary replays the
// FULL walk's errors to the caller's setError — that's the
// authoritative result.
//
// Build-time gating: see common.js's validateSchema wrapper for the
// `process.env.__CANARY_BUILD__` substitution. In production builds
// (without CANARY_BUILD=true) the conditional is dead-code-eliminated
// and the import of this module is tree-shaken — zero canary code in
// the production bundle.

import { validateSchema } from './common';

// Walk-throttle: production sampling pays the cost of a second full
// walk per validation pass. In a sampled session this would noticeably
// degrade keystroke latency. After MAX_CANARY_FIRES per session, just
// run the full walk and skip the comparison. Callers that pass an
// explicit onDivergence callback bypass the throttle (tests).
let _canaryFireCount = 0;
const DEFAULT_MAX_CANARY_FIRES = 5;

const getMaxCanaryFires = () => {
  if (typeof window !== 'undefined'
      && Number.isFinite(window.__incremental_canary_max_per_session__)) {
    return window.__incremental_canary_max_per_session__;
  }
  return DEFAULT_MAX_CANARY_FIRES;
};

// Errors are accumulated as a list of {path: [...], message: string}.
// validateSchema short-circuits on the first row that sets an error,
// but a single validate() call can set multiple errors before
// returning, so the list may have multiple entries per walk.
//
// '\x00' separates path segments for map keys — neither identifiers
// nor row indices can contain it, so collisions are impossible.
const KEY_SEP = '\x00';
const pathKey = (path) => path.map((p) => String(p)).join(KEY_SEP);

const diffErrors = (incrementalList, fullList) => {
  const diffs = [];
  const incMap = new Map();
  const fullMap = new Map();
  for (const e of incrementalList) incMap.set(pathKey(e.path), e);
  for (const e of fullList) fullMap.set(pathKey(e.path), e);

  const allKeys = new Set([...incMap.keys(), ...fullMap.keys()]);
  for (const k of allKeys) {
    const inc = incMap.get(k);
    const full = fullMap.get(k);
    if (!inc || !full || inc.message !== full.message) {
      diffs.push({
        path: (inc || full).path,
        incremental: inc?.message,
        full: full?.message,
      });
    }
  }
  return diffs;
};

// Per design D6: each entry is {fieldPath, reason, addedAt?, expiresAt?}
// where fieldPath segments may include '*' wildcards. Filters out
// known false positives whose host schema has been audited and is
// known-safe.
const applyAllowlist = (diffs, allowlist) => {
  if (!allowlist || allowlist.length === 0) return diffs;
  return diffs.filter((d) => !allowlist.some((entry) => {
    const ap = entry.fieldPath;
    if (!Array.isArray(ap) || ap.length !== d.path.length) return false;
    return ap.every((seg, i) => seg === '*' || seg === String(d.path[i]));
  }));
};

// Treat unparseable `expiresAt` as expired — the design's 90-day TTL
// enforcement in CI depends on identifying expired entries; silently
// keeping a typo'd date as "no expiry" would defeat that.
const isExpired = (entry) => {
  if (!entry.expiresAt) return false;
  const t = Date.parse(entry.expiresAt);
  if (Number.isNaN(t)) return true;
  return t < Date.now();
};

const formatDivergence = (schema, diffs) => {
  const schemaName = schema?.constructor?.name || 'UnknownSchema';
  const sorted = [...diffs].sort((a, b) =>
    a.path.join('.').localeCompare(b.path.join('.'))
  );
  const lines = sorted.slice(0, 20).map((d) => (
    `  ${d.path.join('.')} — incremental=${JSON.stringify(d.incremental)} `
    + `full=${JSON.stringify(d.full)}`
  ));
  const extra = sorted.length > 20 ? `\n  ... ${sorted.length - 20} more` : '';
  return (
    `Incremental validator divergence in ${schemaName}:\n${lines.join('\n')}${extra}`
  );
};

// Mutually exclusive routing — production endpoint, test-throw flag,
// dev console. Avoids double-logging that would trip setup-jest's
// `expect(console.error).not.toHaveBeenCalled()` afterEach.
const defaultReport = (report) => {
  if (typeof window !== 'undefined'
      && typeof navigator !== 'undefined'
      && navigator.sendBeacon
      && window.__incremental_canary_endpoint__) {
    try {
      navigator.sendBeacon(
        window.__incremental_canary_endpoint__,
        JSON.stringify({
          tag: 'canary:incremental-divergence',
          subsystem: 'validator',
          schema: report.schemaName,
          paths: report.diffs.map((d) => d.path.join('.')),
        }),
      );
    } catch (_e) {
      // sendBeacon throws synchronously on payload-too-large; swallow.
    }
    return;
  }

  if (typeof process !== 'undefined'
      && process?.env?.NODE_ENV === 'test'
      && typeof window !== 'undefined'
      && window.__throw_on_canary_divergence__) {
    throw new Error(report.message);
  }

  if (typeof console !== 'undefined') {
    console.error(report.message);
  }
};

// Test-only — not re-exported via any index.
export const _resetValidationCanaryFireCount = () => { _canaryFireCount = 0; };

// Public entry point.
//
// Params (same shape as validateSchema + onDivergence hook):
//
//   schema, sessData, setError, accessPath, collLabel, mustVisit
//     — passed through to validateSchema for the inner walks.
//
//   onDivergence (optional) — callback fired with {schemaName, diffs,
//     message} for each divergence report. If provided, the throttle is
//     bypassed (tests). If not provided, defaultReport handles routing.
//
// Returns: the full-walk hadError result. Caller's setError receives
// the FULL walk's errors — incremental's errors are discarded after
// the diff. That keeps callers' state machine deterministic regardless
// of whether incremental and full agreed.
//
// On depth: this is only invoked from validateSchema at __validateDepth
// === 1 (the wrapper increments before calling). The two inner walks
// re-enter validateSchema, which at depth > 0 just runs _impl directly
// — no recursion through the canary, no double measure().
export const runValidationCanary = ({
  schema, sessData, setError,
  accessPath = [], collLabel = null, mustVisit = null,
  onDivergence = null,
}) => {
  // Full walk — authoritative result the caller receives.
  const fullErrors = [];
  const fullCapture = (path, message) => {
    if (!message) return;
    fullErrors.push({ path: [...path], message });
  };
  const fullHadError = validateSchema(
    schema, sessData, fullCapture, accessPath, collLabel, null
  );

  // When mustVisit is null, both walks produce identical output —
  // short-circuit. (V3 identity.)
  if (mustVisit === null) {
    for (const e of fullErrors) setError(e.path, e.message);
    return fullHadError;
  }

  // Throttle: in production sampling, cap canary fires per session to
  // avoid paying the second-walk cost on every keystroke. Tests that
  // supply onDivergence bypass the throttle.
  if (!onDivergence && _canaryFireCount >= getMaxCanaryFires()) {
    for (const e of fullErrors) setError(e.path, e.message);
    return fullHadError;
  }
  _canaryFireCount += 1;

  // Incremental walk — same inputs, but with the actual mustVisit
  // array. Captures errors into a separate list.
  const incrementalErrors = [];
  const incCapture = (path, message) => {
    if (!message) return;
    incrementalErrors.push({ path: [...path], message });
  };
  validateSchema(
    schema, sessData, incCapture, accessPath, collLabel, mustVisit
  );

  // Diff and report.
  const allowlist = (schema?.constructor?.canaryAllowedValidationDivergences || [])
    .filter((e) => !isExpired(e));
  const allDiffs = diffErrors(incrementalErrors, fullErrors);
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

  // Propagate full walk's errors to the caller. Authoritative.
  for (const e of fullErrors) setError(e.path, e.message);
  return fullHadError;
};
