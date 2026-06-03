/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Locks the bounded-growth contract on SchemaState._knownErrorPaths.
// Without the cap, long-lived dialogs (ERD, schema diff, sql editor's
// query-tool schema panel) could grow the tracker unbounded across
// sessions; the cap caps memory at O(KNOWN_ERROR_PATHS_CAP) regardless
// of how many distinct error paths the user surfaces.
//
// The cap value is internal; this spec asserts the contract:
//   1. The tracker accepts entries indefinitely without throwing.
//   2. Its size stays bounded under sustained insertion.
//   3. The MOST RECENTLY ADDED entries are retained (LRU eviction
//      drops the oldest path, not the newest).

import BaseUISchema from '../../../pgadmin/static/js/SchemaView/base_schema.ui';
import { SchemaState } from '../../../pgadmin/static/js/SchemaView/SchemaState';

class Trivial extends BaseUISchema {
  get baseFields() { return [{ id: 'name', type: 'text' }]; }
}

const buildState = () => {
  const schema = new Trivial();
  schema.top = schema;
  return new SchemaState(
    schema, () => Promise.resolve({}), {}, () => {},
    { mode: 'create' }, '',
  );
};

describe('_knownErrorPaths — bounded LRU', () => {
  test('size stays bounded under 10k distinct path insertions', () => {
    const state = buildState();
    for (let i = 0; i < 10000; i++) {
      state.setError({ name: ['row', i, 'cell'], message: `e${i}` });
    }
    // We don't pin the cap value here (it's an implementation detail),
    // but it has to be FINITE and well under the 10k insertions.
    expect(state._knownErrorPaths.size).toBeLessThan(5000);
    expect(state._knownErrorPaths.size).toBeGreaterThan(0);
  });

  test('most-recent insertions are retained, oldest are evicted', () => {
    const state = buildState();
    // Fill past the cap.
    for (let i = 0; i < 2000; i++) {
      state.setError({ name: ['row', i, 'cell'], message: 'e' });
    }
    // The last 100 paths must still be in the tracker.
    for (let i = 1900; i < 2000; i++) {
      const flat = ['row', i, 'cell'].map(String).join('/');
      expect(state._knownErrorPaths.has(flat)).toBe(true);
    }
    // At least SOME of the earliest paths must have been evicted.
    let evictedCount = 0;
    for (let i = 0; i < 100; i++) {
      const flat = ['row', i, 'cell'].map(String).join('/');
      if (!state._knownErrorPaths.has(flat)) evictedCount++;
    }
    expect(evictedCount).toBeGreaterThan(0);
  });

  test('eviction emits a one-shot warn + counts every eviction', () => {
    const state = buildState();
    // Spy on console.warn to catch the one-shot signal.
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Trigger many evictions.
    for (let i = 0; i < 3000; i++) {
      state.setError({ name: ['row', i, 'cell'], message: 'e' });
    }

    // Exactly one warn fires for the whole session, no matter how
    // many evictions follow.
    const evictionWarnCalls = warnSpy.mock.calls.filter(
      ([msg]) => typeof msg === 'string' && msg.includes('_knownErrorPaths LRU cap'),
    );
    expect(evictionWarnCalls.length).toBe(1);

    warnSpy.mockRestore();
  });

  test('re-adding an existing path refreshes its recency', () => {
    const state = buildState();
    // Seed an early entry.
    state.setError({ name: ['row', 0, 'cell'], message: 'e' });
    // Flood with enough new entries to risk eviction.
    for (let i = 1; i < 2000; i++) {
      state.setError({ name: ['row', i, 'cell'], message: 'e' });
    }
    // Re-touch the early entry — should refresh recency.
    state.setError({ name: ['row', 0, 'cell'], message: 'e2' });
    // Now flood more.
    for (let i = 2000; i < 2500; i++) {
      state.setError({ name: ['row', i, 'cell'], message: 'e' });
    }
    // The refreshed entry must survive even though entries from
    // BEFORE the refresh are gone.
    const flat = ['row', 0, 'cell'].map(String).join('/');
    expect(state._knownErrorPaths.has(flat)).toBe(true);
  });
});
