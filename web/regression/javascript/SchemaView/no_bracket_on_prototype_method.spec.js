/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Guard against a recurring typo class found during a PEM audit:
// using SQUARE brackets to "call" a prototype method that's a
// function:
//
//   classList.join[' ']     // wrong: property access on `join`, undefined
//   memDeps.push[newProps]  // wrong: property access on `push`, undefined
//
// Both expressions evaluate to `undefined`, silently no-op, and survive
// type checking because JS allows arbitrary property access. They are
// almost always a typo for the function call form `.join(' ')` or
// `.push(newProps)`.
//
// We don't have an ESLint rule for this yet, so a regression test that
// walks the SchemaView source tree is the next best thing.

import fs from 'fs';
import path from 'path';

const SCHEMA_VIEW_DIR = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  'pgadmin',
  'static',
  'js',
  'SchemaView'
);

const HOT_METHODS = [
  'push', 'pop', 'shift', 'unshift',
  'join', 'map', 'filter', 'forEach', 'reduce', 'reduceRight',
  'concat', 'slice', 'splice', 'sort', 'reverse',
  'some', 'every', 'find', 'findIndex', 'flat', 'flatMap',
  'indexOf', 'lastIndexOf', 'includes',
];

// `.method[` anywhere in the source is the smoke signal.
const ANTI_PATTERN = new RegExp(
  String.raw`\.(?:${HOT_METHODS.join('|')})\s*\[`,
  'g'
);

const collectFiles = (dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return collectFiles(p);
    if (/\.(jsx?|tsx?)$/.test(e.name)) return [p];
    return [];
  });
};

describe('SchemaView source — bracket-on-prototype-method anti-pattern', () => {
  test('no .push[...] / .join[...] / .map[...] etc. anywhere under SchemaView', () => {
    const files = collectFiles(SCHEMA_VIEW_DIR);
    const offenders = [];

    for (const file of files) {
      const src = fs.readFileSync(file, 'utf8');
      // Reset regex state and scan line-by-line for better error
      // messages.
      const lines = src.split(/\r?\n/);
      lines.forEach((line, i) => {
        if (line.includes('eslint-disable')) return; // explicit opt-out
        // Skip pure single-line comments — the test catches its own
        // documentation otherwise. Block-comment detection would need
        // a real lexer; the convention "code comes before trailing //"
        // is enough.
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
        // Strip trailing line comments before matching.
        const codeOnly = line.split(/\/\//)[0];
        ANTI_PATTERN.lastIndex = 0;
        if (ANTI_PATTERN.test(codeOnly)) {
          offenders.push(`${path.relative(SCHEMA_VIEW_DIR, file)}:${i + 1}  ${trimmed}`);
        }
      });
    }

    if (offenders.length > 0) {
      const msg = [
        'Bracket-on-prototype-method anti-pattern found '
        + '(likely typo for a function call):',
        ...offenders.map((o) => '  ' + o),
        '',
        'If this is intentional (legitimate property access on a function',
        'object), add an `eslint-disable` marker on the line.',
      ].join('\n');
      throw new Error(msg);
    }
  });
});
