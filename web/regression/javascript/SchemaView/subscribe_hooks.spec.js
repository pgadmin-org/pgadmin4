/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Tests that useFieldValue / useFieldOptions / useFieldError pin their
// useEffect dependencies so they don't re-add a subscription on every
// render.

import { renderHook } from '@testing-library/react';

import { useFieldValue } from
  '../../../pgadmin/static/js/SchemaView/hooks/useFieldValue';
import { useFieldOptions } from
  '../../../pgadmin/static/js/SchemaView/hooks/useFieldOptions';
import { useFieldError } from
  '../../../pgadmin/static/js/SchemaView/hooks/useFieldError';

const fakeState = () => ({
  value: () => 'v',
  options: () => ({}),
  errors: { name: null, message: null },
  subscribe: () => () => {},
});

const makeManager = () => {
  const add = jest.fn(() => () => {});
  return { add, ref: { current: { add, signal: () => {} } } };
};

const stablePath = ['rows', 0, 'name'];

describe('useFieldValue — useEffect re-subscribe behaviour', () => {
  test('subscribes once across multiple stable re-renders', () => {
    const state = fakeState();
    const mgr = makeManager();

    const { rerender } = renderHook(
      ({ path }) => useFieldValue(path, state, mgr.ref),
      { initialProps: { path: stablePath } }
    );
    rerender({ path: stablePath });
    rerender({ path: stablePath });
    rerender({ path: stablePath });

    expect(mgr.add).toHaveBeenCalledTimes(1);
  });

  test('NEGATIVE — re-subscribes when path changes', () => {
    const state = fakeState();
    const mgr = makeManager();

    const { rerender } = renderHook(
      ({ path }) => useFieldValue(path, state, mgr.ref),
      { initialProps: { path: ['rows', 0, 'name'] } }
    );
    rerender({ path: ['rows', 1, 'name'] });
    rerender({ path: ['rows', 2, 'name'] });

    expect(mgr.add).toHaveBeenCalledTimes(3);
  });
});

describe('useFieldOptions — useEffect re-subscribe behaviour', () => {
  test('subscribes once across multiple stable re-renders', () => {
    const state = fakeState();
    const mgr = makeManager();

    const { rerender } = renderHook(
      ({ path }) => useFieldOptions(path, state, mgr.ref),
      { initialProps: { path: stablePath } }
    );
    rerender({ path: stablePath });
    rerender({ path: stablePath });

    expect(mgr.add).toHaveBeenCalledTimes(1);
  });

  test('NEGATIVE — re-subscribes when path changes', () => {
    const state = fakeState();
    const mgr = makeManager();

    const { rerender } = renderHook(
      ({ path }) => useFieldOptions(path, state, mgr.ref),
      { initialProps: { path: ['rows', 0] } }
    );
    rerender({ path: ['rows', 1] });
    expect(mgr.add).toHaveBeenCalledTimes(2);
  });
});

describe('useFieldError — useEffect re-subscribe behaviour', () => {
  test('subscribes once across multiple stable re-renders', () => {
    const state = fakeState();
    const mgr = makeManager();

    const { rerender } = renderHook(
      ({ path }) => useFieldError(path, state, mgr.ref),
      { initialProps: { path: stablePath } }
    );
    rerender({ path: stablePath });
    rerender({ path: stablePath });

    expect(mgr.add).toHaveBeenCalledTimes(1);
  });
});
