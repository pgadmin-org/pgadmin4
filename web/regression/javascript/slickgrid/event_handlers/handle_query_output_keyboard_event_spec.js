/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2017, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import HandleQueryOutputKeyboardEvent from 'sources/slickgrid/event_handlers/handle_query_output_keyboard_event';
import clipboard from 'sources/selection/clipboard';
import RangeSelectionHelper from 'sources/selection/range_selection_helper';
import XCellSelectionModel from 'sources/selection/xcell_selection_model';
import Slick from 'slickgrid';
import 'slickgrid.grid';

import $ from 'jquery';

describe('#handleQueryOutputKeyboardEvent', function () {
  var event, grid, slickEvent;
  var SlickGrid = Slick.Grid;
  var handleQueryOutputKeyboardEvent;

  beforeEach(function () {
    event = {
      shiftKey: false,
      ctrlKey: false,
      metaKey: false,
      which: -1,
      keyCode: -1,
      preventDefault: jasmine.createSpy('preventDefault'),
    };

    var data = [['', '0,0-cell-content', '0,1-cell-content'],
      ['', '1,0-cell-content', '1,1-cell-content'],
      ['', '2,0-cell-content', '2,1-cell-content']];
    var columnDefinitions = [{name: 'checkboxColumn'}, {pos: 1, name: 'firstColumn'}, {
      pos: 2,
      name: 'secondColumn',
    }];
    grid = new SlickGrid($('<div></div>'), data, columnDefinitions);
    grid.setSelectionModel(new XCellSelectionModel());

    slickEvent = {
      grid: grid,
    };

    spyOn(clipboard, 'copyTextToClipboard');
    handleQueryOutputKeyboardEvent = HandleQueryOutputKeyboardEvent.bind(window);
  });

  describe('when a range is selected', function () {
    beforeEach(function () {
      grid.getSelectionModel().setSelectedRanges([
        RangeSelectionHelper.rangeForRow(grid, 0),
        RangeSelectionHelper.rangeForRow(grid, 2),
      ]);
    });

    describe('pressing Command + C', function () {
      beforeEach(function () {
        event.metaKey = true;
        event.keyCode = 67;
      });

      it('copies the cell content to the clipboard', function () {
        handleQueryOutputKeyboardEvent(event, slickEvent);

        expect(clipboard.copyTextToClipboard).toHaveBeenCalledWith('\'0,0-cell-content\',\'0,1-cell-content\'\n\'2,0-cell-content\',\'2,1-cell-content\'');
      });
    });

    describe('pressing Ctrl + C', function () {
      beforeEach(function () {
        event.ctrlKey = true;
        event.keyCode = 67;
      });

      it('copies the cell content to the clipboard', function () {
        handleQueryOutputKeyboardEvent(event, slickEvent);

        expect(clipboard.copyTextToClipboard).toHaveBeenCalledWith('\'0,0-cell-content\',\'0,1-cell-content\'\n\'2,0-cell-content\',\'2,1-cell-content\'');
      });
    });

    describe('pressing Command + A', function () {
      beforeEach(function () {
        event.metaKey = true;
        event.keyCode = 65;
      });

      it('selects the entire grid to ranges', function () {
        handleQueryOutputKeyboardEvent(event, slickEvent);

        expect(RangeSelectionHelper.isEntireGridSelected(grid)).toBeTruthy();
        expect(grid.getSelectionModel().getSelectedRanges().length).toBe(1);
      });
    });

    describe('pressing Ctrl + A', function () {
      beforeEach(function () {
        event.ctrlKey = true;
        event.keyCode = 65;
      });

      it('selects the entire grid to ranges', function () {
        handleQueryOutputKeyboardEvent(event, slickEvent);

        expect(RangeSelectionHelper.isEntireGridSelected(grid)).toBeTruthy();
        expect(grid.getSelectionModel().getSelectedRanges().length).toBe(1);
      });
    });
  });

  describe('when no ranges are selected', function () {
    describe('pressing Command + A', function () {
      beforeEach(function () {
        event.metaKey = true;
        event.keyCode = 65;
      });

      it('selects the entire grid to ranges', function () {
        handleQueryOutputKeyboardEvent(event, slickEvent);

        expect(RangeSelectionHelper.isEntireGridSelected(grid)).toBeTruthy();
        expect(grid.getSelectionModel().getSelectedRanges().length).toBe(1);
      });
    });

    describe('pressing Ctrl + A', function () {
      beforeEach(function () {
        event.ctrlKey = true;
        event.keyCode = 65;
      });

      it('selects the entire grid to ranges', function () {
        handleQueryOutputKeyboardEvent(event, slickEvent);

        expect(RangeSelectionHelper.isEntireGridSelected(grid)).toBeTruthy();
        expect(grid.getSelectionModel().getSelectedRanges().length).toBe(1);
      });
    });
  });
});
