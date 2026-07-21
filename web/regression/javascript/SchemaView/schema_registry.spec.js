/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Tests for the schema registry. Per design D10, every default-
// exported BaseUISchema subclass wraps its export in `registerSchema()`
// so the audit harness can enumerate schemas without grep / AST walks.
//
// The registry itself is a thin module-scoped Map. Concerns under test:
//   - registerSchema is a passthrough: returns its argument unchanged
//   - getRegisteredSchemas returns a snapshot (caller mutation can't
//     corrupt the internal state)
//   - re-registering the same class is idempotent (no duplicate
//     entries, last value wins)
//   - argument validation: non-function inputs throw early so a
//     misuse fails loudly at module load rather than at audit time
//   - _resetRegistry isolates tests from each other

import BaseUISchema from '../../../pgadmin/static/js/SchemaView/base_schema.ui';
import {
  registerSchema, getRegisteredSchemas, _resetRegistry,
} from '../../../pgadmin/static/js/SchemaView/SchemaState/schema_registry';

beforeEach(() => { _resetRegistry(); });

describe('registerSchema', () => {
  test('returns its argument unchanged (passthrough)', () => {
    class FooSchema extends BaseUISchema {}
    expect(registerSchema(FooSchema)).toBe(FooSchema);
  });

  test('records the class in the registry under its name', () => {
    class FooSchema extends BaseUISchema {}
    registerSchema(FooSchema);
    expect(getRegisteredSchemas().get('FooSchema')).toBe(FooSchema);
  });

  test('re-registering the same class name overwrites (last wins)', () => {
    // Two classes can share a name (separate definitions in different
    // files). The codebase shouldn't have collisions; if it does, the
    // registry surfaces it as last-wins so the audit harness still
    // sees a single entry per name. ESLint rule prevents this in
    // practice — but the registry shouldn't silently keep both.
    class FooSchema extends BaseUISchema {}
    const FirstFoo = FooSchema;
    registerSchema(FirstFoo);
    class FooSchema2 extends BaseUISchema { static get _label() { return 'v2'; } }
    Object.defineProperty(FooSchema2, 'name', { value: 'FooSchema' });
    registerSchema(FooSchema2);
    expect(getRegisteredSchemas().get('FooSchema')).toBe(FooSchema2);
    expect(getRegisteredSchemas().size).toBe(1);
  });

  test('throws on non-function argument', () => {
    expect(() => registerSchema(null)).toThrow(TypeError);
    expect(() => registerSchema(undefined)).toThrow(TypeError);
    expect(() => registerSchema({})).toThrow(TypeError);
    expect(() => registerSchema('FooSchema')).toThrow(TypeError);
  });

  test('throws when the class has no name (anonymous)', () => {
    // Anonymous classes (e.g. `registerSchema(class extends BaseUISchema {})`)
    // would land as key '' in the registry — silently collapsing onto
    // one entry. Fail loud so authors give the class a name.
    const Anon = (() => class extends BaseUISchema {})();
    expect(Anon.name).toBe('');
    expect(() => registerSchema(Anon)).toThrow(/anonymous|name/i);
  });
});

describe('getRegisteredSchemas', () => {
  test('returns an empty Map when nothing registered', () => {
    const result = getRegisteredSchemas();
    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(0);
  });

  test('returns a snapshot — mutating it does not affect future calls', () => {
    class FooSchema extends BaseUISchema {}
    registerSchema(FooSchema);

    const snap = getRegisteredSchemas();
    snap.delete('FooSchema');
    snap.set('BogusSchema', 42);

    const fresh = getRegisteredSchemas();
    expect(fresh.get('FooSchema')).toBe(FooSchema);
    expect(fresh.has('BogusSchema')).toBe(false);
  });

  test('includes every registered schema', () => {
    class A extends BaseUISchema {}
    class B extends BaseUISchema {}
    class C extends BaseUISchema {}
    registerSchema(A);
    registerSchema(B);
    registerSchema(C);

    const schemas = getRegisteredSchemas();
    expect(schemas.size).toBe(3);
    expect(schemas.get('A')).toBe(A);
    expect(schemas.get('B')).toBe(B);
    expect(schemas.get('C')).toBe(C);
  });
});

describe('_resetRegistry', () => {
  test('clears the registry between tests', () => {
    class FooSchema extends BaseUISchema {}
    registerSchema(FooSchema);
    expect(getRegisteredSchemas().size).toBe(1);

    _resetRegistry();
    expect(getRegisteredSchemas().size).toBe(0);
  });
});

describe('SchemaState index re-exports', () => {
  test('registerSchema and getRegisteredSchemas reachable from SchemaState index', () => {
    // The design doc D10 specifies:
    //   import { getRegisteredSchemas } from 'sources/SchemaView/SchemaState';
    // Verify the index forwards the API so callers don't depend on
    // the internal file layout.
    const idx = require(
      '../../../pgadmin/static/js/SchemaView/SchemaState'
    );
    expect(typeof idx.registerSchema).toBe('function');
    expect(typeof idx.getRegisteredSchemas).toBe('function');
  });
});
