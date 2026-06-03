/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import _ from 'lodash';
import { isModeSupportedByField } from '../common';
import { measure } from '../perf';
import { FIELD_OPTIONS, booleanEvaluator } from './common';


const COMMON_OPTIONS = '__common';
const _optionEvaluators = { };


export function registerOptionEvaluator(option, evaluator, defaultVal, types) {
  types = types || [COMMON_OPTIONS];
  evaluator = evaluator || booleanEvaluator;
  defaultVal = _.isUndefined(defaultVal) ? false : defaultVal;

  types.forEach((type) => {
    const evaluators = _optionEvaluators[type] =
      (_optionEvaluators[type] || []);

    evaluators.push([option, evaluator, defaultVal]);
  });
}

export function evaluateFieldOption({
  option, schema, value, viewHelperProps, field, options, parentOptions,
}) {
  if (option && option in _optionEvaluators) {
    const evaluators = _optionEvaluators[option];
    evaluators?.forEach(([option, evaluator, defaultVal]) => {
      options[option] = evaluator({
        schema, field, option, value, viewHelperProps, options, defaultVal,
        parentOptions
      });
    });
  }
}

export function evaluateFieldOptions({
  schema, value, viewHelperProps, field, options={}, parentOptions=null
}) {
  evaluateFieldOption({
    option: COMMON_OPTIONS, schema, value, viewHelperProps, field, options,
    parentOptions
  });
  evaluateFieldOption({
    option: field.type, schema, value, viewHelperProps, field, options,
    parentOptions
  });
}

// Returns true when one path is a prefix of (or equal to) the other.
// We compare stringified keys so numeric indices match either way (lodash
// stores them as numbers, dispatchers sometimes hand back strings).
export function pathOverlaps(currentPath, changedPath) {
  const shorter = currentPath.length < changedPath.length
    ? currentPath : changedPath;
  const longer = shorter === currentPath ? changedPath : currentPath;
  for (let i = 0; i < shorter.length; i++) {
    if (String(shorter[i]) !== String(longer[i])) return false;
  }
  return true;
}

let __evalDepth = 0;
export function schemaOptionsEvalulator(opts) {
  // Measure only the outermost call; this function recurses through itself
  // for nested schemas and collection rows.
  if (__evalDepth === 0) {
    __evalDepth++;
    try {
      return measure('schemaOptionsEvalulator', () => _schemaOptionsEvalulatorImpl(opts));
    } finally {
      __evalDepth--;
    }
  }
  return _schemaOptionsEvalulatorImpl(opts);
}

// Walker is now FUNCTIONAL — it returns a new options object for this
// schema level instead of mutating an input. Unvisited collection rows
// keep their previous object reference (structural sharing); visited
// subtrees get fresh objects. The caller (SchemaState.updateOptions)
// passes `prevOptions` and uses the returned value as the new state.
//
// `options` (legacy) is accepted as an alias for `prevOptions` so
// existing callers / external consumers that still pass `options` get
// the previous-walk semantics they were used to — but we no longer
// mutate that object.
function _schemaOptionsEvalulatorImpl({
  schema, data, accessPath=[], viewHelperProps,
  options=null, prevOptions=null,
  parentOptions=null, inGrid=false,
  // Incremental option evaluation: when set, skip walking collection
  // rows whose path does not overlap the changed path. Initial mount and
  // any caller that doesn't pass these args keeps the full-walk
  // behaviour. `globalPath` mirrors the data tree so we can compare
  // against `changedPath`; `accessPath` continues to navigate the
  // options tree. `depDests` carries the dest paths of any DepListener
  // entry whose source overlaps `changedPath` — they must also be
  // visited so cross-row declared deps stay correct.
  changedPath=null, globalPath=[], depDests=null,
}) {
  // Incremental mode is opt-in. It's enabled either per-dialog (via
  // viewHelperProps.incrementalOptions) or globally via the
  // window.__INCREMENTAL_OPTIONS__ toggle (handy for benchmarks /
  // canarying without rebuilding the dialog plumbing).
  //
  // KNOWN LIMITATION — leave incremental off until the host schema has
  // been audited:
  //   Rows are pruned by `pathOverlaps(rowGlobalPath, p)` for every `p`
  //   in `mustVisit` (changedPath + dest paths of DepListener entries
  //   whose source overlaps changedPath). Cross-row deps that are
  //   *declared* via `field.deps` are therefore handled correctly — they
  //   register as DepListener entries and join mustVisit.
  //   What's NOT handled: a field whose `visible` / `disabled` /
  //   `readonly` / `editable` evaluator reads data from a SIBLING row
  //   without declaring those source paths in `field.deps`. That row is
  //   silently skipped. Audit each schema before flipping incremental
  //   on and declare cross-row deps as `field.deps`.
  const incremental = (
    Array.isArray(changedPath) && (
      viewHelperProps?.incrementalOptions === true
      || (typeof window !== 'undefined' && window.__INCREMENTAL_OPTIONS__ === true)
    )
  );

  const mustVisit = incremental
    ? [changedPath].concat(Array.isArray(depDests) ? depDests : [])
    : null;

  // `prev` is the read-only previous options snapshot at this level.
  // We start `out` as a shallow clone so untouched keys (set by
  // sibling fields in this loop, or pre-existing entries for unvisited
  // collections we haven't written yet) keep their references.
  const prev = prevOptions || options || {};
  const out = { ...prev };

  schema?.fields?.forEach((field) => {
    // We could have multiple entries of same `field.id` for each mode,
    // hence — we should process the options only if the current field is
    // supported for the given mode.
    if (!isModeSupportedByField(field, viewHelperProps)) return;

    switch (field.type) {
    case 'nested-tab':
    case 'nested-fieldset':
    case 'inline-groups':
      {
        if (!field.schema) return;
        if (!field.schema.top) field.schema.top = schema.top || schema;

        // nested-* groups share their parent's data level. Recurse and
        // merge the returned dict into `out` (nested fields take
        // priority over siblings already accumulated).
        const nested = schemaOptionsEvalulator({
          schema: field.schema, data,
          accessPath: field.id ? [...accessPath, field.id] : accessPath,
          viewHelperProps, prevOptions: out,
          parentOptions, changedPath, globalPath, depDests,
        });
        // `nested` already contains everything we had in `out` (it was
        // seeded as prevOptions) plus the nested fields' contributions.
        Object.assign(out, nested);
      }
      break;

    case 'collection':
      {
        if (!field.schema) return;
        if (!field.schema.top) field.schema.top = schema.top || schema;

        const fieldGlobalPath = [...globalPath, field.id];
        // Per-collection slot in prev → shallow clone so unvisited rows
        // retain their reference.
        const prevColl = (prev[field.id] && typeof prev[field.id] === 'object')
          ? prev[field.id] : {};
        const nextColl = { ...prevColl };

        // Field-level options (canAdd, canEdit, etc.) — always fresh.
        const fieldOptions = {};
        evaluateFieldOptions({
          schema, value: data, viewHelperProps, field,
          options: fieldOptions, parentOptions,
        });
        nextColl[FIELD_OPTIONS] = fieldOptions;

        const rows = data[field.id];
        rows?.forEach((row, idx) => {
          const rowGlobalPath = [...fieldGlobalPath, idx];

          // Incremental prune: skip rows whose subtree the change cannot
          // affect. A row matters when ANY must-visit path either reaches
          // INTO it (typing a cell inside this row, or a declared dep
          // points into it) or sits ABOVE it (a structural change at or
          // above the collection — e.g. ADD_ROW with
          // `changedPath = ['columns']`).
          if (incremental && !mustVisit.some((p) => pathOverlaps(rowGlobalPath, p))) {
            // nextColl[idx] already === prevColl[idx] via spread; we
            // intentionally do NOTHING so the reference is preserved.
            return;
          }

          // Visited row: walk the row schema (returns new sub-options).
          const subOpts = schemaOptionsEvalulator({
            schema: field.schema, data: row, accessPath: [],
            viewHelperProps, prevOptions: prevColl[idx],
            parentOptions: fieldOptions, inGrid: true,
            changedPath, globalPath: rowGlobalPath, depDests,
          });

          // Per-row options (canEditRow, etc.).
          const rowFieldOptions = {};
          evaluateFieldOption({
            option: 'row', schema: field.schema, value: row, viewHelperProps,
            field, options: rowFieldOptions, parentOptions: fieldOptions,
          });

          nextColl[idx] = { ...subOpts, [FIELD_OPTIONS]: rowFieldOptions };
        });

        out[field.id] = nextColl;
      }
      break;

    default:
      {
        // Leaf field: compute fresh fieldOptions; the per-leaf slot is
        // a new object every time we visit (walker always evaluates
        // top-level leaves). For leaves inside an UNVISITED row, we
        // never get here — the collection branch above keeps the row's
        // entire reference.
        const fieldOptions = {};
        evaluateFieldOptions({
          schema, value: data, viewHelperProps, field,
          options: fieldOptions, parentOptions,
        });
        if (inGrid) {
          evaluateFieldOption({
            option: 'cell', schema, value: data, viewHelperProps, field,
            options: fieldOptions, parentOptions,
          });
        }
        out[field.id] = { [FIELD_OPTIONS]: fieldOptions };
      }
      break;
    }
  });

  return out;
}
