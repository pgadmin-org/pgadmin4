/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { useEffect } from 'react';
import _ from 'lodash';

import { evalFunc } from 'sources/utils';


/**
 * Wires a field's `depChange` and `deferredDepChange` callbacks into the
 * SchemaState dependency tracker so they fire when the field's own value
 * or any of its declared `deps` change.
 *
 * ## `depChange(state, source, topState, actionObj) => deltaObj | undefined`
 *
 * Synchronous. Return a partial-state object to merge into the field's
 * local data; `undefined` means "no change". Runs inline during the
 * reducer dispatch, so it must be cheap and side-effect free.
 *
 * ## `deferredDepChange(state, source, topState, actionObj) => Promise<cb> | undefined`
 *
 * Asynchronous follow-up. Use this for work that needs a confirmation
 * dialog, a network round-trip, or any other Promise-bound result.
 *
 * The contract:
 *
 *   1. Return **`undefined`** to opt out — nothing is queued, no
 *      Promise is constructed. Use this when the trigger doesn't apply
 *      (wrong `source`, no actual change, nothing to do).
 *   2. Otherwise return a Promise that **always settles**:
 *        - On success, resolve with a callback `(tmpstate) => deltaObj`.
 *          The callback is invoked at drain time against the latest
 *          state and must return a delta object only — it must NOT
 *          mutate `tmpstate` or any captured input state.
 *        - On failure, prefer resolving with a recovery callback that
 *          resets any "in-progress" flag and surface the error via
 *          `pgAdmin.Browser.notifier.error(...)` from inside the
 *          Promise body. Rejecting is permitted as a safety net — the
 *          drainer routes rejections to `notifier.error` so the user
 *          sees a generic message — but per-schema recovery gives a
 *          better UX than a generic toast.
 *   3. Side effects (notifier dialogs, schema-level mutations like
 *      `setOperClassOptions`) belong **inside the Promise body before
 *      resolving** — not inside the returned callback. Exception: when
 *      the side effect's input legitimately depends on `tmpstate`
 *      (drain-time state, e.g. merging fetched columns into whatever
 *      the user has typed since the deferred work was queued), the
 *      side effect may live in the callback. Treat the exception as
 *      a smell: prefer to compute the result before resolve when you
 *      can.
 *
 * A Promise that never resolves leaks into `data.__deferred__` forever
 * and is the bug pattern this protocol exists to prevent.
 */
export const listenDepChanges = (
  accessPath, field, schemaState, setRefreshKey
) => {
  const deps = field?.deps ? (evalFunc(null, field.deps) || []) : null;
  const parentPath = accessPath ? [...accessPath] : [];

  // Remove the last element.
  if (field?.id && field.id === parentPath[parentPath.length - 1]) {
    parentPath.pop();
  }

  useEffect(() => {
    if (!schemaState || !field) return;

    if(field.depChange || field.deferredDepChange) {
      schemaState.addDepListener(
        accessPath, accessPath,
        field.depChange, field.deferredDepChange
      );
    }

    if (field.deps) {
      deps.forEach((dep) => {
        // When dep is a string then prepend the complete accessPath,
        // but - when dep is an array, then the intention is to provide
        // the exact accesspath.
        let source = _.isArray(dep) ? dep : parentPath.concat(dep);

        // Register a dep listener for EVERY declared `dep`, even when
        // the field has no `depChange` callback. The listener body is
        // only fired when `.callback` is set (see DepListener.getDepChange),
        // so the no-callback registration is a pure record. Why we
        // need it: the incremental option walker's
        // `_collectDepDestsForPath` enumerates the listener registry
        // to know which dest rows must stay in `mustVisit` when a
        // source path changes. Without registering a listener for
        // evaluator-only deps (fields whose `editable`/`disabled`/
        // `visible`/`readonly` closures read a cross-row source via
        // `obj.top.sessData.X`), the walker prunes those rows and
        // their options go stale — the canary catches this on
        // VacuumSettingsSchema's vacuum_table.*.value.editable.
        schemaState.addDepListener(
          source, accessPath, field.depChange, field.deferredDepChange
        );

        if (setRefreshKey)
          schemaState.subscribe(
            source, () => setRefreshKey(Date.now()), 'value'
          );
      });
    }

    return () => {
      // Cleanup the listeners when unmounting.
      schemaState.removeDepListener(accessPath);
    };
  }, []);

  return deps?.map((dep) => schemaState.value(
    _.isArray(dep) ? dep : parentPath.concat(dep)
  ));
};
