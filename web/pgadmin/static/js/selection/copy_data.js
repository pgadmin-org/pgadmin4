/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define([
  'jquery',
  'underscore',
  'sources/selection/clipboard',
  'sources/selection/range_selection_helper',
  'sources/selection/range_boundary_navigator',
],
function ($, _, clipboard, RangeSelectionHelper, rangeBoundaryNavigator) {
  var copyData = function () {
    var self = this || window;

    var grid = self.slickgrid;
    var columnDefinitions = grid.getColumns();
    var selectedRanges = grid.getSelectionModel().getSelectedRanges();
    var dataView = grid.getData();
    var rows = grid.getSelectedRows();
    var CSVOptions = grid.CSVOptions;

    if (RangeSelectionHelper.areAllRangesCompleteRows(grid, selectedRanges)) {
      self.copied_rows = rows.map(function (rowIndex) {
        return grid.getDataItem(rowIndex);
      });
      setPasteRowButtonEnablement(self.can_edit, true);
    } else {
      self.copied_rows = [];
      setPasteRowButtonEnablement(self.can_edit, false);
    }
    var csvText = rangeBoundaryNavigator.rangesToCsv(dataView.getItems(), columnDefinitions,
      selectedRanges, CSVOptions, copyWithHeader());
    if (csvText) {
      clipboard.copyTextToClipboard(csvText);
    }
  };

  var copyWithHeader = function () {
    return !$('.copy-with-header').hasClass('visibility-hidden');
  };

  var setPasteRowButtonEnablement = function (canEditFlag, isEnabled) {
    if (canEditFlag) {
      $('#btn-paste-row').prop('disabled', !isEnabled);
      if(isEnabled && window.parent.$) {
        // trigger copied event to all sessions
        window.parent.$(window.parent.document).trigger('pgadmin-sqleditor:rows-copied', copyWithHeader());
      }
    }
  };
  return copyData;
});
