//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

import * as keyboardShortcuts from 'sources/keyboard_shortcuts';
import $ from 'jquery';

describe('the keyboard shortcuts', () => {
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
