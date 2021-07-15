/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
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
import EditRoundedIcon from '@material-ui/icons/EditRounded';
import DeleteRoundedIcon from '@material-ui/icons/DeleteRounded';
import { useTable, useBlockLayout, useResizeColumns, useSortBy, useExpanded } from 'react-table';
import clsx from 'clsx';
import PropTypes from 'prop-types';
import _ from 'lodash';

import gettext from 'sources/gettext';
import { SCHEMA_STATE_ACTIONS } from '.';
import FormView from './FormView';
import { confirmDeleteRow } from '../helpers/legacyConnector';
import CustomPropTypes from 'sources/custom_prop_types';
import { evalFunc } from 'sources/utils';
import { useOnScreen } from '../custom_hooks';
import { DepListenerContext } from './DepListener';
import { getSchemaRow } from '../utils';

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
  tableCell: {
    margin: 0,
    padding: theme.spacing(0.5),
    ...theme.mixins.panelBorder.bottom,
    ...theme.mixins.panelBorder.right,
    position: 'relative',
    textAlign: 'center'
  },
  tableCellHeader: {
    fontWeight: theme.typography.fontWeightBold,
    padding: theme.spacing(1, 0.5),
    textAlign: 'left',
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
  return (
    <div>
      {headerGroups.map((headerGroup, hi) => (
        <div key={hi} {...headerGroup.getHeaderGroupProps()}>
          {headerGroup.headers.map((column, ci) => (
            <div key={ci} {...column.getHeaderProps()}>
              <div {...(column.sortable ? column.getSortByToggleProps() : {})} className={clsx(classes.tableCell, classes.tableCellHeader)}>
                {column.render('Header')}
                <span>
                  {column.isSorted
                    ? column.isSortedDesc
                      ? ' 🔽'
                      : ' 🔼'
                    : ''}
                </span>
              </div>
              {column.resizable &&
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

function DataTableRow({row, totalRows, isResizing, schema, accessPath}) {
  const classes = useStyles();
  const [key, setKey] = useState(false);
  const depListener = useContext(DepListenerContext);
  /* Memoize the row to avoid unnecessary re-render.
   * If table data changes, then react-table re-renders the complete tables
   * We can avoid re-render by if row data is not changed
   */

  useEffect(()=>{
    /* Calculate the fields which depends on the current field
    deps has info on fields which the current field depends on. */
    schema.fields.forEach((field)=>{
      /* Self change is also dep change */
      if(field.depChange) {
        depListener.addDepListener(accessPath.concat(field.id), accessPath.concat(field.id), field.depChange);
      }
      (evalFunc(null, field.deps) || []).forEach((dep)=>{
        let source = accessPath.concat(dep);
        if(_.isArray(dep)) {
          source = dep;
        }
        depListener.addDepListener(source, accessPath.concat(field.id), field.depChange);
      });
    });
  }, []);

  let depsMap = _.values(row.values, Object.keys(row.values).filter((k)=>!k.startsWith('btn')));
  depsMap = depsMap.concat([totalRows, row.isExpanded, key, isResizing]);
  return useMemo(()=>
    <div {...row.getRowProps()} className="tr">
      {row.cells.map((cell, ci) => {
        let classNames = [classes.tableCell];
        if(cell.column.id == 'btn-edit' && row.isExpanded) {
          classNames.push(classes.expandedIconCell);
        }
        return (
          <div key={ci} {...cell.getCellProps()} className={clsx(classNames)}>
            {cell.render('Cell', {
              reRenderRow: ()=>{setKey((currKey)=>!currKey);}
            })}
          </div>
        );
      })}
    </div>, depsMap);
}

export default function DataGridView({
  value, viewHelperProps, formErr, schema, accessPath, dataDispatch, containerClassName, ...props}) {
  const classes = useStyles();

  /* Using ref so that schema variable is not frozen in columns closure */
  const schemaRef = useRef(schema);
  let columns = useMemo(
    ()=>{
      let cols = [];
      if(props.canEdit) {
        let colInfo = {
          Header: <>&nbsp;</>,
          id: 'btn-edit',
          accessor: ()=>{},
          resizable: false,
          sortable: false,
          dataType: 'edit',
          width: 30,
          minWidth: '0',
          Cell: ({row})=>{
            let canEditRow = true;
            if(props.canEditRow) {
              canEditRow = evalFunc(schemaRef.current, props.canEditRow, row.original || {});
            }
            return <PgIconButton data-test="expand-row" title={gettext('Edit row')} icon={<EditRoundedIcon />} className={classes.gridRowButton}
              onClick={()=>{
                row.toggleRowExpanded(!row.isExpanded);
              }} disabled={!canEditRow}
            />
          }
        };
        colInfo.Cell.displayName = 'Cell',
        colInfo.Cell.propTypes = {
          row: PropTypes.object.isRequired,
        };
        cols.push(colInfo);
      }
      if(props.canDelete) {
        let colInfo = {
          Header: <>&nbsp;</>,
          id: 'btn-delete',
          accessor: ()=>{},
          resizable: false,
          sortable: false,
          dataType: 'delete',
          width: 30,
          minWidth: '0',
          Cell: ({row}) => {
            let canDeleteRow = true;
            if(props.canDeleteRow) {
              canDeleteRow = evalFunc(schemaRef.current, props.canDeleteRow, row.original || {});
            }

            return (
              <PgIconButton data-test="delete-row" title={gettext('Delete row')} icon={<DeleteRoundedIcon />}
                onClick={()=>{
                  confirmDeleteRow(()=>{
                    /* Get the changes on dependent fields as well */
                    dataDispatch({
                      type: SCHEMA_STATE_ACTIONS.DELETE_ROW,
                      path: accessPath,
                      value: row.index,
                    });
                  }, ()=>{}, props.customDeleteTitle, props.customDeleteMsg);
                }} className={classes.gridRowButton} disabled={!canDeleteRow} />
            );
          }
        };
        colInfo.Cell.displayName = 'Cell',
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
          let colInfo = {
            Header: field.label,
            accessor: field.id,
            field: field,
            resizable: true,
            sortable: true,
            ...(field.minWidth ?  {minWidth: field.minWidth} : {}),
            ...(field.width ?  {width: field.width} : {}),
            Cell: ({value, row, ...other}) => {
              let {visible, editable, readonly, ..._field} = field;

              let verInLimit = (_.isUndefined(viewHelperProps.serverInfo) ? true :
                ((_.isUndefined(field.server_type) ? true :
                  (viewHelperProps.serverInfo.type in field.server_type)) &&
                (_.isUndefined(field.min_version) ? true :
                  (viewHelperProps.serverInfo.version >= field.min_version)) &&
                (_.isUndefined(field.max_version) ? true :
                  (viewHelperProps.serverInfo.version <= field.max_version))));
              let _readonly = viewHelperProps.inCatalog || (viewHelperProps.mode == 'properties');
              if(!_readonly) {
                _readonly = evalFunc(schemaRef.current, readonly, row.original || {});
              }

              visible = _.isUndefined(visible) ? true : visible;
              let _visible = true;
              if(visible) {
                _visible = evalFunc(schemaRef.current, visible, row.original || {});
              }
              _visible = _visible && verInLimit;

              editable = _.isUndefined(editable) ? true : editable;
              editable = evalFunc(schemaRef.current, editable, row.original || {});

              return <MappedCellControl rowIndex={row.index} value={value}
                row={row.original} {..._field}
                readonly={_readonly}
                disabled={!editable}
                visible={_visible}
                onCellChange={(value)=>{
                  dataDispatch({
                    type: SCHEMA_STATE_ACTIONS.SET_VALUE,
                    path: accessPath.concat([row.index, _field.id]),
                    value: value,
                  });
                }}
                reRenderRow={other.reRenderRow}
              />;
            },
          };
          colInfo.Cell.displayName = 'Cell',
          colInfo.Cell.propTypes = {
            row: PropTypes.object.isRequired,
            value: PropTypes.any,
            onCellChange: PropTypes.func,
          };
          return colInfo;
        })
      );
      return cols;
    },[]
  );

  const onAddClick = useCallback(()=>{
    let newRow = schemaRef.current.getNewData();
    dataDispatch({
      type: SCHEMA_STATE_ACTIONS.ADD_ROW,
      path: accessPath,
      value: newRow,
    });
  });

  const defaultColumn = useMemo(()=>({
    minWidth: 175,
    width: 0,
  }));

  let tablePlugins = [
    useBlockLayout,
    useResizeColumns,
    useSortBy,
  ];
  if(props.canEdit) {
    tablePlugins.push(useExpanded);
  }
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
  } = useTable(
    {
      columns,
      data: value || [],
      defaultColumn,
      manualSortBy: true,
      autoResetSortBy: false,
      autoResetExpanded: false,
    },
    ...tablePlugins,
  );

  const isResizing = _.flatMap(headerGroups, headerGroup => headerGroup.headers.map(col=>col.isResizing)).includes(true);

  return (
    <Box className={containerClassName}>
      <Box className={classes.grid}>
        <Box className={classes.gridHeader}>
          <Box className={classes.gridHeaderText}>{props.label}</Box>
          <Box className={classes.gridControls}>
            {props.canAdd && <PgIconButton data-test="add-row" title={gettext('Add row')} onClick={onAddClick} icon={<AddIcon />} className={classes.gridControlsButton} />}
          </Box>
        </Box>
        <div {...getTableProps()} className={classes.table}>
          <DataTableHeader headerGroups={headerGroups} />
          <div {...getTableBodyProps()}>
            {rows.map((row, i) => {
              prepareRow(row);
              return <React.Fragment key={i}>
                <DataTableRow row={row} totalRows={rows.length} isResizing={isResizing}
                  schema={schemaRef.current} accessPath={accessPath.concat([row.index])} />
                {props.canEdit && row.isExpanded &&
                  <FormView value={row.original} viewHelperProps={viewHelperProps} formErr={formErr} dataDispatch={dataDispatch}
                    schema={schemaRef.current} accessPath={accessPath.concat([row.index])} isNested={true} className={classes.expandedForm}
                    isDataGridForm={true}/>
                }
              </React.Fragment>;
            })}
          </div>
        </div>
      </Box>
    </Box>
  );
}

DataGridView.propTypes = {
  label: PropTypes.string,
  value: PropTypes.array,
  viewHelperProps: PropTypes.object,
  formErr: PropTypes.object,
  schema: CustomPropTypes.schemaUI,
  accessPath: PropTypes.array.isRequired,
  dataDispatch: PropTypes.func.isRequired,
  containerClassName: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
  columns: PropTypes.array,
  canEdit: PropTypes.bool,
  canAdd: PropTypes.bool,
  canDelete: PropTypes.bool,
  customDeleteTitle: PropTypes.string,
  customDeleteMsg: PropTypes.string,
};
