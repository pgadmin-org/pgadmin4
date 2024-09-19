/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useContext, useMemo, useState } from 'react';
import _ from 'lodash';
import PropTypes from 'prop-types';

import { evalFunc } from 'sources/utils';

import { MappedCellControl } from '../MappedControl';
import { SCHEMA_STATE_ACTIONS, SchemaStateContext } from '../SchemaState';
import { flatternObject } from '../common';
import {
  useFieldOptions, useFieldValue, useSchemaStateSubscriber
} from '../hooks';
import { listenDepChanges } from '../utils';

import { DataGridContext, DataGridRowContext } from './context';


export function getMappedCell({field}) {
  const Cell = ({reRenderRow, getValue}) => {

    const [, setKey] = useState(0);
    const subscriberManager = useSchemaStateSubscriber(setKey);
    const schemaState = useContext(SchemaStateContext);
    const { dataDispatch, accessPath } = useContext(DataGridContext);
    const { rowAccessPath, row } = useContext(DataGridRowContext);
    const colAccessPath = schemaState.accessPath(rowAccessPath, field.id);

    let colOptions = useFieldOptions(
      colAccessPath, schemaState, subscriberManager
    );
    let value = useFieldValue(colAccessPath, schemaState, subscriberManager);
    let rowValue = useFieldValue(rowAccessPath, schemaState);
    const rerenderCellOnDepChange = (...args) => {
      subscriberManager.current?.signal(...args);
    };

    const depVals = listenDepChanges(
      colAccessPath, field, schemaState, rerenderCellOnDepChange
    );

    if (!field.id) {
      console.error(`No id set for the field: ${field}`);
      value = getValue();
      rowValue = row.original;
      colOptions = { disabled: true, readonly: true };
    } else {
      colOptions = {...colOptions, readonly: !colOptions['editable']};
    }

    let cellProps = {};

    if (_.isFunction(field.cell) && field.id) {
      cellProps = evalFunc(null, field.cell, rowValue);

      if (typeof (cellProps) !== 'object')
        cellProps = {cell: cellProps};
    }

    const props = {
      ...field,
      ...cellProps,
      ...colOptions,
      visible: true,
      rowIndex: row.index,
      value,
      row,
      dataDispatch,
      onCellChange: (changeValue) => {
        if(field.radioType) {
          dataDispatch({
            type: SCHEMA_STATE_ACTIONS.BULK_UPDATE,
            path: accessPath,
            value: changeValue,
            id: field.id
          });
        }
        dataDispatch({
          type: SCHEMA_STATE_ACTIONS.SET_VALUE,
          path: colAccessPath,
          value: changeValue,
        });
      },
      reRenderRow: reRenderRow
    };

    if(_.isUndefined(field.cell)) {
      console.error('cell is required ', field);
      props.cell = 'unknown';
    }

    return useMemo(
      () => <MappedCellControl {...props}/>,
      [...(depVals || []), ...flatternObject(colOptions), value, row.index]
    );
  };

  Cell.displayName = 'Cell';
  Cell.propTypes = {
    reRenderRow: PropTypes.func,
    getValue: PropTypes.func,
  };

  return Cell;
}
