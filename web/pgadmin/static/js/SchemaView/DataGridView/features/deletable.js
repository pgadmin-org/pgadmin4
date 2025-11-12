/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';

import { getDeleteCell } from 'sources/components/PgReactTableStyled';
import { SCHEMA_STATE_ACTIONS } from 'sources/SchemaView/SchemaState';
import gettext from 'sources/gettext';

import {
  canAddOrDelete, evalIfNotDisabled, registerOptionEvaluator
} from '../../options';

import { SchemaStateContext } from '../../SchemaState';
import { useFieldOptions } from '../../hooks';
import { DataGridRowContext } from '../context';
import { ACTION_COLUMN } from './common';
import Feature from './feature';


// Register the 'canDelete' options for the collection
registerOptionEvaluator('canDelete', canAddOrDelete, false, ['collection']);

// Register the 'canDeleteRow' option for the table row
registerOptionEvaluator('canDeleteRow', evalIfNotDisabled, true, ['row']);


export default class DeletableRow extends Feature {
  // Always add 'edit' column at the start of the columns list
  // (but - not before the reorder column).
  static priority = 50;

  constructor() {
    super();
    this.canDelete = false;
  }

  generateColumns({pgAdmin, columns, columnVisibility, options}) {
    this.canDelete = options.canDelete;

    if (!this.canDelete) return;

    const instance = this;
    const field = instance.field;
    const accessPath = instance.accessPath;
    const dataDispatch = instance.dataDispatch;

    columnVisibility['btn-delete'] = true;

    columns.splice(0, 0, {
      ...ACTION_COLUMN,
      id: 'btn-delete',
      dataType: 'delete',
      cell: getDeleteCell({
        isDisabled: () => {
          const schemaState = React.useContext(SchemaStateContext);
          const { rowAccessPath } = React.useContext(DataGridRowContext);
          const options = useFieldOptions(rowAccessPath, schemaState);

          return !options.canDeleteRow;
        },
        title: gettext('Delete row'),
        onClick: (row) => {
          const deleteRow = () => {
            dataDispatch({
              type: SCHEMA_STATE_ACTIONS.DELETE_ROW,
              path: accessPath,
              value: row.index,
            });
            return true;
          };

          if (field.onDelete){
            field.onDelete(row?.original || {}, deleteRow);
          } else {
            pgAdmin.Browser.notifier.confirm(
              field.customDeleteTitle || gettext('Delete Row'),
              field.customDeleteMsg || gettext(
                'Are you sure you wish to delete this row?'
              ),
              deleteRow,
              function() { return true; }
            );
          }
        },
      }),
    });
  }
}
