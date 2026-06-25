/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Tests for DepListener — both synchronous getDepChange and the async
// getDeferredDepChange path. Includes the prefix-match safety rule
// (matching "shared" should NOT also match "shared_username").

import { DepListener } from
  '../../../pgadmin/static/js/SchemaView/DepListener';

describe('DepListener — prefix-match protection', () => {
  test('getDepChange does NOT match `shared` listener when currPath is `shared_username`', () => {
    const d = new DepListener();
    const cb = jest.fn(() => ({}));
    d.addDepListener(['shared'], ['shared'], cb);

    d.getDepChange(['shared_username'], { shared: 'x' }, {});

    expect(cb).not.toHaveBeenCalled();
  });

  test('getDeferredDepChange does NOT match `shared` listener when currPath is `shared_username`', () => {
    const d = new DepListener();
    const defCb = jest.fn(() => Promise.resolve(() => ({})));
    d.addDepListener(['shared'], ['shared'], null, defCb);

    const result = d.getDeferredDepChange(['shared_username'], { shared: 'x' }, {});

    expect(defCb).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  test('getDeferredDepChange DOES match when source is a true prefix (`shared` matches `shared.sub`)', () => {
    const d = new DepListener();
    const defCb = jest.fn(() => Promise.resolve(() => ({})));
    d.addDepListener(['shared'], ['shared'], null, defCb);

    const result = d.getDeferredDepChange(['shared', 'sub'], { shared: { sub: 1 } }, {});

    expect(defCb).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
  });

  test('getDeferredDepChange matches exact same path', () => {
    const d = new DepListener();
    const defCb = jest.fn(() => Promise.resolve(() => ({})));
    d.addDepListener(['shared'], ['shared'], null, defCb);

    const result = d.getDeferredDepChange(['shared'], { shared: 'x' }, {});

    expect(defCb).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
  });
});

// Behaviors the planned optimization needs to preserve. These run GREEN
// against the current implementation (characterization) and must remain
// GREEN after the refactor.
describe('DepListener — callback-vs-defCallback dispatch', () => {
  test('getDepChange invokes only the sync callback, never defCallback', () => {
    const d = new DepListener();
    const cb = jest.fn(() => ({}));
    const defCb = jest.fn(() => Promise.resolve(() => ({})));
    d.addDepListener(['a'], ['x'], cb, defCb);

    d.getDepChange(['a'], { a: 1 }, {});

    expect(cb).toHaveBeenCalledTimes(1);
    expect(defCb).not.toHaveBeenCalled();
  });

  test('getDeferredDepChange invokes only defCallback, never sync callback', () => {
    const d = new DepListener();
    const cb = jest.fn(() => ({}));
    const defCb = jest.fn(() => Promise.resolve(() => ({})));
    d.addDepListener(['a'], ['x'], cb, defCb);

    const result = d.getDeferredDepChange(['a'], { a: 1 }, {});

    expect(defCb).toHaveBeenCalledTimes(1);
    expect(cb).not.toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });

  test('getDeferredDepChange returns [] when no listener has a defCallback (sync-only registrations)', () => {
    const d = new DepListener();
    const cb1 = jest.fn(() => ({}));
    const cb2 = jest.fn(() => ({}));
    d.addDepListener(['a'], ['x'], cb1);
    d.addDepListener(['b'], ['y'], cb2);

    const result = d.getDeferredDepChange(['a'], { a: 1 }, {});

    expect(result).toEqual([]);
    expect(cb1).not.toHaveBeenCalled();
    expect(cb2).not.toHaveBeenCalled();
  });

  test('getDeferredDepChange returns [] when there are no listeners at all', () => {
    const d = new DepListener();
    const result = d.getDeferredDepChange(['anything'], {}, {});
    expect(result).toEqual([]);
  });

  test('skipping a non-matching listener does not block a later matching one', () => {
    const d = new DepListener();
    const defCbA = jest.fn(() => Promise.resolve(() => ({})));
    const defCbB = jest.fn(() => Promise.resolve(() => ({})));
    d.addDepListener(['a'], ['x'], null, defCbA);
    d.addDepListener(['b'], ['y'], null, defCbB);

    const result = d.getDeferredDepChange(['b'], { a: 1, b: 2 }, {});

    expect(defCbA).not.toHaveBeenCalled();
    expect(defCbB).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
  });

  test('multiple matching listeners all fire, in registration order', () => {
    const d = new DepListener();
    const order = [];
    const defCb1 = jest.fn(() => { order.push(1); return Promise.resolve(() => ({})); });
    const defCb2 = jest.fn(() => { order.push(2); return Promise.resolve(() => ({})); });
    d.addDepListener(['shared'], ['x'], null, defCb1);
    d.addDepListener(['shared'], ['y'], null, defCb2);

    const result = d.getDeferredDepChange(['shared'], { shared: 1 }, {});

    expect(result).toHaveLength(2);
    expect(order).toEqual([1, 2]);
  });

  test('defCallback that returns falsy is skipped (no entry pushed to deferredList)', () => {
    const d = new DepListener();
    const defCb = jest.fn(() => undefined);
    d.addDepListener(['a'], ['x'], null, defCb);

    const result = d.getDeferredDepChange(['a'], { a: 1 }, {});

    expect(defCb).toHaveBeenCalledTimes(1);
    expect(result).toEqual([]);
  });
});

describe('DepListener — early-bail when no defCallbacks registered', () => {
  // Builds a `source` array that traps access only AFTER registration
  // completes. Lets the implementation legitimately pre-compute join
  // keys at add time, while flagging any subsequent walk that touches
  // the array during getDeferredDepChange.
  const makeTrippedSource = (segments) => {
    const target = [...segments];
    let armed = false;
    const proxy = new Proxy(target, {
      get(t, prop) {
        if (armed && (prop === 'concat' || prop === 'join'
            || prop === 'length' || /^\d+$/.test(prop))) {
          throw new Error(
            'listener.source was iterated during getDeferredDepChange '
            + 'despite having no defCallback'
          );
        }
        return t[prop];
      },
    });
    return { proxy, arm: () => { armed = true; } };
  };

  test('getDeferredDepChange does not iterate listener.source when no defCallbacks are registered', () => {
    const d = new DepListener();
    const t = makeTrippedSource(['a']);
    d.addDepListener(t.proxy, ['x'], jest.fn(() => ({})));
    t.arm();

    const result = d.getDeferredDepChange(['anything'], {}, {});
    expect(result).toEqual([]);
  });

  test('after removing the last defCallback listener, the early-bail engages', () => {
    const d = new DepListener();
    const defCb = jest.fn(() => Promise.resolve(() => ({})));
    d.addDepListener(['a'], ['onlydef'], null, defCb);
    d.removeDepListener(['onlydef']);

    const t = makeTrippedSource(['b']);
    d.addDepListener(t.proxy, ['syncOnly'], jest.fn(() => ({})));
    t.arm();

    const result = d.getDeferredDepChange(['anything'], {}, {});
    expect(result).toEqual([]);
  });
});

describe('DepListener — source-array mutation isolation', () => {
  // Pins the defensive-copy contract: a caller that re-uses (and
  // mutates) its source array after `addDepListener` should not be
  // able to corrupt the listener's source path (which is passed to
  // the callback). The cached _sourceKey is already a string snapshot
  // and resistant to mutation; this test guards listener.source too.
  test('mutating the caller-side source array after registration does not affect listener.source seen by the callback', () => {
    const d = new DepListener();
    const source = ['a', 'b'];
    const defCb = jest.fn(() => Promise.resolve(() => ({})));
    d.addDepListener(source, ['dest'], null, defCb);

    // Mutate the original array AFTER registration.
    source.push('mutated');
    source[0] = 'tampered';

    d.getDeferredDepChange(['a', 'b'], {}, {});
    expect(defCb).toHaveBeenCalledTimes(1);
    // The second arg to defCb is listener.source. The defensive copy
    // means it still shows the originally-registered path, not the
    // mutated one.
    const [, sourceArg] = defCb.mock.calls[0];
    expect(sourceArg).toEqual(['a', 'b']);
  });
});

describe('DepListener — removeDepListener', () => {
  test('removeDepListener drops only listeners whose dest is prefixed by the given path', () => {
    const d = new DepListener();
    const defCbKeep = jest.fn(() => Promise.resolve(() => ({})));
    const defCbDrop = jest.fn(() => Promise.resolve(() => ({})));
    d.addDepListener(['a'], ['keep'], null, defCbKeep);
    d.addDepListener(['a'], ['drop', 'sub'], null, defCbDrop);

    d.removeDepListener(['drop']);

    const result = d.getDeferredDepChange(['a'], { a: 1 }, {});
    expect(defCbKeep).toHaveBeenCalledTimes(1);
    expect(defCbDrop).not.toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });

  test('removeDepListener leaves the deferred path functional when remaining listeners still have defCallbacks', () => {
    const d = new DepListener();
    const defCb = jest.fn(() => Promise.resolve(() => ({})));
    d.addDepListener(['a'], ['drop'], null, defCb);
    d.addDepListener(['b'], ['keep'], null, defCb);

    d.removeDepListener(['drop']);

    const result = d.getDeferredDepChange(['b'], { b: 1 }, {});
    expect(result).toHaveLength(1);
  });

  test('after removing the last defCallback-bearing listener, getDeferredDepChange returns []', () => {
    const d = new DepListener();
    const defCb = jest.fn(() => Promise.resolve(() => ({})));
    d.addDepListener(['a'], ['onlydef'], null, defCb);
    d.addDepListener(['b'], ['syncOnly'], jest.fn(() => ({})));

    d.removeDepListener(['onlydef']);

    const result = d.getDeferredDepChange(['a'], { a: 1 }, {});
    expect(result).toEqual([]);
    expect(defCb).not.toHaveBeenCalled();
  });
});
