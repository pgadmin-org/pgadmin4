/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Only the key handler is under test, so keep keyboard.js and xterm, which
// wants a canvas jsdom does not have, out of the way.
jest.mock('pgadmin.browser.keyboard', () => ({}));
jest.mock('@xterm/xterm', () => ({Terminal: jest.fn()}));

import { psql_terminal_io } from
  '../../../pgadmin/tools/psql/static/js/components/PsqlComponent';

// A pgAdmin shortcut pressed in the PSQL terminal is passed to the main
// window once, on keydown, and kept from xterm so that psql does not also
// receive it as terminal input (issue #7232).
describe('psql_terminal_io key handler', () => {
  let keyHandler;
  let broadcast;

  beforeEach(() => {
    broadcast = jest.fn((e) => e.key === 'PageDown');
    window.pgAdmin = {Browser: {keyboardNavigation: {
      triggerIframeEventsBroadcast: broadcast,
    }}};
    const term = {
      attachCustomKeyEventHandler: (fn) => { keyHandler = fn; },
      textarea: {addEventListener: jest.fn()},
      onKey: jest.fn(),
    };
    psql_terminal_io(term, {emit: jest.fn()}, 'linux', window.pgAdmin);
  });

  afterEach(() => {
    delete window.pgAdmin;
  });

  const keyEvent = (type, key) => ({
    type, key, ctrlKey: true, altKey: true, stopPropagation: jest.fn(),
  });

  it('consumes a pgAdmin shortcut on keydown', () => {
    expect(keyHandler(keyEvent('keydown', 'PageDown'))).toBe(false);
    expect(broadcast).toHaveBeenCalledTimes(1);
  });

  it('does not pass the shortcut on again on keyup', () => {
    keyHandler(keyEvent('keyup', 'PageDown'));
    expect(broadcast).not.toHaveBeenCalled();
  });

  it('leaves other keys to xterm', () => {
    expect(keyHandler(keyEvent('keydown', 'x'))).toBe(true);
  });
});
