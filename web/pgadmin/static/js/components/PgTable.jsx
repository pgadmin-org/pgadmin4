/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useMemo, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getExpandedRowModel,
  flexRender,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { styled } from '@mui/material/styles';
import PropTypes from 'prop-types';
import { Checkbox, Box } from '@mui/material';
import { InputText } from './FormComponents';
import _ from 'lodash';
import gettext from 'sources/gettext';
import SchemaView from '../SchemaView';
import EmptyPanelMessage from './EmptyPanelMessage';
import { PgReactTable, PgReactTableBody, PgReactTableCell, PgReactTableHeader, PgReactTableRow, PgReactTableRowContent, PgReactTableRowExpandContent } from './PgReactTableStyled';

const ROW_HEIGHT = 30;
function TableRow({ index, style, schema, row, measureElement}) {
  const [expandComplete, setExpandComplete] = React.useState(false);
  const rowRef = React.useRef();

  React.useEffect(() => {
    if (rowRef.current) {
      if (!expandComplete && rowRef.current.style.height == `${ROW_HEIGHT}px`) {
        return;
      }
      measureElement(rowRef.current);
    }
  }, [row.getIsExpanded(), expandComplete]);

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
        <SchemaView
          getInitData={() => Promise.resolve(row.original)}
          viewHelperProps={{ mode: 'properties' }}
          schema={schema}
          showFooter={false}
          onDataChange={() => { setExpandComplete(true); }}
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

export function Table({ columns, data, hasSelectRow, schema, sortOptions, tableProps, searchVal, ...props }) {
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
    header: ({ table }) => {
      return (
        <div style={{textAlign: 'center', minWidth: 20}}>
          <Checkbox
            color="primary"
            checked={table.getIsAllRowsSelected()}
            indeterminate={table.getIsSomeRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
            inputProps={{ 'aria-label': gettext('Select All Rows') }}
          />
        </div>
      );
    },
    cell: ({ row }) => (
      <div style={{textAlign: 'center', minWidth: 20}}>
        <Checkbox
          color="primary"
          checked={row.getIsSelected()}
          indeterminate={row.getIsSomeSelected()}
          disabled={!row.getCanSelect()}
          onChange={row.getToggleSelectedHandler()}
          inputProps={{ 'aria-label': gettext('Select Row') }}
        />
      </div>
    ),
    enableSorting: false,
    enableResizing: false,
    maxSize: 35,
  }] : []).concat(
    columns.filter((c)=>_.isUndefined(c.enableVisibility) ? true : c.enableVisibility).map((c)=>({
      ...c,
      // if data is null then global search doesn't work
      // Use accessorFn to return empty string if data is null.
      accessorFn: c.accessorFn ?? (c.accessorKey ? (row)=>row[c.accessorKey] ?? '' : undefined),
    }))
  ), [hasSelectRow, columns]);

  // Render the UI for your table
  const tableRef = useRef();

  const table = useReactTable({
    columns: finalColumns,
    data,
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
    <PgReactTable ref={tableRef} table={table}>
      <PgReactTableHeader table={table} />
      {rows.length == 0 ?
        <EmptyPanelMessage text={gettext('No rows found')} /> :
        <PgReactTableBody style={{ height: virtualizer.getTotalSize() + 'px'}}>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index];
            return <TableRow index={row.index} key={row.index} row={row} schema={schema}
              measureElement={virtualizer.measureElement}
              style={{
                transform: `translateY(${virtualRow.start}px)`, //this should always be a `style` as it changes on scroll
              }}
            />;
          })}
        </PgReactTableBody>}
    </PgReactTable>
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

export default function PgTable({ caveTable = true, tableNoBorder = true, ...props }) {
  const [searchVal, setSearchVal] = React.useState('');

  return (
    <StyledPgTableRoot className={[tableNoBorder ? '' : 'pgtable-pgrt-border', caveTable ? 'pgtable-pgrt-cave' : ''].join(' ')} data-test={props['data-test']}>
      <Box className='pgtable-header'>
        {props.CustomHeader && (<Box className={['pgtable-custom-header-section', props['className']].join(' ')}> <props.CustomHeader /></Box>)}
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
      </Box>
      <div className={'pgtable-body'}>
        <Table {...props} searchVal={searchVal} />
      </div>
    </StyledPgTableRoot>
  );
}

PgTable.propTypes = {
  CustomHeader: PropTypes.func,
  caveTable: PropTypes.bool,
  tableNoBorder: PropTypes.bool,
  'data-test': PropTypes.string,
  'className': PropTypes.string
};
