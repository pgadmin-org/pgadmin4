define(['jquery',
    'sources/selection/column_selector',
    'sources/selection/row_selector',
    'sources/selection/range_selection_helper'],
  function ($, ColumnSelector, RowSelector, RangeSelectionHelper) {
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

      var getColumnDefinitions = function (columnDefinitions) {
        columnDefinitions = columnSelector.getColumnDefinitions(columnDefinitions);
        columnDefinitions = rowSelector.getColumnDefinitions(columnDefinitions);

        columnDefinitions[0].selectAllOnClick = true;
        columnDefinitions[0].name = '<span data-id="select-all" ' +
          'title="Select/Deselect All">' +
          '<br>' +
          columnDefinitions[0].name +
          '<img class="select-all-icon" src="/static/img/select-all-icon.png">' +
        '</span>';
        return columnDefinitions;
      };

      function handleSelectedRangesChanged(grid) {
        if(RangeSelectionHelper.isEntireGridSelected(grid)) {
          $("[data-id='select-all']").addClass("selected");
        } else {
          $("[data-id='select-all']").removeClass("selected");
        }
      }

      function toggleSelectAll(grid) {
        if (RangeSelectionHelper.isEntireGridSelected(grid)) {
          selectNone(grid);
        } else {
          RangeSelectionHelper.selectAll(grid);
        }
      }

      function selectNone(grid) {
        var selectionModel = grid.getSelectionModel();
        selectionModel.setSelectedRanges([]);
      }

      $.extend(this, {
        "init": init,
        "getColumnDefinitions": getColumnDefinitions
      });
    };

    return GridSelector;
  });
