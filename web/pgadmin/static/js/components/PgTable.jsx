/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useMemo, useRef } from 'react';
import _ from 'lodash';

import Box from '@mui/material/Box';
import { styled } from '@mui/material/styles';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getExpandedRowModel,
  flexRender,
} from '@tanstack/react-table';
import {
  QueryClient,
  QueryClientProvider,
  useInfiniteQuery,
  keepPreviousData,
} from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import PropTypes from 'prop-types';

import {
  BaseUISchema, FormView, SchemaStateContext, useSchemaState, prepareData,
} from 'sources/SchemaView';
import gettext from 'sources/gettext';

import EmptyPanelMessage from './EmptyPanelMessage';
import { InputText } from './FormComponents';
import { PgReactTable, PgReactTableBody, PgReactTableCell, PgReactTableHeader, PgReactTableRow, PgReactTableRowContent, PgReactTableRowExpandContent, getCheckboxCell, getCheckboxHeaderCell } from './PgReactTableStyled';


const ROW_HEIGHT = 30;

function TableRow({index, style, schema, row, measureElement}) {
  const rowRef = React.useRef();

  React.useEffect(() => {
    if (rowRef.current) {
      if (rowRef.current.style.height == `${ROW_HEIGHT}px`) return;
      measureElement(rowRef.current);
    }
  }, [row.getIsExpanded()]);

  return (
    <PgReactTableRow data-index={index} ref={rowRef} style={style}>
      <PgReactTableRowContent>
        {row.getVisibleCells().map((cell) => {
          const content = flexRender(cell.column.columnDef.cell, cell.getContext());

          return (
            <PgReactTableCell cell={cell} row={row} key={cell.id}>
              {content}
            </PgReactTableCell>
          );
        })}
      </PgReactTableRowContent>
      <PgReactTableRowExpandContent row={row}>
        <FormView
          accessPath={['data', row.index]}
          schema={schema}
          viewHelperProps={{ mode: 'properties' }}
        />
      </PgReactTableRowExpandContent>
    </PgReactTableRow>
  );
}
TableRow.propTypes = {
  index: PropTypes.number,
  style: PropTypes.object,
  row: PropTypes.object,
  schema: PropTypes.object,
  measureElement: PropTypes.func,
};


class TableUISchema extends BaseUISchema {
  constructor(rowSchema) {
    super();
    this.rowSchema = rowSchema;
  }

  get baseFields() {
    return [{
      id: 'data', type: 'collection', mode: ['properties'],
      schema: this.rowSchema,
    }];
  }
}

const getTableSchema = (schema) => {;
  if (!schema) return null;
  if (!schema.top) schema.top = new TableUISchema(schema);
  return schema.top;
};

export function Table({
  columns, data, hasSelectRow, schema, sortOptions, tableProps, searchVal,
  loadNextPage, ...props
}) {
  const { schemaState } = useSchemaState({
    schema: getTableSchema(schema),
    getInitData: null,
    viewHelperProps: {mode: 'properties'},
  });

  // We don't care about validation in static table, hence - initialising the
  // data directly.
  if (data.length && schemaState) {
    schemaState.initData = schemaState.data = prepareData({'data': data});
  }

  const defaultColumn = React.useMemo(
    () => ({
      size: 150,
      minSize: 100,
      maxSize: 1200,
    }),
    []
  );

  const finalColumns = useMemo(() => (hasSelectRow ? [{
    id: 'selection',
    header: getCheckboxCell({
      title: gettext('Select All Rows'),
    }),
    cell: getCheckboxHeaderCell({
      title: gettext('Select Row'),
    }),
    enableSorting: false,
    enableResizing: false,
    maxSize: 35,
  }] : []).concat(
    columns.filter(
      (c) => _.isUndefined(c.enableVisibility) ? true : c.enableVisibility
    ).map((c) => ({
      ...c,
      // if data is null then global search doesn't work
      // Use accessorFn to return empty string if data is null.
      accessorFn: c.accessorFn ?? (
        c.accessorKey ? (row) => row[c.accessorKey] ?? '' : undefined
      ),
    }))
  ), [hasSelectRow, columns]);

  // Render the UI for your table
  const tableRef = useRef();
  let flatData = [];
  let fetchMoreOnBottomReached;
  let totalFetched = 0;
  let totalDBRowCount = 0;

  // Infinite scrolling
  const { _data, fetchNextPage, isFetching } = useInfiniteQuery({
    queryKey: ['logs'],
    queryFn: async () => {
      const fetchedData = loadNextPage ? await loadNextPage() : [];
      return fetchedData;
    },
    initialPageParam: 0,
    getNextPageParam: (_lastGroup, groups) => groups.length,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  flatData = _data || [];
  totalFetched = flatData.length;

  // Called on scroll and possibly on mount to fetch more data as the user
  // scrolls and reaches bottom of table.
  fetchMoreOnBottomReached = React.useCallback(
    (containerRefElement = HTMLDivElement | null) => {
      if (containerRefElement) {
        const { scrollHeight, scrollTop, clientHeight } = containerRefElement;
        //once the user has scrolled within 500px of the bottom of the table, fetch more data if we can
        if (
          scrollHeight - scrollTop - clientHeight < 500 &&
          !isFetching
        ) {
          fetchNextPage();
        }
      }
    },
    [fetchNextPage, isFetching, totalFetched, totalDBRowCount]
  );

  //a check on mount and after a fetch to see if the table is already scrolled to the bottom and immediately needs to fetch more data
  React.useEffect(() => {
    fetchMoreOnBottomReached(tableRef.current);
  }, [fetchMoreOnBottomReached]);

  const table = useReactTable({
    columns: finalColumns,
    data: flatData.length >0 ? flatData : data,
    defaultColumn,
    autoResetAll: false,
    initialState: {
      sorting: sortOptions || [],
    },
    state: {
      rowSelection: props.selectedRows ?? {},
      globalFilter: searchVal,
    },
    columnResizeMode: 'onChange',
    onRowSelectionChange: props.setSelectedRows,
    enableRowSelection: (row) => (hasSelectRow && (_.isUndefined(row.original.canDrop) ? true : row.original.canDrop)),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    ...tableProps,
  });

  const rows = table.getRowModel().rows;

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableRef.current,
    estimateSize: () => ROW_HEIGHT,
    measureElement:
      typeof window !== 'undefined' &&
        navigator.userAgent.indexOf('Firefox') === -1
        ? element => element?.getBoundingClientRect().height
        : undefined,
    overscan: 20,
  });

  return (
    <SchemaStateContext.Provider value={schemaState}>
      <PgReactTable
        ref={tableRef} table={table}
        onScrollFunc={loadNextPage?fetchMoreOnBottomReached: null }
      >
        <PgReactTableHeader table={table} />
        {rows.length == 0 ? <EmptyPanelMessage
          text={gettext('No rows found')} style={{height:'auto'}}/> :
          <PgReactTableBody
            style={{ height: virtualizer.getTotalSize() + 'px'}}>
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index];
              return <TableRow
                index={virtualRow.index} key={virtualRow.index}
                row={row} schema={schema}
                measureElement={virtualizer.measureElement}
                style={{
                  // This should always be a `style` as it changes on scroll.
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              />;
            })}
          </PgReactTableBody>}
      </PgReactTable>
    </SchemaStateContext.Provider>
  );
}
Table.propTypes = {
  columns: PropTypes.array,
  data: PropTypes.array,
  hasSelectRow: PropTypes.bool,
  schema: PropTypes.object,
  sortOptions: PropTypes.arrayOf(PropTypes.object),
  tableProps: PropTypes.object,
  selectedRows: PropTypes.object,
  setSelectedRows: PropTypes.func,
  searchVal: PropTypes.string,
  loadNextPage: PropTypes.func,
};

const StyledPgTableRoot = styled('div')(({theme})=>({
  display: 'flex',
  flexGrow: 1,
  overflow: 'hidden',
  flexDirection: 'column',
  height: '100%',
  '& .pgtable-header': {
    display: 'flex',
    background: theme.palette.background.default,
    padding: '8px 2px 4px',

    '& .pgtable-search-input': {
      minWidth: '300px'
    },
  },
  '& .pgtable-body': {
    flexGrow: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: theme.otherVars.emptySpaceBg,
  },
  '&.pgtable-pgrt-border': {
    '& .pgrt': {
      border: '1px solid ' + theme.otherVars.borderColor,
    }
  },
  '&.pgtable-pgrt-cave': {
    '& .pgtable-body': {
      padding: '8px',
    },
    '& .pgtable-header': {
      padding: '8px 8px 4px',
    },
    '& .pgrt': {
      border: '1px solid ' + theme.otherVars.borderColor,
    }
  },
}));

const queryClient = new QueryClient();

export default function PgTable({ caveTable = true, tableNoBorder = true, tableNoHeader=false, ...props }) {
  const [searchVal, setSearchVal] = React.useState('');

  return (
    <QueryClientProvider client={queryClient}>
      <StyledPgTableRoot className={[tableNoBorder ? '' : 'pgtable-pgrt-border', caveTable ? 'pgtable-pgrt-cave' : ''].join(' ')} data-test={props['data-test']}>
        {!tableNoHeader && <Box className='pgtable-header'>
          {props.customHeader && (<Box className={['pgtable-custom-header-section', props['className']].join(' ')}> {props.customHeader }</Box>)}
          <Box marginLeft="auto">
            <InputText
              placeholder={gettext('Search')}
              controlProps={{ title: gettext('Search') }}
              className='pgtable-search-input'
              value={searchVal}
              onChange={(val) => {
                setSearchVal(val);
              }}
            />
          </Box>
        </Box>}
        <div className={'pgtable-body'} >
          <Table {...props} searchVal={searchVal}/>
        </div>
      </StyledPgTableRoot>
    </QueryClientProvider>
  );
}

PgTable.propTypes = {
  customHeader: PropTypes.element,
  caveTable: PropTypes.bool,
  tableNoBorder: PropTypes.bool,
  tableNoHeader: PropTypes.bool,
  'data-test': PropTypes.string,
  'className': PropTypes.string
};
