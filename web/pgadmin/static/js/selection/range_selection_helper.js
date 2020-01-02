/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define(['slickgrid'], function () {
  var Slick = window.Slick;

  var isSameRange = function (range, otherRange) {
    return range.fromCell == otherRange.fromCell && range.toCell == otherRange.toCell &&
      range.fromRow == otherRange.fromRow && range.toRow == otherRange.toRow;
  };

  var isRangeSelected = function (selectedRanges, range) {
    return _.any(selectedRanges, function (selectedRange) {
      return isSameRange(selectedRange, range);
    });
  };

  var isAnyCellOfColumnSelected = function (selectedRanges, column) {
    return _.any(selectedRanges, function (selectedRange) {
      return selectedRange.fromCell <= column && selectedRange.toCell >= column;
    });
  };

  var isAnyCellOfRowSelected = function (selectedRanges, row) {
    return _.any(selectedRanges, function (selectedRange) {
      return selectedRange.fromRow <= row && selectedRange.toRow >= row;
    });
  };

  var isRangeEntirelyWithinSelectedRanges = function (selectedRanges, range) {
    return _.any(selectedRanges, function (selectedRange) {
      return selectedRange.fromCell <= range.fromCell && selectedRange.toCell >= range.toCell &&
        selectedRange.fromRow <= range.fromRow && selectedRange.toRow >= range.toRow;
    });
  };

  var removeRange = function (selectedRanges, range) {
    return _.filter(selectedRanges, function (selectedRange) {
      return !(isSameRange(selectedRange, range));
    });
  };

  var addRange = function (ranges, range) {
    ranges.push(range);
    return ranges;
  };

  var areAllRangesSingleRows = function (ranges, grid) {
    return _.every(ranges, function (range) {
      return range.fromRow == range.toRow && rangeHasCompleteRows(grid, range);
    });
  };

  var areAllRangesSingleColumns = function (ranges, grid) {
    return _.every(ranges, isRangeAColumn.bind(this, grid));
  };

  var rangeForRow = function (grid, rowId) {
    var columnDefinitions = grid.getColumns();
    if (isFirstColumnData(columnDefinitions)) {
      return new Slick.Range(rowId, 0, rowId, grid.getColumns().length - 1);
    }
    return new Slick.Range(rowId, 1, rowId, grid.getColumns().length - 1);
  };

  var rangeForColumn = function (grid, columnIndex) {
    return new Slick.Range(0, columnIndex, grid.getDataLength() - 1, columnIndex);
  };

  var getRangeOfWholeGrid = function (grid) {
    return new Slick.Range(0, 1, grid.getDataLength() - 1, grid.getColumns().length - 1);
  };

  var isEntireGridSelected = function (grid) {
    var selectionModel = grid.getSelectionModel();
    var selectedRanges = selectionModel.getSelectedRanges();
    return selectedRanges.length == 1 && isSameRange(selectedRanges[0], getRangeOfWholeGrid(grid));
  };

  var isFirstColumnData = function (columnDefinitions) {
    return !_.isUndefined(columnDefinitions[0].pos);
  };

  var areAllRangesCompleteColumns = function (grid, ranges) {
    return _.every(ranges, function (range) {
      return rangeHasCompleteColumns(grid, range);
    });
  };

  var areAllRangesCompleteRows = function (grid, ranges) {
    return _.every(ranges, function (range) {
      return rangeHasCompleteRows(grid, range);
    });
  };

  var getIndexesOfCompleteRows = function (grid, ranges) {
    var indexArray = [];
    ranges.forEach(function (range) {
      if (rangeHasCompleteRows(grid, range))
        indexArray = indexArray.concat(_.range(range.fromRow, range.toRow + 1));
    });

    return indexArray;
  };

  var isRangeAColumn = function (grid, range) {
    return range.fromCell == range.toCell &&
      range.fromRow == 0 && range.toRow == grid.getDataLength() - 1;
  };

  var rangeHasCompleteColumns = function (grid, range) {
    return range.fromRow === 0 && range.toRow === grid.getDataLength() - 1;
  };

  var rangeHasCompleteRows = function (grid, range) {
    return range.fromCell === getFirstDataColumnIndex(grid) &&
      range.toCell === getLastDataColumnIndex(grid);
  };

  function getFirstDataColumnIndex(grid) {
    return _.findIndex(grid.getColumns(), function (columnDefinition) {
      var pos = columnDefinition.pos;

      return !_.isUndefined(pos) && isSelectable(columnDefinition);
    });
  }

  function getLastDataColumnIndex(grid) {
    return _.findLastIndex(grid.getColumns(), isSelectable);
  }

  function isSelectable(columnDefinition) {
    return (_.isUndefined(columnDefinition.selectable) || columnDefinition.selectable === true);
  }

  function selectAll(grid) {
    var range = getRangeOfWholeGrid(grid);
    var selectionModel = grid.getSelectionModel();

    selectionModel.setSelectedRanges([range]);
  }

  return {
    addRange: addRange,
    removeRange: removeRange,
    isRangeSelected: isRangeSelected,
    areAllRangesSingleRows: areAllRangesSingleRows,
    areAllRangesSingleColumns: areAllRangesSingleColumns,
    areAllRangesCompleteRows: areAllRangesCompleteRows,
    areAllRangesCompleteColumns: areAllRangesCompleteColumns,
    rangeForRow: rangeForRow,
    rangeForColumn: rangeForColumn,
    isEntireGridSelected: isEntireGridSelected,
    getRangeOfWholeGrid: getRangeOfWholeGrid,
    isFirstColumnData: isFirstColumnData,
    getIndexesOfCompleteRows: getIndexesOfCompleteRows,
    selectAll: selectAll,
    isRangeAColumn: isRangeAColumn,
    rangeHasCompleteColumns: rangeHasCompleteColumns,
    rangeHasCompleteRows: rangeHasCompleteRows,
    isAnyCellOfColumnSelected: isAnyCellOfColumnSelected,
    isRangeEntirelyWithinSelectedRanges: isRangeEntirelyWithinSelectedRanges,
    isAnyCellOfRowSelected: isAnyCellOfRowSelected,
  };
});
