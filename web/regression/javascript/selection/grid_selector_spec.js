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

import GridSelector from 'sources/selection/grid_selector';
import XCellSelectionModel from 'sources/selection/xcell_selection_model';

describe('GridSelector', function () {
  var container, data, columns, gridSelector, xCellSelectionModel;
  var SlickGrid;

  beforeEach(function () {
    SlickGrid = Slick.Grid;
    container = $('<div></div>');
    container.height(9999);
    columns = [{
      id: '1',
      name: 'some-column-name',
      pos: 0,
    }, {
      id: '2',
      name: 'second column',
      pos: 1,
    }];

    gridSelector = new GridSelector();
    columns = gridSelector.getColumnDefinitions(columns);

    data = [];
    for (var i = 0; i < 10; i++) {
      data.push({'some-column-name': 'some-value-' + i, 'second column': 'second value ' + i});
    }
    var grid = new SlickGrid(container, data, columns);

    xCellSelectionModel = new XCellSelectionModel();
    grid.setSelectionModel(xCellSelectionModel);

    grid.registerPlugin(gridSelector);
    grid.invalidate();

    $('body').append(container);
  });

  afterEach(function () {
    $('body').find(container).remove();
  });

  it('renders an additional column on the left for selecting rows', function () {
    expect(columns.length).toEqual(3);

    var leftmostColumn = columns[0];
    expect(leftmostColumn.id).toEqual('row-header-column');
  });

  it('renders a button for selecting all the cells', function () {
    expect(container.find('[title=\'Select/Deselect All\']').length).toEqual(1);
  });

  describe('when the cell for the select/deselect all is clicked', function () {
    it('selects the whole grid', function () {
      container.find('[title=\'Select/Deselect All\']').parent().trigger('click');

      var selectedRanges = xCellSelectionModel.getSelectedRanges();
      expect(selectedRanges.length).toEqual(1);
      var selectedRange = selectedRanges[0];
      expect(selectedRange.fromCell).toEqual(1);
      expect(selectedRange.toCell).toEqual(2);
      expect(selectedRange.fromRow).toEqual(0);
      expect(selectedRange.toRow).toEqual(9);
    });

    it('adds selected class', function () {
      container.find('[title=\'Select/Deselect All\']').parent().trigger('click');

      expect($(container.find('[data-id=\'select-all\']')).hasClass('selected')).toBeTruthy();
    });
  });

  describe('when the select all button in the corner gets selected', function () {

    it('selects all the cells', function () {
      container.find('[title=\'Select/Deselect All\']').trigger('click');

      var selectedRanges = xCellSelectionModel.getSelectedRanges();
      expect(selectedRanges.length).toEqual(1);
      var selectedRange = selectedRanges[0];
      expect(selectedRange.fromCell).toEqual(1);
      expect(selectedRange.toCell).toEqual(2);
      expect(selectedRange.fromRow).toEqual(0);
      expect(selectedRange.toRow).toEqual(9);
    });

    describe('when the select all button in the corner gets deselected', function () {
      beforeEach(function () {
        container.find('[title=\'Select/Deselect All\']').trigger('click');
      });

      it('deselects all the cells', function () {
        container.find('[title=\'Select/Deselect All\']').trigger('click');

        var selectedRanges = xCellSelectionModel.getSelectedRanges();
        expect(selectedRanges.length).toEqual(0);
      });
    });

    describe('and then the underlying selection changes', function () {
      beforeEach(function () {
        container.find('[title=\'Select/Deselect All\']').trigger('click');
      });

      it('removes the selected class', function () {
        container.find('[title=\'Select/Deselect All\']').parent().trigger('click');

        expect($(container.find('[data-id=\'select-all\']')).hasClass('selected')).toBeFalsy();
      });
    });
  });
});
