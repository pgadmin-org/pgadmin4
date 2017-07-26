//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2017, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

import keyboardShortcuts from 'sources/sqleditor/keyboard_shortcuts';

describe('the keyboard shortcuts', () => {
  const F1_KEY = 112,
    F5_KEY = 116,
    F7_KEY = 118,
    F8_KEY = 119,
    PERIOD_KEY = 190,
    FWD_SLASH_KEY = 191,
    isMacSystem = window.navigator.platform.search('Mac') != -1;

  let sqlEditorControllerSpy;
  let event;
  beforeEach(() => {
    event = {
      shift: false,
      which: undefined,
      preventDefault: jasmine.createSpy('preventDefault'),
      cancelBubble: false,
      stopPropagation: jasmine.createSpy('stopPropagation'),
      stopImmediatePropagation: jasmine.createSpy('stopImmediatePropagation'),
    };

    sqlEditorControllerSpy = jasmine.createSpyObj('SqlEditorController', [
      'isQueryRunning',
      'download',
      'explain',
      'explainAnalyze',
      'executeQuery',
      'commentLineCode',
      'uncommentLineCode',
      'commentBlockCode',
    ]);
  });

  describe('when the key is not handled by the function', function () {

    beforeEach(() => {
      event.which = F1_KEY;
      keyboardShortcuts.processEvent(sqlEditorControllerSpy, event);
    });

    it('should allow event to propagate', () => {
      expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });

  describe('F5', () => {
    describe('when there is no query already running', () => {
      beforeEach(() => {
        event.keyCode = F5_KEY;
        keyboardShortcuts.processEvent(sqlEditorControllerSpy, event);
      });

      it('should execute the query', () => {
        expect(sqlEditorControllerSpy.executeQuery).toHaveBeenCalled();
      });

      it('should stop event propagation', () => {
        expect(event.preventDefault).toHaveBeenCalled();
      });
    });

    describe('when the query is already running', () => {
      it('does nothing', () => {
        event.keyCode = F5_KEY;
        sqlEditorControllerSpy.isQueryRunning.and.returnValue(true);

        keyboardShortcuts.processEvent(sqlEditorControllerSpy, event);

        expect(sqlEditorControllerSpy.executeQuery).not.toHaveBeenCalled();
      });
    });
  });

  describe('F7', () => {
    describe('when there is not a query already running', () => {
      beforeEach(() => {
        event.which = F7_KEY;
        keyboardShortcuts.processEvent(sqlEditorControllerSpy, event);
      });

      it('should explain the query plan', () => {
        expect(sqlEditorControllerSpy.explain).toHaveBeenCalledWith(event);
      });

      expectEventPropagationToStop();
    });

    describe('when the query is already running', () => {
      it('does nothing', () => {
        event.keyCode = F7_KEY;
        sqlEditorControllerSpy.isQueryRunning.and.returnValue(true);

        keyboardShortcuts.processEvent(sqlEditorControllerSpy, event);

        expect(sqlEditorControllerSpy.explain).not.toHaveBeenCalled();
      });
    });
  });

  describe('Shift+F7', () => {
    describe('when therre is not a query already running', () => {
      beforeEach(() => {
        event.shiftKey = true;
        event.which = F7_KEY;
        keyboardShortcuts.processEvent(sqlEditorControllerSpy, event);
      });

      it('should analyze explain the query plan', () => {
        expect(sqlEditorControllerSpy.explainAnalyze).toHaveBeenCalledWith(event);
      });

      expectEventPropagationToStop();
    });

    describe('when the query is already running', () => {
      it('does nothing', () => {
        event.shiftKey = true;
        event.which = F7_KEY;
        sqlEditorControllerSpy.isQueryRunning.and.returnValue(true);

        keyboardShortcuts.processEvent(sqlEditorControllerSpy, event);

        expect(sqlEditorControllerSpy.explainAnalyze).not.toHaveBeenCalled();
      });
    });
  });

  describe('F8', () => {
    describe('when there is not a query already running', () => {
      beforeEach(() => {
        event.which = F8_KEY;
        keyboardShortcuts.processEvent(sqlEditorControllerSpy, event);
      });

      it('should download the query results as a CSV', () => {
        expect(sqlEditorControllerSpy.download).toHaveBeenCalled();
      });

      it('should stop event propagation', () => {
        expect(event.preventDefault).toHaveBeenCalled();
      });
    });

    describe('when the query is already running', () => {
      it('does nothing', () => {
        event.keyCode = F8_KEY;
        sqlEditorControllerSpy.isQueryRunning.and.returnValue(true);

        keyboardShortcuts.processEvent(sqlEditorControllerSpy, event);

        expect(sqlEditorControllerSpy.download).not.toHaveBeenCalled();
      });
    });
  });

  describe('inlineComment', () => {
    describe('when there is not a query already running', () => {
      beforeEach(() => {
        event.metaKey = isMacSystem;
        event.shiftKey = true;
        event.ctrlKey = !isMacSystem;
        event.which = FWD_SLASH_KEY;
        keyboardShortcuts.processEvent(sqlEditorControllerSpy, event);
      });

      it('should comment the line', () => {
        expect(sqlEditorControllerSpy.commentLineCode).toHaveBeenCalled();
      });

      expectEventPropagationToStop();
    });

    describe('when the query is already running', () => {
      it('does nothing', () => {
        event.shiftKey = isMacSystem;
        event.ctrlKey = !isMacSystem;
        event.which = FWD_SLASH_KEY;
        sqlEditorControllerSpy.isQueryRunning.and.returnValue(true);

        keyboardShortcuts.processEvent(sqlEditorControllerSpy, event);

        expect(sqlEditorControllerSpy.commentLineCode).not.toHaveBeenCalled();
      });
    });
  });

  describe('inlineUncomment', () => {
    describe('when there is not a query already running', () => {
      beforeEach(() => {
        event.metaKey = isMacSystem;
        event.shiftKey = true;
        event.ctrlKey = !isMacSystem;
        event.which = PERIOD_KEY;
        keyboardShortcuts.processEvent(sqlEditorControllerSpy, event);
      });

      it('should uncomment the line', () => {
        expect(sqlEditorControllerSpy.uncommentLineCode).toHaveBeenCalled();
      });

      expectEventPropagationToStop();
    });

    describe('when the query is already running', () => {
      it('does nothing', () => {
        event.metaKey = isMacSystem;
        event.shiftKey = true;
        event.ctrlKey = !isMacSystem;
        event.which = PERIOD_KEY;
        sqlEditorControllerSpy.isQueryRunning.and.returnValue(true);

        keyboardShortcuts.processEvent(sqlEditorControllerSpy, event);

        expect(sqlEditorControllerSpy.uncommentLineCode).not.toHaveBeenCalled();
      });
    });
  });

  describe('blockComment', () => {
    describe('when there is not a query already running', () => {
      beforeEach(() => {
        event.metaKey = isMacSystem;
        event.ctrlKey = !isMacSystem;
        event.which = FWD_SLASH_KEY;
        keyboardShortcuts.processEvent(sqlEditorControllerSpy, event);
      });

      it('should comment a block of code', () => {
        expect(sqlEditorControllerSpy.commentBlockCode).toHaveBeenCalled();
      });

      expectEventPropagationToStop();
    });

    describe('when the query is already running', () => {
      it('does nothing', () => {
        event.metaKey = isMacSystem;
        event.ctrlKey = !isMacSystem;
        event.which = FWD_SLASH_KEY;
        sqlEditorControllerSpy.isQueryRunning.and.returnValue(true);

        keyboardShortcuts.processEvent(sqlEditorControllerSpy, event);

        expect(sqlEditorControllerSpy.commentBlockCode).not.toHaveBeenCalled();
      });
    });
  });

  function expectEventPropagationToStop() {
    describe('stops all event propogation', () => {

      it('should cancel the bubble', () => {
        expect(event.cancelBubble).toBe(true);
      });

      it('should prevent the default behavior', () => {
        expect(event.preventDefault).toHaveBeenCalled();
      });

      it('should stop event propagation', () => {
        expect(event.stopPropagation).toHaveBeenCalled();
        expect(event.stopImmediatePropagation).toHaveBeenCalled();
      });
    });
  }
});
