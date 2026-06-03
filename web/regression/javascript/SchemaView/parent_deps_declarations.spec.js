/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Regression guard for the six grid-cell evaluators whose visible /
// disabled / readonly / editable read parent-row data. Their `field.deps`
// MUST include absolute-path entries for those parent fields so the
// DepListener-driven incremental option walker picks them up.

import _ from 'lodash';

import BaseUISchema from '../../../pgadmin/static/js/SchemaView/base_schema.ui';
import ColumnSchema from
  '../../../pgadmin/browser/server_groups/servers/databases/schemas/tables/columns/static/js/column.ui';
import IndexSchema from
  '../../../pgadmin/browser/server_groups/servers/databases/schemas/tables/indexes/static/js/index.ui';
import {
  PartitionsSchema,
} from '../../../pgadmin/browser/server_groups/servers/databases/schemas/tables/static/js/partition.utils.ui';

import TableSchema from
  '../../../pgadmin/browser/server_groups/servers/databases/schemas/tables/static/js/table.ui';
import PartitionTableSchema from
  '../../../pgadmin/browser/server_groups/servers/databases/schemas/tables/partitions/static/js/partition.ui';
import { DomainConstSchema } from
  '../../../pgadmin/browser/server_groups/servers/databases/schemas/domains/static/js/domain.ui';

// Returns true if `arr` contains an element that deep-equals `needle`.
const hasEntry = (arr, needle) =>
  Array.isArray(arr) && arr.some((e) => _.isEqual(e, needle));

const findField = (schema, fieldId) =>
  schema.baseFields.find((f) => f.id === fieldId);

class MockSchema extends BaseUISchema {
  get baseFields() { return []; }
}

const newColumnSchema = () => new ColumnSchema(
  () => new MockSchema(),
  {},
  () => Promise.resolve([]),
  () => Promise.resolve([]),
);

const newIndexSchema = () => new IndexSchema(
  {amname: () => Promise.resolve([])},
  {table: {}},
);

const newPartitionsSchema = () => new PartitionsSchema(
  {table: {}},
  () => Promise.resolve([]),
  () => Promise.resolve([]),
  () => Promise.resolve([]),
);

describe('column.ui.js — is_primary_key parent deps', () => {
  const field = findField(newColumnSchema(), 'is_primary_key');

  test('field exists', () => { expect(field).toBeDefined(); });

  test('declares same-row dep on `name`', () => {
    expect(field.deps).toContain('name');
  });

  test('declares absolute dep on parent `primary_key`', () => {
    expect(hasEntry(field.deps, ['primary_key'])).toBe(true);
  });

  test('declares absolute dep on parent `oid`', () => {
    expect(hasEntry(field.deps, ['oid'])).toBe(true);
  });

  test('declares absolute dep on parent `is_partitioned`', () => {
    expect(hasEntry(field.deps, ['is_partitioned'])).toBe(true);
  });

  test('NEGATIVE — does NOT declare an unrelated parent like `xyz`', () => {
    expect(hasEntry(field.deps, ['xyz'])).toBe(false);
  });
});

describe('index.ui.js — op_class parent amname dep (inside columns row)', () => {
  // IndexSchema exposes a `columns` collection. The row schema is the
  // (non-exported) IndexColumnSchema; reach it via the field definition.
  const schema = newIndexSchema();
  const colsField = schema.baseFields.find(
    (f) => f.id === 'columns' && f.type === 'collection'
  );

  test('columns collection field exists', () => {
    expect(colsField).toBeDefined();
  });

  const rowSchema = colsField?.schema;
  const opClassField = rowSchema?.baseFields.find((f) => f.id === 'op_class');

  test('op_class field exists in row schema', () => {
    expect(opClassField).toBeDefined();
  });

  test('declares absolute dep on parent `amname`', () => {
    expect(hasEntry(opClassField.deps, ['amname'])).toBe(true);
  });

  test('NEGATIVE — does not declare relative `amname` (no such field on column row)', () => {
    expect(opClassField.deps).not.toContain('amname');
  });
});

describe('partition.utils.ui.js — is_attach parent deps', () => {
  const field = findField(newPartitionsSchema(), 'is_attach');

  test('field exists', () => { expect(field).toBeDefined(); });

  test('declares absolute dep on parent `oid` (used by obj.top.isNew())', () => {
    expect(hasEntry(field.deps, ['oid'])).toBe(true);
  });
});

describe('partition.utils.ui.js — is_default parent deps', () => {
  const field = findField(newPartitionsSchema(), 'is_default');

  test('field exists', () => { expect(field).toBeDefined(); });

  test('declares absolute dep on parent `partition_type`', () => {
    expect(hasEntry(field.deps, ['partition_type'])).toBe(true);
  });

  test('declares absolute dep on parent `oid`', () => {
    expect(hasEntry(field.deps, ['oid'])).toBe(true);
  });
});

describe('partition.utils.ui.js — values_remainder parent deps', () => {
  const field = findField(newPartitionsSchema(), 'values_remainder');

  test('field exists', () => { expect(field).toBeDefined(); });

  test('declares same-row dep on `is_default`', () => {
    expect(field.deps).toContain('is_default');
  });

  test('declares absolute dep on parent `partition_type`', () => {
    expect(hasEntry(field.deps, ['partition_type'])).toBe(true);
  });

  test('declares absolute dep on parent `oid`', () => {
    expect(hasEntry(field.deps, ['oid'])).toBe(true);
  });
});

describe('Schema-level incrementalOptions opt-in markers', () => {
  test('TableSchema declares incrementalOptions = true', () => {
    const schema = new TableSchema({}, {}, {}, () => new MockSchema());
    expect(schema.incrementalOptions).toBe(true);
  });

  test('IndexSchema declares incrementalOptions = true', () => {
    const schema = new IndexSchema(
      {amname: () => Promise.resolve([])},
      {table: {}},
    );
    expect(schema.incrementalOptions).toBe(true);
  });

  test('PartitionTableSchema declares incrementalOptions = true', () => {
    const schema = new PartitionTableSchema(
      {}, {}, {constraints: () => new MockSchema()}, () => new MockSchema(),
    );
    expect(schema.incrementalOptions).toBe(true);
  });

  test('NEGATIVE — a bare BaseUISchema subclass does not opt in by default', () => {
    class Unopted extends BaseUISchema { get baseFields() { return []; } }
    expect(new Unopted().incrementalOptions).toBeFalsy();
  });
});

describe('domain.ui.js — DomainConstSchema.convalidated parent deps', () => {
  const schema = new DomainConstSchema();
  const field = findField(schema, 'convalidated');

  test('field exists', () => { expect(field).toBeDefined(); });

  test('declares absolute dep on parent `constraints` (readonly reads top.origData.constraints)', () => {
    expect(hasEntry(field.deps, ['constraints'])).toBe(true);
  });
});

describe('partition.utils.ui.js — sub_partition_keys parent columns dep', () => {
  const field = findField(newPartitionsSchema(), 'sub_partition_keys');

  test('field exists on PartitionsSchema', () => {
    expect(field).toBeDefined();
  });

  test('declares absolute dep on parent `columns` (canAddRow reads top.sessData.columns)', () => {
    expect(hasEntry(field.deps, ['columns'])).toBe(true);
  });

  test('still declares the pre-existing deps', () => {
    expect(field.deps).toContain('is_sub_partitioned');
    expect(field.deps).toContain('sub_partition_type');
  });
});
