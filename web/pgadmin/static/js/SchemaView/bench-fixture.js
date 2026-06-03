/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Synthetic SchemaView -> DataGridView -> SchemaView -> DataGridView fixture
// for stress testing. Models the real-world worst case in pgAdmin: a Table
// dialog with up to 1000 columns, each column carrying nested indexes.
//
// Usage from the browser console (or via Playwright):
//   __PERF_SCHEMA__ = true
//   __mountBenchFixture(1000, 3)   // 1000 outer rows × 3 inner rows each
//   ... interact ...
//   __perfDump()
//
// The fixture uses pgAdmin's existing `pgadmin:utility:show` event so the
// dialog runs inside the real provider tree (theme, PgAdmin context, docker).

import BaseUISchema from './base_schema.ui';

class BenchInnerSchema extends BaseUISchema {
  constructor() {
    super({ key: '', value: '', enabled: false });
  }
  get baseFields() {
    return [
      { id: 'key', label: 'Index name', type: 'text', cell: 'text' },
      { id: 'value', label: 'Expression', type: 'text', cell: 'text' },
      { id: 'enabled', label: 'Unique', type: 'switch', cell: 'switch' },
    ];
  }
}

class BenchOuterSchema extends BaseUISchema {
  constructor() {
    super({ name: '', type: 'text', notnull: false, indexes: [] });
  }
  get baseFields() {
    return [
      { id: 'name', label: 'Column name', type: 'text', cell: 'text' },
      // `type` declares a same-row dep on `name` to exercise the
      // DepListener-driven incremental walk. A no-op depChange is enough
      // — its presence registers the source/dest in _depListeners.
      {
        id: 'type', label: 'Data type', type: 'text', cell: 'text',
        deps: ['name'],
        depChange: () => ({}),
      },
      { id: 'notnull', label: 'Not NULL', type: 'switch', cell: 'switch' },
      {
        id: 'indexes',
        label: 'Indexes',
        type: 'collection',
        schema: new BenchInnerSchema(),
        canAdd: true,
        canEdit: true,
        canDelete: true,
        mode: ['edit', 'create'],
      },
    ];
  }
}

class BenchTopSchema extends BaseUISchema {
  constructor(outerRows, innerRows) {
    super(generateInitial(outerRows, innerRows));
  }
  get baseFields() {
    return [
      { id: 'name', label: 'Table name', type: 'text', mode: ['create','edit'] },
      {
        id: 'columns',
        label: 'Columns',
        type: 'collection',
        schema: new BenchOuterSchema(),
        // Only these fields appear as cells in the outer grid. The `indexes`
        // collection is reachable via the row's expanded edit form.
        columns: ['name', 'type', 'notnull'],
        canAdd: true,
        canEdit: true,
        canDelete: true,
        expandEditOnAdd: true,
        mode: ['edit', 'create'],
      },
    ];
  }
}

function generateInitial(N, M) {
  const columns = new Array(N);
  for (let i = 0; i < N; i++) {
    const indexes = new Array(M);
    for (let j = 0; j < M; j++) {
      indexes[j] = {
        key: `idx_${i}_${j}`,
        value: `expr_${j}`,
        enabled: false,
      };
    }
    columns[i] = {
      name: `col_${i}`,
      type: 'text',
      notnull: false,
      indexes,
    };
  }
  return { name: 'bench_table', columns };
}

function mountBenchFixture(outerRows = 1000, innerRows = 3) {
  const N = parseInt(outerRows, 10) || 1000;
  const M = parseInt(innerRows, 10) || 3;
  // eslint-disable-next-line no-console
  console.log(`[bench-fixture] mounting ${N} outer × ${M} inner rows`);

  const schema = new BenchTopSchema(N, M);

  // pgAdmin is provided as a webpack global via ProvidePlugin.
  // eslint-disable-next-line no-undef
  if (!pgAdmin?.Browser?.Events) {
    throw new Error('pgAdmin.Browser.Events not available — is the app loaded?');
  }

  // eslint-disable-next-line no-undef
  pgAdmin.Browser.Events.trigger(
    'pgadmin:utility:show',
    null,
    `Bench (${N} cols × ${M} idx)`,
    {
      schema,
      actionType: 'create',
      urlBase: '#bench-fixture',
      extraData: {},
      onSave: () => { /* no-op for bench */ },
    },
    1200,
    800,
  );
  return { N, M };
}

if (typeof window !== 'undefined') {
  window.__mountBenchFixture = mountBenchFixture;
}
