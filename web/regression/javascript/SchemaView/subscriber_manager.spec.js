/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Tests for the SubscriberManager class. The previous signal/release
// dance relied on the subscribing hooks re-running their useEffect on
// every render to re-add subscriptions; now that those hooks pin their
// deps (see C.1 / subscribe_hooks.spec.js), signal() must NOT tear down
// existing subscriptions, and release() (called on unmount) must run
// synchronously rather than deferring via setTimeout.

import { SubscriberManager } from
  '../../../pgadmin/static/js/SchemaView/hooks/useSchemaStateSubscriber';

describe('SubscriberManager.signal', () => {
  test('fires the callback once per signal', () => {
    const cb = jest.fn();
    const mgr = new SubscriberManager(cb);
    mgr.signal();
    expect(cb).toHaveBeenCalledTimes(1);
  });

  test('PRESERVES existing subscriptions (does not auto-tear-down)', () => {
    const cb = jest.fn();
    const mgr = new SubscriberManager(cb);
    const unsub = jest.fn();
    mgr._add(unsub);
    expect(mgr.unsubscribers.size).toBe(1);

    mgr.signal();

    expect(mgr.unsubscribers.size).toBe(1);
    expect(unsub).not.toHaveBeenCalled();
  });

  test('batches: second signal before mount() is a no-op', () => {
    const cb = jest.fn();
    const mgr = new SubscriberManager(cb);
    mgr.signal();
    mgr.signal();
    expect(cb).toHaveBeenCalledTimes(1);
  });

  test('mount() re-arms for the next signal', () => {
    const cb = jest.fn();
    const mgr = new SubscriberManager(cb);
    mgr.signal();
    mgr.mount();
    mgr.signal();
    expect(cb).toHaveBeenCalledTimes(2);
  });
});

describe('SubscriberManager.release', () => {
  test('synchronously tears down all subscriptions and empties the set', () => {
    const cb = jest.fn();
    const mgr = new SubscriberManager(cb);
    const u1 = jest.fn();
    const u2 = jest.fn();
    mgr._add(u1);
    mgr._add(u2);

    mgr.release();

    expect(u1).toHaveBeenCalled();
    expect(u2).toHaveBeenCalled();
    expect(mgr.unsubscribers.size).toBe(0);
  });
});
