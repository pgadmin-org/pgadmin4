/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2017, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define([
  'jquery',
  'underscore',
  'sources/selection/set_staged_rows',
], function ($, _, SetStagedRows) {
  describe('set_staged_rows', function () {
    var sqlEditorObj, gridSpy, deleteButton, copyButton, selectionSpy;
    beforeEach(function () {
      gridSpy = jasmine.createSpyObj('gridSpy', ['getData', 'getCellNode', 'getColumns']);
      gridSpy.getData.and.returnValue([
        {0: 'one', 1: 'two', __temp_PK: '123'},
        {0: 'three', 1: 'four', __temp_PK: '456'},
        {0: 'five', 1: 'six', __temp_PK: '789'},
        {0: 'seven', 1: 'eight', __temp_PK: '432'},
      ]);
      gridSpy.getColumns.and.returnValue([
        {
          pos: 0,
          selectable: true,
        }, {
          pos: 1,
          selectable: true,
        },
      ]);

      selectionSpy = jasmine.createSpyObj('selectionSpy', ['setSelectedRows', 'getSelectedRanges']);

      deleteButton = $('<button id="btn-delete-row"></button>');
      copyButton = $('<button id="btn-copy-row"></button>');

      sqlEditorObj = {
        grid: gridSpy,
        editor: {
          handler: {
            data_store: {
              staged_rows: {'456': {}},
            },
            can_edit: false,
          },
        },
        keys: null,
        selection: selectionSpy,
        columns: [
          {
            name: 'a pk column',
            pos: 0,
          },
          {
            name: 'some column',
            pos: 1,
          },
        ],
      };

      $('body').append(deleteButton);
      $('body').append(copyButton);

      deleteButton.prop('disabled', true);
      copyButton.prop('disabled', true);

      selectionSpy = jasmine.createSpyObj('selectionSpy', [
        'setSelectedRows',
        'getSelectedRanges',
      ]);
    });

    afterEach(function () {
      copyButton.remove();
      deleteButton.remove();
    });
    describe('when no full rows are selected', function () {
      describe('when nothing is selected', function () {
        beforeEach(function () {
          selectionSpy.getSelectedRanges.and.returnValue([]);
          sqlEditorObj.selection = selectionSpy;
          SetStagedRows.call(sqlEditorObj, {}, {});
        });

        it('should disable the delete row button', function () {
          expect($('#btn-delete-row').prop('disabled')).toBeTruthy();
        });

        it('should disable the copy row button', function () {
          expect($('#btn-copy-row').prop('disabled')).toBeTruthy();
        });

        it('should clear staged rows', function () {
          expect(sqlEditorObj.editor.handler.data_store.staged_rows).toEqual({});
        });
      });

      describe('when there is a selection', function () {
        beforeEach(function () {
          var range = {
            fromCell: 0,
            toCell: 0,
            fromRow: 1,
            toRow: 1,
          };

          selectionSpy.getSelectedRanges.and.returnValue([range]);
          sqlEditorObj.selection = selectionSpy;
          SetStagedRows.call(sqlEditorObj, {}, {});
        });

        it('should disable the delete row button', function () {
          expect($('#btn-delete-row').prop('disabled')).toBeTruthy();
        });

        it('should disable the copy row button', function () {
          expect($('#btn-copy-row').prop('disabled')).toBeFalsy();
        });

        it('should clear staged rows', function () {
          expect(sqlEditorObj.editor.handler.data_store.staged_rows).toEqual({});
        });
      });
    });

    describe('when 2 full rows are selected', function () {
      beforeEach(function () {
        var range1 = {
          fromCell: 0,
          toCell: 1,
          fromRow: 1,
          toRow: 1,
        };
        var range2 = {
          fromCell: 0,
          toCell: 1,
          fromRow: 2,
          toRow: 2,
        };

        selectionSpy.getSelectedRanges.and.returnValue([range1, range2]);
        sqlEditorObj.selection = selectionSpy;
      });

      describe('when table does not have primary keys', function () {
        it('should enable the copy row button', function () {
          SetStagedRows.call(sqlEditorObj, {}, {});
          expect($('#btn-copy-row').prop('disabled')).toBeFalsy();
        });

        it('should not enable the delete row button', function () {
          SetStagedRows.call(sqlEditorObj, {}, {});
          expect($('#btn-delete-row').prop('disabled')).toBeTruthy();
        });

        it('should update staged rows with the __temp_PK value of the new Selected Rows', function () {
          SetStagedRows.call(sqlEditorObj, {}, {});
          expect(sqlEditorObj.editor.handler.data_store.staged_rows).toEqual({'456': {}, '789': {}});
        });

        describe('the user can edit', function () {
          it('should enable the delete row button', function () {
            sqlEditorObj.editor.handler.can_edit = true;
            SetStagedRows.call(sqlEditorObj, {}, {});
            expect($('#btn-delete-row').prop('disabled')).toBeFalsy();
          });
        });
      });

      describe('when table has primary keys', function () {
        beforeEach(function () {
          sqlEditorObj.keys = {'a pk column': 'varchar'};
          sqlEditorObj.editor.handler.data_store.staged_rows = {'456': {0: 'three'}};
        });

        describe('selected rows have primary key', function () {
          it('should set the staged rows correctly', function () {
            SetStagedRows.call(sqlEditorObj, {}, {});
            expect(sqlEditorObj.editor.handler.data_store.staged_rows).toEqual(
              {'456': {0: 'three'}, '789': {0: 'five'}});
          });

          it('should not clear selected rows in Cell Selection Model', function () {
            SetStagedRows.call(sqlEditorObj, {}, {});
            expect(sqlEditorObj.selection.setSelectedRows).not.toHaveBeenCalledWith();
          });
        });

        describe('selected rows missing primary key', function () {
          beforeEach(function () {
            gridSpy.getData.and.returnValue([
              {0: 'one', 1: 'two', __temp_PK: '123'},
              {1: 'four', __temp_PK: '456'},
              {1: 'six', __temp_PK: '789'},
              {0: 'seven', 1: 'eight', __temp_PK: '432'},
            ]);
          });

          it('should clear the staged rows', function () {
            SetStagedRows.call(sqlEditorObj, {}, {});
            expect(sqlEditorObj.editor.handler.data_store.staged_rows).toEqual({});
          });

          it('should clear selected rows in Cell Selection Model', function () {
            SetStagedRows.call(sqlEditorObj, {}, {});
            expect(sqlEditorObj.selection.setSelectedRows).toHaveBeenCalledWith([]);
          });
        });

        describe('when the selected row is a new row', function () {
          var parentDiv;
          beforeEach(function () {
            var childDiv = $('<div></div>');
            parentDiv = $('<div class="new_row"></div>');
            parentDiv.append(childDiv);
            $('body').append(parentDiv);
            gridSpy.getCellNode.and.returnValue(childDiv);
            SetStagedRows.call(sqlEditorObj, {}, {});
          });

          afterEach(function () {
            parentDiv.remove();
          });

          it('should not clear the staged rows', function () {
            expect(sqlEditorObj.editor.handler.data_store.staged_rows).toEqual({
              '456': {0: 'three'},
              '789': {0: 'five'},
            });
          });

          it('should not clear selected rows in Cell Selection Model', function () {
            expect(sqlEditorObj.selection.setSelectedRows).not.toHaveBeenCalled();
          });
        });
      });
    });
  });
});
