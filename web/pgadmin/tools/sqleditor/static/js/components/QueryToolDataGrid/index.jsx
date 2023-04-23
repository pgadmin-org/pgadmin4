/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import { Box, makeStyles } from '@material-ui/core';
import _ from 'lodash';
import React, {useState, useEffect, useContext, useRef, useLayoutEffect} from 'react';
import {Row, useRowSelection} from 'react-data-grid';
import LockIcon from '@material-ui/icons/Lock';
import EditIcon from '@material-ui/icons/Edit';
import { QUERY_TOOL_EVENTS } from '../QueryToolConstants';
import * as Editors from './Editors';
import * as Formatters from './Formatters';
import clsx from 'clsx';
import { PgIconButton } from '../../../../../../static/js/components/Buttons';
import MapIcon from '@material-ui/icons/Map';
import { QueryToolEventsContext } from '../QueryToolComponent';
import PropTypes from 'prop-types';
import gettext from 'sources/gettext';
import PgReactDataGrid from '../../../../../../static/js/components/PgReactDataGrid';

export const ROWNUM_KEY = '$_pgadmin_rownum_key_$';
export const GRID_ROW_SELECT_KEY = '$_pgadmin_gridrowselect_key_$';

const useStyles = makeStyles((theme)=>({
  columnHeader: {
    padding: '3px 6px',
    height: '100%',
    display: 'flex',
    lineHeight: '16px',
    alignItems: 'center',
    fontWeight: 'normal',
  },
  columnName: {
    fontWeight: 'bold',
  },
  editedCell: {
    fontWeight: 'bold',
  },
  deletedRow: {
    '&:before': {
      content: '" "',
      position: 'absolute',
      top: '50%',
      left: 0,
      borderTop: '1px solid ' + theme.palette.error.main,
      width: '100%',
    }
  },
  rowNumCell: {
    padding: '0px 8px',
  },
  colHeaderSelected: {
    outlineColor: theme.palette.primary.main,
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
  },
  colSelected: {
    outlineColor: theme.palette.primary.main,
    backgroundColor: theme.palette.primary.light,
    color: theme.otherVars.qtDatagridSelectFg,
  }
}));

export const RowInfoContext = React.createContext();
export const DataGridExtrasContext = React.createContext();

function CustomRow(props) {
  const rowRef = useRef();
  const dataGridExtras = useContext(DataGridExtrasContext);
  const rowInfoValue = {
    rowIdx: props.rowIdx,
    getCellElement: (colIdx)=>{
      return rowRef.current?.querySelector(`.rdg-cell[aria-colindex="${colIdx+1}"]`);
    }
  };
  if(!props.isRowSelected && props.selectedCellIdx > 0) {
    dataGridExtras.onSelectedCellChange?.([props.row, props.viewportColumns?.find(columns => columns.idx === props.selectedCellIdx)]);
  } else if(props.selectedCellIdx == 0) {
    dataGridExtras.onSelectedCellChange?.(null);
  }
  const openEditorOnEnter = (e)=>{
    if(e.code === 'Enter' && !props.isRowSelected && props.selectedCellIdx > 0) {
      props.selectCell(props.row, props.viewportColumns?.find(columns => columns.idx === props.selectedCellIdx), true);
    }
  };
  return (
    <RowInfoContext.Provider value={rowInfoValue}>
      <Row ref={rowRef} onKeyDown={openEditorOnEnter} {...props} />
    </RowInfoContext.Provider>
  );
}

CustomRow.propTypes = {
  rowIdx: PropTypes.number,
  isRowSelected: PropTypes.bool,
  selectedCellIdx: PropTypes.number,
  row: PropTypes.object,
  viewportColumns: PropTypes.array,
  selectCell: PropTypes.func,
};

function getCopyShortcutHandler(handleCopy) {
  return (e)=>{
    if((e.ctrlKey || e.metaKey) && e.key !== 'Control' && e.keyCode == 67) {
      handleCopy();
    }
  };
}

function SelectAllHeaderRenderer({onAllRowsSelectionChange, isCellSelected}) {
  const [checked, setChecked] = useState(false);
  const cellRef = useRef();
  const eventBus = useContext(QueryToolEventsContext);
  const dataGridExtras = useContext(DataGridExtrasContext);
  const onClick = ()=>{
    eventBus.fireEvent(QUERY_TOOL_EVENTS.FETCH_MORE_ROWS, true, ()=>{
      setChecked(!checked);
      onAllRowsSelectionChange(!checked);
    });
  };

  useLayoutEffect(() => {
    if (!isCellSelected) return;
    cellRef.current?.focus({ preventScroll: true });
  }, [isCellSelected]);

  return <div ref={cellRef} style={{width: '100%', height: '100%'}} onClick={onClick}
    tabIndex="0" onKeyDown={getCopyShortcutHandler(dataGridExtras.handleCopy)}></div>;
}
SelectAllHeaderRenderer.propTypes = {
  onAllRowsSelectionChange: PropTypes.func,
  isCellSelected: PropTypes.bool,
};

function SelectableHeaderRenderer({column, selectedColumns, onSelectedColumnsChange, isCellSelected}) {
  const classes = useStyles();
  const cellRef = useRef();
  const eventBus = useContext(QueryToolEventsContext);
  const dataGridExtras = useContext(DataGridExtrasContext);

  if(isCellSelected) {
    dataGridExtras.onSelectedCellChange?.(null);
  }

  const onClick = ()=>{
    eventBus.fireEvent(QUERY_TOOL_EVENTS.FETCH_MORE_ROWS, true, ()=>{
      const newSelectedCols = new Set(selectedColumns);
      if (newSelectedCols.has(column.idx)) {
        newSelectedCols.delete(column.idx);
      } else {
        newSelectedCols.add(column.idx);
      }
      onSelectedColumnsChange(newSelectedCols);
    });
  };

  const isSelected = selectedColumns.has(column.idx);

  useLayoutEffect(() => {
    if (!isCellSelected) return;
    cellRef.current?.focus({ preventScroll: true });
  }, [isCellSelected]);

  return (
    <Box ref={cellRef} className={clsx(classes.columnHeader, isSelected ? classes.colHeaderSelected : null)} onClick={onClick} tabIndex="0"
      onKeyDown={getCopyShortcutHandler(dataGridExtras.handleCopy)} data-column-key={column.key}>
      {(column.column_type_internal == 'geometry' || column.column_type_internal == 'geography') &&
      <Box>
        <PgIconButton title={gettext('View all geometries in this column')} icon={<MapIcon data-label="MapIcon"/>} size="small" style={{marginRight: '0.25rem'}} onClick={(e)=>{
          e.stopPropagation();
          eventBus.fireEvent(QUERY_TOOL_EVENTS.TRIGGER_RENDER_GEOMETRIES, column);
        }}/>
      </Box>}
      <Box marginRight="auto">
        <span className={classes.columnName}>{column.display_name}</span><br/>
        <span>{column.display_type}</span>
      </Box>
      <Box marginLeft="4px">{column.can_edit ?
        <EditIcon fontSize="small" style={{fontSize: '0.875rem'}} data-label="EditIcon"/>:
        <LockIcon fontSize="small" style={{fontSize: '0.875rem'}} data-label="LockIcon"/>
      }</Box>
    </Box>
  );
}
SelectableHeaderRenderer.propTypes = {
  column: PropTypes.object,
  selectedColumns: PropTypes.objectOf(Set),
  onSelectedColumnsChange: PropTypes.func,
  isCellSelected: PropTypes.bool,
};

function setEditorFormatter(col) {
  // If grid is editable then add editor else make it readonly
  if (col.cell == 'oid' && col.name == 'oid') {
    col.editor = null;
    col.formatter = Formatters.TextFormatter;
  } else if (col.cell == 'Json') {
    col.editor = Editors.JsonTextEditor;
    col.formatter = Formatters.TextFormatter;
  } else if (['number', 'oid'].indexOf(col.cell) != -1 || ['xid', 'real'].indexOf(col.type) != -1) {
    col.formatter = Formatters.NumberFormatter;
    col.editor = Editors.NumberEditor;
  } else if (col.cell == 'boolean') {
    col.editor = Editors.CheckboxEditor;
    col.formatter = Formatters.TextFormatter;
  } else if (col.cell == 'binary') {
    // We do not support editing binary data in SQL editor and data grid.
    col.editor = null;
    col.formatter = Formatters.BinaryFormatter;
  } else {
    col.editor = Editors.TextEditor;
    col.formatter = Formatters.TextFormatter;
  }
}

function cellClassGetter(col, classes, isSelected, dataChangeStore, rowKeyGetter){
  return (row)=>{
    let cellClasses = [];
    if(dataChangeStore && rowKeyGetter) {
      if(rowKeyGetter(row) in (dataChangeStore?.updated || {})
        && !_.isUndefined(dataChangeStore?.updated[rowKeyGetter(row)]?.data[col.key])
        || rowKeyGetter(row) in (dataChangeStore?.added || {})
      ) {
        cellClasses.push(classes.editedCell);
      }
      if(rowKeyGetter(row) in (dataChangeStore?.deleted || {})) {
        cellClasses.push(classes.deletedRow);
      }
    }
    if(isSelected) {
      cellClasses.push(classes.colSelected);
    }
    return clsx(cellClasses);
  };
}

function initialiseColumns(columns, rows, totalRowCount, columnWidthBy) {
  let retColumns = [
    ...columns,
  ];
  const canvas = document.createElement('canvas');
  const canvasContext = canvas.getContext('2d');
  canvasContext.font = '12px Roboto';

  for(const col of retColumns) {
    col.width = getTextWidth(col, rows, canvasContext, columnWidthBy);
    col.resizable = true;
    col.editorOptions = {
      commitOnOutsideClick: false,
      onCellKeyDown: (e)=>{
        /* Do not open the editor */
        e.preventDefault();
      }
    };
    setEditorFormatter(col);
  }

  let rowNumWidth = canvasContext.measureText((totalRowCount||'').toString()).width;
  /* padding 8 on both sides*/
  rowNumWidth += 16;
  let rowNumCol = {
    key: ROWNUM_KEY, name: '', frozen: true, resizable: false,
    minWidth: 45, width: rowNumWidth,
  };
  rowNumCol.cellClass = cellClassGetter(rowNumCol);
  retColumns.unshift(rowNumCol);
  canvas.remove();
  return retColumns;
}

function RowNumColFormatter({row, rowKeyGetter, dataChangeStore, onSelectedColumnsChange}) {
  const {rowIdx} = useContext(RowInfoContext);
  const [isRowSelected, onRowSelectionChange] = useRowSelection();
  const classes = useStyles();

  let rowKey = rowKeyGetter(row);
  let rownum = rowIdx+1;
  if(rowKey in (dataChangeStore?.added || {})) {
    rownum = rownum+'+';
  } else if(rowKey in (dataChangeStore?.deleted || {})) {
    rownum = rownum+'-';
  }
  return (<div className={classes.rowNumCell} onClick={()=>{
    onSelectedColumnsChange(new Set());
    onRowSelectionChange({ row: row, checked: !isRowSelected, isShiftClick: false});
  }}>
    {rownum}
  </div>);
}
RowNumColFormatter.propTypes = {
  row: PropTypes.object,
  rowKeyGetter: PropTypes.func,
  dataChangeStore: PropTypes.object,
  onSelectedColumnsChange: PropTypes.func,
};

function formatColumns(columns, dataChangeStore, selectedColumns, onSelectedColumnsChange, rowKeyGetter, classes) {
  let retColumns = [
    ...columns,
  ];

  const HeaderRenderer = (props)=>{
    return <SelectableHeaderRenderer {...props} selectedColumns={selectedColumns} onSelectedColumnsChange={onSelectedColumnsChange}/>;
  };

  for(const [idx, col] of retColumns.entries()) {
    col.headerRenderer = HeaderRenderer;
    col.cellClass = cellClassGetter(col, classes, selectedColumns.has(idx), dataChangeStore, rowKeyGetter);
  }

  let rowNumCol = retColumns[0];
  rowNumCol.headerRenderer = SelectAllHeaderRenderer;
  rowNumCol.formatter = (props)=>{
    return <RowNumColFormatter {...props} rowKeyGetter={rowKeyGetter} dataChangeStore={dataChangeStore} onSelectedColumnsChange={onSelectedColumnsChange} />;
  };

  return retColumns;
}

function getTextWidth(column, rows, canvas, columnWidthBy) {
  const dataWidthReducer = (longest, nextRow) => {
    let value = nextRow[column.key];
    if(_.isNull(value) || _.isUndefined(value)) {
      value = '';
    }
    value = value.toString();
    return longest.length > value.length ? longest : value;
  };

  let columnHeaderLen = column.display_name.length > column.display_type.length ?
    canvas.measureText(column.display_name).width : canvas.measureText(column.display_type).width;
  /* padding 12, icon-width 15 */
  columnHeaderLen += 15 + 12;
  if(column.column_type_internal == 'geometry' || column.column_type_internal == 'geography') {
    columnHeaderLen += 40;
  }
  let width = columnHeaderLen;
  if(typeof(columnWidthBy) == 'number') {
    /* padding 16 */
    width = 16 + Math.ceil(canvas.measureText(rows.reduce(dataWidthReducer, '')).width);
    if(width > columnWidthBy && columnWidthBy > 0) {
      width = columnWidthBy;
    }
    if(width < columnHeaderLen) {
      width = columnHeaderLen;
    }
  }
  /* Gracefull */
  width += 8;
  return width;
}

export default function QueryToolDataGrid({columns, rows, totalRowCount, dataChangeStore,
  onSelectedCellChange, selectedColumns, onSelectedColumnsChange, columnWidthBy, ...props}) {
  const classes = useStyles();
  const [readyColumns, setColumns] = useState([]);
  const eventBus = useContext(QueryToolEventsContext);
  const onSelectedColumnsChangeWrapped = (arg)=>{
    props.onSelectedRowsChange(new Set());
    onSelectedColumnsChange(arg);
  };

  useEffect(()=>{
    let initCols = initialiseColumns(columns, rows, totalRowCount, columnWidthBy);
    setColumns(formatColumns(initCols, dataChangeStore, selectedColumns, onSelectedColumnsChangeWrapped, props.rowKeyGetter, classes));
  }, [columns]);

  useEffect(()=>{
    setColumns((prevCols)=>{
      return formatColumns(prevCols, dataChangeStore, selectedColumns, onSelectedColumnsChangeWrapped, props.rowKeyGetter, classes);
    });
  }, [dataChangeStore, selectedColumns]);

  function handleCopy() {
    eventBus.fireEvent(QUERY_TOOL_EVENTS.TRIGGER_COPY_DATA);
  }

  return (
    <DataGridExtrasContext.Provider value={{onSelectedCellChange, handleCopy}}>
      <PgReactDataGrid
        id="datagrid"
        columns={readyColumns}
        rows={rows}
        headerRowHeight={40}
        rowHeight={25}
        mincolumnWidthBy={50}
        enableCellSelect={true}
        onCopy={handleCopy}
        onMultiCopy={handleCopy}
        components={{
          rowRenderer: CustomRow,
        }}
        enableRangeSelection={true}
        rangeLeftBoundaryColIdx={0}
        {...props}
      />
    </DataGridExtrasContext.Provider>
  );
}

QueryToolDataGrid.propTypes = {
  columns: PropTypes.array,
  rows: PropTypes.array,
  totalRowCount: PropTypes.number,
  dataChangeStore: PropTypes.object,
  onSelectedCellChange: PropTypes.func,
  onSelectedRowsChange: PropTypes.func,
  selectedColumns: PropTypes.objectOf(Set),
  onSelectedColumnsChange: PropTypes.func,
  rowKeyGetter: PropTypes.func,
  columnWidthBy: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};
