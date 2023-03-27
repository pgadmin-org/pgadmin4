/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

/* The DataGridView component is based on react-table component */

import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Box } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { PgIconButton } from '../components/Buttons';
import AddIcon from '@material-ui/icons/AddOutlined';
import { MappedCellControl } from './MappedControl';
import DragIndicatorRoundedIcon from '@material-ui/icons/DragIndicatorRounded';
import EditRoundedIcon from '@material-ui/icons/EditRounded';
import DeleteRoundedIcon from '@material-ui/icons/DeleteRounded';
import { useTable, useFlexLayout, useResizeColumns, useSortBy, useExpanded, useGlobalFilter } from 'react-table';
import clsx from 'clsx';
import PropTypes from 'prop-types';
import _ from 'lodash';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import {HTML5Backend} from 'react-dnd-html5-backend';

import gettext from 'sources/gettext';
import { SCHEMA_STATE_ACTIONS, StateUtilsContext } from '.';
import FormView, { getFieldMetaData } from './FormView';
import CustomPropTypes from 'sources/custom_prop_types';
import { evalFunc } from 'sources/utils';
import { DepListenerContext } from './DepListener';
import { useIsMounted } from '../custom_hooks';
import Notify from '../helpers/Notifier';
import { InputText } from '../components/FormComponents';

const useStyles = makeStyles((theme)=>({
  grid: {
    ...theme.mixins.panelBorder,
    backgroundColor: theme.palette.background.default,
  },
  gridHeader: {
    display: 'flex',
    ...theme.mixins.panelBorder.bottom,
    backgroundColor: theme.otherVars.headerBg,
  },
  gridHeaderText: {
    padding: theme.spacing(0.5, 1),
    fontWeight: theme.typography.fontWeightBold,
  },
  gridControls: {
    marginLeft: 'auto',
  },
  gridControlsButton: {
    border: 0,
    borderRadius: 0,
    ...theme.mixins.panelBorder.left,
  },
  gridRowButton: {
    border: 0,
    borderRadius: 0,
    padding: 0,
    minWidth: 0,
    backgroundColor: 'inherit',
    '&.Mui-disabled': {
      border: 0,
    },
  },
  gridTableContainer: {
    overflow: 'auto',
    width: '100%',
  },
  table: {
    borderSpacing: 0,
    width: '100%',
    overflow: 'auto',
    backgroundColor: theme.otherVars.tableBg,
  },
  tableRowHovered: {
    position: 'relative',
    '& .hover-overlay': {
      backgroundColor: theme.palette.primary.light,
      position: 'absolute',
      inset: 0,
      opacity: 0.75,
    }
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
  tableCellHeader: {
    fontWeight: theme.typography.fontWeightBold,
    padding: theme.spacing(1, 0.5),
    textAlign: 'left',
  },
  tableContentWidth: {
    width: 'calc(100% - 3px)',
  },
  btnCell: {
    padding: theme.spacing(0.5, 0),
    textAlign: 'center',
  },
  btnReorder: {
    cursor: 'move',
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
  expandedForm: {
    borderTopWidth: theme.spacing(0.5),
    borderStyle: 'solid ',
    borderColor: theme.palette.grey[400],
  },
  expandedIconCell: {
    backgroundColor: theme.palette.grey[400],
    borderBottom: 'none',
  }
}));

function DataTableHeader({headerGroups}) {
  const classes = useStyles();
  const sortIcon = (isDesc) => {
    return isDesc ? ' 🔽' : ' 🔼';
  };
  return (
    <div className={classes.tableContentWidth}>
      {headerGroups.map((headerGroup, hi) => (
        <div key={hi} {...headerGroup.getHeaderGroupProps()}>
          {headerGroup.headers.map((column, ci) => (
            <div key={ci} {...column.getHeaderProps()}>
              <div {...(column.sortable ? column.getSortByToggleProps() : {})} className={clsx(classes.tableCell, classes.tableCellHeader)}>
                {column.render('Header')}
                <span>
                  {column.isSorted ? sortIcon(column.isSortedDesc) : ''}
                </span>
              </div>
              {!column.disableResizing &&
                <div
                  {...column.getResizerProps()}
                  className={classes.resizer}
                />}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

DataTableHeader.propTypes = {
  headerGroups: PropTypes.array.isRequired,
};

function DataTableRow({index, row, totalRows, isResizing, isHovered, schema, schemaRef, accessPath, moveRow, setHoverIndex}) {
  const classes = useStyles();
  const [key, setKey] = useState(false);
  const depListener = useContext(DepListenerContext);
  const rowRef = useRef(null);
  const dragHandleRef = useRef(null);

  /* Memoize the row to avoid unnecessary re-render.
   * If table data changes, then react-table re-renders the complete tables
   * We can avoid re-render by if row data is not changed
   */
  let depsMap = _.values(row.values, Object.keys(row.values).filter((k)=>!k.startsWith('btn')));
  const externalDeps = useMemo(()=>{
    let retVal = [];
    /* Calculate the fields which depends on the current field
    deps has info on fields which the current field depends on. */
    schema.fields.forEach((field)=>{
      (evalFunc(null, field.deps) || []).forEach((dep)=>{
        let source = accessPath.concat(dep);
        if(_.isArray(dep)) {
          source = dep;
          /* If its an array, then dep is from the top schema and external */
          retVal.push(source);
        }
      });
    });
    return retVal;
  }, []);

  useEffect(()=>{
    schemaRef.current.fields.forEach((field)=>{
      /* Self change is also dep change */
      if(field.depChange || field.deferredDepChange) {
        depListener?.addDepListener(accessPath.concat(field.id), accessPath.concat(field.id), field.depChange, field.deferredDepChange);
      }
      (evalFunc(null, field.deps) || []).forEach((dep)=>{
        let source = accessPath.concat(dep);
        if(_.isArray(dep)) {
          source = dep;
        }
        if(field.depChange) {
          depListener?.addDepListener(source, accessPath.concat(field.id), field.depChange);
        }
      });
    });
    return ()=>{
      /* Cleanup the listeners when unmounting */
      depListener?.removeDepListener(accessPath);
    };
  }, []);

  const [{ handlerId }, drop] = useDrop({
    accept: 'row',
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item, monitor) {
      if (!rowRef.current) {
        return;
      }
      item.hoverIndex = null;
      // Don't replace items with themselves
      if (item.index === index) {
        return;
      }
      // Determine rectangle on screen
      const hoverBoundingRect = rowRef.current?.getBoundingClientRect();
      // Determine mouse position
      const clientOffset = monitor.getClientOffset();
      // Get pixels to the top
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;
      // Only perform the move when the mouse has crossed certain part of the items height
      // Dragging downwards
      if (item.index < index && hoverClientY < (hoverBoundingRect.bottom - hoverBoundingRect.top)/3) {
        return;
      }
      // Dragging upwards
      if (item.index > index && hoverClientY > ((hoverBoundingRect.bottom - hoverBoundingRect.top)*2/3)) {
        return;
      }
      setHoverIndex(index);
      item.hoverIndex = index;
    },
  });

  const [, drag] = useDrag({
    type: 'row',
    item: () => {
      return {index};
    },
    end: (item)=>{
      // Time to actually perform the action
      setHoverIndex(null);
      if(item.hoverIndex >= 0) {
        moveRow(item.index, item.hoverIndex);
      }
    }
  });

  /* External deps values are from top schema sess data */
  depsMap = depsMap.concat(externalDeps.map((source)=>_.get(schemaRef.current.top?.sessData, source)));
  depsMap = depsMap.concat([totalRows, row.isExpanded, key, isResizing, isHovered]);

  drag(dragHandleRef);
  drop(rowRef);

  return useMemo(()=>
    <>
      <div {...row.getRowProps()} ref={rowRef} data-handler-id={handlerId}
        className={isHovered ? classes.tableRowHovered : null}
      >
        {row.cells.map((cell, ci) => {
          let classNames = [classes.tableCell];
          if(typeof(cell.column.id) == 'string' && cell.column.id.startsWith('btn-')) {
            classNames.push(classes.btnCell);
          }
          if(cell.column.id == 'btn-edit' && row.isExpanded) {
            classNames.push(classes.expandedIconCell);
          }
          return (
            <div ref={cell.column.id == 'btn-reorder' ? dragHandleRef : null} key={ci} {...cell.getCellProps()} className={clsx(classNames)}>
              {cell.render('Cell', {
                reRenderRow: ()=>{setKey((currKey)=>!currKey);}
              })}
            </div>
          );
        })}
        <div className='hover-overlay'></div>
      </div>
    </>, depsMap);
}

export function DataGridHeader({label, canAdd, onAddClick, canSearch, onSearchTextChange}) {
  const classes = useStyles();
  const [searchText, setSearchText] = useState('');

  return (
    <Box className={classes.gridHeader}>
      { label &&
      <Box className={classes.gridHeaderText}>{label}</Box>
      }
      { canSearch &&
        <Box className={classes.gridHeaderText} width={'100%'}>
          <InputText value={searchText}
            onChange={(value)=>{
              onSearchTextChange(value);
              setSearchText(value);
            }}
            placeholder={gettext('Search')}>
          </InputText>
        </Box>
      }
      <Box className={classes.gridControls}>
        {canAdd && <PgIconButton data-test="add-row" title={gettext('Add row')} onClick={()=>{
          setSearchText('');
          onSearchTextChange('');
          onAddClick();
        }} icon={<AddIcon />} className={classes.gridControlsButton} />}
      </Box>
    </Box>
  );
}
DataGridHeader.propTypes = {
  label: PropTypes.string,
  canAdd: PropTypes.bool,
  onAddClick: PropTypes.func,
  canSearch: PropTypes.bool,
  onSearchTextChange: PropTypes.func,
};

export default function DataGridView({
  value, viewHelperProps, schema, accessPath, dataDispatch, containerClassName,
  fixedRows, ...props}) {
  const classes = useStyles();
  const stateUtils = useContext(StateUtilsContext);
  const checkIsMounted = useIsMounted();
  const [hoverIndex, setHoverIndex] = useState();
  const newRowIndex = useRef();

  /* Using ref so that schema variable is not frozen in columns closure */
  const schemaRef = useRef(schema);
  let columns = useMemo(
    ()=>{
      let cols = [];
      if(props.canReorder) {
        let colInfo = {
          Header: <>&nbsp;</>,
          id: 'btn-reorder',
          accessor: ()=>{/*This is intentional (SonarQube)*/},
          disableResizing: true,
          sortable: false,
          dataType: 'reorder',
          width: 26,
          minWidth: 26,
          maxWidth: 26,
          Cell: ()=>{
            return <div className={classes.btnReorder}>
              <DragIndicatorRoundedIcon fontSize="small" />
            </div>;
          }
        };
        colInfo.Cell.displayName = 'Cell';
        cols.push(colInfo);
      }
      if(props.canEdit) {
        let colInfo = {
          Header: <>&nbsp;</>,
          id: 'btn-edit',
          accessor: ()=>{/*This is intentional (SonarQube)*/},
          disableResizing: true,
          sortable: false,
          dataType: 'edit',
          width: 26,
          minWidth: 26,
          maxWidth: 26,
          Cell: ({row})=>{
            let canEditRow = true;
            if(props.canEditRow) {
              canEditRow = evalFunc(schemaRef.current, props.canEditRow, row.original || {});
            }
            return <PgIconButton data-test="expand-row" title={gettext('Edit row')} icon={<EditRoundedIcon fontSize="small" />} className={classes.gridRowButton}
              onClick={()=>{
                row.toggleRowExpanded(!row.isExpanded);
              }} disabled={!canEditRow}
            />;
          }
        };
        colInfo.Cell.displayName = 'Cell';
        colInfo.Cell.propTypes = {
          row: PropTypes.object.isRequired,
        };
        cols.push(colInfo);
      }
      if(props.canDelete) {
        let colInfo = {
          Header: <>&nbsp;</>,
          id: 'btn-delete',
          accessor: ()=>{/*This is intentional (SonarQube)*/},
          disableResizing: true,
          sortable: false,
          dataType: 'delete',
          width: 26,
          minWidth: 26,
          maxWidth: 26,
          Cell: ({row}) => {
            let canDeleteRow = true;
            if(props.canDeleteRow) {
              canDeleteRow = evalFunc(schemaRef.current, props.canDeleteRow, row.original || {});
            }

            return (
              <PgIconButton data-test="delete-row" title={gettext('Delete row')} icon={<DeleteRoundedIcon fontSize="small" />}
                onClick={()=>{
                  const deleteRow = ()=> {
                    dataDispatch({
                      type: SCHEMA_STATE_ACTIONS.DELETE_ROW,
                      path: accessPath,
                      value: row.index,
                    });
                    return true;
                  };

                  if (props.onDelete){
                    props.onDelete(row.original || {}, deleteRow);
                  } else {
                    Notify.confirm(
                      props.customDeleteTitle || gettext('Delete Row'),
                      props.customDeleteMsg || gettext('Are you sure you wish to delete this row?'),
                      deleteRow,
                      function() {
                        return true;
                      }
                    );
                  }
                }} className={classes.gridRowButton} disabled={!canDeleteRow} />
            );
          }
        };
        colInfo.Cell.displayName = 'Cell';
        colInfo.Cell.propTypes = {
          row: PropTypes.object.isRequired,
        };
        cols.push(colInfo);
      }

      cols = cols.concat(
        schemaRef.current.fields.filter((f)=>{
          return _.isArray(props.columns) ? props.columns.indexOf(f.id) > -1 : true;
        }).sort((firstF, secondF)=>{
          if(_.isArray(props.columns)) {
            return props.columns.indexOf(firstF.id) < props.columns.indexOf(secondF.id) ? -1 : 1;
          }
          return 0;
        }).map((field)=>{
          let widthParms = {};
          if(field.width) {
            widthParms.width = field.width;
            widthParms.minWidth = field.width;
          } else {
            widthParms.width = 75;
            widthParms.minWidth = 75;
          }
          if(field.minWidth) {
            widthParms.minWidth = field.minWidth;
          }
          if(field.maxWidth) {
            widthParms.maxWidth = field.maxWidth;
          }
          widthParms.disableResizing = Boolean(field.disableResizing);

          let colInfo = {
            Header: field.label||<>&nbsp;</>,
            accessor: field.id,
            field: field,
            disableResizing: false,
            sortable: true,
            ...widthParms,
            Cell: ({value, row, ...other}) => {
              /* Make sure to take the latest field info from schema */
              field = _.find(schemaRef.current.fields, (f)=>f.id==field.id) || field;

              let {editable, disabled} = getFieldMetaData(field, schemaRef.current, row.original || {}, viewHelperProps);

              if(_.isUndefined(field.cell)) {
                console.error('cell is required ', field);
              }

              return <MappedCellControl rowIndex={row.index} value={value}
                row={row.original} {...field}
                readonly={!editable}
                disabled={disabled}
                visible={true}
                onCellChange={(changeValue)=>{
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
                    path: accessPath.concat([row.index, field.id]),
                    value: changeValue,
                  });
                }}
                reRenderRow={other.reRenderRow}
              />;
            },
          };
          colInfo.Cell.displayName = 'Cell';
          colInfo.Cell.propTypes = {
            row: PropTypes.object.isRequired,
            value: PropTypes.any,
            onCellChange: PropTypes.func,
          };
          return colInfo;
        })
      );
      return cols;
    },[props.canEdit, props.canDelete, props.canReorder]
  );

  const onAddClick = useCallback(()=>{
    if(!props.canAddRow) {
      return;
    }

    let newRow = schemaRef.current.getNewData();
    if(props.expandEditOnAdd && props.canEdit) {
      newRowIndex.current = rows.length;
    }
    dataDispatch({
      type: SCHEMA_STATE_ACTIONS.ADD_ROW,
      path: accessPath,
      value: newRow,
    });
  }, [props.canAddRow, rows?.length]);

  const defaultColumn = useMemo(()=>({
  }), []);

  let tablePlugins = [
    useGlobalFilter,
    useFlexLayout,
    useResizeColumns,
    useSortBy,
    useExpanded,
  ];

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    setGlobalFilter,
  } = useTable(
    {
      columns,
      data: value,
      defaultColumn,
      manualSortBy: true,
      autoResetSortBy: false,
      autoResetExpanded: false,
    },
    ...tablePlugins,
  );

  useEffect(()=>{
    let rowsPromise = fixedRows;

    /* If fixedRows is defined, fetch the details */
    if(typeof rowsPromise === 'function') {
      rowsPromise = rowsPromise();
    }
    if(rowsPromise) {
      Promise.resolve(rowsPromise)
        .then((res)=>{
          /* If component unmounted, dont update state */
          if(checkIsMounted()) {
            stateUtils.initOrigData(accessPath, res);
          }
        });
    }
  }, []);

  useEffect(()=>{
    if(newRowIndex.current >= 0) {
      rows[newRowIndex.current]?.toggleRowExpanded(true);
      newRowIndex.current = null;
    }
  }, [rows?.length]);

  const moveRow = (dragIndex, hoverIndex) => {
    dataDispatch({
      type: SCHEMA_STATE_ACTIONS.MOVE_ROW,
      path: accessPath,
      oldIndex: dragIndex,
      newIndex: hoverIndex,
    });
  };

  const isResizing = _.flatMap(headerGroups, headerGroup => headerGroup.headers.map(col=>col.isResizing)).includes(true);

  if(!props.visible) {
    return <></>;
  }

  return (
    <Box className={containerClassName}>
      <Box className={classes.grid}>
        {(props.label || props.canAdd) && <DataGridHeader label={props.label} canAdd={props.canAdd} onAddClick={onAddClick}
          canSearch={props.canSearch}
          onSearchTextChange={(value)=>{
            setGlobalFilter(value || undefined);
          }}
        />}
        <DndProvider backend={HTML5Backend}>
          <div {...getTableProps(()=>({style: {minWidth: 'unset'}}))} className={classes.table}>
            <DataTableHeader headerGroups={headerGroups} />
            <div {...getTableBodyProps()} className={classes.tableContentWidth}>
              {rows.map((row, i) => {
                prepareRow(row);
                return <React.Fragment key={i}>
                  <DataTableRow index={i} row={row} totalRows={rows.length} isResizing={isResizing}
                    schema={schemaRef.current} schemaRef={schemaRef} accessPath={accessPath.concat([row.index])}
                    moveRow={moveRow} isHovered={i == hoverIndex} setHoverIndex={setHoverIndex} />
                  {props.canEdit && row.isExpanded &&
                    <FormView value={row.original} viewHelperProps={viewHelperProps} dataDispatch={dataDispatch}
                      schema={schemaRef.current} accessPath={accessPath.concat([row.index])} isNested={true} className={classes.expandedForm}
                      isDataGridForm={true}/>
                  }
                </React.Fragment>;
              })}
            </div>
          </div>
        </DndProvider>
      </Box>
    </Box>
  );
}

DataGridView.propTypes = {
  label: PropTypes.string,
  value: PropTypes.array,
  viewHelperProps: PropTypes.object,
  schema: CustomPropTypes.schemaUI,
  accessPath: PropTypes.array.isRequired,
  dataDispatch: PropTypes.func,
  containerClassName: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
  fixedRows: PropTypes.oneOfType([PropTypes.array, PropTypes.instanceOf(Promise), PropTypes.func]),
  columns: PropTypes.array,
  canEdit: PropTypes.bool,
  canAdd: PropTypes.bool,
  canDelete: PropTypes.bool,
  canReorder: PropTypes.bool,
  visible: PropTypes.bool,
  canAddRow: PropTypes.oneOfType([
    PropTypes.bool, PropTypes.func,
  ]),
  canEditRow: PropTypes.oneOfType([
    PropTypes.bool, PropTypes.func,
  ]),
  canDeleteRow: PropTypes.oneOfType([
    PropTypes.bool, PropTypes.func,
  ]),
  expandEditOnAdd: PropTypes.bool,
  customDeleteTitle: PropTypes.string,
  customDeleteMsg: PropTypes.string,
  canSearch: PropTypes.bool,
  onDelete: PropTypes.func,
};
