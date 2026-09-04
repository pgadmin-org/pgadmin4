/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Tests that the deferredDepChange queue drains follow the protocol:
//   - Rejected promises don't silently disappear; they're surfaced
//     to the user via pgAdmin.Browser.notifier.error.
//   - When the resolved value isn't a function, we warn (console) and
//     skip the dispatch instead of submitting a broken listener.

import { drainDeferredQueue } from
  '../../../pgadmin/static/js/SchemaView/hooks/useSchemaState';
import pgAdmin from '../fake_pgadmin';

describe('drainDeferredQueue — protocol guards', () => {
  let warnSpy, notifierSpy;
  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    notifierSpy = jest.spyOn(pgAdmin.Browser.notifier, 'error')
      .mockImplementation(() => {});
  });
  afterEach(() => {
    warnSpy.mockRestore();
    notifierSpy.mockRestore();
  });

  test('dispatches DEFERRED_DEPCHANGE when promise resolves to a function', async () => {
    const dispatch = jest.fn();
    const cb = () => ({});
    const item = {
      action: { path: ['x'], depChange: () => {} },
      listener: { source: ['x'], dest: ['x'] },
      promise: Promise.resolve(cb),
    };
    drainDeferredQueue([item], dispatch);
    await item.promise;
    await Promise.resolve();
    expect(dispatch).toHaveBeenCalledTimes(1);
    const call = dispatch.mock.calls[0][0];
    expect(call.type).toBe('deferred_depchange');
    expect(call.listener.callback).toBe(cb);
  });

  test('SKIPS dispatch and console.errors when promise resolves to a NON-function', async () => {
    // Protocol violation: schema author resolved with a data object
    // instead of a callback. We surface this loudly via console.error
    // (not warn) so it trips test suites and is more likely to be
    // caught in dev/QA. Notifier toast would be wrong here — this is
    // a code bug, not a user-actionable failure.
    console.error.mockImplementation(() => {});
    const dispatch = jest.fn();
    const item = {
      action: { path: ['x'], depChange: () => {} },
      listener: { source: ['x'], dest: ['x'] },
      promise: Promise.resolve({ x: 1 }),
    };
    drainDeferredQueue([item], dispatch);
    await item.promise;
    await Promise.resolve();
    expect(dispatch).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
    expect(console.error.mock.calls[0][0])
      .toMatch(/must resolve to a callback function/);
    // Clear so the global afterEach doesn't trip on our intentional
    // error invocation.
    console.error.mockClear();
  });

  test('surfaces rejected promises to the user via notifier.error', async () => {
    const dispatch = jest.fn();
    const err = new Error('boom');
    const item = {
      action: { path: ['x'], depChange: () => {} },
      listener: { source: ['x'], dest: ['x'] },
      promise: Promise.reject(err),
    };
    drainDeferredQueue([item], dispatch);
    // Wait for the rejection's .catch chain to fire.
    await new Promise((res) => setTimeout(res, 0));
    expect(dispatch).not.toHaveBeenCalled();
    expect(notifierSpy).toHaveBeenCalledTimes(1);
    // The error message should include the original error's text.
    expect(notifierSpy.mock.calls[0][0]).toMatch(/boom/);
  });

  test('falls back to console.error when notifier is unavailable', async () => {
    // Edge case: pgAdmin.Browser.notifier could be missing during
    // very early init or in test harnesses that haven't installed it.
    // The rejection still needs to be surfaced — silent no-op would
    // recreate the bug this commit fixed.
    // setup-jest.js already spies console.error; mock it for this test
    // and clear before the global afterEach asserts non-call.
    console.error.mockImplementation(() => {});
    const savedNotifier = pgAdmin.Browser.notifier;
    pgAdmin.Browser.notifier = undefined;

    try {
      const dispatch = jest.fn();
      const item = {
        action: { path: ['x'], depChange: () => {} },
        listener: { source: ['x'], dest: ['x'] },
        promise: Promise.reject(new Error('boom-no-notifier')),
      };
      drainDeferredQueue([item], dispatch);
      await new Promise((res) => setTimeout(res, 0));
      expect(console.error).toHaveBeenCalled();
      expect(console.error.mock.calls[0].join(' '))
        .toMatch(/boom-no-notifier/);
    } finally {
      pgAdmin.Browser.notifier = savedNotifier;
      // Reset so the global afterEach doesn't trip on our intentional
      // error invocation.
      console.error.mockClear();
    }
  });
});
