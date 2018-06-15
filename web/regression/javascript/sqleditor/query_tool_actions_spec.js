//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2018, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////
import queryToolActions from 'sources/sqleditor/query_tool_actions';

describe('queryToolActions', () => {
  let sqlEditorController,
    getSelectionSpy, getValueSpy,
    selectedQueryString, entireQueryString,
    replaceSelectionSpy;

  describe('executeQuery', () => {
    describe('when the command is being run from the query tool', () => {
      beforeEach(() => {
        setUpSpies('', '');
        spyOn(queryToolActions, '_clearMessageTab');
      });

      it('clears the html in the message tab', () => {
        queryToolActions.executeQuery(sqlEditorController);

        expect(queryToolActions._clearMessageTab).toHaveBeenCalled();
      });

      it('calls the execute function on the sqlEditorController', () => {
        queryToolActions.executeQuery(sqlEditorController);

        expect(sqlEditorController.execute).toHaveBeenCalled();
      });
    });
    describe('when the command is being run from the view data view', () => {
      beforeEach(() => {
        setUpSpies('', '');
        sqlEditorController.is_query_tool = false;
      });

      it('it calls the execute_data_query function on the sqlEditorController', () => {
        queryToolActions.executeQuery(sqlEditorController);

        expect(sqlEditorController.execute_data_query).toHaveBeenCalled();
      });
    });
  });

  describe('explainAnalyze', () => {
    describe('when verbose and costs are not selected and buffers and timing are not selected', () => {
      beforeEach(() => {
        setUpSpies('', '');
        spyOn(queryToolActions, '_verbose').and.returnValue(false);
        spyOn(queryToolActions, '_costsEnabled').and.returnValue(false);
        spyOn(queryToolActions, '_buffers').and.returnValue(false);
        spyOn(queryToolActions, '_timing').and.returnValue(false);
      });

      it('calls the execute function', () => {
        queryToolActions.explainAnalyze(sqlEditorController);

        // let explainAnalyzeQuery = 'EXPLAIN (FORMAT JSON, ANALYZE ON, VERBOSE OFF, COSTS OFF, BUFFERS OFF, TIMING OFF) ';
        const explainObject = {
          format: 'json',
          analyze: true,
          verbose: false,
          costs: false,
          buffers: false,
          timing: false,
          summary: false,
        };

        expect(sqlEditorController.execute).toHaveBeenCalledWith(explainObject);
      });
    });

    describe('when verbose and costs and buffers and timing are all selected', () => {
      beforeEach(() => {
        setUpSpies('', '');
        spyOn(queryToolActions, '_verbose').and.returnValue(true);
        spyOn(queryToolActions, '_costsEnabled').and.returnValue(true);
        spyOn(queryToolActions, '_buffers').and.returnValue(true);
        spyOn(queryToolActions, '_timing').and.returnValue(true);
      });
      it('calls the execute function', () => {
        queryToolActions.explainAnalyze(sqlEditorController);
        const explainObject = {
          format: 'json',
          analyze: true,
          verbose: true,
          costs: true,
          buffers: true,
          timing: true,
          summary: false,
        };
        expect(sqlEditorController.execute).toHaveBeenCalledWith(explainObject);
      });
    });

    describe('when verbose is selected and costs is not selected and buffer is selected and timing is not selected', () => {
      beforeEach(() => {
        setUpSpies('', '');
        spyOn(queryToolActions, '_verbose').and.returnValue(true);
        spyOn(queryToolActions, '_costsEnabled').and.returnValue(false);
        spyOn(queryToolActions, '_buffers').and.returnValue(true);
        spyOn(queryToolActions, '_timing').and.returnValue(false);
      });
      it('calls the execute function', () => {
        queryToolActions.explainAnalyze(sqlEditorController);

        const explainObject = {
          format: 'json',
          analyze: true,
          verbose: true,
          costs: false,
          buffers: true,
          timing: false,
          summary: false,
        };

        expect(sqlEditorController.execute).toHaveBeenCalledWith(explainObject);
      });
    });

    describe('when verbose is  not selected and costs is selected and buffer is not selected and timing is  selected', () => {
      beforeEach(() => {
        setUpSpies('', '');
        spyOn(queryToolActions, '_verbose').and.returnValue(false);
        spyOn(queryToolActions, '_costsEnabled').and.returnValue(true);
        spyOn(queryToolActions, '_buffers').and.returnValue(false);
        spyOn(queryToolActions, '_timing').and.returnValue(true);
      });
      it('calls the execute function', () => {
        queryToolActions.explainAnalyze(sqlEditorController);

        const explainObject = {
          format: 'json',
          analyze: true,
          verbose: false,
          costs: true,
          buffers: false,
          timing: true,
          summary: false,
        };

        expect(sqlEditorController.execute).toHaveBeenCalledWith(explainObject);
      });
    });
  });

  describe('explain', () => {
    describe('when verbose and costs are selected', () => {
      beforeEach(() => {
        setUpSpies('', '');
        spyOn(queryToolActions, '_verbose').and.returnValue(true);
        spyOn(queryToolActions, '_costsEnabled').and.returnValue(true);
      });

      it('calls the execute function', () => {
        queryToolActions.explain(sqlEditorController);
        const explainObject = {
          format: 'json',
          analyze: false,
          verbose: true,
          costs: true,
          buffers: false,
          timing: false,
          summary: false,
        };
        expect(sqlEditorController.execute).toHaveBeenCalledWith(explainObject);
      });
    });

    describe('when verbose and costs are not selected', () => {
      beforeEach(() => {
        setUpSpies('', '');
        spyOn(queryToolActions, '_verbose').and.returnValue(false);
        spyOn(queryToolActions, '_costsEnabled').and.returnValue(false);
      });

      it('calls the execute function', () => {
        queryToolActions.explain(sqlEditorController);
        const explainObject = {
          format: 'json',
          analyze: false,
          verbose: false,
          costs: false,
          buffers: false,
          timing: false,
          summary: false,
        };

        expect(sqlEditorController.execute).toHaveBeenCalledWith(explainObject);
      });
    });

    describe('when verbose is selected and costs is not selected', () => {
      beforeEach(() => {
        setUpSpies('', '');
        spyOn(queryToolActions, '_verbose').and.returnValue(true);
        spyOn(queryToolActions, '_costsEnabled').and.returnValue(false);
      });

      it('calls the execute function', () => {
        queryToolActions.explain(sqlEditorController);
        const explainObject = {
          format: 'json',
          analyze: false,
          verbose: true,
          costs: false,
          buffers: false,
          timing: false,
          summary: false,
        };
        expect(sqlEditorController.execute).toHaveBeenCalledWith(explainObject);
      });
    });
  });

  describe('download', () => {
    describe('when the query is empty', () => {
      beforeEach(() => {
        setUpSpies('', '');
      });
      it('does nothing', () => {
        queryToolActions.download(sqlEditorController);

        expect(sqlEditorController.trigger_csv_download).not.toHaveBeenCalled();
      });
    });

    describe('when the table was opened through the queryTool', () => {
      describe('when the query tool object has a selection', () => {
        let time;

        beforeEach(() => {
          entireQueryString = 'include some more of that yummy string cheese;';
          selectedQueryString = 'some silly string cheese';
          setUpSpies(selectedQueryString, entireQueryString);

          time = 'rightNow';
          spyOn(window, 'Date').and.callFake(() => ({
            getTime: () => {
              return time;
            },
          }));
        });

        it('calls trigger_csv_download with the query and the filename', () => {
          let filename = 'data-' + time + '.csv';

          queryToolActions.download(sqlEditorController);

          expect(sqlEditorController.trigger_csv_download).toHaveBeenCalledWith(selectedQueryString, filename);
        });
      });

      describe('when there is no selection', () => {
        let time;

        beforeEach(() => {
          selectedQueryString = '';
          entireQueryString = 'include some more of that yummy string cheese;';

          setUpSpies(selectedQueryString, entireQueryString);

          time = 'rightNow';
          spyOn(window, 'Date').and.callFake(() => ({
            getTime: () => {
              return time;
            },
          }));
        });

        it('calls trigger_csv_download with the query and the filename', () => {
          let filename = 'data-' + time + '.csv';

          queryToolActions.download(sqlEditorController);

          expect(sqlEditorController.trigger_csv_download).toHaveBeenCalledWith(entireQueryString, filename);
        });
      });
    });

    describe('when the table was opened through tables, view all data', () => {
      it('calls trigger_csv_download with the sqlQuery and the table name', () => {
        let query = 'a very long query';
        setUpSpies('', query);
        sqlEditorController.is_query_tool = false;

        queryToolActions.download(sqlEditorController);

        expect(sqlEditorController.trigger_csv_download).toHaveBeenCalledWith(query, 'iAmATable' + '.csv');
      });
    });

  });

  describe('commentBlockCode', () => {
    describe('when there is no query text', () => {
      beforeEach(() => {
        setUpSpies('', '');
      });
      it('does nothing', () => {
        let codeMirrorObj = sqlEditorController.gridView.query_tool_obj;

        queryToolActions.commentBlockCode(sqlEditorController);

        expect(codeMirrorObj.toggleComment).not.toHaveBeenCalled();
      });
    });

    describe('when there is empty selection', () => {
      beforeEach(() => {
        setUpSpies('', 'a string\nddd\nsss');

        sqlEditorController.gridView.query_tool_obj.getCursor = (isFrom) => {
          return isFrom ? 3 : 3;
        };
      });

      it('comments the current line', () => {
        let codeMirrorObj = sqlEditorController.gridView.query_tool_obj;

        queryToolActions.commentBlockCode(sqlEditorController);

        expect(codeMirrorObj.toggleComment).toHaveBeenCalledWith(3, 3);
      });
    });

    describe('when some part of the query is selected', () => {
      beforeEach(() => {
        setUpSpies('a string\nddd', 'a string\nddd\nsss');
      });

      it('comments the selection', () => {
        let codeMirrorObj = sqlEditorController.gridView.query_tool_obj;

        queryToolActions.commentBlockCode(sqlEditorController);

        expect(codeMirrorObj.toggleComment).toHaveBeenCalledWith(0, 12);
      });
    });
  });

  describe('commentLineCode', () => {
    describe('when there is no query text', () => {
      beforeEach(() => {
        setUpSpies('', '');
      });
      it('does nothing', () => {
        let codeMirrorObj = sqlEditorController.gridView.query_tool_obj;

        queryToolActions.commentLineCode(sqlEditorController);

        expect(codeMirrorObj.lineComment).not.toHaveBeenCalled();
      });
    });

    describe('when there is empty selection', () => {
      beforeEach(() => {
        setUpSpies('', 'a string\nddd\nsss');

        sqlEditorController.gridView.query_tool_obj.getCursor = (isFrom) => {
          return isFrom ? 3 : 3;
        };
      });

      it('comments the current line', () => {
        let codeMirrorObj = sqlEditorController.gridView.query_tool_obj;

        queryToolActions.commentLineCode(sqlEditorController);

        expect(codeMirrorObj.lineComment).toHaveBeenCalledWith(3, 3, {lineComment: '--'});
      });
    });

    describe('when some part of the query is selected', () => {
      beforeEach(() => {
        setUpSpies('tring\nddd', 'a string\nddd\nsss');
      });

      it('comments the selection', () => {
        let codeMirrorObj = sqlEditorController.gridView.query_tool_obj;

        queryToolActions.commentLineCode(sqlEditorController);

        expect(codeMirrorObj.lineComment).toHaveBeenCalledWith(3, 12, {lineComment: '--'});
      });
    });
  });

  describe('uncommentLineCode', () => {
    describe('when there is no query text', () => {
      beforeEach(() => {
        setUpSpies('', '');
      });
      it('does nothing', () => {
        let codeMirrorObj = sqlEditorController.gridView.query_tool_obj;

        queryToolActions.uncommentLineCode(sqlEditorController);

        expect(codeMirrorObj.uncomment).not.toHaveBeenCalled();
      });
    });

    describe('when there is empty selection', () => {
      beforeEach(() => {
        setUpSpies('', 'a string\nddd\nsss');

        sqlEditorController.gridView.query_tool_obj.getCursor = (isFrom) => {
          return isFrom ? 3 : 3;
        };
      });

      it('uncomments the current line', () => {
        let codeMirrorObj = sqlEditorController.gridView.query_tool_obj;

        queryToolActions.uncommentLineCode(sqlEditorController);

        expect(codeMirrorObj.uncomment).toHaveBeenCalledWith(3, 3, {lineComment: '--'});
      });
    });

    describe('when some part of the query is selected', () => {
      beforeEach(() => {
        setUpSpies('tring\nddd', 'a string\nddd\nsss');
      });

      it('uncomments the selection', () => {
        let codeMirrorObj = sqlEditorController.gridView.query_tool_obj;

        queryToolActions.uncommentLineCode(sqlEditorController);

        expect(codeMirrorObj.uncomment).toHaveBeenCalledWith(3, 12, {lineComment: '--'});
      });
    });
  });

  describe('toggleCaseOfSelectedText', () => {
    describe('when there is no query text', () => {
      beforeEach(() => {
        setUpSpies('', '');
      });
      it('does nothing', () => {
        expect(
          queryToolActions.toggleCaseOfSelectedText(sqlEditorController)
        ).not.toBeDefined();
      });
    });

    describe('when there is empty selection', () => {
      beforeEach(() => {
        setUpSpies('', 'a string\nddd\nsss');

        sqlEditorController.gridView.query_tool_obj.getCursor = (isFrom) => {
          return isFrom ? 3 : 3;
        };
      });

      it('does nothing', () => {
        expect(
          queryToolActions.toggleCaseOfSelectedText(sqlEditorController)
        ).not.toBeDefined();
      });
    });

    describe('when selected query is in lower case', () => {
      beforeEach(() => {
        setUpSpies('string', 'a string\nddd\nsss');
      });

      it('toggle the selection and string should be in upper case', () => {
        queryToolActions.toggleCaseOfSelectedText(sqlEditorController);
        expect(replaceSelectionSpy
          ).toHaveBeenCalledWith('STRING');
      });

      it('(negative scenario toggle the selection and string should be in upper case', () => {
        queryToolActions.toggleCaseOfSelectedText(sqlEditorController);
        expect(replaceSelectionSpy
          ).not.toHaveBeenCalledWith('string');
      });
    });

    describe('when selected query is in upper case', () => {
      beforeEach(() => {
        setUpSpies('STRING', 'a string\nddd\nsss');
      });

      it('toggle the selection and string should be in lower case', () => {
        queryToolActions.toggleCaseOfSelectedText(sqlEditorController);
        expect(replaceSelectionSpy
          ).toHaveBeenCalledWith('string');
      });

      it('(negative scenario toggle the selection and string should be in lower case', () => {
        queryToolActions.toggleCaseOfSelectedText(sqlEditorController);
        expect(replaceSelectionSpy
          ).not.toHaveBeenCalledWith('STRING');
      });
    });

    describe('when selected query is in mixed case', () => {
      beforeEach(() => {
        setUpSpies('sTRIng', 'a string\nddd\nsss');
      });

      it('toggle the selection and string should be in upper case', () => {
        queryToolActions.toggleCaseOfSelectedText(sqlEditorController);
        expect(replaceSelectionSpy
          ).toHaveBeenCalledWith('STRING');
      });

      it('(negative scenario toggle the selection and string should be in upper case', () => {
        queryToolActions.toggleCaseOfSelectedText(sqlEditorController);
        expect(replaceSelectionSpy
          ).not.toHaveBeenCalledWith('sTRIng');
      });
    });
  });

  function setUpSpies(selectedQueryString, entireQueryString) {
    getValueSpy = jasmine.createSpy('getValueSpy').and.returnValue(entireQueryString);
    getSelectionSpy = jasmine.createSpy('getSelectionSpy').and.returnValue(selectedQueryString);
    replaceSelectionSpy = jasmine.createSpy('replaceSelectionSpy');

    sqlEditorController = {
      gridView: {
        query_tool_obj: {
          getSelection: getSelectionSpy,
          getValue: getValueSpy,
          toggleComment: jasmine.createSpy('toggleCommentSpy'),
          lineComment: jasmine.createSpy('lineCommentSpy'),
          uncomment: jasmine.createSpy('uncommentSpy'),
          replaceSelection: replaceSelectionSpy,
          getCursor: (isFrom) => {
            return entireQueryString.indexOf(selectedQueryString) + (isFrom ? 0 : selectedQueryString.length);
          },
        },
      },
      trigger_csv_download: jasmine.createSpy('trigger_csv_download'),
      trigger: jasmine.createSpy('trigger'),
      table_name: 'iAmATable',
      is_query_tool: true,
      execute: jasmine.createSpy('execute'),
      execute_data_query: jasmine.createSpy('execute_data_query'),
    };
  }
});
