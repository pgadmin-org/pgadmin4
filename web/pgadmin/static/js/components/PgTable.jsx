/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
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
import _ from 'lodash';
import gettext from 'sources/gettext';
import SchemaView from '../SchemaView';
import EmptyPanelMessage from './EmptyPanelMessage';
import KeyboardArrowUpIcon from '@material-ui/icons/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';

/* eslint-disable react/display-name */
const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    ...theme.mixins.panelBorder,
    backgroundColor: theme.palette.background.default,
  },
  autoResizerContainer: {
    flexGrow: 1,
    minHeight: 0
  },
  autoResizer: {
    width: '100% !important',
  },
  fixedSizeList: {
    direction: 'ltr',
    overflowX: 'hidden !important',
    overflow: 'overlay !important',
  },
  CustomHeader:{
    marginTop: '8px',
    marginLeft: '4px'
  },
  warning: {
    backgroundColor: theme.palette.warning.main + '!important'
  },
  alert: {
    backgroundColor: theme.palette.error.main + '!important'
  },
  searchInput: {
    minWidth: '300px'
  },
  tableContainer: {
    overflowX: 'auto',
    flexGrow: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: theme.otherVars.emptySpaceBg,
  },
  table: {
    borderSpacing: 0,
    overflow: 'hidden',
    borderRadius: theme.shape.borderRadius,
    border: '1px solid '+theme.otherVars.borderColor,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  pgTableContainer: {
    display: 'flex',
    flexGrow: 1,
    overflow: 'hidden',
    flexDirection: 'column',
    height: '100%',
  },
  pgTableHeader: {
    display: 'flex',
    background: theme.palette.background.default,
    padding: '8px',
  },
  tableRowContent:{
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },

  expandedForm: {
    ...theme.mixins.panelBorder.all,
    margin: '8px',
    flexGrow: 1,
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
    alignContent: 'center',
    backgroundColor: theme.otherVars.tableBg,
    overflow: 'hidden',
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
    overflow: 'auto',
    padding: '8px',
    display: 'flex',
  },
  caveTable: {
    margin: '8px',
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

const ROW_HEIGHT = 35;

function SortIcon ({column}) {
  if (column.isSorted) {
    return column.isSortedDesc ? <KeyboardArrowDownIcon style={{fontSize: '1.2rem'}} /> : <KeyboardArrowUpIcon style={{fontSize: '1.2rem'}} />;
  }
  return '';
}

SortIcon.propTypes = {
  column: PropTypes.object
};

function RenderRow({ index, style, schema, row, prepareRow, setRowHeight, ExpandedComponent }) {
  const [expandComplete, setExpandComplete] = React.useState(false);
  const rowRef = React.useRef() ;
  const classes = useStyles();
  prepareRow(row);

  React.useEffect(()=>{
    if(rowRef.current) {
      if(!expandComplete && rowRef.current.style.height == `${ROW_HEIGHT}px`) {
        return;
      }
      let rowHeight;
      rowRef.current.style.height = 'unset';
      if(expandComplete) {
        rowHeight = rowRef.current.offsetHeight;
      } else {
        rowHeight = ROW_HEIGHT;
        rowRef.current.style.height = ROW_HEIGHT;
      }
      rowRef.current.style.height = rowHeight + 'px';
      setRowHeight(index, rowHeight);
    }
  }, [expandComplete]);

  return (
    <div style={style} key={row.id} ref={rowRef} data-test="row-container">
      <div className={classes.tableRowContent}>
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
              <div key={cell.column.id} {...cell.getCellProps()} className={clsx(classNames, cell.column?.dataClassName, row.original.icon?.[cell.column.id], row.original.icon?.[cell.column.id] && classes.cellIcon)}
                title={_.isUndefined(cell.value) || _.isNull(cell.value) ? '': String(cell.value)}>
                {cell.render('Cell')}
              </div>
            );
          })}
        </div>
        {!_.isUndefined(row) && row.isExpanded && (
          <Box key={row.id} className={classes.expandedForm}>
            {schema && <SchemaView
              getInitData={()=>Promise.resolve({})}
              viewHelperProps={{ mode: 'properties' }}
              schema={schema[row.id]}
              showFooter={false}
              onDataChange={()=>{setExpandComplete(true);}}
            />}
            {ExpandedComponent && <ExpandedComponent row={row} onExpandComplete={()=>setExpandComplete(true)}/>}
          </Box>
        )}
      </div>
    </div>
  );
}
RenderRow.propTypes = {
  index: PropTypes.number,
  style: PropTypes.object,
  row: PropTypes.object,
  schema: PropTypes.object,
  prepareRow: PropTypes.func,
  setRowHeight: PropTypes.func,
  ExpandedComponent: PropTypes.node,
};

export default function PgTable({ columns, data, isSelectRow, caveTable=true, schema, ExpandedComponent, sortOptions, tableProps, ...props }) {
  // Use the state and functions returned from useTable to build your UI
  const classes = useStyles();
  const [searchVal, setSearchVal] = React.useState('');
  const tableRef = React.useRef();
  const rowHeights = React.useRef({});

  // Reset Search value on tab changes.

  React.useEffect(()=>{
    setSearchVal(prevState => (prevState));
    setGlobalFilter(searchVal || undefined);
    rowHeights.current = {};
    tableRef.current?.resetAfterIndex(0);
  }, [data]);

  function getRowHeight(index) {
    return rowHeights.current[index] || ROW_HEIGHT;
  }

  const setRowHeight = (index, size) => {
    if(tableRef.current) {
      if(size == ROW_HEIGHT) {
        delete rowHeights.current[index];
      } else {
        rowHeights.current[index] = size;
      }
      tableRef.current.resetAfterIndex(index);
    }
  };

  const defaultColumn = React.useMemo(
    () => ({
      minWidth: 50,
    }),
    []
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    selectedFlatRows,
    state: { selectedRowIds },
    setGlobalFilter,
    setHiddenColumns,
    totalColumnsWidth
  } = useTable(
    {
      columns,
      data,
      defaultColumn,
      isSelectRow,
      autoResetSortBy: false,
      initialState: {
        sortBy: sortOptions || [],
      },
      ...tableProps,
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
              resizable: false,
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
              sortable: false,
              width: 35,
              maxWidth: 35,
              minWidth: 0
            },
            ...CLOUMNS,
          ];
        } else {
          return [...CLOUMNS];
        }
      });
    }
  );

  React.useEffect(() => {
    setHiddenColumns(
      columns
        .filter((column) => {
          return !(column.isVisible === undefined || column.isVisible === true);
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

  // Render the UI for your table
  return (
    <Box className={classes.pgTableContainer} data-test={props['data-test']}>
      <Box className={classes.pgTableHeader}>
        {props.CustomHeader && (<Box className={classes.customHeader}> <props.CustomHeader /></Box>)}
        <Box marginLeft="auto">
          <InputText
            placeholder={'Search'}
            className={classes.searchInput}
            value={searchVal}
            onChange={(val) => {
              setSearchVal(val);
            }}
          />
        </Box>
      </Box>
      <div className={classes.tableContainer}>
        <div {...getTableProps({style:{minWidth: totalColumnsWidth}})} className={clsx(classes.table, caveTable ? classes.caveTable : '')}>
          <div>
            {headerGroups.map((headerGroup) => (
              <div key={''} {...headerGroup.getHeaderGroupProps((column)=>({
                style: {
                  ...column.style,
                  height: '40px',
                }
              }))}>
                {headerGroup.headers.map((column) => (
                  <div
                    key={column.id}
                    {...column.getHeaderProps()}
                    className={clsx(classes.tableCellHeader, column.className)}
                  >
                    <div
                      {...(column.sortable ? column.getSortByToggleProps() : {})}
                    >
                      {column.render('Header')}
                      <span>
                        <SortIcon column={column} />
                      </span>
                    </div>
                    {column.resizable && (
                      <div
                        {...column.getResizerProps()}
                        className={classes.resizer}
                      />
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
          {
            data.length > 0 ? (
              <div {...getTableBodyProps()} className={classes.autoResizerContainer}>
                <AutoSizer
                  className={classes.autoResizer}
                >
                  {({ height }) => (
                    <VariableSizeList
                      ref={tableRef}
                      className={classes.fixedSizeList}
                      height={height}
                      itemCount={rows.length}
                      itemSize={getRowHeight}
                      itemData={{rows, prepareRow, setRowHeight}}
                    >
                      {({index, style})=>(
                        <RenderRow index={index} style={style} row={rows[index]} schema={schema} prepareRow={prepareRow}
                          setRowHeight={setRowHeight} ExpandedComponent={ExpandedComponent} />
                      )}
                    </VariableSizeList>)}
                </AutoSizer>
              </div>
            ) : (
              <EmptyPanelMessage text={gettext('No rows found')}/>
            )
          }
        </div>
      </div>
    </Box>
  );
}

PgTable.propTypes = {
  stepId: PropTypes.number,
  height: PropTypes.number,
  CustomHeader: PropTypes.func,
  className: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  caveTable: PropTypes.bool,
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
  sortOptions: PropTypes.array,
  schema: PropTypes.object,
  rows: PropTypes.object,
  ExpandedComponent: PropTypes.node,
  tableProps: PropTypes.object,
  'data-test': PropTypes.string
};
