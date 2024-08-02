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
import { Box } from '@mui/material';
import AddIcon from '@mui/icons-material/AddOutlined';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getExpandedRowModel,
  flexRender,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import PropTypes from 'prop-types';
import _ from 'lodash';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import {HTML5Backend} from 'react-dnd-html5-backend';

import { usePgAdmin } from 'sources/BrowserComponent';
import { PgIconButton } from 'sources/components/Buttons';
import {
  PgReactTable, PgReactTableBody, PgReactTableCell, PgReactTableHeader,
  PgReactTableRow, PgReactTableRowContent, PgReactTableRowExpandContent,
  getDeleteCell, getEditCell, getReorderCell
} from 'sources/components/PgReactTableStyled';
import CustomPropTypes from 'sources/custom_prop_types';
import { useIsMounted } from 'sources/custom_hooks';
import { InputText } from 'sources/components/FormComponents';
import gettext from 'sources/gettext';
import { evalFunc, requestAnimationAndFocus  } from 'sources/utils';

import FormView from './FormView';
import { MappedCellControl } from './MappedControl';
import {
  SCHEMA_STATE_ACTIONS, SchemaStateContext, getFieldMetaData,
  isModeSupportedByField
} from './common';
import { StyleDataGridBox } from './StyledComponents';


function DataTableRow({
  index, row, totalRows, isResizing, isHovered, schema, schemaRef, accessPath,
  moveRow, setHoverIndex, viewHelperProps
}) {

  const [key, setKey] = useState(false);
  const schemaState = useContext(SchemaStateContext);
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
        schemaState?.addDepListener(accessPath.concat(field.id), accessPath.concat(field.id), field.depChange, field.deferredDepChange);
      }
      (evalFunc(null, field.deps) || []).forEach((dep)=>{
        let source = accessPath.concat(dep);
        if(_.isArray(dep)) {
          source = dep;
        }
        if(field.depChange) {
          schemaState?.addDepListener(source, accessPath.concat(field.id), field.depChange);
        }
      });
    });

    return ()=>{
      /* Cleanup the listeners when unmounting */
      schemaState?.removeDepListener(accessPath);
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
    <PgReactTableRowContent ref={rowRef} data-handler-id={handlerId}
      className={isHovered ? 'DataGridView-tableRowHovered' : null}
      data-test='data-table-row' style={{position: 'initial'}}>
      {row.getVisibleCells().map((cell) => {
        // Let's not render the cell, which are not supported in this mode.
        if (cell.column.field && !isModeSupportedByField(
          cell.column.field, viewHelperProps
        )) return;

        const content = flexRender(cell.column.columnDef.cell, {
          key: cell.column.columnDef.cell?.type ?? cell.column.columnDef.id,
          ...cell.getContext(),
          reRenderRow: ()=>{setKey((currKey)=>!currKey);}
        });

        return (
          <PgReactTableCell cell={cell} row={row} key={cell.id}
            ref={cell.column.id == 'btn-reorder' ? dragHandleRef : null}>
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

function getMappedCell({
  field,
  schemaRef,
  viewHelperProps,
  accessPath,
  dataDispatch
}) {
  const Cell = ({row, ...other}) => {
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
  };

  Cell.displayName = 'Cell';
  Cell.propTypes = {
    row: PropTypes.object.isRequired,
    value: PropTypes.any,
    onCellChange: PropTypes.func,
  };

  return Cell;
}

export default function DataGridView({
  value, viewHelperProps, schema, accessPath, dataDispatch, containerClassName,
  fixedRows, ...props
}) {

  const schemaState = useContext(SchemaStateContext);
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
          cell: getReorderCell(),
        };
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
          cell: getEditCell({
            isDisabled: (row)=>{
              let canEditRow = true;
              if(props.canEditRow) {
                canEditRow = evalFunc(schemaRef.current, props.canEditRow, row.original || {});
              }
              return !canEditRow;
            },
            title: gettext('Edit row'),
          })
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
          cell: getDeleteCell({
            title: gettext('Delete row'),
            isDisabled: (row)=>{
              let canDeleteRow = true;
              if(props.canDeleteRow) {
                canDeleteRow = evalFunc(schemaRef.current, props.canDeleteRow, row.original || {});
              }
              return !canDeleteRow;
            },
            onClick: (row)=>{
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
            }
          }),
        };
        cols.push(colInfo);
      }

      cols = cols.concat(
        schemaRef.current.fields.filter((f) => (
          _.isArray(props.columns) ? props.columns.indexOf(f.id) > -1 : true
        )).sort((firstF, secondF) => (
          _.isArray(props.columns) ? ((
            props.columns.indexOf(firstF.id) <
            props.columns.indexOf(secondF.id)
          ) ? -1 : 1) : 0
        )).map((field) => {
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
          widthParms.enableResizing =
            _.isUndefined(field.enableResizing) ? true : Boolean(
              field.enableResizing
            );

          let colInfo = {
            header: field.label||<>&nbsp;</>,
            accessorKey: field.id,
            field: field,
            enableResizing: true,
            enableSorting: false,
            ...widthParms,
            cell: getMappedCell({
              field: field,
              schemaRef: schemaRef,
              viewHelperProps: viewHelperProps,
              accessPath: accessPath,
              dataDispatch: dataDispatch,
            }),
          };

          return colInfo;
        })
      );
      return cols;
    },[props.canEdit, props.canDelete, props.canReorder]
  );

  const columnVisibility = useMemo(()=>{
    const ret = {};

    columns.forEach(column => {
      ret[column.id] = isModeSupportedByField(column.field, viewHelperProps);
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

  const onAddClick = useCallback(()=>{
    if(!props.canAddRow) {
      return;
    }
    let newRow = schemaRef.current.getNewData();

    const current_macros = schemaRef.current?._top?._sessData?.macro || null;
    if (current_macros){
      newRow = schemaRef.current.getNewData(current_macros);
    }

    newRowIndex.current = props.addOnTop ? 0 : rows.length;

    dataDispatch({
      type: SCHEMA_STATE_ACTIONS.ADD_ROW,
      path: accessPath,
      value: newRow,
      addOnTop: props.addOnTop
    });
  }, [props.canAddRow, rows?.length]);

  useEffect(() => {
    let rowsPromise = fixedRows;

    // If fixedRows is defined, fetch the details.
    if(typeof rowsPromise === 'function') {
      rowsPromise = rowsPromise();
    }

    if(rowsPromise) {
      Promise.resolve(rowsPromise)
        .then((res) => {
          /* If component unmounted, dont update state */
          if(checkIsMounted()) {
            schemaState.setUnpreparedData(accessPath, res);
          }
        });
    }
  }, []);

  useEffect(()=>{
    if(newRowIndex.current >= 0) {
      virtualizer.scrollToIndex(newRowIndex.current);

      // Try autofocus on newly added row.
      setTimeout(() => {
        const rowInput = tableRef.current?.querySelector(
          `.pgrt-row[data-index="${newRowIndex.current}"] input`
        );
        if(!rowInput) return;

        requestAnimationAndFocus(tableRef.current.querySelector(
          `.pgrt-row[data-index="${newRowIndex.current}"] input`
        ));
        props.expandEditOnAdd && props.canEdit &&
          rows[newRowIndex.current]?.toggleExpanded(true);
        newRowIndex.current = undefined;
      }, 50);
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

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableRef.current,
    estimateSize: () => 42,
    measureElement:
      typeof window !== 'undefined' &&
        navigator.userAgent.indexOf('Firefox') === -1
        ? element => element?.getBoundingClientRect().height
        : undefined,
    overscan: viewHelperProps.virtualiseOverscan ?? 10,
  });

  if(!props.visible) {
    return <></>;
  }

  return (
    <StyleDataGridBox className={containerClassName}>
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
            <PgReactTableBody style={{ height: virtualizer.getTotalSize() + 'px'}}>
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const row = rows[virtualRow.index];

                return <PgReactTableRow key={row.id} data-index={virtualRow.index}
                  ref={node => virtualizer.measureElement(node)}
                  style={{
                    transform: `translateY(${virtualRow.start}px)`, // this should always be a `style` as it changes on scroll
                  }}>
                  <DataTableRow index={virtualRow.index} row={row} totalRows={rows.length} isResizing={isResizing}
                    schema={schemaRef.current} schemaRef={schemaRef} accessPath={accessPath.concat([row.index])}
                    moveRow={moveRow} isHovered={virtualRow.index == hoverIndex} setHoverIndex={setHoverIndex} viewHelperProps={viewHelperProps}
                    measureElement={virtualizer.measureElement}
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
    </StyleDataGridBox>
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
