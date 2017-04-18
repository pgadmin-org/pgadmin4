define(['jquery', 'sources/selection/range_selection_helper', 'slickgrid'], function ($, rangeSelectionHelper) {
  var RowSelector = function () {
    var Slick = window.Slick;

    var gridEventBus = new Slick.EventHandler();

    var init = function (grid) {
      grid.getSelectionModel()
        .onSelectedRangesChanged.subscribe(handleSelectedRangesChanged.bind(null, grid));
      gridEventBus
        .subscribe(grid.onClick, handleClick.bind(null, grid))
    };

    var handleClick = function (grid, event, args) {
      if (grid.getColumns()[args.cell].id === 'row-header-column') {
        if (event.target.type != "checkbox") {
          var checkbox = $(event.target).find('input[type="checkbox"]');
          toggleCheckbox($(checkbox));
        }
        updateRanges(grid, args.row);
      }
    }

    var handleSelectedRangesChanged = function (grid, event, ranges) {
      $('[data-cell-type="row-header-checkbox"]:checked')
        .each(function (index, checkbox) {
          var $checkbox = $(checkbox);
          var row = parseInt($checkbox.data('row'));
          var isStillSelected = rangeSelectionHelper.isRangeSelected(ranges,
            rangeSelectionHelper.rangeForRow(grid, row));
          if (!isStillSelected) {
            toggleCheckbox($checkbox);
          }
        });
    }

    var updateRanges = function (grid, rowId) {
      var selectionModel = grid.getSelectionModel();
      var ranges = selectionModel.getSelectedRanges();

      var rowRange = rangeSelectionHelper.rangeForRow(grid, rowId);

      var newRanges;
      if (rangeSelectionHelper.isRangeSelected(ranges, rowRange)) {
        newRanges = rangeSelectionHelper.removeRange(ranges, rowRange);
      } else {
        if (rangeSelectionHelper.areAllRangesRows(ranges, grid)) {
          newRanges = rangeSelectionHelper.addRange(ranges, rowRange);
        } else {
          newRanges = [rowRange];
        }
      }
      selectionModel.setSelectedRanges(newRanges);
    }

    var toggleCheckbox = function (checkbox) {
      if (checkbox.prop("checked")) {
        checkbox.prop("checked", false)
      } else {
        checkbox.prop("checked", true)
      }
    };

    var getColumnDefinitionsWithCheckboxes = function (columnDefinitions) {
      columnDefinitions.unshift({
        id: 'row-header-column',
        name: '',
        selectable: false,
        focusable: false,
        formatter: function (rowIndex) {
          return '<input type="checkbox" ' +
            'data-row="' + rowIndex + '" ' +
            'data-cell-type="row-header-checkbox"/>'
        }
      });
      return columnDefinitions;
    };

    $.extend(this, {
      "init": init,
      "getColumnDefinitionsWithCheckboxes": getColumnDefinitionsWithCheckboxes
    });
  };
  return RowSelector;
});
