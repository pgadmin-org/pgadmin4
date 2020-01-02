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
], function ($, RangeSelectionHelper) {

  var ActiveCellCapture = function () {
    var KEY_RIGHT = 39;
    var KEY_LEFT = 37;
    var KEY_UP = 38;
    var KEY_DOWN = 40;

    var bypassDefaultActiveCellRangeChange = false;
    var isColumnsResized = false;
    var isMouseInHeader = false;
    var grid;

    var init = function (slickGrid) {
      grid = slickGrid;
      grid.onDragEnd.subscribe(onDragEndHandler);
      grid.onHeaderClick.subscribe(onHeaderClickHandler);
      grid.onClick.subscribe(onClickHandler);
      grid.onActiveCellChanged.subscribe(onActiveCellChangedHandler);
      grid.onKeyDown.subscribe(onKeyDownHandler);
      grid.onHeaderMouseEnter.subscribe(onHeaderMouseEnterHandler);
      grid.onHeaderMouseLeave.subscribe(onHeaderMouseLeaveHandler);
      grid.onColumnsResized.subscribe(onColumnsResizedHandler);
    };

    var destroy = function () {
      grid.onDragEnd.unsubscribe(onDragEndHandler);
      grid.onHeaderClick.unsubscribe(onHeaderClickHandler);
      grid.onActiveCellChanged.unsubscribe(onActiveCellChangedHandler);
      grid.onKeyDown.unsubscribe(onKeyDownHandler);
      grid.onHeaderMouseEnter.unsubscribe(onHeaderMouseEnterHandler);
      grid.onHeaderMouseLeave.unsubscribe(onHeaderMouseLeaveHandler);
      grid.onColumnsResized.unsubscribe(onColumnsResizedHandler);
    };

    $.extend(this, {
      'init': init,
      'destroy': destroy,
    });

    function onDragEndHandler(event, dragData) {
      bypassDefaultActiveCellRangeChange = true;
      grid.setActiveCell(dragData.range.start.row, dragData.range.start.cell);
    }

    function onHeaderClickHandler(event, args) {
      if (isColumnsResizedAndCurrentlyInHeader()) {
        isColumnsResized = false;
        event.stopPropagation();
        return;
      }

      /* Skip if clicked on resize handler */
      if($(event.target).hasClass('slick-resizable-handle')) {
        return;
      }

      bypassDefaultActiveCellRangeChange = true;

      var clickedColumn = args.column.pos + 1;
      if (isClickingLastClickedHeader(0, clickedColumn)) {
        if (isSingleRangeSelected()) {
          grid.resetActiveCell();
        } else {
          grid.setActiveCell(0, retrievePreviousSelectedRange().fromCell);
        }
      } else if (!isClickingInSelectedColumn(clickedColumn)) {
        grid.setActiveCell(0, clickedColumn);
      }
    }

    function isEditableNewRow(row) {
      return row >= grid.getDataLength();
    }

    function onHeaderMouseLeaveHandler() {
      isMouseInHeader = false;
    }

    function onHeaderMouseEnterHandler() {
      isMouseInHeader = true;
      isColumnsResized = false;
    }

    function onColumnsResizedHandler() {
      isColumnsResized = true;
    }

    function onClickHandler(event, args) {
      if (isRowHeader(args.cell)) {
        bypassDefaultActiveCellRangeChange = true;
        var rowClicked = args.row;

        if (isEditableNewRow(rowClicked)) {
          return;
        }

        if (isClickingLastClickedHeader(rowClicked, 1)) {
          if (isSingleRangeSelected()) {
            grid.resetActiveCell();
          } else {
            grid.setActiveCell(retrievePreviousSelectedRange().fromRow, 1);
          }
        } else if (!isClickingInSelectedRow(rowClicked)) {
          grid.setActiveCell(rowClicked, 1);
        }
      }
    }

    function onActiveCellChangedHandler(event) {
      if (bypassDefaultActiveCellRangeChange) {
        bypassDefaultActiveCellRangeChange = false;
        event.stopPropagation();
      }
    }

    function onKeyDownHandler(event) {
      if (hasActiveCell() && isShiftArrowKey(event)) {
        selectOnlyRangeOfActiveCell();
      }
    }

    function isColumnsResizedAndCurrentlyInHeader() {
      return isMouseInHeader && isColumnsResized;
    }

    function isClickingLastClickedHeader(clickedRow, clickedColumn) {
      return hasActiveCell() && grid.getActiveCell().row === clickedRow && grid.getActiveCell().cell === clickedColumn;
    }

    function isClickingInSelectedColumn(clickedColumn) {
      var column = RangeSelectionHelper.rangeForColumn(grid, clickedColumn);
      var cellSelectionModel = grid.getSelectionModel();
      var ranges = cellSelectionModel.getSelectedRanges();
      return RangeSelectionHelper.isRangeSelected(ranges, column);
    }

    function isRowHeader(cellClicked) {
      return grid.getColumns()[cellClicked].id === 'row-header-column';
    }

    function isClickingInSelectedRow(rowClicked) {
      var row = RangeSelectionHelper.rangeForRow(grid, rowClicked);
      var cellSelectionModel = grid.getSelectionModel();
      var ranges = cellSelectionModel.getSelectedRanges();
      return RangeSelectionHelper.isRangeSelected(ranges, row);
    }

    function isSingleRangeSelected() {
      var cellSelectionModel = grid.getSelectionModel();
      var ranges = cellSelectionModel.getSelectedRanges();
      return ranges.length === 1;
    }

    function retrievePreviousSelectedRange() {
      var cellSelectionModel = grid.getSelectionModel();
      var ranges = cellSelectionModel.getSelectedRanges();
      return ranges[ranges.length - 2];
    }

    function isArrowKey(event) {
      return event.which === KEY_RIGHT
        || event.which === KEY_UP
        || event.which === KEY_LEFT
        || event.which === KEY_DOWN;
    }

    function isModifiedByShiftOnly(event) {
      return event.shiftKey
        && !event.ctrlKey
        && !event.altKey;
    }

    function isShiftArrowKey(event) {
      return isModifiedByShiftOnly(event) && isArrowKey(event);
    }

    function hasActiveCell() {
      return !!grid.getActiveCell();
    }

    function selectOnlyRangeOfActiveCell() {
      var cellSelectionModel = grid.getSelectionModel();
      var ranges = cellSelectionModel.getSelectedRanges();

      if (ranges.length > 1) {
        cellSelectionModel.setSelectedRanges([ranges.pop()]);
      }
    }
  };

  return ActiveCellCapture;
});
