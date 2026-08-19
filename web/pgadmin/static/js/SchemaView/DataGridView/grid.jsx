/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import {
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

import { usePgAdmin } from 'sources/PgAdminProvider';
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

  // Virtualising a small grid buys nothing (there's no offscreen window to
  // skip rendering) but still pays for measureElement's per-row
  // getBoundingClientRect on every mount/remeasure. That remeasure is
  // exactly what fires when a dialog tab holding the grid is hidden via
  // `display: none` and then shown again, since the scroll viewport
  // momentarily measures 0 and the virtualizer's ResizeObserver treats
  // that as a real resize. Below the threshold we skip virtualisation
  // entirely and render every row in normal document flow, so showing a
  // hidden tab is a pure CSS toggle again.
  const virtualiseThreshold = viewHelperProps.virtualiseThreshold ?? 100;
  const shouldVirtualise = rows.length > virtualiseThreshold;

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableEleRef.current,
    estimateSize: () => 50,
    measureElement:
      shouldVirtualise &&
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
              <PgReactTableBody style={
                shouldVirtualise ? {height: virtualizer.getTotalSize() + 'px'} : undefined
              }>
                {
                  (
                    shouldVirtualise
                      ? virtualizer.getVirtualItems()
                      : rows.map((_row, index) => ({index, start: 0}))
                  ).map((virtualRow) => {
                    const row = rows[virtualRow.index];
                    return (
                      <PgReactTableRow
                        key={row.id}
                        data-index={virtualRow.index}
                        ref={shouldVirtualise ? node => virtualizer.measureElement(node) : undefined}
                        className={shouldVirtualise ? undefined : 'pgrt-row--static'}
                        style={
                          shouldVirtualise ? {
                            // This should always be a `style` as it changes
                            // on scroll.
                            transform: `translateY(${virtualRow.start}px)`,
                          } : undefined
                        }
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
