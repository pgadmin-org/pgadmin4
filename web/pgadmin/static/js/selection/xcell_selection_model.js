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
  'sources/selection/range_selection_helper',
  'sources/window',
  'slickgrid',
], function ($, _, RangeSelectionHelper, pgWindow) {
  var XCellSelectionModel = function (options) {

    var KEY_ARROW_RIGHT = 39;
    var KEY_ARROW_LEFT = 37;
    var KEY_ARROW_UP = 38;
    var KEY_ARROW_DOWN = 40;

    var Slick = window.Slick;
    var _grid;
    var _ranges = [];
    var _self = this;
    var _selector = new Slick.CellRangeSelector({
      selectionCss: {
        border: '2px solid black',
      },
      offset: {
        top: 0,
        left: -1,
        height: 2,
        width: 1,
      },
    });
    var _options;
    var _defaults = {
      selectActiveCell: true,
    };


    function init(grid) {
      _options = $.extend(true, {}, _defaults, options);
      _grid = grid;
      _grid.onActiveCellChanged.subscribe(handleActiveCellChange);
      _grid.onKeyDown.subscribe(handleKeyDown);
      grid.registerPlugin(_selector);
      _selector.onCellRangeSelected.subscribe(handleCellRangeSelected);
      _selector.onBeforeCellRangeSelected.subscribe(handleBeforeCellRangeSelected);
      $(pgWindow.default).on('mouseup',handleWindowMouseUp);
    }

    function destroy() {
      _grid.onActiveCellChanged.unsubscribe(handleActiveCellChange);
      _grid.onKeyDown.unsubscribe(handleKeyDown);
      _selector.onCellRangeSelected.unsubscribe(handleCellRangeSelected);
      _selector.onBeforeCellRangeSelected.unsubscribe(handleBeforeCellRangeSelected);
      _grid.unregisterPlugin(_selector);
      $(pgWindow.default).off('mouseup', handleWindowMouseUp);
    }

    function removeInvalidRanges(ranges) {
      var result = [];

      for (var i = 0; i < ranges.length; i++) {
        var r = ranges[i];
        if (_grid.canCellBeSelected(r.fromRow, r.fromCell) && _grid.canCellBeSelected(r.toRow, r.toCell)) {
          result.push(r);
        }
      }

      return result;
    }

    function setSelectedRanges(ranges) {
      // simple check for: empty selection didn't change, prevent firing onSelectedRangesChanged
      if ((!_ranges || _ranges.length === 0) && (!ranges || ranges.length === 0)) { return; }

      _ranges = removeInvalidRanges(ranges);
      _self.onSelectedRangesChanged.notify(_ranges);
    }

    function getSelectedRanges() {
      return _ranges;
    }

    function setSelectedRows(rows) {
      _ranges = [];

      for(var i = 0 ; i < rows.length ; i++) {
        _ranges.push(RangeSelectionHelper.rangeForRow(_grid, rows[i]));
      }
    }

    function handleBeforeCellRangeSelected(e) {
      if (_grid.getEditorLock().isActive()) {
        e.stopPropagation();
        return false;
      }
    }

    function handleCellRangeSelected(e, args) {
      setSelectedRanges([args.range]);
    }

    function handleActiveCellChange(e, args) {
      if (_options.selectActiveCell && args.row != null && args.cell != null) {
        setSelectedRanges([new Slick.Range(args.row, args.cell)]);
      }
    }

    function arrowKeyPressed(event) {
      return event.which == KEY_ARROW_RIGHT
        || event.which == KEY_ARROW_LEFT
        || event.which == KEY_ARROW_UP
        || event.which == KEY_ARROW_DOWN;
    }

    function shiftArrowKeyPressed(event) {
      return event.shiftKey && !event.ctrlKey && !event.altKey &&
        (arrowKeyPressed(event));
    }

    function needUpdateRange(newRange) {
      return removeInvalidRanges([newRange]).length;
    }

    function handleKeyDown(e) {
      var ranges;
      var lastSelectedRange;
      var anchorActiveCell = _grid.getActiveCell();

      function isKey(key) { return e.which === key; }

      function getKeycode() { return e.which; }

      function shouldScrollToBottommostRow() { return anchorActiveCell.row === newSelectedRange.fromRow; }

      function shouldScrollToRightmostColumn() { return anchorActiveCell.cell === newSelectedRange.fromCell; }

      function getMobileCellFromRange(range, activeCell) {
        var localMobileCell = {};

        localMobileCell.row = range.fromRow === activeCell.row ? range.toRow : range.fromRow;
        localMobileCell.cell = range.fromCell === activeCell.cell ? range.toCell : range.fromCell;

        return localMobileCell;
      }

      function getNewRange(rangeCorner, oppositeCorner) {
        var newFromCell = rangeCorner.cell <= oppositeCorner.cell ? rangeCorner.cell : oppositeCorner.cell;
        var newToCell = rangeCorner.cell <= oppositeCorner.cell ? oppositeCorner.cell : rangeCorner.cell;

        var newFromRow = rangeCorner.row <= oppositeCorner.row ? rangeCorner.row : oppositeCorner.row;
        var newToRow = rangeCorner.row <= oppositeCorner.row ? oppositeCorner.row : rangeCorner.row;

        return new Slick.Range(
          newFromRow,
          newFromCell,
          newToRow,
          newToCell
        );
      }

      if (anchorActiveCell && shiftArrowKeyPressed(e)) {
        ranges = getSelectedRanges();
        if (!ranges.length) {
          ranges.push(new Slick.Range(anchorActiveCell.row, anchorActiveCell.cell));
        }

        // keyboard can work with last range only
        lastSelectedRange = ranges.pop();

        // can't handle selection out of active cell
        if (!lastSelectedRange.contains(anchorActiveCell.row, anchorActiveCell.cell)) {
          lastSelectedRange = new Slick.Range(anchorActiveCell.row, anchorActiveCell.cell);
        }

        var mobileCell = getMobileCellFromRange(lastSelectedRange, anchorActiveCell);

        switch (getKeycode()) {
        case KEY_ARROW_LEFT:
          mobileCell.cell -= 1;
          break;
        case KEY_ARROW_RIGHT:
          mobileCell.cell += 1;
          break;
        case KEY_ARROW_UP:
          mobileCell.row -= 1;
          break;
        case KEY_ARROW_DOWN:
          mobileCell.row += 1;
          break;
        }

        var newSelectedRange = getNewRange(anchorActiveCell, mobileCell);

        if (needUpdateRange(newSelectedRange)) {
          var rowToView = shouldScrollToBottommostRow() ? newSelectedRange.toRow : newSelectedRange.fromRow;
          var columnToView = shouldScrollToRightmostColumn() ? newSelectedRange.toCell : newSelectedRange.fromCell;

          if (isKey(KEY_ARROW_RIGHT) || isKey(KEY_ARROW_LEFT)) {
            _grid.scrollColumnIntoView(columnToView);
          } else if (isKey(KEY_ARROW_UP) || isKey(KEY_ARROW_DOWN)) {
            _grid.scrollRowIntoView(rowToView);
          }
          ranges.push(newSelectedRange);
        } else {
          ranges.push(lastSelectedRange);
        }

        setSelectedRanges(ranges);

        e.preventDefault();
        e.stopPropagation();
      }
    }

    function handleWindowMouseUp() {
      var selectedRange = _selector.getCurrentRange();
      if (!_.isUndefined(selectedRange)) {
        _grid.onDragEnd.notify({range: selectedRange});
      }
    }

    $.extend(this, {
      'getSelectedRanges': getSelectedRanges,
      'setSelectedRanges': setSelectedRanges,
      'setSelectedRows': setSelectedRows,

      'init': init,
      'destroy': destroy,

      'onSelectedRangesChanged': new Slick.Event(),
    });
  };
  return XCellSelectionModel;
});
