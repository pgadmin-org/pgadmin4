define(['jquery', 'sources/selection/range_selection_helper', 'slickgrid'], function ($, rangeSelectionHelper) {
  var ColumnSelector = function () {
    var init = function (grid) {
      grid.onHeaderClick.subscribe(function (event, eventArgument) {
          var column = eventArgument.column;

          if (column.selectable !== false) {

            if (!clickedCheckbox(event)) {
              var $checkbox = $("[data-id='checkbox-" + column.id + "']");
              toggleCheckbox($checkbox);
            }

            updateRanges(grid, column.id);
          }
        }
      );
      grid.getSelectionModel().onSelectedRangesChanged
        .subscribe(handleSelectedRangesChanged.bind(null, grid));
    };

    var handleSelectedRangesChanged = function (grid, event, ranges) {
      $('[data-cell-type="column-header-row"] input:checked')
        .each(function (index, checkbox) {
          var $checkbox = $(checkbox);
          var columnIndex = grid.getColumnIndex($checkbox.data('column-id'));
          var isStillSelected = rangeSelectionHelper.isRangeSelected(ranges, rangeSelectionHelper.rangeForColumn(grid, columnIndex));
          if (!isStillSelected) {
            toggleCheckbox($checkbox);
          }
        });
    };

    var updateRanges = function (grid, columnId) {
      var selectionModel = grid.getSelectionModel();
      var ranges = selectionModel.getSelectedRanges();

      var columnIndex = grid.getColumnIndex(columnId);

      var columnRange = rangeSelectionHelper.rangeForColumn(grid, columnIndex);
      var newRanges;
      if (rangeSelectionHelper.isRangeSelected(ranges, columnRange)) {
        newRanges = rangeSelectionHelper.removeRange(ranges, columnRange);
      } else {
        if (rangeSelectionHelper.areAllRangesColumns(ranges, grid)) {
          newRanges = rangeSelectionHelper.addRange(ranges, columnRange);
        } else {
          newRanges = [columnRange];
        }
      }
      selectionModel.setSelectedRanges(newRanges);
    };

    var clickedCheckbox = function (e) {
      return e.target.type == "checkbox"
    };

    var toggleCheckbox = function (checkbox) {
      if (checkbox.prop("checked")) {
        checkbox.prop("checked", false)
      } else {
        checkbox.prop("checked", true)
      }
    };

    var getColumnDefinitionsWithCheckboxes = function (columnDefinitions) {
      return _.map(columnDefinitions, function (columnDefinition) {
        if (columnDefinition.selectable !== false) {
          var name =
            "<span data-cell-type='column-header-row' " +
            "       data-test='output-column-header'>" +
            "  <input data-id='checkbox-" + columnDefinition.id + "' " +
            "         data-column-id='" + columnDefinition.id + "' " +
            "         type='checkbox'/>" +
            "  <span class='column-description'>" + columnDefinition.name + "</span>" +
            "</span>";
          return _.extend(columnDefinition, {
            name: name
          });
        } else {
          return columnDefinition;
        }
      });
    };

    $.extend(this, {
      "init": init,
      "getColumnDefinitionsWithCheckboxes": getColumnDefinitionsWithCheckboxes
    });
  };
  return ColumnSelector;
});
