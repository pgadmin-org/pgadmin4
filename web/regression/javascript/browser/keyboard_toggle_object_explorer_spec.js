/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// keyboard.js reaches pgadmin.js by relative path, which skips the
// sources/pgadmin alias that maps to the fake, so point it there explicitly.
jest.mock('../../../pgadmin/static/js/pgadmin', () =>
  jest.requireActual('../fake_pgadmin'));

import pgAdmin from 'sources/pgadmin';
import { TOGGLE_OBJECT_EXPLORER_EVENT } from
  '../../../pgadmin/browser/static/js/constants';
import '../../../pgadmin/browser/static/js/keyboard';

/* The shortcut does not own the visibility state, the workspace provider
 * does, so all it has to do is say what the user asked for. */
describe('keyboardNavigation.bindToggleObjectExplorer', () => {
  it('asks the workspace provider to toggle the Object Explorer',
    async () => {
      const listener = jest.fn();
      const dereg = pgAdmin.Browser.Events.registerListener(
        TOGGLE_OBJECT_EXPLORER_EVENT, listener);

      try {
        pgAdmin.Browser.keyboardNavigation.bindToggleObjectExplorer();
        // EventBus dispatches through a couple of microtasks, so wait for a
        // macrotask to be sure they have all run.
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(listener).toHaveBeenCalled();
      } finally {
        dereg();
      }
    });
});
