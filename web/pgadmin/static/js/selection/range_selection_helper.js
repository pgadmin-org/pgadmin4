define(['slickgrid'], function () {
  var Slick = window.Slick;

  var isSameRange = function (range, otherRange) {
    return range.fromCell == otherRange.fromCell && range.toCell == otherRange.toCell &&
      range.fromRow == otherRange.fromRow && range.toRow == otherRange.toRow;
  };

  var isRangeSelected = function (selectedRanges, range) {
    return _.any(selectedRanges, function (selectedRange) {
      return isSameRange(selectedRange, range)
    })
  };

  var removeRange = function (selectedRanges, range) {
    return _.filter(selectedRanges, function (selectedRange) {
      return !(isSameRange(selectedRange, range))
    })
  };

  var addRange = function (ranges, range) {
    ranges.push(range);
    return ranges;
  };

  var areAllRangesRows = function (ranges, grid) {
    return _.every(ranges, function (range) {
      return range.fromRow == range.toRow &&
        range.fromCell == 1 && range.toCell == grid.getColumns().length - 1
    })
  };

  var areAllRangesColumns = function (ranges, grid) {
    return _.every(ranges, function (range) {
      return range.fromCell == range.toCell &&
        range.fromRow == 0 && range.toRow == grid.getDataLength() - 1
    })
  };

  var rangeForRow = function (grid, rowId) {
    var columnDefinitions = grid.getColumns();
    if(isFirstColumnData(columnDefinitions)) {
      return new Slick.Range(rowId, 0, rowId, grid.getColumns().length - 1);
    }
    return new Slick.Range(rowId, 1, rowId, grid.getColumns().length - 1);
  };

  function rangeForColumn(grid, columnIndex) {
    return new Slick.Range(0, columnIndex, grid.getDataLength() - 1, columnIndex)
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

  return {
    addRange: addRange,
    removeRange: removeRange,
    isRangeSelected: isRangeSelected,
    areAllRangesRows: areAllRangesRows,
    areAllRangesColumns: areAllRangesColumns,
    rangeForRow: rangeForRow,
    rangeForColumn: rangeForColumn,
    isEntireGridSelected: isEntireGridSelected,
    getRangeOfWholeGrid: getRangeOfWholeGrid,
    isFirstColumnData: isFirstColumnData
  }
});