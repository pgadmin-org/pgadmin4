//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

import * as keyboardShortcuts from 'sources/keyboard_shortcuts';
import $ from 'jquery';

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
    let dockerSpy = {
      '_focusFrame': {
        '_curTab': 0,
        '_panelList': [
          {$container: $('<b/>'), '_type': 'type1', 'focus': function() {return true;}},
          {$container: $('<b/>'), '_type': 'type2', 'focus': function() {return true;}},
        ],
      },
    };
    it('right key', function () {
      dockerSpy._focusFrame._curTab = 0;
      expect(keyboardShortcuts.focusDockerPanel(dockerSpy, 'right')).toEqual('type2');
    });
    it('left key', function () {
      dockerSpy._focusFrame._curTab = 1;
      expect(keyboardShortcuts.focusDockerPanel(dockerSpy, 'left')).toEqual('type1');
    });
    it('left key cycle', function () {
      dockerSpy._focusFrame._curTab = 0;
      expect(keyboardShortcuts.focusDockerPanel(dockerSpy, 'left')).toEqual('type2');
    });
    it('right key cycle', function () {
      dockerSpy._focusFrame._curTab = 1;
      expect(keyboardShortcuts.focusDockerPanel(dockerSpy, 'left')).toEqual('type1');
    });
  });


});
