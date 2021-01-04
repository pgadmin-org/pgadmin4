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

import ColumnSelector from 'sources/selection/column_selector';
import ActiveCellCapture from 'sources/selection/active_cell_capture';
import 'sources/selection/grid_selector';
import 'slickgrid.plugins/slick.cellrangeselector';

import XCellSelectionModel from 'sources/selection/xcell_selection_model';

describe('ColumnSelector', function () {
  var container, data, columns, options;
  var SlickGrid = Slick.Grid;
  var KEY = {
    RIGHT: 39,
    LEFT: 37,
    UP: 38,
    DOWN: 40,
  };

  beforeEach(function () {
    container = $('<div></div>');
    container.height(9999);
    container.width(9999);

    data = [{
      'some-column-name': 'first value',
      'second column': 'second value',
      'third column': 'nonselectable value',
    }, {
      'some-column-name': 'row 1 - first value',
      'second column': 'row 1 - second value',
      'third column': 'row 1 - nonselectable value',
    }];

    columns = [
      {
        id: 'row-header-column',
        name: 'row header column name',
        selectable: false,
        display_name: 'row header column name',
        column_type: 'text',
      },
      {
        id: '1',
        name: 'some-column-name',
        pos: 0,
        display_name: 'some-column-name',
        column_type: 'text',
      },
      {
        id: '2',
        name: 'second column',
        pos: 1,
        display_name: 'second column',
        column_type: 'json',
      },
      {
        id: 'third-column-id',
        name: 'third column',
        pos: 2,
        display_name: 'third column',
        column_type: 'text',
      },
      {
        name: 'some-non-selectable-column',
        selectable: false,
        pos: 3,
        display_name: 'some-non-selectable-column',
        column_type: 'numeric',
      },
    ];
  });

  it('displays the name of the column', function () {
    setupGrid(columns);

    expect($(container.find('.slick-header-columns .slick-column-name')[1]).text())
      .toContain('some-column-name');
    expect($(container.find('.slick-header-columns .slick-column-name')[1]).text())
      .toContain('text');
    expect($(container.find('.slick-header-columns .slick-column-name')[2]).text())
      .toContain('second column');
    expect($(container.find('.slick-header-columns .slick-column-name')[2]).text())
      .toContain('json');
  });

  it('preserves the other attributes of column definitions', function () {
    var columnSelector = new ColumnSelector();
    var selectableColumns = columnSelector.getColumnDefinitions(columns);

    expect(selectableColumns[1].id).toEqual('1');
  });

  describe('with ActiveCellCapture, CellSelectionModel, and GridSelector: selecting columns', function () {
    var grid, cellSelectionModel;
    beforeEach(function () {
      var columnSelector = new ColumnSelector();
      columns = columnSelector.getColumnDefinitions(columns);
      data = [];
      for (var i = 0; i < 10; i++) {
        data.push({
          'some-column-name': 'some-value-' + i,
          'second column': 'second value ' + i,
          'third column': 'third value ' + i,
          'fourth column': 'fourth value ' + i,
        });
      }
      grid = new SlickGrid(container, data, columns);

      grid.registerPlugin(new ActiveCellCapture());
      cellSelectionModel = new XCellSelectionModel();
      grid.setSelectionModel(cellSelectionModel);

      grid.registerPlugin(columnSelector);
      grid.invalidate();
      $('body').append(container);
    });

    afterEach(function () {
      $('body').find(container).remove();
    });

    describe('when the user clicks a column header', function () {
      it('selects the column', function () {
        container.find('.slick-header-column:contains(some-column-name)').click();
        var selectedRanges = cellSelectionModel.getSelectedRanges();
        expectOnlyTheFirstColumnToBeSelected(selectedRanges);
      });

      it('toggles a selected class to the header cell', function () {
        container.find('.slick-header-column:contains(second column)').click();
        expect($(container.find('.slick-header-column:contains(second column)')).hasClass('selected'))
          .toEqual(true);

        container.find('.slick-header-column:contains(second column)').click();
        expect($(container.find('.slick-header-column:contains(second column)')).hasClass('selected'))
          .toEqual(false);
      });
    });

    describe('when the user clicks an additional column header', function () {
      beforeEach(function () {
        container.find('.slick-header-column:contains(some-column-name)').click();
        container.find('.slick-header-column:contains(second column)').click();
      });

      it('selects additional columns', function () {

        var selectedRanges = cellSelectionModel.getSelectedRanges();

        expect(selectedRanges.length).toEqual(2);
        var column1 = selectedRanges[0];
        expect(column1.fromCell).toEqual(1);
        expect(column1.toCell).toEqual(1);

        var column2 = selectedRanges[1];
        expect(column2.fromCell).toEqual(2);
        expect(column2.toCell).toEqual(2);
      });

      describe('and presses shift + right-arrow', function () {
        beforeEach(function () {
          pressShiftArrow(KEY.RIGHT);
        });

        it('keeps the last column selected', function () {
          expect(cellSelectionModel.getSelectedRanges().length).toEqual(1);
        });

        it('grows the selection to the right', function () {
          var selectedRange = cellSelectionModel.getSelectedRanges()[0];
          expect(selectedRange.fromCell).toEqual(2);
          expect(selectedRange.toCell).toEqual(3);
          expect(selectedRange.fromRow).toEqual(0);
          expect(selectedRange.toRow).toEqual(9);
        });

        it('keeps selected class on columns 2 and 3', function () {
          expect($(container.find('.slick-header-column:contains(second column)')).hasClass('selected'))
            .toEqual(true);
          expect($(container.find('.slick-header-column:contains(third column)')).hasClass('selected'))
            .toEqual(true);
          expect($(container.find('.slick-header-column:contains(some-column-name)')).hasClass('selected'))
            .toEqual(false);
        });
      });

      describe('when the user deselects the last selected column header', function () {
        beforeEach(function () {
          container.find('.slick-header-column:contains(second column)').click();
        });

        describe('and presses shift + right-arrow', function () {
          it('first and second columns are selected', function () {
            pressShiftArrow(KEY.RIGHT);

            var selectedRanges = cellSelectionModel.getSelectedRanges();

            expect(selectedRanges.length).toEqual(1);
            expect(selectedRanges[0].fromCell).toEqual(1);
            expect(selectedRanges[0].toCell).toEqual(2);
            expect(selectedRanges[0].fromRow).toEqual(0);
            expect(selectedRanges[0].toRow).toEqual(9);
          });
        });
      });
    });

    describe('when the user clicks a column header description', function () {
      it('selects the column', function () {
        container.find('.slick-header-columns span.column-description:contains(some-column-name)').click();

        var selectedRanges = cellSelectionModel.getSelectedRanges();
        expectOnlyTheFirstColumnToBeSelected(selectedRanges);
      });

      it('toggles a selected class to the header cell', function () {
        container.find('.slick-header-column span.column-description:contains(second column)').click();
        expect($(container.find('.slick-header-column:contains(second column)')).hasClass('selected'))
          .toEqual(true);

        container.find('.slick-header-column span.column-description:contains(second column)').click();
        expect($(container.find('.slick-header-column:contains(second column)')).hasClass('selected'))
          .toEqual(false);
      });
    });

    describe('when a row is selected', function () {
      beforeEach(function () {
        var selectedRanges = [new Slick.Range(0, 0, 0, 1)];
        cellSelectionModel.setSelectedRanges(selectedRanges);
      });

      it('deselects the row', function () {
        container.find('.slick-header-column')[1].click();
        var selectedRanges = cellSelectionModel.getSelectedRanges();

        expect(selectedRanges.length).toEqual(1);

        var column = selectedRanges[0];

        expect(column.fromCell).toEqual(1);
        expect(column.toCell).toEqual(1);
        expect(column.fromRow).toEqual(0);
        expect(column.toRow).toEqual(9);
      });
    });

    describe('clicking a second time', function () {
      beforeEach(function () {
        container.find('.slick-header-column')[1].click();
      });

      it('deselects the column', function () {
        container.find('.slick-header-column')[1].click();
        var selectedRanges = cellSelectionModel.getSelectedRanges();

        expect(selectedRanges.length).toEqual(0);
      });
    });

    describe('when the column is not selectable', function () {
      it('does not select the column', function () {
        $(container.find('.slick-header-column:contains(some-non-selectable-column)')).trigger('click');
        var selectedRanges = cellSelectionModel.getSelectedRanges();

        expect(selectedRanges.length).toEqual(0);
      });
    });

    describe('when a non-column range was already selected', function () {
      beforeEach(function () {
        var selectedRanges = [new Slick.Range(0, 0, 2, 0)];
        cellSelectionModel.setSelectedRanges(selectedRanges);
      });

      it('deselects the non-column range', function () {
        container.find('.slick-header-column:contains(some-column-name)').click();

        var selectedRanges = cellSelectionModel.getSelectedRanges();
        expectOnlyTheFirstColumnToBeSelected(selectedRanges);
      });
    });

    describe('when a column is selected', function () {
      beforeEach(function () {
        container.find('.slick-header-column:contains(some-column-name)').click();
      });

      describe('when the user click a cell on the current range', function () {
        beforeEach(function () {
          container.find('.slick-cell.l1.r1')[1].click();
        });

        it('column is deselected', function () {

          var selectedRanges = cellSelectionModel.getSelectedRanges();

          expect(selectedRanges.length).toEqual(1);

          var column = selectedRanges[0];

          expect(column.fromCell).toEqual(1);
          expect(column.toCell).toEqual(1);
          expect(column.fromRow).toEqual(1);
          expect(column.toRow).toEqual(1);
        });

        it('keep select class on column header', function () {
          expect($(container.find('.slick-header-column:contains(some-column-name)')).hasClass('selected'))
            .toBeTruthy();
        });
      });

      describe('when the user click a cell outside the current range', function () {
        beforeEach(function () {
          container.find('.slick-cell.l2.r2')[2].click();
        });

        it('column is deselected', function () {

          var selectedRanges = cellSelectionModel.getSelectedRanges();

          expect(selectedRanges.length).toEqual(1);

          var column = selectedRanges[0];

          expect(column.fromCell).toEqual(2);
          expect(column.toCell).toEqual(2);
          expect(column.fromRow).toEqual(2);
          expect(column.toRow).toEqual(2);
        });

        it('remove select class on \'some-column-name\' column header', function () {
          expect($(container.find('.slick-header-column:contains(some-column-name)')).hasClass('selected'))
            .toBeFalsy();
          expect($(container.find('.slick-header-column:contains(second column)')).hasClass('selected'))
            .toBeTruthy();
        });
      });

      describe('when the user click in a row header', function () {
        beforeEach(function () {
          var selectedRanges = [new Slick.Range(1, 1, 1, 3)];
          cellSelectionModel.setSelectedRanges(selectedRanges);
        });

        it('column is deselected', function () {
          var selectedRanges = cellSelectionModel.getSelectedRanges();

          expect(selectedRanges.length).toEqual(1);

          var column = selectedRanges[0];

          expect(column.fromCell).toEqual(1);
          expect(column.toCell).toEqual(3);
          expect(column.fromRow).toEqual(1);
          expect(column.toRow).toEqual(1);
        });

        it('no column should have the class \'selected\'', function () {
          expect($(container.find('.slick-header-column:contains(some-column-name)')).hasClass('selected'))
            .toBeTruthy();
        });
      });
    });
  });

  function setupGrid(gridColumns) {
    var columnSelector = new ColumnSelector();
    gridColumns = columnSelector.getColumnDefinitions(gridColumns);
    var grid = new SlickGrid(container, data, gridColumns, options);

    var cellSelectionModel = new XCellSelectionModel();
    grid.setSelectionModel(cellSelectionModel);

    grid.registerPlugin(columnSelector);
    grid.invalidate();
  }

  function expectOnlyTheFirstColumnToBeSelected(selectedRanges) {
    var row = selectedRanges[0];

    expect(selectedRanges.length).toEqual(1);
    expect(row.fromCell).toEqual(1);
    expect(row.toCell).toEqual(1);
    expect(row.fromRow).toEqual(0);
    expect(row.toRow).toEqual(9);
  }

  function pressShiftArrow(keyCode) {
    var pressEvent = new $.Event('keydown');
    pressEvent.shiftKey = true;
    pressEvent.ctrlKey = false;
    pressEvent.altKey = false;
    pressEvent.which = keyCode;

    $(container.find('.grid-canvas')).trigger(pressEvent);
  }
});
