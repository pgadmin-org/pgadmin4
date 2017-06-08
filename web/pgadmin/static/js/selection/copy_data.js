define([
  'jquery',
  'underscore',
  'sources/selection/clipboard',
  'sources/selection/range_selection_helper',
  'sources/selection/range_boundary_navigator'
  ],
function ($, _, clipboard, RangeSelectionHelper, rangeBoundaryNavigator) {
  var copyData = function () {
    var self = this;

    var grid = self.slickgrid;
    var columnDefinitions = grid.getColumns();
    var selectedRanges = grid.getSelectionModel().getSelectedRanges();
    var data = grid.getData();
    var rows = grid.getSelectedRows();

    if (RangeSelectionHelper.areAllRangesCompleteRows(grid, selectedRanges)) {
      self.copied_rows = rows.map(function (rowIndex) {
        return data[rowIndex];
      });
      setPasteRowButtonEnablement(self.can_edit, true);
    } else {
      self.copied_rows = [];
      setPasteRowButtonEnablement(self.can_edit, false);
    }
    var csvText = rangeBoundaryNavigator.rangesToCsv(data, columnDefinitions, selectedRanges);
    if (csvText) {
      clipboard.copyTextToClipboard(csvText);
    }
  };

  var setPasteRowButtonEnablement = function (canEditFlag, isEnabled) {
    if (canEditFlag) {
      $("#btn-paste-row").prop('disabled', !isEnabled);
    }
  };

  var allTheRangesAreFullRows = function (ranges, columnDefinitions) {
    var colRangeBounds = ranges.map(function (range) {
      return [range.fromCell, range.toCell];
    });

    if(RangeSelectionHelper.isFirstColumnData(columnDefinitions)) {
      return _.isEqual(_.union.apply(null, colRangeBounds), [0, columnDefinitions.length - 1]);
    }
    return _.isEqual(_.union.apply(null, colRangeBounds), [0, columnDefinitions.length - 1]);
  };

  return copyData
});