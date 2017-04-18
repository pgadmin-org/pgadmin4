define(['jquery', 'sources/selection/column_selector', 'sources/selection/row_selector'],
  function ($, ColumnSelector, RowSelector) {
    var Slick = window.Slick;

    var GridSelector = function (columnDefinitions) {
      var rowSelector = new RowSelector(columnDefinitions);
      var columnSelector = new ColumnSelector(columnDefinitions);

      var init = function (grid) {
        this.grid = grid;
        grid.onHeaderClick.subscribe(function (event, eventArguments) {
          if (eventArguments.column.selectAllOnClick) {
            toggleSelectAll(grid);
          }
        });

        grid.getSelectionModel().onSelectedRangesChanged
          .subscribe(handleSelectedRangesChanged.bind(null, grid));
        grid.registerPlugin(rowSelector);
        grid.registerPlugin(columnSelector);
      };

      var getColumnDefinitionsWithCheckboxes = function (columnDefinitions) {
        columnDefinitions = columnSelector.getColumnDefinitionsWithCheckboxes(columnDefinitions);
        columnDefinitions = rowSelector.getColumnDefinitionsWithCheckboxes(columnDefinitions);

        columnDefinitions[0].selectAllOnClick = true;
        columnDefinitions[0].name = '<input type="checkbox" data-id="checkbox-select-all" ' +
          'title="Select/Deselect All"/>' + columnDefinitions[0].name;
        return columnDefinitions;
      };

      function handleSelectedRangesChanged(grid) {
        $("[data-id='checkbox-select-all']").prop("checked", isEntireGridSelected(grid));
      }

      function isEntireGridSelected(grid) {
        var selectionModel = grid.getSelectionModel();
        var selectedRanges = selectionModel.getSelectedRanges();
        return selectedRanges.length == 1 && isSameRange(selectedRanges[0], getRangeOfWholeGrid(grid));
      }

      function toggleSelectAll(grid) {
        if (isEntireGridSelected(grid)) {
          deselect(grid);
        } else {
          selectAll(grid)
        }
      }

      var isSameRange = function (range, otherRange) {
        return range.fromCell == otherRange.fromCell && range.toCell == otherRange.toCell &&
          range.fromRow == otherRange.fromRow && range.toRow == otherRange.toRow;
      };

      function getRangeOfWholeGrid(grid) {
        return new Slick.Range(0, 1, grid.getDataLength() - 1, grid.getColumns().length - 1);
      }

      function deselect(grid) {
        var selectionModel = grid.getSelectionModel();
        selectionModel.setSelectedRanges([]);
      }

      function selectAll(grid) {
        var range = getRangeOfWholeGrid(grid);
        var selectionModel = grid.getSelectionModel();

        selectionModel.setSelectedRanges([range]);
      }

      $.extend(this, {
        "init": init,
        "getColumnDefinitionsWithCheckboxes": getColumnDefinitionsWithCheckboxes
      });
    };

    return GridSelector;
  });
