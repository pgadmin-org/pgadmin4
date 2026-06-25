/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Tests for the feature-priority-ordering contract on
// DataGridView/features/feature.js's `register()`. Features are added to
// the module-scoped sorted list via a comparator that checks
// `priority`. A typo on either side of that comparator silently breaks
// the order (the comparator returns `undefined < N` which is always
// false) and features end up in import-registration order rather than
// in declared-priority order.

import Feature, {
  register,
  FeatureSet,
} from '../../../pgadmin/static/js/SchemaView/DataGridView/features/feature';

class HighPriorityFeature extends Feature {
  static priority = 999;
}
class LowPriorityFeature extends Feature {
  static priority = 1;
}

describe('DataGridView features — register() priority ordering', () => {
  test('register sorts classes by static priority (low priority first)', () => {
    // Register HIGH first then LOW. If the comparator works correctly,
    // LOW (priority=1) must end up at a lower index than HIGH
    // (priority=999) regardless of registration order.
    register(HighPriorityFeature);
    register(LowPriorityFeature);

    const fs = new FeatureSet();
    const lowIdx = fs.features
      .findIndex((f) => f.constructor === LowPriorityFeature);
    const highIdx = fs.features
      .findIndex((f) => f.constructor === HighPriorityFeature);

    expect(lowIdx).toBeGreaterThanOrEqual(0);
    expect(highIdx).toBeGreaterThanOrEqual(0);
    expect(lowIdx).toBeLessThan(highIdx);
  });
});
