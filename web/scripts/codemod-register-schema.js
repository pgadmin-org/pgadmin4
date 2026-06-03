#!/usr/bin/env node
/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// One-shot codemod for design D10: wraps every default-exported
// BaseUISchema subclass in `registerSchema()` so the audit harness
// can enumerate it. Idempotent — running twice is a no-op on
// already-wrapped files.
//
// Usage:
//   node scripts/codemod-register-schema.js [--dry]
//
// Transforms:
//   export default class FooSchema extends BaseUISchema { ... }
// into:
//   class FooSchema extends BaseUISchema { ... }
//   export default registerSchema(FooSchema);
// and inserts an import line for registerSchema if not present.
//
// The transformation is AST-driven (locates the ExportDefaultDeclaration
// node by source position) but emits the edits as string slices so
// the file's existing whitespace and comments are preserved exactly.

'use strict';

const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');

const REGISTER_IMPORT = (
  "import { registerSchema } from 'sources/SchemaView/SchemaState';\n"
);

const dryRun = process.argv.includes('--dry');
const WEB_ROOT = path.resolve(__dirname, '..');
const PGADMIN_ROOT = path.join(WEB_ROOT, 'pgadmin');

const walk = function* (dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'generated') continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(p);
    } else if (/\.(js|jsx|ui\.js)$/.test(entry.name)) {
      yield p;
    }
  }
};

const parseFile = (src) => parser.parse(src, {
  sourceType: 'module',
  plugins: [
    'jsx',
    'classProperties',
    'classPrivateProperties',
    'classPrivateMethods',
    'optionalChaining',
    'nullishCoalescingOperator',
    'objectRestSpread',
    'asyncGenerators',
    'dynamicImport',
    'topLevelAwait',
  ],
});

// Detect: is `decl` a ClassDeclaration extending an identifier
// `BaseUISchema`? Cross-file inheritance isn't followed (the codebase
// imports BaseUISchema by name everywhere).
const extendsBaseUISchema = (decl) =>
  decl
  && decl.type === 'ClassDeclaration'
  && decl.superClass
  && decl.superClass.type === 'Identifier'
  && decl.superClass.name === 'BaseUISchema';

// Already has `import { registerSchema } from 'sources/SchemaView/SchemaState'`?
// We also accept it if registerSchema is part of a broader named-import
// from the same module (e.g. `import { SchemaState, registerSchema } ...`).
const hasRegisterSchemaImport = (ast) => {
  for (const node of ast.program.body) {
    if (node.type !== 'ImportDeclaration') continue;
    if (node.source.value !== 'sources/SchemaView/SchemaState') continue;
    for (const spec of node.specifiers) {
      if (spec.type === 'ImportSpecifier'
          && spec.imported.name === 'registerSchema') {
        return true;
      }
    }
  }
  return false;
};

// Find a good insertion point for the new import: right after the
// BaseUISchema import if present, otherwise after the last import.
// Returns a source position (character offset). Returns null if there
// are no imports at all (caller should append at file top).
const findImportInsertOffset = (ast) => {
  let lastImportEnd = null;
  let baseUIImportEnd = null;
  for (const node of ast.program.body) {
    if (node.type !== 'ImportDeclaration') continue;
    lastImportEnd = node.end;
    for (const spec of node.specifiers) {
      if ((spec.type === 'ImportDefaultSpecifier'
            || spec.type === 'ImportSpecifier')
          && (spec.local?.name === 'BaseUISchema'
              || spec.imported?.name === 'BaseUISchema')) {
        baseUIImportEnd = node.end;
      }
    }
  }
  return baseUIImportEnd ?? lastImportEnd;
};

const transformOne = (src, relPath) => {
  let ast;
  try {
    ast = parseFile(src);
  } catch (err) {
    return { changed: false, src, reason: `parse error: ${err.message}` };
  }

  // Locate the default export that's a BaseUISchema class declaration.
  let target = null;
  for (const node of ast.program.body) {
    if (node.type === 'ExportDefaultDeclaration'
        && extendsBaseUISchema(node.declaration)) {
      target = node;
      break;
    }
  }
  if (!target) {
    return { changed: false, src, reason: 'no default-exported BaseUISchema class' };
  }

  const className = target.declaration.id?.name;
  if (!className) {
    // Anonymous default-exported classes can't be registered (the
    // registry refuses anonymous classes). Skip and report so the
    // author can fix manually.
    return {
      changed: false, src,
      reason: 'anonymous default-exported class — needs manual rename',
    };
  }

  // Edit 1: drop the `export default ` prefix on the class declaration.
  // target.start is the start of "export default class Foo...".
  // target.declaration.start is the start of "class Foo...".
  const exportPrefixStart = target.start;
  const classStart = target.declaration.start;
  const exportPrefix = src.slice(exportPrefixStart, classStart);
  if (!/^export\s+default\s+$/.test(exportPrefix)) {
    return {
      changed: false, src,
      reason: `unexpected export prefix: ${JSON.stringify(exportPrefix)}`,
    };
  }

  // Edit 2: after the class body's closing brace, append the new
  // wrapped export on the next line.
  const classEnd = target.end;
  // target.end actually points to the end of the ExportDefaultDeclaration,
  // which is the same as the class body end (no trailing semicolon on
  // `export default class { ... }`). Use the class declaration end.
  const classDeclEnd = target.declaration.end;

  // Build the new source.
  let out = src;

  // Apply edits from RIGHT to LEFT so offsets don't shift.

  // Append wrapped export after class.
  const wrappedExport = `\nexport default registerSchema(${className});\n`;
  out = out.slice(0, classDeclEnd) + wrappedExport + out.slice(classEnd);

  // (After edit above, the original `export default ` prefix is
  // still in place at exportPrefixStart..classStart. Remove it.)
  // Note: classStart hasn't moved because we edited AFTER it.
  out = out.slice(0, exportPrefixStart) + out.slice(classStart);

  // Insert import if missing. Compute offset against the ORIGINAL ast
  // — but the edits above only added text AFTER the imports, so the
  // import-region offsets are still valid in `out`. The export-prefix
  // removal happened later in the file too (export default is below
  // all imports), so import offsets are stable.
  if (!hasRegisterSchemaImport(ast)) {
    const insertAt = findImportInsertOffset(ast);
    if (insertAt == null) {
      // No imports at all — prepend at file top after the copyright
      // header. Safest: insert at offset 0 with a leading blank line.
      out = REGISTER_IMPORT + '\n' + out;
    } else {
      out = out.slice(0, insertAt) + '\n' + REGISTER_IMPORT.trimEnd()
            + out.slice(insertAt);
    }
  }

  return { changed: true, src: out, className, relPath };
};

const main = () => {
  const results = { changed: [], skipped: [], errors: [] };
  for (const file of walk(PGADMIN_ROOT)) {
    const src = fs.readFileSync(file, 'utf8');
    if (!/extends BaseUISchema/.test(src)) continue;
    if (!/^export default class/m.test(src)) continue;

    const rel = path.relative(WEB_ROOT, file);
    const { changed, src: newSrc, reason, className } = transformOne(src, rel);
    if (changed) {
      if (!dryRun) fs.writeFileSync(file, newSrc);
      results.changed.push({ rel, className });
    } else if (reason && reason.startsWith('parse')) {
      results.errors.push({ rel, reason });
    } else if (reason) {
      results.skipped.push({ rel, reason });
    }
  }

  console.log(`Changed: ${results.changed.length} files`);
  for (const r of results.changed) {
    console.log(`  ${r.className.padEnd(40)} ${r.rel}`);
  }
  if (results.skipped.length) {
    console.log(`\nSkipped: ${results.skipped.length}`);
    for (const r of results.skipped) console.log(`  ${r.rel}: ${r.reason}`);
  }
  if (results.errors.length) {
    console.log(`\nErrors: ${results.errors.length}`);
    for (const r of results.errors) console.log(`  ${r.rel}: ${r.reason}`);
    process.exit(1);
  }

  if (dryRun) console.log('\n(dry run — no files written)');
};

main();
