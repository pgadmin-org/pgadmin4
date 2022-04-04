/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2022, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import {
  useTable,
  useRowSelect,
  useSortBy,
  useResizeColumns,
  useFlexLayout,
  useGlobalFilter,
  useExpanded,
} from 'react-table';
import { VariableSizeList } from 'react-window';
import { makeStyles } from '@material-ui/core/styles';
import clsx from 'clsx';
import PropTypes from 'prop-types';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Checkbox, Box } from '@material-ui/core';
import { InputText } from './FormComponents';
import FormView from 'sources/SchemaView';
import _ from 'lodash';
import gettext from 'sources/gettext';

/* eslint-disable react/display-name */
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
  fixedSizeList: {
    direction: 'ltr',
    overflowX: 'hidden !important',
    overflow: 'overlay !important',
  },
  customHeader:{
    marginTop: '8px',
    marginLeft: '4px'
  },
  searchBox: {
    marginBottom: '5px',
    display: 'flex',
    background: theme.palette.background.default
  },
  warning: {
    backgroundColor: theme.palette.warning.main + '!important'
  },
  alert: {
    backgroundColor: theme.palette.error.main + '!important'
  },

  tableContentWidth: {
    width: 'calc(100% - 3px)',
  },
  searchPadding: {
    flex: 2.5
  },
  searchInput: {
    flex: 1,
    marginTop: 8,
    borderLeft: 'none',
    paddingLeft: 5,
    marginRight: 8,
    marginBottom: 8,

  },
  table: {
    flexGrow: 1,
    minHeight: 0,
    borderSpacing: 0,
    width: '100%',
    overflow: 'hidden',
    borderRadius: theme.shape.borderRadius,
    border: '1px solid'+ theme.palette.grey[400]
  },
  pgTableHeadar: {
    display: 'flex',
    flexGrow: 1,
    overflow: 'hidden !important',
    height: '100% !important',
    flexDirection: 'column'
  },

  expandedForm: {
    ...theme.mixins.panelBorder,
    margin: '8px',
    paddingBottom: '12px',
    marginRight: '15px',
  },

  tableCell: {
    margin: 0,
    padding: theme.spacing(0.5),
    ...theme.mixins.panelBorder.bottom,
    ...theme.mixins.panelBorder.right,
    position: 'relative',
    overflow: 'hidden',
    height: '35px',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    backgroundColor: theme.otherVars.tableBg,
    userSelect: 'text'
  },
  selectCell: {
    textAlign: 'center',
    minWidth: 20
  },
  tableCellHeader: {
    fontWeight: theme.typography.fontWeightBold,
    padding: theme.spacing(1, 0.5),
    textAlign: 'left',
    overflowY: 'auto',
    overflowX: 'hidden',
    alignContent: 'center',
    backgroundColor: theme.otherVars.tableBg,
    ...theme.mixins.panelBorder.bottom,
    ...theme.mixins.panelBorder.right,
    ...theme.mixins.panelBorder.top,
    ...theme.mixins.panelBorder.left,
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
    paddingLeft: '1.8em',
    paddingTop: '0.35em',
    height: 35,
    backgroundPosition: '1%',
  },
  emptyPanel: {
    minHeight: '100%',
    minWidth: '100%',
    background: theme.palette.background.default,
    overflow: 'auto',
    padding: '7.5px',
  },
  panelIcon: {
    width: '80%',
    margin: '0 auto',
    marginTop: '25px !important',
    position: 'relative',
    textAlign: 'center',
  },
  panelMessage: {
    marginLeft: '0.5rem',
    fontSize: '0.875rem',
  },
  expandedIconCell: {
    backgroundColor: theme.palette.grey[400],
    ...theme.mixins.panelBorder.top,
    borderBottom: 'none',
  },
  btnCell: {
    padding: theme.spacing(0.5, 0),
    textAlign: 'center',
  },
}));

export default function PgTable({ columns, data, isSelectRow, offset=105, ...props }) {
  // Use the state and functions returned from useTable to build your UI
  const classes = useStyles();
  const [searchVal, setSearchVal] = React.useState('');
  const tableRef = React.useRef();
  const rowHeights = React.useRef({});
  const rowRef = React.useRef({});

  // Reset Search vakue in tab changed.
  React.useEffect(()=>{
    setSearchVal('');
  },[columns]);
  function getRowHeight(index, size) {
    return rowHeights.current[index] + size || 35;
  }

  const setRowHeight = React.useCallback((index, size) => {
    if(tableRef.current) {
      tableRef.current.resetAfterIndex(index);
      if (!(rowHeights.current.hasOwnProperty(index))){
        rowHeights.current = { ...rowHeights.current, [index]: size };
      }
    }
  }, []);

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
            ref={resolvedRef} {...rest}
          />
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
    state: { selectedRowIds, expanded },
    setGlobalFilter,
    setHiddenColumns,
  } = useTable(
    {
      columns,
      data,
      defaultColumn,
      isSelectRow,
    },
    useGlobalFilter,
    useSortBy,
    useExpanded,
    useRowSelect,
    useResizeColumns,
    useFlexLayout,
    (hooks) => {
      hooks.visibleColumns.push((CLOUMNS) => {
        if (isSelectRow) {
          return [
            // Let's make a column for selection
            {
              id: 'selection',
              // The header can use the table's getToggleAllRowsSelectedProps method
              // to render a checkbox
              Header: ({ getToggleAllRowsSelectedProps, toggleRowSelected, isAllRowsSelected, rows }) => {

                const modifiedOnChange = (event) => {
                  rows.forEach((row) => {
                    //check each row if it is not disabled
                    !(!_.isUndefined(row.original.canDrop) && !(row.original.canDrop)) && toggleRowSelected(row.id, event.currentTarget.checked);

                  });
                };

                let allTableRows = 0;
                let selectedTableRows = 0;
                rows.forEach((row) => {
                  row.isSelected && selectedTableRows++;
                  (_.isUndefined(row.original.canDrop) || row.original.canDrop) && allTableRows++;
                });
                const disabled = allTableRows === 0;
                const checked =
                    (isAllRowsSelected ||
                      allTableRows === selectedTableRows) &&
                    !disabled;
                return(
                  <div className={classes.selectCell}>
                    <IndeterminateCheckbox {...getToggleAllRowsSelectedProps()
                    }
                    onChange={modifiedOnChange}
                    checked={checked}
                    />
                  </div>
                );},
              // The cell can use the individual row's getToggleRowSelectedProps method
              // to the render a checkbox
              Cell: ({ row }) => (
                <div className={classes.selectCell}>
                  <IndeterminateCheckbox {...row.getToggleRowSelectedProps()}
                    disabled={!_.isUndefined(row.original.canDrop) ? !(row.original.canDrop) : false}
                  />
                </div>
              ),
              sortble: false,
              width: 30,
              maxWidth: 30,
              minWidth: 0
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

  React.useEffect(()=>{
    tableRef.current?.resetAfterIndex(0);
  },[expanded]);


  React.useEffect(() => {
    setHiddenColumns(
      columns
        .filter((column) => {
          if (column.isVisible === undefined || column.isVisible === true) {
            return false;
          }
          return true;
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
    setGlobalFilter(searchVal || undefined);
  }, [searchVal]);

  const RenderRow = React.useCallback(
    ({ index, style }) => {
      const row = rows[index];
      prepareRow(row);
      return (
        <div className={classes.tableContentWidth} style={style} key={row.id}>
          <div {...row.getRowProps()} className={classes.tr}>
            {row.cells.map((cell) => {
              let classNames = [classes.tableCell];
              if(typeof(cell.column.id) == 'string' && cell.column.id.startsWith('btn-')) {
                classNames.push(classes.btnCell);
              }
              if(cell.column.id == 'btn-edit' && row.isExpanded) {
                classNames.push(classes.expandedIconCell);
              }
              if (row.original.row_type === 'warning'){
                classNames.push(classes.warning);
              }
              if (row.original.row_type === 'alert'){
                classNames.push(classes.alert);
              }
              return (
                <div key={cell.column.id} {...cell.getCellProps()} className={clsx(classNames, row.original.icon && row.original.icon[cell.column.id], row.original.icon[cell.column.id] && classes.cellIcon)}
                  title={_.isUndefined(cell.value) || _.isNull(cell.value) ? '': String(cell.value)}>
                  {cell.render('Cell')}
                </div>
              );
            })}
          </div>
          {!_.isUndefined(row) && row.isExpanded && (
            <Box key={row.id} className={classes.expandedForm} ref={rowRef} style={{height: rowHeights.current[index]}}>
              <FormView
                getInitData={() => {
                  /*This is intentional (SonarQube)*/
                }}
                viewHelperProps={{ mode: 'properties' }}
                schema={props.schema[row.id]}
                showFooter={false}
                onDataChange={() => { }}
              />
            </Box>
          )}
        </div>
      );
    },
    [prepareRow, rows, selectedRowIds]
  );
  // Render the UI for your table
  return (
    <Box className={classes.pgTableHeadar}>
      <Box className={classes.searchBox}>
        {props.customHeader && (<Box className={classes.customHeader}> <props.customHeader /></Box>)}
        <Box className={classes.searchPadding}></Box>
        <InputText
          placeholder={'Search'}
          className={classes.searchInput}
          value={searchVal}
          onChange={(val) => {
            setSearchVal(val);
          }}
        />
      </Box>
      <AutoSizer
        className={props.type === 'panel' ? props.className : classes.autoResizer}
      >
        {({ height }) => (
          <div {...getTableProps()} className={classes.table}>
            <div>
              {headerGroups.map((headerGroup) => (
                <div key={''} {...headerGroup.getHeaderGroupProps()}>
                  {headerGroup.headers.map((column) => (
                    <div
                      key={column.id}
                      {...column.getHeaderProps()}
                      className={clsx(classes.tableCellHeader, column.className)}
                    >
                      <div
                        {...(column.sortble ? column.getSortByToggleProps() : {})}
                      >
                        {column.render('Header')}
                        <span>
                          {column.isSorted
                            ? column.isSortedDesc
                              ? ' 🔽'
                              : ' 🔼'
                            : ''}
                        </span>
                        {column.resizable && (
                          <div
                            {...column.getResizerProps()}
                            className={classes.resizer}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {
              data.length > 0 ? (
                <div {...getTableBodyProps()} >
                  <VariableSizeList
                    ref={tableRef}
                    className={props.type === 'dashboard' ? props.fixedSizeList : classes.fixedSizeList}
                    height={height - offset}
                    itemCount={rows.length}
                    itemSize={(i) => {
                      if (_.isUndefined(rows[i].isExpanded)) {
                        rows[i].isExpanded = false;
                      }
                      if (rowRef.current && rows[i].isExpanded) {
                        setRowHeight(i, rowRef.current.offsetHeight + 35);
                      }
                      return rows[i].isExpanded ? getRowHeight(i, 35) : 35;
                    }}
                    sorted={props?.sortOptions}
                  >
                    {RenderRow}

                  </VariableSizeList>
                </div>
              ) : (

                <div className={classes.emptyPanel}>
                  <div className={classes.panelIcon}>
                    <i className="fa fa-exclamation-circle"></i>
                    <span className={classes.panelMessage}>{gettext('No record found')}</span>
                  </div>

                </div>
              )}
          </div>
        )}
      </AutoSizer>
    </Box>
  );
}

PgTable.propTypes = {
  stepId: PropTypes.number,
  height: PropTypes.number,
  offset: PropTypes.number,
  customHeader: PropTypes.func,
  className: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  fixedSizeList: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node,
  ]),
  getToggleAllRowsSelectedProps: PropTypes.func,
  toggleRowSelected: PropTypes.func,
  columns: PropTypes.array,
  data: PropTypes.array,
  isSelectRow: PropTypes.bool,
  isAllRowsSelected: PropTypes.bool,
  row: PropTypes.func,
  setSelectedRows: PropTypes.func,
  getSelectedRows: PropTypes.func,
  searchText: PropTypes.string,
  type: PropTypes.string,
  sortOptions: PropTypes.array,
  schema: PropTypes.object,
  rows: PropTypes.object
};
