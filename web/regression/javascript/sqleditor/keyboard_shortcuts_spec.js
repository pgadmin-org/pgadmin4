//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2017, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

import keyboardShortcuts from 'sources/sqleditor/keyboard_shortcuts';
import {queryToolActions} from 'sources/sqleditor/query_tool_actions';

describe('the keyboard shortcuts', () => {
  const F1_KEY = 112,
    F5_KEY = 116,
    F7_KEY = 118,
    F8_KEY = 119,
    PERIOD_KEY = 190,
    FWD_SLASH_KEY = 191;

  let sqlEditorControllerSpy, event, queryToolActionsSpy;
  beforeEach(() => {
    event = {
      shift: false,
      which: undefined,
      preventDefault: jasmine.createSpy('preventDefault'),
      cancelBubble: false,
      stopPropagation: jasmine.createSpy('stopPropagation'),
      stopImmediatePropagation: jasmine.createSpy('stopImmediatePropagation'),
    };

    let gridView = {
      query_tool_obj: {
        getSelection: jasmine.createSpy('getSelection'),
        getValue: jasmine.createSpy('getValue'),
      },
    };

    sqlEditorControllerSpy = jasmine.createSpyObj('SqlEditorController', [
      'isQueryRunning',
      'execute',
    ]);

    sqlEditorControllerSpy.gridView = gridView;
    queryToolActionsSpy = jasmine.createSpyObj(queryToolActions, [
      'explainAnalyze',
      'explain',
      'download',
      'commentBlockCode',
      'commentLineCode',
      'uncommentLineCode',
      'executeQuery',
    ]);
  });

  describe('when the key is not handled by the function', function () {

    beforeEach(() => {
      event.which = F1_KEY;
      keyboardShortcuts.processEvent(sqlEditorControllerSpy, queryToolActionsSpy, event);
    });

    it('should allow event to propagate', () => {
      expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });

  describe('F5', () => {
    describe('when there is no query already running', () => {
      beforeEach(() => {
        event.keyCode = F5_KEY;
        keyboardShortcuts.processEvent(sqlEditorControllerSpy, queryToolActionsSpy, event);
      });

      it('should execute the query', () => {
        expect(queryToolActionsSpy.executeQuery).toHaveBeenCalledWith(sqlEditorControllerSpy);
      });

      it('should stop event propagation', () => {
        expect(event.preventDefault).toHaveBeenCalled();
      });
    });

    describe('when the query is already running', () => {
      it('does nothing', () => {
        event.keyCode = F5_KEY;
        sqlEditorControllerSpy.isQueryRunning.and.returnValue(true);

        keyboardShortcuts.processEvent(sqlEditorControllerSpy, queryToolActionsSpy, event);

        expect(queryToolActionsSpy.executeQuery).not.toHaveBeenCalled();
      });
    });
  });

  describe('F7', () => {
    describe('when there is not a query already running', () => {
      beforeEach(() => {
        event.which = F7_KEY;
        keyboardShortcuts.processEvent(sqlEditorControllerSpy, queryToolActionsSpy, event);
      });

      it('should explain the query plan', () => {
        expect(queryToolActionsSpy.explain).toHaveBeenCalledWith(sqlEditorControllerSpy);
      });

      expectEventPropagationToStop();
    });

    describe('when the query is already running', () => {
      it('does nothing', () => {
        event.keyCode = F7_KEY;
        sqlEditorControllerSpy.isQueryRunning.and.returnValue(true);

        keyboardShortcuts.processEvent(sqlEditorControllerSpy, queryToolActionsSpy, event);

        expect(queryToolActionsSpy.explain).not.toHaveBeenCalled();
      });
    });
  });

  describe('Shift+F7', () => {
    describe('when there is not a query already running', () => {
      beforeEach(() => {
        event.shiftKey = true;
        event.which = F7_KEY;
        keyboardShortcuts.processEvent(sqlEditorControllerSpy, queryToolActionsSpy, event);
      });

      it('should analyze explain the query plan', () => {
        expect(queryToolActionsSpy.explainAnalyze).toHaveBeenCalledWith(sqlEditorControllerSpy);
      });

      expectEventPropagationToStop();
    });

    describe('when the query is already running', () => {
      it('does nothing', () => {
        event.shiftKey = true;
        event.which = F7_KEY;
        sqlEditorControllerSpy.isQueryRunning.and.returnValue(true);

        keyboardShortcuts.processEvent(sqlEditorControllerSpy, queryToolActionsSpy, event);

        expect(queryToolActionsSpy.explainAnalyze).not.toHaveBeenCalled();
      });
    });
  });

  describe('F8', () => {
    describe('when there is not a query already running', () => {
      beforeEach(() => {
        event.which = F8_KEY;
        keyboardShortcuts.processEvent(sqlEditorControllerSpy, queryToolActionsSpy, event);
      });

      it('should download the query results as a CSV', () => {
        expect(queryToolActionsSpy.download).toHaveBeenCalled();
      });

      it('should stop event propagation', () => {
        expect(event.preventDefault).toHaveBeenCalled();
      });
    });

    describe('when the query is already running', () => {
      it('does nothing', () => {
        event.keyCode = F8_KEY;
        sqlEditorControllerSpy.isQueryRunning.and.returnValue(true);

        keyboardShortcuts.processEvent(sqlEditorControllerSpy, queryToolActionsSpy, event);

        expect(queryToolActionsSpy.download).not.toHaveBeenCalled();
      });
    });
  });

  describe('inlineComment', () => {
    describe('when there is not a query already running', () => {
      describe('and the system is a Mac', () => {
        beforeEach(() => {
          macKeysSetup();
          event.which = FWD_SLASH_KEY;
          keyboardShortcuts.processEvent(sqlEditorControllerSpy, queryToolActionsSpy, event);
        });

        it('should comment the line', () => {
          expect(queryToolActionsSpy.commentLineCode).toHaveBeenCalledWith(sqlEditorControllerSpy);
        });

        expectEventPropagationToStop();
      });

      describe('and the system is Windows', () => {
        beforeEach(() => {
          windowsKeysSetup();
          event.which = FWD_SLASH_KEY;
          keyboardShortcuts.processEvent(sqlEditorControllerSpy, queryToolActionsSpy, event);
        });

        it('should comment the line', () => {
          expect(queryToolActionsSpy.commentLineCode).toHaveBeenCalledWith(sqlEditorControllerSpy);
        });

        expectEventPropagationToStop();
      });
    });

    describe('when the query is already running', () => {
      beforeEach(() => {
        sqlEditorControllerSpy.isQueryRunning.and.returnValue(true);
      });
      describe('and the system is a Mac', () => {
        beforeEach(() => {
          macKeysSetup();
          event.which = FWD_SLASH_KEY;
        });

        it('does nothing', () => {
          keyboardShortcuts.processEvent(sqlEditorControllerSpy, queryToolActionsSpy, event);

          expect(queryToolActionsSpy.commentLineCode).not.toHaveBeenCalled();
        });
      });

      describe('and the system is a Windows', () => {
        beforeEach(() => {
          windowsKeysSetup();
          event.which = FWD_SLASH_KEY;
        });

        it('does nothing', () => {
          keyboardShortcuts.processEvent(sqlEditorControllerSpy, queryToolActionsSpy, event);

          expect(queryToolActionsSpy.commentLineCode).not.toHaveBeenCalled();
        });
      });
    });
  });

  describe('inlineUncomment', () => {
    describe('when there is not a query already running', () => {
      describe('and the system is a mac', () => {
        beforeEach(() => {
          macKeysSetup();
          event.which = PERIOD_KEY;
          keyboardShortcuts.processEvent(sqlEditorControllerSpy, queryToolActionsSpy, event);
        });

        it('should uncomment the line', () => {
          expect(queryToolActionsSpy.uncommentLineCode).toHaveBeenCalledWith(sqlEditorControllerSpy);
        });

        expectEventPropagationToStop();
      });
      describe('and the system is a windows', () => {
        beforeEach(() => {
          windowsKeysSetup();
          event.which = PERIOD_KEY;
          keyboardShortcuts.processEvent(sqlEditorControllerSpy, queryToolActionsSpy, event);
        });

        it('should uncomment the line', () => {
          expect(queryToolActionsSpy.uncommentLineCode).toHaveBeenCalledWith(sqlEditorControllerSpy);
        });

        expectEventPropagationToStop();
      });
    });

    describe('when the query is already running', () => {
      beforeEach(() => {
        sqlEditorControllerSpy.isQueryRunning.and.returnValue(true);
      });
      describe('and the system is a Mac', () => {
        beforeEach(() => {
          macKeysSetup();
          event.which = PERIOD_KEY;
        });

        it('does nothing', () => {
          keyboardShortcuts.processEvent(sqlEditorControllerSpy, queryToolActionsSpy, event);
          expect(queryToolActionsSpy.uncommentLineCode).not.toHaveBeenCalled();
        });
      });
      describe('and the system is a Windows', () => {
        beforeEach(() => {
          windowsKeysSetup();
          event.which = PERIOD_KEY;
        });

        it('does nothing', () => {
          keyboardShortcuts.processEvent(sqlEditorControllerSpy, queryToolActionsSpy, event);

          expect(queryToolActionsSpy.uncommentLineCode).not.toHaveBeenCalled();
        });
      });
    });
  });

  describe('blockComment', () => {
    describe('when there is not a query already running', () => {
      describe('and the system is a Mac', () => {
        beforeEach(() => {
          macKeysSetup();
          event.which = FWD_SLASH_KEY;
          event.shiftKey = true;
          keyboardShortcuts.processEvent(sqlEditorControllerSpy, queryToolActionsSpy, event);
        });

        it('should comment out the block selection', () => {
          expect(queryToolActionsSpy.commentBlockCode).toHaveBeenCalledWith(sqlEditorControllerSpy);
        });

        expectEventPropagationToStop();
      });
    });

    describe('when there is not a query already running', () => {
      describe('and the system is a Windows', () => {
        beforeEach(() => {
          windowsKeysSetup();
          event.which = FWD_SLASH_KEY;
          event.shiftKey = true;
          keyboardShortcuts.processEvent(sqlEditorControllerSpy, queryToolActionsSpy, event);
        });

        it('should comment out the block selection', () => {
          expect(queryToolActionsSpy.commentBlockCode).toHaveBeenCalledWith(sqlEditorControllerSpy);
        });

        expectEventPropagationToStop();
      });
    });

    describe('when there is a query already running', () => {
      beforeEach(() => {
        sqlEditorControllerSpy.isQueryRunning.and.returnValue(true);
      });
      describe('and the system is a Mac', () => {
        beforeEach(() => {
          macKeysSetup();
          event.which = FWD_SLASH_KEY;
          event.shiftKey = true;
          keyboardShortcuts.processEvent(sqlEditorControllerSpy, queryToolActionsSpy, event);
        });
        it('does nothing', () => {
          expect(queryToolActionsSpy.commentBlockCode).not.toHaveBeenCalled();
        });
      });
      describe('and the system is a Windows', () => {
        beforeEach(() => {
          windowsKeysSetup();
          event.which = FWD_SLASH_KEY;
          event.shiftKey = true;
          keyboardShortcuts.processEvent(sqlEditorControllerSpy, queryToolActionsSpy, event);
        });
        it('does nothing', () => {
          expect(queryToolActionsSpy.commentBlockCode).not.toHaveBeenCalled();
        });
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

  function windowsKeysSetup() {
    spyOn(keyboardShortcuts, 'isMac').and.returnValue(false);
    event.ctrlKey = true;
    event.metaKey = false;
  }

  function macKeysSetup() {
    spyOn(keyboardShortcuts, 'isMac').and.returnValue(true);
    event.ctrlKey = false;
    event.metaKey = true;
  }
});
