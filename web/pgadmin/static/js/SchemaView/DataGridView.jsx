/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

/* The DataGridView component is based on react-table component */

import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { styled } from '@mui/material/styles';
import { Box } from '@mui/material';
import { PgIconButton } from '../components/Buttons';
import AddIcon from '@mui/icons-material/AddOutlined';
import { MappedCellControl } from './MappedControl';
import DragIndicatorRoundedIcon from '@mui/icons-material/DragIndicatorRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getExpandedRowModel,
  flexRender,
} from '@tanstack/react-table';
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
import { InputText } from '../components/FormComponents';
import { usePgAdmin } from '../BrowserComponent';
import { requestAnimationAndFocus } from '../utils';
import { PgReactTable, PgReactTableBody, PgReactTableCell, PgReactTableHeader, PgReactTableRow, PgReactTableRowContent, PgReactTableRowExpandContent } from '../components/PgReactTableStyled';

const StyledBox = styled(Box)(({theme}) => ({
  '& .DataGridView-grid': {
    ...theme.mixins.panelBorder,
    backgroundColor: theme.palette.background.default,
    '& .DataGridView-gridHeader': {
      display: 'flex',
      ...theme.mixins.panelBorder.bottom,
      backgroundColor: theme.otherVars.headerBg,
      '& .DataGridView-gridHeaderText': {
        padding: theme.spacing(0.5, 1),
        fontWeight: theme.typography.fontWeightBold,
      },
      '& .DataGridView-gridControls': {
        marginLeft: 'auto',
        '& .DataGridView-gridControlsButton': {
          border: 0,
          borderRadius: 0,
          ...theme.mixins.panelBorder.left,
        },
      },
    },
    '& .DataGridView-table': {
      '&.pgrt-table': {
        '& .pgrt-body':{
          '& .pgrt-row': {
            position: 'unset',
            backgroundColor: theme.otherVars.emptySpaceBg,
            '& .pgrt-row-content':{
              '& .pgrd-row-cell': {
                height: 'auto',
                padding: theme.spacing(0.5),
                '&.btn-cell, &.expanded-icon-cell': {
                  padding: '2px 0px'
                },
                '& .DataGridView-gridRowButton': {
                  border: 0,
                  borderRadius: 0,
                  padding: 0,
                  minWidth: 0,
                  backgroundColor: 'inherit',
                  '&.Mui-disabled': {
                    border: 0,
                  },
                },
              }
            },
          }
        }
      }
    },
  },
  '& .DataGridView-tableRowHovered': {
    position: 'relative',
    '& .hover-overlay': {
      backgroundColor: theme.palette.primary.light,
      position: 'absolute',
      inset: 0,
      opacity: 0.75,
    }
  },
  '& .DataGridView-btnReorder': {
    cursor: 'move',
    padding: '4px 2px',
  },
  '& .DataGridView-resizer': {
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
  '& .DataGridView-expandedForm': {
    border: '1px solid '+theme.palette.grey[400],
  },
  '& .DataGridView-expandedIconCell': {
    backgroundColor: theme.palette.grey[400],
    borderBottom: 'none',
  }
}));

function DataTableRow({index, row, totalRows, isResizing, isHovered, schema, schemaRef, accessPath, moveRow, setHoverIndex, viewHelperProps}) {

  const [key, setKey] = useState(false);
  const depListener = useContext(DepListenerContext);
  const rowRef = useRef(null);
  const dragHandleRef = useRef(null);

  /* Memoize the row to avoid unnecessary re-render.
   * If table data changes, then react-table re-renders the complete tables
   * We can avoid re-render by if row data is not changed
   */
  let depsMap = [JSON.stringify(row.original)];
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

    // Try autofocus on newly added row.
    requestAnimationAndFocus(rowRef.current?.querySelector('input'));

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
  depsMap = depsMap.concat([totalRows, row.getIsExpanded(), key, isResizing, isHovered]);

  drag(dragHandleRef);
  drop(rowRef);

  return useMemo(()=>
    <PgReactTableRowContent ref={rowRef} data-handler-id={handlerId} className={isHovered ? 'DataGridView-tableRowHovered' : null} data-test='data-table-row' style={{position: 'initial'}}>
      {row.getVisibleCells().map((cell) => {
        let {modeSupported} = cell.column.field ? getFieldMetaData(cell.column.field, schemaRef.current, {}, viewHelperProps) : {modeSupported: true};

        const content = flexRender(cell.column.columnDef.cell, {
          key: cell.column.columnDef.cell.type,
          ...cell.getContext(),
          reRenderRow: ()=>{setKey((currKey)=>!currKey);}
        });

        return (modeSupported &&
          <PgReactTableCell cell={cell} row={row} key={cell.id} ref={cell.column.id == 'btn-reorder' ? dragHandleRef : null}>
            {content}
          </PgReactTableCell>
        );
      })}
      <div className='hover-overlay'></div>
    </PgReactTableRowContent>, depsMap);
}

export function DataGridHeader({label, canAdd, onAddClick, canSearch, onSearchTextChange}) {
  const [searchText, setSearchText] = useState('');
  return (
    <Box className='DataGridView-gridHeader'>
      { label &&
      <Box className='DataGridView-gridHeaderText'>{label}</Box>
      }
      { canSearch &&
        <Box className='DataGridView-gridHeaderText' width={'100%'}>
          <InputText value={searchText}
            onChange={(value)=>{
              onSearchTextChange(value);
              setSearchText(value);
            }}
            placeholder={gettext('Search')}>
          </InputText>
        </Box>
      }
      <Box className='DataGridView-gridControls'>
        {canAdd && <PgIconButton data-test="add-row" title={gettext('Add row')} onClick={()=>{
          setSearchText('');
          onSearchTextChange('');
          onAddClick();
        }} icon={<AddIcon />} className='DataGridView-gridControlsButton' />}
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

  const stateUtils = useContext(StateUtilsContext);
  const checkIsMounted = useIsMounted();
  const [hoverIndex, setHoverIndex] = useState();
  const newRowIndex = useRef();
  const pgAdmin = usePgAdmin();
  const [searchVal, setSearchVal] = useState('');

  /* Using ref so that schema variable is not frozen in columns closure */
  const schemaRef = useRef(schema);
  const columns = useMemo(
    ()=>{
      let cols = [];
      if(props.canReorder) {
        let colInfo = {
          header: <>&nbsp;</>,
          id: 'btn-reorder',
          accessorFn: ()=>{/*This is intentional (SonarQube)*/},
          enableResizing: false,
          enableSorting: false,
          dataType: 'reorder',
          size: 36,
          maxSize: 26,
          minSize: 26,
          cell: ()=>{
            return <div className='DataGridView-btnReorder'>
              <DragIndicatorRoundedIcon fontSize="small" />
            </div>;
          }
        };
        colInfo.cell.displayName = 'Cell';
        cols.push(colInfo);
      }
      if(props.canEdit) {
        let colInfo = {
          header: <>&nbsp;</>,
          id: 'btn-edit',
          accessorFn: ()=>{/*This is intentional (SonarQube)*/},
          enableResizing: false,
          enableSorting: false,
          dataType: 'edit',
          size: 26,
          maxSize: 26,
          minSize: 26,
          cell: ({row})=>{
            let canEditRow = true;
            if(props.canEditRow) {
              canEditRow = evalFunc(schemaRef.current, props.canEditRow, row.original || {});
            }
            return <PgIconButton data-test="expand-row" title={gettext('Edit row')} icon={<EditRoundedIcon fontSize="small" />} className='DataGridView-gridRowButton'
              onClick={()=>{
                row.toggleExpanded();
              }} disabled={!canEditRow}
            />;
          }
        };
        colInfo.cell.displayName = 'Cell';
        colInfo.cell.propTypes = {
          row: PropTypes.object.isRequired,
        };
        cols.push(colInfo);
      }
      if(props.canDelete) {
        let colInfo = {
          header: <>&nbsp;</>,
          id: 'btn-delete',
          accessorFn: ()=>{/*This is intentional (SonarQube)*/},
          enableResizing: false,
          enableSorting: false,
          dataType: 'delete',
          size: 26,
          maxSize: 26,
          minSize: 26,
          cell: ({row}) => {
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
                    pgAdmin.Browser.notifier.confirm(
                      props.customDeleteTitle || gettext('Delete Row'),
                      props.customDeleteMsg || gettext('Are you sure you wish to delete this row?'),
                      deleteRow,
                      function() {
                        return true;
                      }
                    );
                  }
                }} className='DataGridView-gridRowButton' disabled={!canDeleteRow} />
            );
          }
        };
        colInfo.cell.displayName = 'Cell';
        colInfo.cell.propTypes = {
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
            widthParms.size = field.width;
            widthParms.minSize = field.width;
          } else {
            widthParms.size = 75;
            widthParms.minSize = 75;
          }
          if(field.minWidth) {
            widthParms.minSize = field.minWidth;
          }
          if(field.maxWidth) {
            widthParms.maxSize = field.maxWidth;
          }
          widthParms.enableResizing = _.isUndefined(field.enableResizing) ? true : Boolean(field.enableResizing);

          let colInfo = {
            header: field.label||<>&nbsp;</>,
            accessorKey: field.id,
            field: field,
            enableResizing: true,
            enableSorting: false,
            ...widthParms,
            cell: ({row, ...other}) => {
              const value = other.getValue();
              /* Make sure to take the latest field info from schema */
              field = _.find(schemaRef.current.fields, (f)=>f.id==field.id) || field;

              let {editable, disabled, modeSupported} = getFieldMetaData(field, schemaRef.current, row.original || {}, viewHelperProps);

              if(_.isUndefined(field.cell)) {
                console.error('cell is required ', field);
              }

              return modeSupported && <MappedCellControl rowIndex={row.index} value={value}
                row={row} {...field}
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
          colInfo.cell.displayName = 'Cell';
          colInfo.cell.propTypes = {
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

    const current_macros = schemaRef.current?._top?._sessData?.macro || null;
    if (current_macros){
      newRow = schemaRef.current.getNewData(current_macros);
    }

    if(props.expandEditOnAdd && props.canEdit) {
      newRowIndex.current = rows.length;
    }
    dataDispatch({
      type: SCHEMA_STATE_ACTIONS.ADD_ROW,
      path: accessPath,
      value: newRow,
      addOnTop: props.addOnTop
    });
  }, [props.canAddRow, rows?.length]);

  const columnVisibility = useMemo(()=>{
    const ret = {};

    columns.forEach(column => {
      let {modeSupported} = column.field ? getFieldMetaData(column.field, schemaRef.current, {}, viewHelperProps) : {modeSupported: true};
      ret[column.id] = modeSupported;
    });

    return ret;
  }, [columns, viewHelperProps]);

  const table = useReactTable({
    columns,
    data: value,
    autoResetAll: false,
    state: {
      globalFilter: searchVal,
      columnVisibility: columnVisibility,
    },
    columnResizeMode: 'onChange',
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  const rows = table.getRowModel().rows;

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
      rows[newRowIndex.current]?.toggleExpanded(true);
      newRowIndex.current = null;
    }
  }, [rows?.length]);

  const tableRef = useRef();

  const moveRow = (dragIndex, hoverIndex) => {
    dataDispatch({
      type: SCHEMA_STATE_ACTIONS.MOVE_ROW,
      path: accessPath,
      oldIndex: dragIndex,
      newIndex: hoverIndex,
    });
  };

  const isResizing = _.flatMap(table.getHeaderGroups(), headerGroup => headerGroup.headers.map(header=>header.column.getIsResizing())).includes(true);

  if(!props.visible) {
    return <></>;
  }

  return (
    <StyledBox className={containerClassName}>
      <Box className='DataGridView-grid'>
        {(props.label || props.canAdd) && <DataGridHeader label={props.label} canAdd={props.canAdd} onAddClick={onAddClick}
          canSearch={props.canSearch}
          onSearchTextChange={(value)=>{
            setSearchVal(value || undefined);
          }}
        />}
        <DndProvider backend={HTML5Backend}>
          <PgReactTable ref={tableRef} table={table} data-test="data-grid-view" tableClassName='DataGridView-table'>
            <PgReactTableHeader table={table} />
            <PgReactTableBody>
              {rows.map((row, i) => {
                return <PgReactTableRow key={row.index}>
                  <DataTableRow index={i} row={row} totalRows={rows.length} isResizing={isResizing}
                    schema={schemaRef.current} schemaRef={schemaRef} accessPath={accessPath.concat([row.index])}
                    moveRow={moveRow} isHovered={i == hoverIndex} setHoverIndex={setHoverIndex} viewHelperProps={viewHelperProps}
                  />
                  {props.canEdit &&
                    <PgReactTableRowExpandContent row={row}>
                      <FormView value={row.original} viewHelperProps={viewHelperProps} dataDispatch={dataDispatch}
                        schema={schemaRef.current} accessPath={accessPath.concat([row.index])} isNested={true} className='DataGridView-expandedForm'
                        isDataGridForm={true} firstEleRef={(ele)=>{
                          requestAnimationAndFocus(ele);
                        }}/>
                    </PgReactTableRowExpandContent>
                  }
                </PgReactTableRow>;
              })}
            </PgReactTableBody>
          </PgReactTable>
        </DndProvider>
      </Box>
    </StyledBox>
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
  addOnTop: PropTypes.bool
};
