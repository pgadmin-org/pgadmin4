/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import { getExpandedRowModel } from '@tanstack/react-table';

import { getEditCell } from 'sources/components/PgReactTableStyled';
import gettext from 'sources/gettext';
import FormView from 'sources/SchemaView/FormView';

import { SchemaStateContext } from '../../SchemaState';
import { useFieldOptions } from '../../hooks';
import { DataGridRowContext } from '../context';
import { ACTION_COLUMN } from './common';
import Feature from './feature';


export default class ExpandedFormView extends Feature {
  // Always add 'edit' column at the start of the columns list
  // (but - not before the reorder column).
  static priority = 70;

  constructor() {
    super();
    this.canEdit = false;
  }

  generateColumns({columns, columnVisibility, options}) {
    this.canEdit = options.canEdit;

    if (!this.canEdit) return;

    columnVisibility['btn-edit'] = true;

    columns.splice(0, 0, {
      ...ACTION_COLUMN,
      id: 'btn-edit',
      dataType: 'edit',
      cell: getEditCell({
        isDisabled: () => {
          const schemaState = React.useContext(SchemaStateContext);
          const { rowAccessPath } = React.useContext(DataGridRowContext);
          const options = useFieldOptions(rowAccessPath, schemaState);

          return !options.canEditRow;
        },
        title: gettext('Edit row'),
      }),
    });
  }

  onTable({table}) {
    table.setOptions(prev => ({
      ...prev,
      getExpandedRowModel: getExpandedRowModel(),
      state: {
        ...prev.state,
      }
    }));
  }

  onRow({row, expandedRowContents, rowOptions}) {
    const instance = this;

    if (rowOptions.canEditRow && row?.getIsExpanded()) {
      expandedRowContents.splice(
        0, 0, <FormView
          key={`expanded-form-row-${row.id}`}
          value={row?.original}
          viewHelperProps={instance.viewHelperProps}
          dataDispatch={instance.dataDispatch}
          schema={instance.schema}
          accessPath={instance.accessPath.concat([row.index])}
          isNested={true}
          className='DataGridView-expandedForm'
          isDataGridForm={true}
          focusOnFirstInput={true}
        />
      );
    }
  }
}
