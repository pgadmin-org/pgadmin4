/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define(
  [
    'jquery',
    'underscore',
    'sources/selection/range_selection_helper',
  ],
  function ($, _, RangeSelectionHelper) {
    function disableButton(selector) {
      $(selector).prop('disabled', true);
    }

    function enableButton(selector) {
      $(selector).prop('disabled', false);
    }

    function getRowPrimaryKeyValuesToStage(selectedRows, primaryKeys, dataView, client_primary_key) {
      return _.reduce(selectedRows, function (primaryKeyValuesToStage, dataGridRowIndex) {
        var gridRow = dataView.getItem(dataGridRowIndex);
        if (isRowMissingPrimaryKeys(gridRow, primaryKeys)) {
          return primaryKeyValuesToStage;
        }
        var tempPK = gridRow[client_primary_key];
        primaryKeyValuesToStage[tempPK] = getSingleRowPrimaryKeyValueToStage(primaryKeys, gridRow);
        return primaryKeyValuesToStage;
      }, {});
    }

    function isRowMissingPrimaryKeys(gridRow, primaryKeys) {
      if (_.isUndefined(gridRow)) {
        return true;
      }

      return !_.isUndefined(
        _.find(primaryKeys , function (pk) {
          return _.isUndefined(gridRow[pk]);
        })
      );
    }

    function getSingleRowPrimaryKeyValueToStage(primaryKeys, gridRow) {
      var rowToStage = {};
      if (primaryKeys && primaryKeys.length) {
        _.each(_.keys(gridRow), function (columnNames) {
          if (_.contains(primaryKeys, columnNames))
            rowToStage[columnNames] = gridRow[columnNames];
        });
      }
      return rowToStage;
    }

    function getPrimaryKeysForSelectedRows(self, selectedRows) {
      var dataView = self.grid.getData();
      var stagedRows = getRowPrimaryKeyValuesToStage(selectedRows, _.keys(self.keys), dataView, self.client_primary_key);
      return stagedRows;
    }

    var setStagedRows = function () {
      var self = this;

      function setStagedRows(rowsToStage) {
        self.editor.handler.data_store.staged_rows = rowsToStage;
      }

      function isEditMode() {
        return self.editor.handler.can_edit;
      }

      disableButton('#btn-delete-row');
      disableButton('#btn-copy-row');

      function areAllSelectionsEntireRows() {
        return RangeSelectionHelper.areAllRangesCompleteRows(self.grid,
          self.selection.getSelectedRanges());
      }

      var selectedRanges = this.selection.getSelectedRanges();

      if (selectedRanges.length > 0) {
        enableButton('#btn-copy-row');
      }

      if (areAllSelectionsEntireRows()) {
        var selectedRows = RangeSelectionHelper.getIndexesOfCompleteRows(this.grid, this.selection.getSelectedRanges());
        var stagedRows = getPrimaryKeysForSelectedRows(self, selectedRows);
        setStagedRows(stagedRows);
        if (_.isEmpty(stagedRows)) {
          this.selection.setSelectedRows([]);
        }

        if (isEditMode() && !_.isEmpty(stagedRows)) {
          enableButton('#btn-delete-row');
        }
      } else {
        setStagedRows({});
      }
    };
    return setStagedRows;
  }
);
