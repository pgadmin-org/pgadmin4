/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// ESLint rule: every default-exported BaseUISchema subclass must be
// wrapped in `registerSchema()`. Enforces design D10 — the audit
// harness enumerates schemas via the registry; an unregistered
// schema is silently skipped, defeating the canary's coverage.
//
// What the rule flags:
//   - `export default class Foo extends BaseUISchema {}` — direct
//     class declaration, no wrap possible without modification
//   - `export default Foo;` where Foo is a class extending
//     BaseUISchema declared in the same file
//   - `export default decorate(Foo);` — wrapping in any function
//     other than `registerSchema` hides the schema from the registry
//   - `export default decorate(class Foo extends BaseUISchema {});`
//
// What's intentionally NOT flagged:
//   - inner schemas not default-exported (they're not enumerated)
//   - re-exports (`export { default } from './foo'`) — the rule fires
//     in the source file
//   - classes extending something other than `BaseUISchema` directly
//     (rare in the codebase; cross-file inheritance chains would need
//     a type-aware lint that ESLint can't provide without TS)

'use strict';

const REGISTER_FN = 'registerSchema';
const BASE_NAME = 'BaseUISchema';

const isClassNode = (node) =>
  node && (node.type === 'ClassDeclaration' || node.type === 'ClassExpression');

// Direct check: superclass is the literal identifier `BaseUISchema`.
// Doesn't follow imports — schemas in this codebase always import
// BaseUISchema by name, so a name match is sufficient. Edge cases
// (renamed imports) are vanishingly rare and would be caught by the
// audit harness reporting a missing schema entry.
const extendsBaseUISchema = (node) => {
  if (!isClassNode(node)) return false;
  const sup = node.superClass;
  return sup && sup.type === 'Identifier' && sup.name === BASE_NAME;
};

const findClassByName = (scope, name) => {
  let cursor = scope;
  while (cursor) {
    const v = cursor.set.get(name);
    if (v) {
      for (const def of v.defs) {
        if (isClassNode(def.node)) return def.node;
      }
    }
    cursor = cursor.upper;
  }
  return null;
};

// Resolves the "ultimate exported class" from the default-export RHS.
// Returns the class node if found, plus a flag indicating whether the
// path from the export down to the class was through a registerSchema
// call (any intermediate non-registerSchema function makes it false).
const resolveExportedClass = (decl, scope) => {
  // export default class Foo extends BaseUISchema {}
  if (isClassNode(decl)) {
    return { classNode: decl, wrapped: false };
  }

  // export default Identifier
  if (decl.type === 'Identifier') {
    const classNode = findClassByName(scope, decl.name);
    return { classNode, wrapped: false };
  }

  // export default someFn(...)
  if (decl.type === 'CallExpression') {
    const isRegister = decl.callee.type === 'Identifier'
      && decl.callee.name === REGISTER_FN;
    const arg = decl.arguments[0];
    if (!arg) return { classNode: null, wrapped: false };

    if (isClassNode(arg)) {
      return { classNode: arg, wrapped: isRegister };
    }
    if (arg.type === 'Identifier') {
      const classNode = findClassByName(scope, arg.name);
      return { classNode, wrapped: isRegister };
    }
    // Nested calls (e.g. registerSchema(decorate(Foo))) — treat as
    // unwrapped: the registry receives a wrapped value, not the raw
    // class. Future enhancement could whitelist specific decorators.
    if (arg.type === 'CallExpression') {
      const inner = resolveExportedClass(arg, scope);
      // Even if outer is registerSchema, the inner call hides the
      // class identity from the registry — flag it.
      return { classNode: inner.classNode, wrapped: false };
    }
  }

  return { classNode: null, wrapped: false };
};

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Default-exported BaseUISchema subclasses must be wrapped in '
        + 'registerSchema() so the audit harness can enumerate them.',
    },
    schema: [],
    messages: {
      missingWrap:
        'Default-exported BaseUISchema subclass \'{{name}}\' must be '
        + 'wrapped in registerSchema() — required by design D10 so the '
        + 'audit harness can enumerate it. Use: '
        + 'export default registerSchema({{name}});',
    },
  },

  create(context) {
    return {
      ExportDefaultDeclaration(node) {
        const scope = context.sourceCode.getScope(node);
        const { classNode, wrapped } = resolveExportedClass(
          node.declaration, scope
        );

        if (!classNode || !extendsBaseUISchema(classNode)) return;
        if (wrapped) return;

        context.report({
          node,
          messageId: 'missingWrap',
          data: { name: classNode.id ? classNode.id.name : '<anonymous>' },
        });
      },
    };
  },
};
