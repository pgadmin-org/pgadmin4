//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2018, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

import keyboardShortcuts from 'sources/keyboard_shortcuts';

describe('the keyboard shortcuts', () => {
  const F1_KEY = 112;

  let debuggerElementSpy, event, debuggerUserShortcutSpy;
  debuggerUserShortcutSpy = jasmine.createSpyObj(
    'userDefinedShortcuts', [
      { 'edit_grid_keys': null },
      { 'next_panel_keys': null },
      { 'previous_panel_keys': null },
    ]
  );
  beforeEach(() => {
    event = {
      shift: false,
      which: undefined,
      preventDefault: jasmine.createSpy('preventDefault'),
      cancelBubble: false,
      stopPropagation: jasmine.createSpy('stopPropagation'),
      stopImmediatePropagation: jasmine.createSpy('stopImmediatePropagation'),
    };
  });

  describe('when the key is not handled by the function', function () {
    beforeEach(() => {
      event.which = F1_KEY;
      keyboardShortcuts.processEventDebugger(
        debuggerElementSpy, event, debuggerUserShortcutSpy
      );
    });

    it('should allow event to propagate', () => {
      expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });

  describe('when user wants to goto next panel', function () {

    it('returns panel id', function () {
      expect(keyboardShortcuts.getInnerPanel(debuggerElementSpy, 'right')).toEqual(false);
    });
  });


});
