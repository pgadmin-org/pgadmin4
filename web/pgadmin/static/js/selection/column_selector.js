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
  'sources/selection/range_selection_helper',
  'slickgrid',
], function ($, RangeSelectionHelper) {
  var ColumnSelector = function () {
    var Slick = window.Slick,
      gridEventBus = new Slick.EventHandler(),
      onBeforeColumnSelectAll = new Slick.Event(),
      onColumnSelectAll = new Slick.Event();

    var init = function (grid) {
      gridEventBus.subscribe(grid.onHeaderClick, handleHeaderClick.bind(null, grid));
      grid.getSelectionModel().onSelectedRangesChanged
        .subscribe(handleSelectedRangesChanged.bind(null, grid));
      onColumnSelectAll.subscribe(function(e, args) {
        updateRanges(args.grid, args.column.id);
      });
    };

    var handleHeaderClick = function (grid, event, args) {
      var columnDefinition = args.column;

      grid.focus();

      if (isColumnSelectable(columnDefinition)) {
        var $columnHeader = $(event.target);
        if (hasClickedChildOfColumnHeader(event)) {
          if ($(event.target).hasClass('slick-resizable-handle')) {
            return;
          }
          $columnHeader = $(event.target).parents('.slick-header-column');
        }
        $columnHeader.toggleClass('selected');

        if ($columnHeader.hasClass('selected')) {
          onBeforeColumnSelectAll.notify(args, event);
        }

        if (!(event.isPropagationStopped() || event.isImmediatePropagationStopped())) {
          updateRanges(grid, columnDefinition.id);
        }
      } else {
        toggleColumnHeaderForCopyHeader(grid);
      }
    };

    var toggleColumnHeaderForCopyHeader = function(grid) {
      if(!$('.copy-with-header').hasClass('visibility-hidden')) {
        var selRowCnt = grid.getSelectedRows();
        $('.slick-header-column').each(function (index, columnHeader) {
          if (selRowCnt.length == 0) {
            $(columnHeader).removeClass('selected');
            grid.getColumns()[index].selected = false;
          }
          else {
            if (index > 0 && grid.getColumns()[index].selectable) {
              $(columnHeader).addClass('selected');
              grid.getColumns()[index].selected = true;
            }
          }

        });
      } else {
        $('.slick-header-column').each(function (index, columnHeader) {
          $(columnHeader).removeClass('selected');
        });
      }
    }.bind(RangeSelectionHelper);

    var handleSelectedRangesChanged = function (grid, event, selectedRanges) {
      $('.slick-header-column').each(function (index, columnHeader) {
        var $spanHeaderColumn = $(columnHeader).find('[data-cell-type="column-header-row"]');
        var columnIndex = grid.getColumnIndex($spanHeaderColumn.data('column-id'));
        if (isColumnSelected(grid, selectedRanges, columnIndex)) {
          $(columnHeader).addClass('selected');
          if (columnIndex) grid.getColumns()[columnIndex].selected = true;
        } else if(!RangeSelectionHelper.areAllRangesCompleteRows(grid, selectedRanges)){
          $(columnHeader).removeClass('selected');
          if (columnIndex) grid.getColumns()[columnIndex].selected = false;
        }
      });
    };

    var updateRanges = function (grid, columnId) {
      var selectionModel = grid.getSelectionModel();
      var ranges = selectionModel.getSelectedRanges();

      var columnIndex = grid.getColumnIndex(columnId);

      var columnRange = RangeSelectionHelper.rangeForColumn(grid, columnIndex);
      var newRanges;
      if (RangeSelectionHelper.isRangeSelected(ranges, columnRange)) {
        newRanges = RangeSelectionHelper.removeRange(ranges, columnRange);
      } else {
        if (RangeSelectionHelper.areAllRangesSingleColumns(ranges, grid)) {
          newRanges = RangeSelectionHelper.addRange(ranges, columnRange);
        } else {
          newRanges = [columnRange];
        }
      }
      selectionModel.setSelectedRanges(newRanges);
    };

    var hasClickedChildOfColumnHeader = function (event) {
      return !$(event.target).hasClass('slick-header-column');
    };

    var isColumnSelectable = function (columnDefinition) {
      return columnDefinition.selectable !== false;
    };

    var isColumnSelected = function (grid, selectedRanges, columnIndex) {
      var allRangesAreRows = RangeSelectionHelper.areAllRangesCompleteRows(grid, selectedRanges);
      return isAnyCellSelectedInColumn(grid, selectedRanges, columnIndex) && !allRangesAreRows;
    };

    var isAnyCellSelectedInColumn = function (grid, selectedRanges, columnIndex) {
      var isStillSelected = RangeSelectionHelper.isRangeEntirelyWithinSelectedRanges(selectedRanges,
        RangeSelectionHelper.rangeForColumn(grid, columnIndex));
      var cellSelectedInColumn = RangeSelectionHelper.isAnyCellOfColumnSelected(selectedRanges, columnIndex);

      return isStillSelected || cellSelectedInColumn;
    };

    var getColumnDefinitions = function (columnDefinitions) {
      return _.map(columnDefinitions, function (columnDefinition) {
        if (isColumnSelectable(columnDefinition)) {
          var name =
            '<span data-cell-type=\'column-header-row\' ' +
            '       data-test=\'output-column-header\'' +
            '       data-column-id=\'' + columnDefinition.id + '\'>' +
            '  <span class=\'column-description\'>' +
            '    <span class=\'column-name\'>' + columnDefinition.display_name + '</span>' +
            '    <span class=\'column-type\'>' + columnDefinition.column_type + '</span>' +
            '  </span>' +
            '</span>';
          return _.extend(columnDefinition, {
            name: name,
          });
        } else {
          return columnDefinition;
        }
      });
    };

    $.extend(this, {
      'init': init,
      'getColumnDefinitions': getColumnDefinitions,
      'onBeforeColumnSelectAll': onBeforeColumnSelectAll,
      'onColumnSelectAll': onColumnSelectAll,
      'toggleColumnHeaderForCopyHeader': toggleColumnHeaderForCopyHeader,
    });
  };
  return ColumnSelector;
});
