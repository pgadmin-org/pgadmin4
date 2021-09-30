/* eslint-disable react/display-name */
/* eslint-disable react/prop-types */

import React from 'react';
import { useTable, useRowSelect, useSortBy, useResizeColumns, useFlexLayout, useGlobalFilter } from 'react-table';
import { FixedSizeList } from 'react-window';
import { makeStyles } from '@material-ui/core/styles';
import clsx from 'clsx';
import PropTypes from 'prop-types';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Checkbox } from '@material-ui/core';

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    ...theme.mixins.panelBorder,
    backgroundColor: theme.palette.background.default,
  },
  autoResizer: {
    height: '100% !important',
    width: '100% !important',
  },
  table: {
    borderSpacing: 0,
    width: '100%',
    overflow: 'hidden',
    height: '99.7%',
    backgroundColor: theme.otherVars.tableBg,
    ...theme.mixins.panelBorder,
    //backgroundColor: theme.palette.background.default,
  },

  tableCell: {
    margin: 0,
    padding: theme.spacing(0.5),
    ...theme.mixins.panelBorder.bottom,
    ...theme.mixins.panelBorder.right,
    position: 'relative',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  selectCell: {
    textAlign: 'center'
  },
  tableCellHeader: {
    fontWeight: theme.typography.fontWeightBold,
    padding: theme.spacing(1, 0.5),
    textAlign: 'left',
    overflowY: 'auto',
    overflowX: 'hidden',
    alignContent: 'center',
    ...theme.mixins.panelBorder.bottom,
    ...theme.mixins.panelBorder.right,
  },
  resizer: {
    display: 'inline-block',
    width: '5px',
    height: '100%',
    position: 'absolute',
    right: 0,
    top: 0,
    transform: 'translateX(50%)',
    zIndex: 1,
    touchAction: 'none',
  },
  cellIcon: {
    paddingLeft: '1.5em',
    height: 35
  }
}),
);

export default function PgTable({ columns, data, isSelectRow, ...props }) {
  // Use the state and functions returned from useTable to build your UI
  const classes = useStyles();
  const defaultColumn = React.useMemo(
    () => ({
      minWidth: 150,
    }),
    []
  );

  const IndeterminateCheckbox = React.forwardRef(
    ({ indeterminate, ...rest }, ref) => {
      const defaultRef = React.useRef();
      const resolvedRef = ref || defaultRef;

      React.useEffect(() => {
        resolvedRef.current.indeterminate = indeterminate;
      }, [resolvedRef, indeterminate]);
      return (
        <>
          <Checkbox
            color="primary"
            ref={resolvedRef} {...rest} />
        </>
      );
    },
  );

  IndeterminateCheckbox.displayName = 'SelectCheckbox';

  IndeterminateCheckbox.propTypes = {
    indeterminate: PropTypes.bool,
    rest: PropTypes.func,
    getToggleAllRowsSelectedProps: PropTypes.func,
    row: PropTypes.object,
  };

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    selectedFlatRows,
    state: { selectedRowIds },
    setGlobalFilter,
    setHiddenColumns
  } = useTable(
    {
      columns,
      data,
      defaultColumn,
      isSelectRow,
    },
    useGlobalFilter,
    useSortBy,
    useRowSelect,
    useResizeColumns,
    useFlexLayout,
    hooks => {
      hooks.visibleColumns.push(CLOUMNS => {
        if (isSelectRow) {
          return [
            // Let's make a column for selection
            {
              id: 'selection',
              // The header can use the table's getToggleAllRowsSelectedProps method
              // to render a checkbox
              Header: ({ getToggleAllRowsSelectedProps }) => (
                <div className={classes.selectCell}>
                  <IndeterminateCheckbox {...getToggleAllRowsSelectedProps()} />
                </div>
              ),
              // The cell can use the individual row's getToggleRowSelectedProps method
              // to the render a checkbox
              Cell: ({ row }) => (
                <div className={classes.selectCell}>
                  <IndeterminateCheckbox {...row.getToggleRowSelectedProps()} />
                </div>
              ),
              sortble: false,
              width: 50,
              minWidth: 0,
            },
            ...CLOUMNS,
          ];
        } else {
          return [...CLOUMNS];
        }
      });
      hooks.useInstanceBeforeDimensions.push(({ headerGroups }) => {
        // fix the parent group of the selection button to not be resizable
        const selectionGroupHeader = headerGroups[0].headers[0];
        selectionGroupHeader.resizable = false;
      });
    }
  );

  React.useEffect(() => {
    setHiddenColumns(
      columns
        .filter((column) => {
          if (column.isVisible === undefined || columns.isVisible === true) {
            return false;
          } else{
            return true;
          }
        }
        )
        .map((column) => column.accessor)
    );
  }, [setHiddenColumns, columns]);

  React.useEffect(() => {
    if (props.setSelectedRows) {
      props.setSelectedRows(selectedFlatRows);
    }
  }, [selectedRowIds]);

  React.useEffect(() => {
    if (props.getSelectedRows) {
      props.getSelectedRows(selectedFlatRows);
    }
  }, [selectedRowIds]);

  React.useEffect(() => {
    setGlobalFilter(props.searchText || undefined);
  }, [props.searchText]);


  const RenderRow = React.useCallback(
    ({ index, style }) => {
      const row = rows[index];
      prepareRow(row);
      return (
        <div
          {...row.getRowProps({
            style,
          })}
          className={classes.tr}
        >
          {row.cells.map((cell) => {
            return (
              <div key={cell.column.id} {...cell.getCellProps()} className={clsx(classes.tableCell, row.original.icon && row.original.icon[cell.column.id], row.original.icon[cell.column.id] && classes.cellIcon)} title={cell.value}>
                {cell.render('Cell')}
              </div>
            );
          })}
        </div>
      );
    },
    [prepareRow, rows, selectedRowIds]
  );
  // Render the UI for your table
  return (
    <AutoSizer className={classes.autoResizer}>
      {({ height }) => (
        <div {...getTableProps()} className={classes.table}>
          <div>
            {headerGroups.map(headerGroup => (
              <div key={''} {...headerGroup.getHeaderGroupProps()}>
                {headerGroup.headers.map(column => (
                  <div key={column.id} {...column.getHeaderProps()} className={clsx(classes.tableCellHeader, column.className)}>
                    <div {...(column.sortble ? column.getSortByToggleProps() : {})}>
                      {column.render('Header')}
                      <span>
                        {column.isSorted
                          ? column.isSortedDesc
                            ? ' 🔽'
                            : ' 🔼'
                          : ''}
                      </span>
                      {column.resizable &&
                        <div
                          {...column.getResizerProps()}
                          className={classes.resizer}
                        />}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div {...getTableBodyProps()}>

            <FixedSizeList
              height={height - 75}
              itemCount={rows.length}
              itemSize={35}
              sorted={props?.sortOptions}
            >
              {RenderRow}
            </FixedSizeList>

          </div>
        </div>
      )}
    </AutoSizer>
  );
}

PgTable.propTypes = {
  stepId: PropTypes.number,
  height: PropTypes.number,
  className: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  children: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.node), PropTypes.node]),
  getToggleAllRowsSelectedProps: PropTypes.func,
};


