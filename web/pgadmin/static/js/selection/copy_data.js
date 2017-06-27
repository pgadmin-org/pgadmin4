define([
  'jquery',
  'underscore',
  'sources/selection/clipboard',
  'sources/selection/range_selection_helper',
  'sources/selection/range_boundary_navigator',
],
function ($, _, clipboard, RangeSelectionHelper, rangeBoundaryNavigator) {
  var copyData = function () {
    var self = this;

    var grid = self.slickgrid;
    var columnDefinitions = grid.getColumns();
    var selectedRanges = grid.getSelectionModel().getSelectedRanges();
    var dataView = grid.getData();
    var rows = grid.getSelectedRows();

    if (RangeSelectionHelper.areAllRangesCompleteRows(grid, selectedRanges)) {
      self.copied_rows = rows.map(function (rowIndex) {
        return grid.getDataItem(rowIndex);
      });
      setPasteRowButtonEnablement(self.can_edit, true);
    } else {
      self.copied_rows = [];
      setPasteRowButtonEnablement(self.can_edit, false);
    }
    var csvText = rangeBoundaryNavigator.rangesToCsv(dataView.getItems(), columnDefinitions, selectedRanges);
    if (csvText) {
      clipboard.copyTextToClipboard(csvText);
    }
  };

  var setPasteRowButtonEnablement = function (canEditFlag, isEnabled) {
    if (canEditFlag) {
      $('#btn-paste-row').prop('disabled', !isEnabled);
    }
  };
  return copyData;
});
