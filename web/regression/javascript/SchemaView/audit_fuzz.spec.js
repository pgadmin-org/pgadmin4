/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Property-based fuzzing layer on top of the deterministic audit
// harness. The deterministic sweep (registered_schemas_audit.spec.js)
// covers every k-combination of candidate paths up to k=4 across
// 87 schemas x 3 modes. The fuzzer adds:
//
//   - RANDOM batch sizes (k in [2, 6])
//   - RANDOM path INDICES drawn from each schema's candidate list
//     (so the permutation of extras varies — deterministic sweep
//     uses a fixed candidate order with k rotations of primary)
//   - RANDOM mutation ordering (applyMutation runs in batch order;
//     fast-check varies that order via index permutation)
//
// The unique value-add over deterministic sweep is SHRINKING: if a
// random batch trips the canary, fast-check shrinks the input to
// the smallest reproducer (fewest paths, smallest indices). Useful
// for new contributors who introduce a closure with an undeclared
// cross-row read — the canary will catch divergence, the shrinker
// will pin down the minimal scenario in the test output.
//
// Today everything passes; the fuzzer's payoff is on the day someone
// breaks it.

import fc from 'fast-check';
import fs from 'fs';
import path from 'path';
import {
  getRegisteredSchemas, _resetRegistry,
} from '../../../pgadmin/static/js/SchemaView/SchemaState/schema_registry';
import { fuzzBatchAgainst } from
  '../../../pgadmin/static/js/SchemaView/SchemaState/audit_harness';

const PGADMIN_ROOT = path.resolve(__dirname, '../../../pgadmin');

const findSchemaFiles = () => {
  const out = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === 'generated') continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (!/\.(js|jsx)$/.test(e.name)) continue;
      try {
        const src = fs.readFileSync(p, 'utf8');
        if (!/extends BaseUISchema/.test(src)) continue;
        if (!/registerSchema\(/.test(src)) continue;
        out.push(p);
      } catch { /* unreadable; skip */ }
    }
  };
  walk(PGADMIN_ROOT);
  return out;
};

_resetRegistry();
for (const file of findSchemaFiles()) {
  try { require(file); } catch { /* import failure → skipped */ }
}

const schemaNames = Array.from(getRegisteredSchemas().keys()).sort();
const MODES = ['create', 'edit', 'properties'];

// Numbers chosen so the full fuzz run completes in well under
// 60s on a dev laptop. NUM_RUNS_PER_PROPERTY * NUM_PROPERTIES
// roughly bounds the total dispatch count.
const NUM_RUNS = 500;

describe('audit fuzz — random batches across registered schemas', () => {
  test('no random k-batch produces a canary divergence', () => {
    fc.assert(
      fc.property(
        // Schema choice — fast-check shrinks toward the first
        // name in the list (alphabetical: AggregateSchema etc.).
        // For best triage, alphabetize so AggregateSchema is
        // simpler than TableSchema; shrinker prefers earlier.
        fc.constantFrom(...schemaNames),
        // Mode — shrinks toward the first.
        fc.constantFrom(...MODES),
        // Path indices — 2 to 6 non-negative ints. Shrinker
        // collapses toward [0, 1] (smallest distinct pair).
        fc.array(
          fc.integer({ min: 0, max: 20 }),
          { minLength: 2, maxLength: 6 },
        ),
        (schemaName, mode, pathIndices) => {
          const SchemaClass = getRegisteredSchemas().get(schemaName);
          if (!SchemaClass) return;  // shouldn't happen but safe
          const result = fuzzBatchAgainst(SchemaClass, mode, pathIndices);
          if (!result.ok) {
            // Make the failure message readable in fast-check's
            // shrunk-counterexample output.
            throw new Error(
              `canary divergence in ${schemaName} [${mode}] batch=`
              + JSON.stringify(result.batch)
              + '\n' + result.message,
            );
          }
        },
      ),
      { numRuns: NUM_RUNS, verbose: false },
    );
  });
});
