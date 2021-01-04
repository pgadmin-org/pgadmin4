/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import $ from 'jquery';
import 'slickgrid';
import 'slickgrid.grid';

import XCellSelectionModel from 'sources/selection/xcell_selection_model';
import CellSelector from 'sources/slickgrid/cell_selector';
import RangeSelectionHelper from 'sources/selection/range_selection_helper';

describe('CellSelector', function () {
  var container, columns, cellSelector, data, cellSelectionModel, grid;

  var Slick = window.Slick;

  beforeEach(function () {
    container = $('<div></div>');
    container.height(9999);
    container.width(9999);
    columns = [{
      name: 'some-column-name',
    }, {
      name: 'second column',
    }];

    cellSelector = new CellSelector();

    data = [];
    for (var i = 0; i < 10; i++) {
      data.push({'some-column-name': 'some-value-' + i, 'second column': 'second value ' + i});
    }
    grid = new Slick.Grid(container, data, columns);

    cellSelectionModel = new XCellSelectionModel();
    grid.setSelectionModel(cellSelectionModel);

    grid.registerPlugin(cellSelector);
    grid.invalidate();

    $('body').append(container);
  });

  afterEach(function () {
    $('body').find(container).remove();
  });

  describe('when the user clicks or tabs to a cell', function () {
    it('sets the selected range to that cell', function () {
      var row = 1, column = 0;
      $(container.find('.slick-row .slick-cell.l' + column)[row]).trigger('click');

      var selectedRanges = cellSelectionModel.getSelectedRanges();
      expect(selectedRanges.length).toEqual(1);
      expect(selectedRanges[0].fromCell).toEqual(0);
      expect(selectedRanges[0].toCell).toEqual(0);
      expect(selectedRanges[0].fromRow).toEqual(1);
      expect(selectedRanges[0].toRow).toEqual(1);
    });

    it('deselects previously selected ranges', function () {
      var row2Range = RangeSelectionHelper.rangeForRow(grid, 2);
      var ranges = RangeSelectionHelper.addRange(cellSelectionModel.getSelectedRanges(),
        row2Range);
      cellSelectionModel.setSelectedRanges(ranges);

      var row = 4, column = 1;
      $(container.find('.slick-row .slick-cell.l' + column)[row]).trigger('click');

      expect(RangeSelectionHelper.isRangeSelected(cellSelectionModel.getSelectedRanges(), row2Range))
        .toEqual(false);
    });
  });
});
