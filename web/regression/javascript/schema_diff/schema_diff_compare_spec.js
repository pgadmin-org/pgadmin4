/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { computeDependLevels } from '../../../pgadmin/tools/schema_diff/static/js/components/SchemaDiffCompare';

describe('computeDependLevels', () => {

  it('gives a chain of dependencies strictly increasing levels, deepest first', () => {
    // A depends on B, B depends on C. C must end up with a higher level
    // than B, and B a higher level than A, so a reverse walk (as
    // generateFinalScript performs) writes C, then B, then A.
    const rowA = { id: 'a', oid: 1, dependencies: [{ type: 'table', oid: 2 }] };
    const rowB = { id: 'b', oid: 2, dependencies: [{ type: 'type', oid: 3 }] };
    const rowC = { id: 'c', oid: 3, dependencies: [] };

    computeDependLevels([rowA, rowB, rowC]);

    expect(rowC.dependLevel).toBeGreaterThan(rowB.dependLevel);
    expect(rowB.dependLevel).toBeGreaterThan(rowA.dependLevel);
  });

  it('leaves unrelated rows all at the base level', () => {
    const rowA = { id: 'a', oid: 1, dependencies: [] };
    const rowB = { id: 'b', oid: 2, dependencies: [] };

    computeDependLevels([rowA, rowB]);

    expect(rowA.dependLevel).toBe(1);
    expect(rowB.dependLevel).toBe(1);
  });

  it('does not loop forever on a circular dependency', () => {
    const rowA = { id: 'a', oid: 1, dependencies: [{ type: 'table', oid: 2 }] };
    const rowB = { id: 'b', oid: 2, dependencies: [{ type: 'table', oid: 1 }] };

    computeDependLevels([rowA, rowB]);

    expect(Number.isFinite(rowA.dependLevel)).toBe(true);
    expect(Number.isFinite(rowB.dependLevel)).toBe(true);
  });

  it('ignores dependencies that point at an oid not present in the row set', () => {
    const rowA = { id: 'a', oid: 1, dependencies: [{ type: 'extension', oid: 999 }] };

    computeDependLevels([rowA]);

    expect(rowA.dependLevel).toBe(1);
  });

  it('takes the deepest of several dependency chains converging on the same row', () => {
    // Both A and B depend directly on C, but A also depends on D which in
    // turn depends on C, so C's level must reflect the longer A -> D -> C
    // chain, not just the shorter B -> C one.
    const rowA = { id: 'a', oid: 1, dependencies: [{ type: 'table', oid: 3 }, { type: 'table', oid: 4 }] };
    const rowB = { id: 'b', oid: 2, dependencies: [{ type: 'table', oid: 3 }] };
    const rowC = { id: 'c', oid: 3, dependencies: [] };
    const rowD = { id: 'd', oid: 4, dependencies: [{ type: 'table', oid: 3 }] };

    computeDependLevels([rowA, rowB, rowC, rowD]);

    expect(rowC.dependLevel).toBe(rowD.dependLevel + 1);
    expect(rowC.dependLevel).toBeGreaterThan(rowB.dependLevel + 1);
  });
});
