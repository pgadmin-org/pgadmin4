/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define(['jquery',
  'sources/gettext',
  'sources/selection/column_selector',
  'sources/selection/row_selector',
  'sources/selection/range_selection_helper',
  'sources/url_for',
], function ($, gettext, ColumnSelector, RowSelector, RangeSelectionHelper, url_for) {
  var GridSelector = function (columnDefinitions) {
    var Slick = window.Slick,
      rowSelector = new RowSelector(columnDefinitions),
      columnSelector = new ColumnSelector(columnDefinitions),
      onBeforeGridSelectAll = new Slick.Event(),
      onGridSelectAll = new Slick.Event(),
      onBeforeGridColumnSelectAll = columnSelector.onBeforeColumnSelectAll,
      onGridColumnSelectAll = columnSelector.onColumnSelectAll;

    var init = function (grid) {
      this.grid = grid;
      grid.onHeaderClick.subscribe(function (event, eventArguments) {
        if (eventArguments.column.selectAllOnClick && !$(event.target).hasClass('slick-resizable-handle')) {
          toggleSelectAll(grid, event, eventArguments);
        }
      });

      grid.getSelectionModel().onSelectedRangesChanged
        .subscribe(handleSelectedRangesChanged.bind(null, grid));

      grid.registerPlugin(rowSelector);
      grid.registerPlugin(columnSelector);

      onGridSelectAll.subscribe(function(e, args) {
        RangeSelectionHelper.selectAll(args.grid);
      });
    };

    var getColumnDefinitions = function (columnDefinition) {
      columnDefinition = columnSelector.getColumnDefinitions(columnDefinition);
      columnDefinition = rowSelector.getColumnDefinitions(columnDefinition);

      columnDefinition[0].selectAllOnClick = true;
      columnDefinition[0].name = '<span data-id="select-all" ' +
          'title="' + gettext('Select/Deselect All') + '">' +
          '<br>' +
          columnDefinition[0].name +
          '<img class="select-all-icon" src="' + url_for('static', {'filename': 'img/select-all-icon.png'}) + '"></img>' +
      '</span>';
      return columnDefinition;
    };

    function handleSelectedRangesChanged(grid) {
      if(RangeSelectionHelper.isEntireGridSelected(grid)) {
        $('[data-id=\'select-all\']').addClass('selected');
      } else {
        $('[data-id=\'select-all\']').removeClass('selected');
      }
    }

    function toggleSelectAll(grid, event, eventArguments) {
      if (RangeSelectionHelper.isEntireGridSelected(grid)) {
        selectNone(grid);
      } else {
        onBeforeGridSelectAll.notify(eventArguments, event);
        if (!(event.isPropagationStopped() || event.isImmediatePropagationStopped())) {
          RangeSelectionHelper.selectAll(grid);
        }
      }
    }

    function selectNone(grid) {
      var selectionModel = grid.getSelectionModel();
      selectionModel.setSelectedRanges([]);
    }

    $.extend(this, {
      'init': init,
      'getColumnDefinitions': getColumnDefinitions,
      'onBeforeGridSelectAll': onBeforeGridSelectAll,
      'onGridSelectAll': onGridSelectAll,
      'onBeforeGridColumnSelectAll': onBeforeGridColumnSelectAll,
      'onGridColumnSelectAll': onGridColumnSelectAll,
    });
  };

  return GridSelector;
});
