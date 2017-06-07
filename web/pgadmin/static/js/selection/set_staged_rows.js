/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2017, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define(
  [
    'jquery',
    'underscore'
  ],
  function ($, _) {
    function disableButton(selector) {
      $(selector).prop('disabled', true);
    }

    function enableButton(selector) {
      $(selector).prop('disabled', false);
    }

    function getRowPrimaryKeyValuesToStage(selectedRows, primaryKeyColumnIndices, gridData) {
      return _.reduce(selectedRows, function (primaryKeyValuesToStage, dataGridRowIndex) {
        var gridRow = gridData[dataGridRowIndex];

        if (isRowMissingPrimaryKeys(gridRow, primaryKeyColumnIndices)) {
          return primaryKeyValuesToStage;
        }

        var tempPK = gridRow.__temp_PK;
        primaryKeyValuesToStage[tempPK] = getSingleRowPrimaryKeyValueToStage(primaryKeyColumnIndices, gridRow);

        return primaryKeyValuesToStage;
      }, {});
    }

    function isRowMissingPrimaryKeys(gridRow, primaryKeyColumnIndices) {
      if (_.isUndefined(gridRow)) {
        return true;
      }

      return !_.isUndefined(
        _.find(primaryKeyColumnIndices, function (pkIndex) {
          return _.isUndefined(gridRow[pkIndex]);
        })
      );
    }

    function getSingleRowPrimaryKeyValueToStage(primaryKeyColumnIndices, gridRow) {
      var rowToStage = {};
      if (primaryKeyColumnIndices.length) {
        _.each(_.keys(gridRow), function (columnPos) {
          if (_.contains(primaryKeyColumnIndices, Number(columnPos)))
            rowToStage[columnPos] = gridRow[columnPos];
        })
      }
      return rowToStage;
    }

    function getPrimaryKeysForSelectedRows(self, selectedRows) {
      var primaryKeyColumnIndices = _.map(_.keys(self.keys), function (columnName) {
        var columnInfo = _.findWhere(self.columns, {name: columnName});
        return columnInfo['pos'];
      });

      var gridData = self.grid.getData();
      var stagedRows = getRowPrimaryKeyValuesToStage(selectedRows, primaryKeyColumnIndices, gridData);

      return stagedRows;
    }

    var setStagedRows = function (e, args) {
      var self = this;

      function setStagedRows(rowsToStage) {
        self.editor.handler.data_store.staged_rows = rowsToStage;
      }

      function isEditMode() {
        return self.editor.handler.can_edit;
      }

      disableButton('#btn-delete-row');
      disableButton('#btn-copy-row');

      if (!_.has(this.selection, 'getSelectedRows')) {
        setStagedRows({});
        return;
      }

      var selectedRows = this.selection.getSelectedRows();

      if (selectedRows.length > 0) {
        var stagedRows = getPrimaryKeysForSelectedRows(self, selectedRows);
        setStagedRows(stagedRows);
        if (_.isEmpty(stagedRows)) {
          this.selection.setSelectedRows([]);
        }

        enableButton('#btn-copy-row');
        if (isEditMode()) {
          enableButton('#btn-delete-row');
        }
      } else {
        setStagedRows({});
      }
    };
    return setStagedRows;
  }
);


