/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Regression: when React batches multiple dispatches into one validate
// cycle (e.g. two sibling fixedRows promises resolving in the same
// microtask tick), the validate must visit ALL changed paths — not
// only the last one. Surfaced by Create Table UI smoke when both
// VacuumSettingsSchema collections (vacuum_table + vacuum_toast) had
// their fixedRows promises resolve in the same tick: prior to the
// fix the incremental walker pruned vacuum_table rows because
// __lastChangedPath only held the second path.

import { act, render } from '@testing-library/react';
import React from 'react';
import BaseUISchema from '../../../pgadmin/static/js/SchemaView/base_schema.ui';
import { FIELD_OPTIONS } from '../../../pgadmin/static/js/SchemaView/options';
import { useSchemaState } from '../../../pgadmin/static/js/SchemaView/hooks/useSchemaState';

class CellSchema extends BaseUISchema {
  get baseFields() {
    return [
      { id: 'label', name: 'label', type: 'text', cell: 'text' },
      { id: 'value', name: 'value', type: 'text', cell: 'text' },
    ];
  }
}

class TwoCollSchema extends BaseUISchema {
  constructor() {
    super({ coll_a: [], coll_b: [] });
    this.cellA = new CellSchema();
    this.cellB = new CellSchema();
  }
  get baseFields() {
    return [
      {
        id: 'coll_a', type: 'collection', schema: this.cellA,
        canAdd: false, canDelete: false, canEdit: false,
        mode: ['create', 'edit'],
      },
      {
        id: 'coll_b', type: 'collection', schema: this.cellB,
        canAdd: false, canDelete: false, canEdit: false,
        mode: ['create', 'edit'],
      },
    ];
  }
}

// 4-collection variant for the 3+ paths batched test: drives the
// case where, e.g., Function dialog loads parameters + arguments +
// privileges + parameters in one tick.
class FourCollSchema extends BaseUISchema {
  constructor() {
    super({ coll_a: [], coll_b: [], coll_c: [], coll_d: [] });
    this.cell = new CellSchema();
  }
  get baseFields() {
    return [
      { id: 'coll_a', type: 'collection', schema: this.cell,
        canAdd: false, canDelete: false, canEdit: false,
        mode: ['create', 'edit'] },
      { id: 'coll_b', type: 'collection', schema: this.cell,
        canAdd: false, canDelete: false, canEdit: false,
        mode: ['create', 'edit'] },
      { id: 'coll_c', type: 'collection', schema: this.cell,
        canAdd: false, canDelete: false, canEdit: false,
        mode: ['create', 'edit'] },
      { id: 'coll_d', type: 'collection', schema: this.cell,
        canAdd: false, canDelete: false, canEdit: false,
        mode: ['create', 'edit'] },
    ];
  }
}

// Render-time harness: exercises useSchemaState end-to-end, including
// the dispatcher that hands paths to validate. This is the only way to
// reliably catch the batched-dispatch bug, since the bug lives at the
// dispatcher↔validate seam.
const Harness = ({ schema, initData, onState }) => {
  const { schemaState, dataDispatch } = useSchemaState({
    schema, getInitData: () => Promise.resolve(initData),
    immutableData: false, onDataChange: () => {},
    viewHelperProps: { mode: 'create', incrementalOptions: true },
    loadingText: '',
  });
  React.useEffect(() => {
    onState({ schemaState, dataDispatch });
  }, [schemaState, dataDispatch]);
  return null;
};

const flushReady = async (schemaState) => {
  // useSchemaState fires initialise on mount; wait a tick for the
  // Promise to settle and isReady to flip.
  for (let i = 0; i < 50; i++) {
    if (schemaState?.isReady) return;
     
    await new Promise((r) => setTimeout(r, 5));
  }
};

describe('batched changedPaths — incremental walker', () => {
  test(
    'two batched fixedRows-style dispatches both visited',
    async () => {
      const schema = new TwoCollSchema();
      schema.top = schema;
      let captured = null;
      render(<Harness schema={schema}
        initData={{ coll_a: [], coll_b: [] }}
        onState={(s) => { captured = s; }} />);
      await act(async () => { await flushReady(schema.state); });
      const { schemaState } = captured;

      // Simulate two setUnpreparedData calls arriving in the SAME
      // React batch (sibling fixedRows promises resolving in one
      // microtask tick).
      await act(async () => {
        schemaState.setUnpreparedData(
          ['coll_a'],
          [{ label: 'a0', value: 'v0' }, { label: 'a1', value: 'v1' }],
        );
        schemaState.setUnpreparedData(
          ['coll_b'],
          [{ label: 'b0', value: 'v0' }, { label: 'b1', value: 'v1' }],
        );
      });

      const opts = schemaState.optionStore.getState();
      // Both collections' row entries must be populated. Pre-fix:
      // __lastChangedPath retained only ['coll_b'], the incremental
      // walker pruned coll_a's rows, and opts.coll_a[N] stayed
      // undefined.
      expect(opts.coll_a?.[0]?.[FIELD_OPTIONS]).toBeDefined();
      expect(opts.coll_a?.[1]?.[FIELD_OPTIONS]).toBeDefined();
      expect(opts.coll_b?.[0]?.[FIELD_OPTIONS]).toBeDefined();
      expect(opts.coll_b?.[1]?.[FIELD_OPTIONS]).toBeDefined();
    },
  );

  test(
    'four batched fixedRows-style dispatches all visited',
    async () => {
      // Models the case where a complex dialog (e.g. Function with
      // arguments + parameters + privileges + variables) has four
      // sibling async loads landing in one React commit.
      const schema = new FourCollSchema();
      schema.top = schema;
      let captured = null;
      render(<Harness schema={schema}
        initData={{ coll_a: [], coll_b: [], coll_c: [], coll_d: [] }}
        onState={(s) => { captured = s; }} />);
      await act(async () => { await flushReady(schema.state); });
      const { schemaState } = captured;

      // Fire FOUR setUnpreparedData calls in one batch.
      await act(async () => {
        schemaState.setUnpreparedData(['coll_a'], [{ label: 'a', value: 'v' }]);
        schemaState.setUnpreparedData(['coll_b'], [{ label: 'b', value: 'v' }]);
        schemaState.setUnpreparedData(['coll_c'], [{ label: 'c', value: 'v' }]);
        schemaState.setUnpreparedData(['coll_d'], [{ label: 'd', value: 'v' }]);
      });

      const opts = schemaState.optionStore.getState();
      // All four collections' row entries must be populated. Pre-fix
      // (single-scalar __lastChangedPath): three of the four were
      // pruned because the accumulator could retain only the last
      // path. Post-fix: all four ride mustVisit.
      for (const c of ['coll_a', 'coll_b', 'coll_c', 'coll_d']) {
        expect(opts[c]?.[0]?.[FIELD_OPTIONS]).toBeDefined();
      }
    },
  );
});
