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

import RowSelector from 'sources/selection/row_selector';
import ActiveCellCapture from 'sources/selection/active_cell_capture';
import XCellSelectionModel from 'sources/selection/xcell_selection_model';

describe('RowSelector', function () {
  var KEY = {
    RIGHT: 39,
    LEFT: 37,
    UP: 38,
    DOWN: 40,
  };
  var container, dataView, columnDefinitions, grid, cellSelectionModel;
  var SlickGrid = Slick.Grid;

  beforeEach(function () {
    container = $('<div></div>');
    container.height(9999);
    container.width(9999);

    columnDefinitions = [{
      id: '1',
      name: 'some-column-name',
      selectable: true,
      pos: 0,
    }, {
      id: '2',
      name: 'second column',
      selectable: true,
      pos: 1,
    }];

    dataView = new Slick.Data.DataView();
    var rowSelector = new RowSelector();
    var data = [];
    for (var i = 0; i < 10; i++) {
      data.push({'some-column-name':'some-value-' + i, 'second column':'second value ' + i});
    }
    columnDefinitions = rowSelector.getColumnDefinitions(columnDefinitions);
    dataView.setItems(data, 'some-column-name');
    grid = new SlickGrid(container, dataView, columnDefinitions);
    grid.registerPlugin(new ActiveCellCapture());
    cellSelectionModel = new XCellSelectionModel();
    grid.setSelectionModel(cellSelectionModel);

    grid.registerPlugin(rowSelector);
    grid.invalidate();

    $('body').append(container);
  });

  afterEach(function () {
    $('body').find(container).remove();
  });

  it('renders an additional column on the left', function () {
    expect(columnDefinitions.length).toEqual(3);

    var leftmostColumn = columnDefinitions[0];
    expect(leftmostColumn.id).toEqual('row-header-column');
    expect(leftmostColumn.name).toEqual('');
    expect(leftmostColumn.selectable).toEqual(false);
  });

  it('renders a span on the leftmost column', function () {
    expect(container.find('.slick-row').length).toEqual(10);
    expect(container.find('.slick-row .slick-cell:first-child span[data-cell-type="row-header-selector"]').length).toEqual(10);
  });

  it('preserves the other attributes of column definitions', function () {
    expect(columnDefinitions[1].id).toEqual('1');
    expect(columnDefinitions[1].selectable).toEqual(true);
  });

  describe('selecting rows', function () {
    describe('when the user clicks a row header span', function () {
      it('selects the row', function () {
        container.find('.slick-row .slick-cell:first-child span[data-cell-type="row-header-selector"]')[0].click();

        var selectedRanges = cellSelectionModel.getSelectedRanges();
        expectOnlyTheFirstRowToBeSelected(selectedRanges);
      });

      it('add selected class to parent of the span', function () {
        container.find('.slick-row .slick-cell:first-child span[data-cell-type="row-header-selector"]')[5].click();

        expect($(container.find('.slick-row .slick-cell:first-child ')[5])
          .hasClass('selected')).toBeTruthy();
      });
    });

    describe('when the user clicks a row header', function () {
      beforeEach(function () {
        container.find('.slick-row .slick-cell:first-child')[1].click();

      });
      it('selects the row', function () {

        var selectedRanges = cellSelectionModel.getSelectedRanges();
        var row = selectedRanges[0];

        expect(selectedRanges.length).toEqual(1);
        expect(row.fromCell).toEqual(1);
        expect(row.toCell).toEqual(2);
        expect(row.fromRow).toEqual(1);
        expect(row.toRow).toEqual(1);
      });

      it('add selected class to parent of the span', function () {

        expect($(container.find('.slick-row .slick-cell:first-child ')[1])
          .hasClass('selected')).toBeTruthy();
      });

      describe('when the user clicks again the same row header', function () {
        it('add selected class to parent of the span', function () {
          container.find('.slick-row .slick-cell:first-child span[data-cell-type="row-header-selector"]')[1].click();

          expect($(container.find('.slick-row .slick-cell:first-child ')[1])
            .hasClass('selected')).toBeFalsy();
        });
      });

      describe('and presses shift + down-arrow', function () {
        beforeEach(function () {
          pressShiftArrow(KEY.DOWN);
        });

        it('keeps the last row selected', function () {
          expect(cellSelectionModel.getSelectedRanges().length).toEqual(1);
        });

        it('grows the selection down', function () {
          var selectedRanges = cellSelectionModel.getSelectedRanges();

          var row = selectedRanges[0];

          expect(selectedRanges.length).toEqual(1);
          expect(row.fromCell).toEqual(1);
          expect(row.toCell).toEqual(2);
          expect(row.fromRow).toEqual(1);
          expect(row.toRow).toEqual(2);
        });

        it('keeps selected class on rows 1 and 2', function () {
          expect($(container.find('.slick-row .slick-cell:first-child ')[0])
            .hasClass('selected')).toBeFalsy();
          expect($(container.find('.slick-row .slick-cell:first-child ')[1])
            .hasClass('selected')).toBeTruthy();
          expect($(container.find('.slick-row .slick-cell:first-child ')[2])
            .hasClass('selected')).toBeTruthy();
          expect($(container.find('.slick-row .slick-cell:first-child ')[3])
            .hasClass('selected')).toBeFalsy();
        });
      });

      describe('when the user clicks a cell on the current range', function () {
        beforeEach(function () {
          container.find('.slick-cell.l1.r1')[5].click();
        });

        it('row gets deselected', function () {

          var selectedRanges = cellSelectionModel.getSelectedRanges();

          expect(selectedRanges.length).toEqual(1);

          var newSelection = selectedRanges[0];

          expect(newSelection.fromCell).toEqual(1);
          expect(newSelection.fromRow).toEqual(5);
          expect(newSelection.toCell).toEqual(1);
          expect(newSelection.toRow).toEqual(5);
        });

        it('keep select class on row header', function () {
          expect($(container.find('.slick-cell.l0.r0')[5]).hasClass('selected'))
            .toBeTruthy();
        });
      });

      describe('when the user clicks a cell outside the current range', function () {
        beforeEach(function () {
          container.find('.slick-cell.l2.r2')[2].click();
        });

        it('row gets deselected', function () {

          var selectedRanges = cellSelectionModel.getSelectedRanges();

          expect(selectedRanges.length).toEqual(1);

          var newSelection = selectedRanges[0];

          expect(newSelection.fromCell).toEqual(2);
          expect(newSelection.fromRow).toEqual(2);
          expect(newSelection.toCell).toEqual(2);
          expect(newSelection.toRow).toEqual(2);
        });

        it('remove select class on "some-column-name" column header', function () {
          expect($(container.find('.slick-cell.l0.r0')[5]).hasClass('selected'))
            .toBeFalsy();
          expect($(container.find('.slick-cell.l0.r0')[2]).hasClass('selected'))
            .toBeTruthy();
        });
      });

      describe('when the user has a column selected', function () {
        beforeEach(function () {
          var selectedRanges = [new Slick.Range(0, 1, 9, 1)];
          cellSelectionModel.setSelectedRanges(selectedRanges);
        });

        it('no row should have the class "selected"', function () {
          expect($(container.find('.slick-cell.l0.r0')[0]).hasClass('selected'))
            .toBeFalsy();
          expect($(container.find('.slick-cell.l0.r0')[1]).hasClass('selected'))
            .toBeFalsy();
          expect($(container.find('.slick-cell.l0.r0')[2]).hasClass('selected'))
            .toBeFalsy();
          expect($(container.find('.slick-cell.l0.r0')[3]).hasClass('selected'))
            .toBeFalsy();
          expect($(container.find('.slick-cell.l0.r0')[4]).hasClass('selected'))
            .toBeFalsy();
          expect($(container.find('.slick-cell.l0.r0')[5]).hasClass('selected'))
            .toBeFalsy();
        });
      });
    });

    describe('when the user clicks multiple row headers', function () {
      it('selects another row', function () {
        container.find('.slick-row .slick-cell:first-child')[4].click();
        container.find('.slick-row .slick-cell:first-child')[0].click();

        var selectedRanges = cellSelectionModel.getSelectedRanges();
        expect(selectedRanges.length).toEqual(2);

        var row1 = selectedRanges[0];
        expect(row1.fromRow).toEqual(4);
        expect(row1.toRow).toEqual(4);

        var row2 = selectedRanges[1];
        expect(row2.fromRow).toEqual(0);
        expect(row2.toRow).toEqual(0);
      });
    });

    describe('when a column was already selected', function () {
      beforeEach(function () {
        var selectedRanges = [new Slick.Range(0, 0, 0, 1)];
        cellSelectionModel.setSelectedRanges(selectedRanges);
      });

      it('deselects the column', function () {
        container.find('.slick-row .slick-cell:first-child')[0].click();
        var selectedRanges = cellSelectionModel.getSelectedRanges();

        expectOnlyTheFirstRowToBeSelected(selectedRanges);
      });
    });

    describe('when the row is deselected through setSelectedRanges', function () {
      beforeEach(function () {
        container.find('.slick-row .slick-cell:first-child')[4].click();
      });

      it('should remove the selected class', function () {
        cellSelectionModel.setSelectedRanges([]);

        expect($(container.find('.slick-row .slick-cell:first-child span[data-cell-type="row-header-selector"]')[4])
          .hasClass('selected')).toBeFalsy();
      });
    });

    describe('click a second time', function () {
      beforeEach(function () {
        container.find('.slick-row .slick-cell:first-child')[1].click();
      });

      it('removes the selected class', function () {
        container.find('.slick-row .slick-cell:first-child')[1].click();
        expect($(container.find('.slick-row .slick-cell:first-child span[data-cell-type="row-header-selector"]')[1])
          .hasClass('selected')).toBeFalsy();
      });

      it('unselects the row', function () {
        container.find('.slick-row .slick-cell:first-child')[1].click();
        var selectedRanges = cellSelectionModel.getSelectedRanges();

        expect(selectedRanges.length).toEqual(0);
      });
    });
  });

  function pressShiftArrow(keyCode) {
    var pressEvent = new $.Event('keydown');
    pressEvent.shiftKey = true;
    pressEvent.ctrlKey = false;
    pressEvent.altKey = false;
    pressEvent.which = keyCode;

    $(container.find('.grid-canvas')).trigger(pressEvent);
  }

  function expectOnlyTheFirstRowToBeSelected(selectedRanges) {
    var row = selectedRanges[0];

    expect(selectedRanges.length).toEqual(1);
    expect(row.fromCell).toEqual(1);
    expect(row.toCell).toEqual(2);
    expect(row.fromRow).toEqual(0);
    expect(row.toRow).toEqual(0);
  }
});
