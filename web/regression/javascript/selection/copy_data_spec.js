//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

import $ from 'jquery';

import Slick from 'slickgrid';
import 'slickgrid.grid';

import clipboard from '../../../pgadmin/static/js/selection/clipboard';
import copyData from '../../../pgadmin/static/js/selection/copy_data';
import RangeSelectionHelper from 'sources/selection/range_selection_helper';
import XCellSelectionModel from 'sources/selection/xcell_selection_model';
describe('copyData', function () {
  var grid, sqlEditor, gridContainer, buttonPasteRow, buttonCopyWithHeader;
  var SlickGrid;

  beforeEach(function () {
    SlickGrid = Slick.Grid;
    var data = [{'id': 1, 'brand':'leopord', 'size':12, '__temp_PK': '123'},
        {'id': 2, 'brand':'lion', 'size':13, '__temp_PK': '456'},
        {'id': 3, 'brand':'puma', 'size':9, '__temp_PK': '789'}],
      dataView = new Slick.Data.DataView();

    var CSVOptions = {'quoting': 'strings', 'quote_char': '"', 'field_separator': ','};
    var columns = [
      {
        id: 'row-header-column',
        name: 'row header column name',
        selectable: false,
        display_name: 'row header column name',
        column_type: 'text',
      },
      {
        name: 'id',
        field: 'id',
        pos: 0,
        label: 'id<br> numeric',
        cell: 'number',
        can_edit: false,
        type: 'numeric',
      }, {
        name: 'brand',
        field: 'brand',
        pos: 1,
        label: 'flavor<br> character varying',
        cell: 'string',
        can_edit: false,
        type: 'character varying',
      }, {
        name: 'size',
        field: 'size',
        pos: 2,
        label: 'size<br> numeric',
        cell: 'number',
        can_edit: false,
        type: 'numeric',
      },
    ];
    gridContainer = $('<div id="grid"></div>');
    $('body').append(gridContainer);
    buttonPasteRow = $('<button id="btn-paste-row" disabled></button>');
    buttonCopyWithHeader = $('<button class="copy-with-header visibility-hidden"></button>');
    $('body').append(buttonPasteRow);
    $('body').append(buttonCopyWithHeader);
    grid = new SlickGrid('#grid', dataView, columns, {});
    grid.CSVOptions = CSVOptions;
    dataView.setItems(data, '__temp_PK');
    grid.setSelectionModel(new XCellSelectionModel());
    sqlEditor = {slickgrid: grid};
  });

  afterEach(function() {
    grid.destroy();
    gridContainer.remove();
    buttonPasteRow.remove();
    buttonCopyWithHeader.remove();
  });

  describe('when rows are selected', function () {
    beforeEach(function () {
      grid.getSelectionModel().setSelectedRanges([
        RangeSelectionHelper.rangeForRow(grid, 0),
        RangeSelectionHelper.rangeForRow(grid, 2)]
      );
    });

    it('copies them', function () {
      spyOn(clipboard, 'copyTextToClipboard').and.callThrough();

      copyData.apply(sqlEditor);

      expect(sqlEditor.copied_rows.length).toEqual(2);

      expect(clipboard.copyTextToClipboard).toHaveBeenCalled();
      expect(clipboard.copyTextToClipboard.calls.mostRecent().args[0]).toContain('1,"leopord",12');
      expect(clipboard.copyTextToClipboard.calls.mostRecent().args[0]).toContain('3,"puma",9');
    });

    describe('when the user can edit the grid', function () {
      it('enables the paste row button', function () {
        copyData.apply(_.extend({can_edit: true}, sqlEditor));

        expect($('#btn-paste-row').prop('disabled')).toEqual(false);
      });
    });
  });

  describe('when a column is selected', function () {
    beforeEach(function () {
      var firstDataColumn = RangeSelectionHelper.rangeForColumn(grid, 1);
      grid.getSelectionModel().setSelectedRanges([firstDataColumn]);
    });

    it('copies text to the clipboard', function () {
      spyOn(clipboard, 'copyTextToClipboard');

      copyData.apply(sqlEditor);

      expect(clipboard.copyTextToClipboard).toHaveBeenCalled();

      var copyArg = clipboard.copyTextToClipboard.calls.mostRecent().args[0];
      var rowStrings = copyArg.split('\n');
      expect(rowStrings[0]).toEqual('1');
      expect(rowStrings[1]).toEqual('2');
      expect(rowStrings[2]).toEqual('3');
    });

    it('sets copied_rows to empty', function () {
      copyData.apply(sqlEditor);

      expect(sqlEditor.copied_rows.length).toEqual(0);
    });

    describe('when the user can edit the grid', function () {
      beforeEach(function () {
        copyData.apply(_.extend({can_edit: true}, sqlEditor));
      });

      it('disables the paste row button', function () {
        expect($('#btn-paste-row').prop('disabled')).toEqual(true);
      });
    });
  });
});
