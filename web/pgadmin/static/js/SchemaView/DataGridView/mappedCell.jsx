/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { useContext, useMemo, useState } from 'react';
import _ from 'lodash';
import PropTypes from 'prop-types';

import { evalFunc } from 'sources/utils';

import { MappedCellControl } from '../MappedControl';
import { SCHEMA_STATE_ACTIONS, SchemaStateContext } from '../SchemaState';
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
    // The whole-row value is only consulted when `field.cell` is a
    // function (passed to evalFunc below) or when the field has no id
    // (the error branch swaps rowValue for row.original). For the common
    // case — string `field.cell` with a valid id — we don't need to read
    // it at all. Skipping the hook removes ~one _.get(data, rowAccessPath)
    // per cell per render.
    let rowValue = (_.isFunction(field.cell) && field.id)
      ? schemaState.value(rowAccessPath)
      : undefined;
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

    // useMemo deps used to be `...flatternObject(colOptions)` — a recursive
    // walk + sort over the full options object on every render. The options
    // that actually drive cell rendering are a fixed, small set (the four
    // registered dynamic options below), so list them explicitly. Anything
    // else a cell needs to react to should come through `depVals` via
    // `field.deps`.
    return useMemo(
      () => <MappedCellControl {...props}/>,
      [
        ...(depVals || []),
        colOptions.disabled,
        colOptions.visible,
        colOptions.readonly,
        colOptions.editable,
        value,
        row.index,
      ]
    );
  };

  Cell.displayName = 'Cell';
  Cell.propTypes = {
    reRenderRow: PropTypes.func,
    getValue: PropTypes.func,
  };

  return Cell;
}
