/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { setRecordCount } from '../../../pgadmin/tools/schema_diff/static/js/components/ResultGridComponent';
import { FILTER_NAME } from '../../../pgadmin/tools/schema_diff/static/js/SchemaDiffConstants';

const ALL_FILTERS = [
  FILTER_NAME.IDENTICAL,
  FILTER_NAME.DIFFERENT,
  FILTER_NAME.SOURCE_ONLY,
  FILTER_NAME.TARGET_ONLY,
];

function leaf(status) {
  return { status };
}

function midGroup(label, children) {
  return {
    label,
    identicalCount: 0,
    differentCount: 0,
    sourceOnlyCount: 0,
    targetOnlyCount: 0,
    children,
  };
}

function topGroup(label, children) {
  return {
    label,
    identicalCount: 0,
    differentCount: 0,
    sourceOnlyCount: 0,
    targetOnlyCount: 0,
    children,
  };
}

describe('setRecordCount', () => {
  it('counts leaf children by status', () => {
    const row = midGroup('Functions', [
      leaf(FILTER_NAME.IDENTICAL),
      leaf(FILTER_NAME.DIFFERENT),
      leaf(FILTER_NAME.DIFFERENT),
      leaf(FILTER_NAME.SOURCE_ONLY),
      leaf(FILTER_NAME.SOURCE_ONLY),
      leaf(FILTER_NAME.SOURCE_ONLY),
      leaf(FILTER_NAME.TARGET_ONLY),
    ]);

    setRecordCount(row, ALL_FILTERS);

    expect(row.identicalCount).toBe(1);
    expect(row.differentCount).toBe(2);
    expect(row.sourceOnlyCount).toBe(3);
    expect(row.targetOnlyCount).toBe(1);
  });

  it('skips leaf children whose status is filtered out', () => {
    const row = midGroup('Functions', [
      leaf(FILTER_NAME.IDENTICAL),
      leaf(FILTER_NAME.DIFFERENT),
      leaf(FILTER_NAME.SOURCE_ONLY),
      leaf(FILTER_NAME.TARGET_ONLY),
    ]);

    // Only count DIFFERENT and SOURCE_ONLY.
    setRecordCount(row, [FILTER_NAME.DIFFERENT, FILTER_NAME.SOURCE_ONLY]);

    expect(row.identicalCount).toBe(0);
    expect(row.differentCount).toBe(1);
    expect(row.sourceOnlyCount).toBe(1);
    expect(row.targetOnlyCount).toBe(0);
  });

  it('aggregates mid-level child counts into the top-level group (issue #9892)', () => {
    // Tree mirroring the bug reporter's case: a top-level group whose
    // children are object-type groups (Functions, Tables, ...) that
    // each have leaf children with statuses. Before the fix the top
    // row stayed at 0/0/0/0.
    const top = topGroup('Schema Objects', [
      midGroup('Functions', [
        leaf(FILTER_NAME.SOURCE_ONLY),
        leaf(FILTER_NAME.SOURCE_ONLY),
        leaf(FILTER_NAME.SOURCE_ONLY),
        leaf(FILTER_NAME.SOURCE_ONLY),
        leaf(FILTER_NAME.SOURCE_ONLY),
        leaf(FILTER_NAME.SOURCE_ONLY),
        leaf(FILTER_NAME.SOURCE_ONLY),
        leaf(FILTER_NAME.TARGET_ONLY),
      ]),
      midGroup('Tables', Array(6).fill(leaf(FILTER_NAME.SOURCE_ONLY))),
      midGroup('Procedures', Array(3).fill(leaf(FILTER_NAME.SOURCE_ONLY))),
      midGroup('Sequences', [
        leaf(FILTER_NAME.SOURCE_ONLY),
        leaf(FILTER_NAME.DIFFERENT),
      ]),
      midGroup('Types', [leaf(FILTER_NAME.IDENTICAL)]),
    ]);

    setRecordCount(top, ALL_FILTERS);

    // 7 (Functions src) + 6 (Tables) + 3 (Procedures) + 1 (Sequences) = 17
    expect(top.sourceOnlyCount).toBe(17);
    expect(top.targetOnlyCount).toBe(1);
    expect(top.differentCount).toBe(1);
    expect(top.identicalCount).toBe(1);
  });

  it('refreshes mid-level child counts on every call (filter change)', () => {
    const mid = midGroup('Functions', [
      leaf(FILTER_NAME.IDENTICAL),
      leaf(FILTER_NAME.DIFFERENT),
    ]);
    const top = topGroup('Schema Objects', [mid]);

    // First pass: include both statuses → mid counts both.
    setRecordCount(top, ALL_FILTERS);
    expect(mid.identicalCount).toBe(1);
    expect(mid.differentCount).toBe(1);
    expect(top.identicalCount).toBe(1);
    expect(top.differentCount).toBe(1);

    // Filter changes to DIFFERENT only → top must reflect mid's refreshed
    // counts, not the stale numbers from the first pass.
    setRecordCount(top, [FILTER_NAME.DIFFERENT]);
    expect(mid.identicalCount).toBe(0);
    expect(mid.differentCount).toBe(1);
    expect(top.identicalCount).toBe(0);
    expect(top.differentCount).toBe(1);
  });

  it('handles an empty children list without throwing', () => {
    const row = midGroup('Empty', []);
    setRecordCount(row, ALL_FILTERS);
    expect(row.identicalCount).toBe(0);
    expect(row.differentCount).toBe(0);
    expect(row.sourceOnlyCount).toBe(0);
    expect(row.targetOnlyCount).toBe(0);
  });
});
