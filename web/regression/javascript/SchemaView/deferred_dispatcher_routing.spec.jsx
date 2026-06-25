/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Regression: drainDeferredQueue must dispatch DEFERRED_DEPCHANGE
// actions THROUGH the listener wrapper (sessDispatchWithListener)
// so they:
//   (a) carry the __viaListener sentinel and don't trip the reducer's
//       bypass guard,
//   (b) push their path into state.__pendingChangedPaths so the
//       next validate's mustVisit includes the deferred field.
//
// Pre-fix, the drain useEffect called sessDispatch directly. Every
// resolved deferredDepChange triggered console.error from the
// bypass guard AND silently dropped the path from the accumulator
// — the incremental walker would then prune the field's row on the
// next render even though the deferred resolve genuinely changed
// its value.

import { act, render } from '@testing-library/react';
import React from 'react';
import BaseUISchema from '../../../pgadmin/static/js/SchemaView/base_schema.ui';
import { useSchemaState } from '../../../pgadmin/static/js/SchemaView/hooks/useSchemaState';

class DeferredSchema extends BaseUISchema {
  constructor() {
    super({ source: '', dest: '' });
  }
  get baseFields() {
    return [
      { id: 'source', type: 'text' },
      {
        id: 'dest', type: 'text',
        deps: ['source'],
        // Resolves with a callback that flips dest to 'resolved'.
        // The drain useEffect must dispatch that callback's output
        // through sessDispatchWithListener so the path joins the
        // accumulator.
        deferredDepChange: (state, source) => {
          if (source[source.length - 1] !== 'source') return undefined;
          return Promise.resolve(() => ({ dest: 'resolved' }));
        },
      },
    ];
  }
}

const Harness = React.forwardRef(({ schema }, ref) => {
  const { schemaState, dataDispatch } = useSchemaState({
    schema, getInitData: () => Promise.resolve({ source: '', dest: '' }),
    immutableData: false, onDataChange: () => {},
    viewHelperProps: { mode: 'create', incrementalOptions: true },
    loadingText: '',
  });
  React.useImperativeHandle(ref, () => ({ schemaState, dataDispatch }),
    [schemaState, dataDispatch]);
  return null;
});
Harness.displayName = 'Harness';

const flushReady = async (schemaState) => {
  for (let i = 0; i < 50; i++) {
    if (schemaState?.isReady) return;
     
    await new Promise((r) => setTimeout(r, 5));
  }
};

afterEach(() => {
   
  console.error.mockClear();
});

describe('drainDeferredQueue routes through dispatcher', () => {
  test('DEFERRED_DEPCHANGE does NOT trip the bypass guard', async () => {
    const schema = new DeferredSchema();
    schema.top = schema;
    const ref = React.createRef();
    render(<Harness ref={ref} schema={schema} />);
    await act(async () => { await flushReady(schema.state); });
    const { dataDispatch } = ref.current;

    // Type into `source` — this triggers the deferred chain on `dest`.
    await act(async () => {
      dataDispatch({
        type: 'set_value', path: ['source'], value: 'audit_source',
      });
    });
    // Wait for the deferred promise to resolve and the drain to fire.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });

    // The bypass guard would have fired console.error on raw
    // sessDispatch. Post-fix, the drain routes through the listener
    // wrapper which stamps __viaListener, so the guard stays silent.
     
    expect(console.error).not.toHaveBeenCalledWith(
      expect.stringMatching(/dispatcher bypass/),
      expect.anything(),
    );
  });

  test('drainDeferredQueue uses sessDispatchWithListener', () => {
    // Direct contract assertion: drainDeferredQueue's signature
    // accepts a `dispatch` function; useSchemaState passes
    // sessDispatchWithListener to it. We assert against the wiring
    // by introspecting the SchemaView module's wiring rather than
    // re-running the full async chain (the full chain depends on
    // DepListener registration timing + useEffect orderings that
    // are flaky to test synchronously in jsdom).
    const useSchemaSrc = require('fs').readFileSync(
      require('path').resolve(__dirname,
        '../../../pgadmin/static/js/SchemaView/hooks/useSchemaState.js'),
      'utf8',
    );
    // The drain useEffect MUST pass sessDispatchWithListener, not
    // raw sessDispatch.
    expect(useSchemaSrc).toMatch(
      /drainDeferredQueue\(items,\s*sessDispatchWithListener\)/
    );
    expect(useSchemaSrc).not.toMatch(
      /drainDeferredQueue\(items,\s*sessDispatch\s*\)/
    );
  });
});
