/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, {
  useContext, useEffect, useMemo, useRef, useState,
} from 'react';

import Box from '@mui/material/Box';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import _ from 'lodash';
import PropTypes from 'prop-types';
import { DndProvider } from 'react-dnd';
import {HTML5Backend} from 'react-dnd-html5-backend';

import { usePgAdmin } from 'sources/BrowserComponent';
import {
  PgReactTable, PgReactTableBody, PgReactTableHeader,
  PgReactTableRow, 
} from 'sources/components/PgReactTableStyled';
import CustomPropTypes from 'sources/custom_prop_types';

import { StyleDataGridBox } from '../StyledComponents';
import { SchemaStateContext } from '../SchemaState';
import {
  useFieldOptions, useFieldValue, useSchemaStateSubscriber,
} from '../hooks';
import { registerView } from '../registry';
import { listenDepChanges } from '../utils';

import { DataGridContext } from './context';
import { DataGridHeader } from './header';
import { DataGridRow } from './row';
import { FeatureSet } from './features';
import { createGridColumns, GRID_STATE } from './utils';


export default function DataGridView({
  field, viewHelperProps, accessPath, dataDispatch, containerClassName
}) {
  const pgAdmin = usePgAdmin();
  const [refreshKey, setRefreshKey] = useState(0);
  const subscriberManager = useSchemaStateSubscriber(setRefreshKey);
  const schemaState = useContext(SchemaStateContext);
  const options = useFieldOptions(accessPath, schemaState, subscriberManager);
  const value = useFieldValue(accessPath, schemaState);
  const schema = field.schema;
  const features = useRef();

  // Update refresh key on changing the number of rows.
  useFieldValue(
    [...accessPath, 'length'], schemaState, subscriberManager
  );

  useEffect(() => {
    return schemaState.subscribe(
      accessPath.concat(GRID_STATE),
      () => setRefreshKey(Date.now()), 'states'
    );
  }, [refreshKey]);

  // We won't refresh the whole grid on dependent changes.
  listenDepChanges(accessPath, field, schemaState);

  if (!features.current) {
    features.current = new FeatureSet();
  };

  features.current.setContext({
    accessPath, field, schema: schema, dataDispatch, viewHelperProps,
    schemaState,
  });

  const [columns, columnVisibility] = useMemo(() => {

    const [columns, columnVisibility] = createGridColumns({
      schema, field, accessPath, viewHelperProps, dataDispatch,
    });

    features.current?.generateColumns({
      pgAdmin, columns, columnVisibility, options
    });

    return [columns, columnVisibility];

  }, [options]);

  const table = useReactTable({
    columns: columns|| [],
    data: value || [],
    autoResetAll: false,
    state: {
      columnVisibility: columnVisibility || {},
    },
    columnResizeMode: 'onChange',
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const classList = [].concat(containerClassName);
  features.current?.onTable({table, classList, options});

  const rows = table.getRowModel().rows;
  const tableEleRef = useRef();

  const isResizing = _.flatMap(
    table.getHeaderGroups(),
    headerGroup => headerGroup.headers.map(
      header => header.column.getIsResizing()
    )
  ).includes(true);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableEleRef.current,
    estimateSize: () => 50,
    measureElement:
      typeof window !== 'undefined' &&
        navigator.userAgent.indexOf('Firefox') === -1
        ? element => element?.getBoundingClientRect().height
        : undefined,
    overscan: viewHelperProps.virtualiseOverscan ?? 10,
  });

  const GridHeader = field.GridHeader || DataGridHeader;
  const GridRow = field.GridRow || DataGridRow;

  if (!options.visible) return (<></>);

  return (
    <DataGridContext.Provider value={{
      table, accessPath, virtualizer, field, dataDispatch, features, options,
      viewHelperProps,
    }}>
      <StyleDataGridBox className={classList.join(' ')}>
        <Box className='DataGridView-grid'>
          <GridHeader tableEleRef={tableEleRef} rows={rows} />
          <DndProvider backend={HTML5Backend}>
            <PgReactTable
              ref={tableEleRef} table={table} data-test="data-grid-view"
              tableClassName='DataGridView-table'>
              <PgReactTableHeader table={table} />
              <PgReactTableBody style={{
                height: virtualizer.getTotalSize() + 'px'
              }}>
                {
                  virtualizer.getVirtualItems().map((virtualRow) => {
                    const row = rows[virtualRow.index];
                    return (
                      <PgReactTableRow
                        key={row.id}
                        data-index={virtualRow.index}
                        ref={node => virtualizer.measureElement(node)}
                        style={{
                          // This should always be a `style` as it changes on
                          // scroll.
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                        <GridRow
                          rowId={virtualRow.index} isResizing={isResizing}
                          row={row}
                        />
                      </PgReactTableRow>
                    );
                  })
                }
              </PgReactTableBody>
            </PgReactTable>
          </DndProvider>
        </Box>
      </StyleDataGridBox>
    </DataGridContext.Provider>
  );
}

DataGridView.propTypes = {
  viewHelperProps: PropTypes.object,
  schema: CustomPropTypes.schemaUI,
  accessPath: PropTypes.array.isRequired,
  dataDispatch: PropTypes.func,
  containerClassName: PropTypes.oneOfType([
    PropTypes.object, PropTypes.string
  ]),
  field: PropTypes.object,
};

registerView(DataGridView, 'DataGridView');
