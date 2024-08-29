/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useContext, useMemo, useRef, useState } from 'react';

import { flexRender } from '@tanstack/react-table';

import {
  PgReactTableCell, PgReactTableRowContent, PgReactTableRowExpandContent,
} from 'sources/components/PgReactTableStyled';

import { SchemaStateContext } from '../SchemaState';
import { useFieldOptions } from '../hooks';
import { listenDepChanges } from '../utils';

import { DataGridContext, DataGridRowContext } from './context';


export function DataGridRow({rowId, isResizing}) {
  const [key, setKey] = useState(0);
  const schemaState = useContext(SchemaStateContext);

  const { accessPath, field, options, table, features } = useContext(
    DataGridContext
  );

  const rowAccessPath = schemaState.accessPath(accessPath, rowId);
  const rowOptions = useFieldOptions(rowAccessPath, schemaState, key, setKey);

  const rowRef = useRef(null);
  const row = table.getRowModel().rows[rowId];

  listenDepChanges(rowAccessPath, field, true, schemaState);

  /*
   * Memoize the row to avoid unnecessary re-render. If table data changes,
   * then react-table re-renders the complete tables.
   *
   * We can avoid re-render by if row data has not changed.
   */
  let depsMap = [JSON.stringify(row?.original)];
  let classList = [];
  let attributes = {};
  let expandedRowContents = [];

  features.current?.onRow({
    index: rowId, row, rowRef, classList, attributes, expandedRowContents,
    rowOptions, tableOptions: options
  });

  depsMap = depsMap.concat([
    row?.getIsExpanded(), key, isResizing, expandedRowContents.length
  ]);

  return useMemo(() => (
    !row ? <></> :
      <DataGridRowContext.Provider value={{ rowAccessPath, row }}>
        <PgReactTableRowContent ref={rowRef}
          className={classList.join[' ']}
          data-test='data-table-row' style={{position: 'initial'}}
          {...attributes}
        >
          {
            row?.getVisibleCells().map((cell) => {
              const columnDef = cell.column.columnDef;
              const content = flexRender(
                columnDef.cell, {
                  key: columnDef.cell?.type ?? columnDef.id,
                  row: row,
                  getValue: cell.getValue,
                }
              );

              return (
                <PgReactTableCell cell={cell} row={row} key={cell.id}>
                  {content}
                </PgReactTableCell>
              );
            })
          }
          <div className='hover-overlay'></div>
        </PgReactTableRowContent>
        {
          expandedRowContents.length ?
            <PgReactTableRowExpandContent
              row={row} key={`expanded-row-${row?.id}`}>
              {expandedRowContents}
            </PgReactTableRowExpandContent> : <></>
        }
      </DataGridRowContext.Provider>
  ), depsMap);
}
