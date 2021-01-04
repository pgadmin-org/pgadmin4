/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define([
  'jquery',
  'sources/selection/range_selection_helper',
  'sources/selection/column_selector',
  'slickgrid',
], function ($, RangeSelectionHelper, ColumnSelector) {
  var RowSelector = function () {
    var Slick = window.Slick;

    var gridEventBus = new Slick.EventHandler();
    var columnSelector = new ColumnSelector();

    var init = function (grid) {
      grid.getSelectionModel().onSelectedRangesChanged
        .subscribe(handleSelectedRangesChanged.bind(null, grid));
      gridEventBus
        .subscribe(grid.onClick, handleClick.bind(null, grid));
    };

    var handleClick = function (grid, event, args) {
      if (grid.getColumns()[args.cell].id === 'row-header-column') {
        var $rowHeaderSpan = $(event.target);

        if ($rowHeaderSpan.data('cell-type') != 'row-header-selector') {
          $rowHeaderSpan = $(event.target).find('[data-cell-type="row-header-selector"]');
        }

        $rowHeaderSpan.parent().toggleClass('selected');
        updateRanges(grid, args.row);
        columnSelector.toggleColumnHeaderForCopyHeader(grid);
      }
    };

    var handleSelectedRangesChanged = function (grid, event, selectedRanges) {
      $('[data-cell-type="row-header-selector"]').each(function (index, rowHeaderSpan) {
        var $rowHeaderSpan = $(rowHeaderSpan);
        var row = parseInt($rowHeaderSpan.data('row'));

        if (isRowSelected(grid, selectedRanges, row)) {
          $rowHeaderSpan.parent().addClass('selected');
        } else {
          $rowHeaderSpan.parent().removeClass('selected');
        }
      });
    };

    var updateRanges = function (grid, rowId) {
      var selectionModel = grid.getSelectionModel();
      var ranges = selectionModel.getSelectedRanges();

      var rowRange = RangeSelectionHelper.rangeForRow(grid, rowId);

      var newRanges;
      if (RangeSelectionHelper.isRangeSelected(ranges, rowRange)) {
        newRanges = RangeSelectionHelper.removeRange(ranges, rowRange);
      } else {
        if (RangeSelectionHelper.areAllRangesSingleRows(ranges, grid)) {
          newRanges = RangeSelectionHelper.addRange(ranges, rowRange);
        } else {
          newRanges = [rowRange];
        }
      }
      selectionModel.setSelectedRanges(newRanges);
    };

    var isAnyCellSelectedInRow = function (grid, selectedRanges, row) {
      var isStillSelected = RangeSelectionHelper.isRangeEntirelyWithinSelectedRanges(selectedRanges,
        RangeSelectionHelper.rangeForRow(grid, row));
      var cellSelectedInRow = RangeSelectionHelper.isAnyCellOfRowSelected(selectedRanges, row);

      return isStillSelected || cellSelectedInRow;
    };

    var isRowSelected = function (grid, selectedRanges, row) {
      var allRangesAreColumns = RangeSelectionHelper.areAllRangesCompleteColumns(grid, selectedRanges);
      return isAnyCellSelectedInRow(grid, selectedRanges, row) && !allRangesAreColumns;
    };

    var getColumnDefinitions = function (columnDefinitions) {
      columnDefinitions.unshift({
        id: 'row-header-column',
        name: '',
        selectable: false,
        focusable: false,
        formatter: function (rowIndex) {
          return '<span ' +
            'data-row="' + rowIndex + '" ' +
            'data-cell-type="row-header-selector">' +
            (rowIndex+1) + '</span>';
        },
        width: 30,
      });
      return columnDefinitions;
    };

    $.extend(this, {
      'init': init,
      'getColumnDefinitions': getColumnDefinitions,
    });
  };

  return RowSelector;
});
