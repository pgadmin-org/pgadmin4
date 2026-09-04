/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Characterization + contract tests for AzureCredSchema's
// is_authenticating deferredDepChange.

import { AzureCredSchema } from
  '../../../pgadmin/misc/cloud/static/js/azure_schema.ui';
import pgAdmin from '../fake_pgadmin';

const getIsAuthenticatingField = (cred) => {
  const field = cred.baseFields.find((f) => f.id === 'is_authenticating');
  expect(field).toBeDefined();
  expect(typeof field.deferredDepChange).toBe('function');
  return field.deferredDepChange.bind(cred);
};

describe('AzureCredSchema is_authenticating deferredDepChange', () => {
  let cred, defChange, authCodeMock;

  beforeEach(() => {
    authCodeMock = jest.fn();
    cred = new AzureCredSchema(null, { getAuthCode: () => authCodeMock() });
    defChange = getIsAuthenticatingField(cred);
  });

  // Source is passed by the schema framework as an *array* (the path
  // to the field that changed) — e.g. ['auth_btn'] for a top-level
  // field, or ['parent', 'auth_btn'] when the schema is embedded in a
  // nested context. The earlier tests passed a bare string which
  // happened to compare equal-by-coercion against 'auth_btn' for a
  // single-element array but doesn't reflect production shape.

  // ---- Happy path (characterization — must hold before AND after refactor) -

  test('matching trigger + getAuthCode resolves → callback returns auth_code delta', async () => {
    authCodeMock.mockResolvedValue({
      data: { data: { user_code: 'ABC-123' } },
    });
    const result = defChange(
      { auth_type: 'interactive_browser_credential', is_authenticating: true },
      ['auth_btn'],
    );
    expect(result).toBeInstanceOf(Promise);
    const cb = await result;
    expect(typeof cb).toBe('function');
    expect(cb()).toEqual({ is_authenticating: false, auth_code: 'ABC-123' });
  });

  test('matching trigger when embedded in a nested path (source ends in auth_btn) still proceeds', async () => {
    // Regression: the legacy guard `source != "auth_btn"` worked by
    // single-element-array coercion. With a nested source like
    // ['parent', 'auth_btn'], the array coerces to 'parent,auth_btn'
    // and the guard fired wrongly, opting out of the auth flow. The
    // fix compares against the LAST path segment.
    authCodeMock.mockResolvedValue({
      data: { data: { user_code: 'XYZ-789' } },
    });
    const result = defChange(
      { auth_type: 'interactive_browser_credential', is_authenticating: true },
      ['parent', 'auth_btn'],
    );
    expect(result).toBeInstanceOf(Promise);
    const cb = await result;
    expect(cb()).toEqual({ is_authenticating: false, auth_code: 'XYZ-789' });
  });

  test('matching trigger + getAuthCode rejects → recovers via notifier.error + resolves with reset callback', async () => {
    // Updated contract: instead of rejecting (which the drain swallows
    // into console.error with zero user feedback and leaves
    // is_authenticating stuck true), the schema now surfaces the error
    // via the notifier and resolves with a callback that resets
    // is_authenticating so the UI unblocks.
    const errorSpy = jest.spyOn(pgAdmin.Browser.notifier, 'error')
      .mockImplementation(() => {});
    authCodeMock.mockRejectedValue(new Error('upstream failure'));

    const result = defChange(
      { auth_type: 'interactive_browser_credential', is_authenticating: true },
      ['auth_btn'],
    );
    expect(result).toBeInstanceOf(Promise);

    const cb = await result;
    expect(typeof cb).toBe('function');
    // Also clears any stale auth_code from a prior successful attempt.
    // Otherwise the user would see "still authenticated" UI alongside
    // the failure toast, which is misleading.
    expect(cb()).toEqual({ is_authenticating: false, auth_code: null });
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0][0]).toMatch(/upstream failure/);

    errorSpy.mockRestore();
  });

  // ---- NEW contract: non-matching trigger returns undefined --------------

  test('source other than auth_btn → returns undefined (was a hung Promise)', () => {
    const result = defChange(
      { auth_type: 'interactive_browser_credential', is_authenticating: true },
      ['some_other_field'],
    );
    expect(result).toBeUndefined();
    expect(authCodeMock).not.toHaveBeenCalled();
  });

  test('auth_type not interactive_browser_credential → returns undefined', () => {
    const result = defChange(
      { auth_type: 'service_principal_credential', is_authenticating: true },
      ['auth_btn'],
    );
    expect(result).toBeUndefined();
    expect(authCodeMock).not.toHaveBeenCalled();
  });

  test('is_authenticating false → returns undefined', () => {
    const result = defChange(
      { auth_type: 'interactive_browser_credential', is_authenticating: false },
      ['auth_btn'],
    );
    expect(result).toBeUndefined();
    expect(authCodeMock).not.toHaveBeenCalled();
  });
});
