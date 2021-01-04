/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import $ from 'jquery';
import Slick from 'slickgrid';
import 'slickgrid.grid';
import RangeSelectionHelper from 'sources/selection/range_selection_helper';

describe('RangeSelectionHelper utility functions', function () {
  var grid;
  beforeEach(function () {
    var container, data, columns, options;
    container = $('<div></div>');
    container.height(9999);

    columns = [{
      id: '1',
      name: 'some-column-name',
      pos: 0,
    }, {
      id: 'second-column-id',
      name: 'second column',
      pos: 1,
    }];

    data = [];
    for (var i = 0; i < 10; i++) {
      data.push({'some-column-name': 'some-value-' + i, 'second column': 'second value ' + i});
    }

    grid = new Slick.Grid(container, data, columns, options);
    grid.invalidate();
  });

  describe('#getIndexesOfCompleteRows', function () {
    describe('when selected ranges are not rows', function () {
      it('returns an empty array', function () {
        var rowlessRanges = [RangeSelectionHelper.rangeForColumn(grid, 1)];

        expect(RangeSelectionHelper.getIndexesOfCompleteRows(grid, rowlessRanges))
          .toEqual([]);
      });
    });
    describe('when selected range', function () {
      describe('is a single row', function () {
        it('returns an array with one index', function () {
          var singleRowRange = [RangeSelectionHelper.rangeForRow(grid, 1)];

          expect(RangeSelectionHelper.getIndexesOfCompleteRows(grid, singleRowRange))
            .toEqual([1]);
        });
      });

      describe('is multiple rows', function () {
        it('returns an array of each row\'s index', function () {
          var multipleRowRange = [
            RangeSelectionHelper.rangeForRow(grid, 0),
            RangeSelectionHelper.rangeForRow(grid, 3),
            RangeSelectionHelper.rangeForRow(grid, 2),
          ];

          var indexesOfCompleteRows = RangeSelectionHelper.getIndexesOfCompleteRows(grid, multipleRowRange);
          indexesOfCompleteRows.sort();
          expect(indexesOfCompleteRows).toEqual([0, 2, 3]);
        });
      });

      describe('contains a multi row selection', function () {
        it('returns an array of each individual row\'s index', function () {
          var multipleRowRange = [
            new Slick.Range(3, 0, 5, 1),
          ];

          var indexesOfCompleteRows = RangeSelectionHelper.getIndexesOfCompleteRows(grid, multipleRowRange);
          indexesOfCompleteRows.sort();
          expect(indexesOfCompleteRows).toEqual([3, 4, 5]);
        });

        describe('and also contains a selection that is not a row', function () {
          it('returns an array of only the complete rows\' indexes', function () {
            var multipleRowRange = [
              new Slick.Range(8, 1, 9, 1),
              new Slick.Range(3, 0, 5, 1),
            ];

            var indexesOfCompleteRows = RangeSelectionHelper.getIndexesOfCompleteRows(grid, multipleRowRange);
            indexesOfCompleteRows.sort();
            expect(indexesOfCompleteRows).toEqual([3, 4, 5]);
          });
        });
      });
    });
  });
});
