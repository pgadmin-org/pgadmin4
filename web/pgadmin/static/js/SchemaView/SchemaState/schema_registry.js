/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Schema registry. Per design D10, each default-exported BaseUISchema
// subclass wraps its export in `registerSchema()`:
//
//   class TableSchema extends BaseUISchema { ... }
//   export default registerSchema(TableSchema);
//
// The audit harness consumes `getRegisteredSchemas()` to enumerate
// schemas without grep / AST walks / import-list maintenance. An
// ESLint rule (see eslint-rules/) enforces the wrapping at lint time.
//
// The registry has no side effects beyond the Map mutation — it is
// NOT a hook into validation, dispatch, or rendering. It is purely an
// enumeration mechanism for tooling.

const _registry = new Map();

// Records `SchemaClass` in the registry keyed by `SchemaClass.name`,
// then returns the class unchanged so it can be the value of an
// `export default registerSchema(...)` expression.
//
// Throws on non-class arguments or anonymous classes — both would
// silently corrupt the registry. Failing at module load surfaces the
// mistake immediately rather than at audit time when the harness
// notices a missing entry.
export const registerSchema = (SchemaClass) => {
  if (typeof SchemaClass !== 'function') {
    throw new TypeError(
      'registerSchema: argument must be a class (got '
      + (SchemaClass === null ? 'null' : typeof SchemaClass) + ')'
    );
  }
  if (!SchemaClass.name) {
    throw new TypeError(
      'registerSchema: anonymous classes cannot be registered — give '
      + 'the class a name so the audit harness can identify it.'
    );
  }
  _registry.set(SchemaClass.name, SchemaClass);
  return SchemaClass;
};

// Returns a defensive snapshot of the registry. Callers (audit harness,
// CI scripts) can iterate freely without mutating the source-of-truth.
export const getRegisteredSchemas = () => new Map(_registry);

// Test-only helper. Module-scoped state would otherwise leak between
// specs that register fixture schemas with the same name. Not surfaced
// in the SchemaState index — only the spec imports it directly.
export const _resetRegistry = () => { _registry.clear(); };
