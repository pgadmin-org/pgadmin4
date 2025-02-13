/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { forwardRef, useEffect } from 'react';
import { flexRender } from '@tanstack/react-table';
import { styled } from '@mui/material/styles';
import PropTypes from 'prop-types';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import { PgIconButton } from './Buttons';
import CustomPropTypes from '../custom_prop_types';
import { InputSwitch } from './FormComponents';
import { Checkbox } from '@mui/material';
import { getEnterKeyHandler } from '../utils';

const StyledDiv = styled('div')(({theme})=>({
  '&.pgrt': {
    display: 'grid',
    overflow: 'auto',
    position: 'relative',
    flexGrow: 1,
  },

  // by default the table has no outer border.
  // the parent container has to take care of border.
  '& .pgrt-table': {
    borderSpacing: 0,
    borderRadius: theme.shape.borderRadius,
    display: 'grid',
    gridAutoRows: 'max-content',
    flexGrow: 1,
    flexDirection: 'column',

    '& .pgrt-header': {
      position: 'sticky',
      top: 0,
      zIndex: 1,

      '& .pgrt-header-row': {
        height: '34px',
        display: 'flex',

        '& .pgrt-header-cell': {
          position: 'relative',
          fontWeight: theme.typography.fontWeightBold,
          padding: theme.spacing(0.5),
          textAlign: 'left',
          alignContent: 'center',
          backgroundColor: theme.otherVars.tableBg,
          overflow: 'hidden',
          ...theme.mixins.panelBorder.bottom,
          ...theme.mixins.panelBorder.right,

          '& > div': {
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            textWrap: 'nowrap'
          },

          '& .pgrt-header-resizer': {
            display: 'inline-block',
            width: '5px',
            height: '100%',
            position: 'absolute',
            right: 0,
            top: 0,
            transform: 'translateX(50%)',
            zIndex: 1,
            cursor: 'col-resize',
          }
        }
      }
    },

    '& .pgrt-body': {
      position: 'relative',
      flexGrow: 1,
      minHeight: 0,

      '& .pgrt-row': {
        display: 'flex',
        flexDirection: 'column',
        position: 'absolute',
        width: '100%',

        '& .pgrt-row-content': {
          display: 'flex',
          minHeight: 0,

          '& .pgrd-row-cell': {
            margin: 0,
            padding: theme.spacing(0.25, 0.5),
            ...theme.mixins.panelBorder.bottom,
            ...theme.mixins.panelBorder.right,
            position: 'relative',
            height: '30px',
            display: 'flex',
            alignItems: 'flex-start',
            backgroundColor: theme.otherVars.tableBg,

            '&.btn-cell': {
              textAlign: 'center',
            },
            '&.expanded-icon-cell': {
              backgroundColor: theme.palette.grey[400],
              borderBottom: 'none',
            },
            '&.row-warning': {
              backgroundColor: theme.palette.warning.main + '!important'
            },
            '&.row-alert': {
              backgroundColor: theme.palette.error.main + '!important'
            },
            '&.cell-with-icon': {
              paddingLeft: '1.8em',
              borderRadius: 0,
              backgroundPosition: '1%',
            },

            '& .pgrd-row-cell-content': {
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              userSelect: 'text',
              width: '100%',
            },

            '& .reorder-cell': {
              cursor: 'move',
              padding: '4px 2px',
            },
            '& .pgrt-cell-button': {
              border: 0,
              borderRadius: 0,
              padding: 0,
              minWidth: 0,
              backgroundColor: 'inherit',
              '&.Mui-disabled': {
                border: 0,
              },
            }
          }
        },

        '& .pgrt-expanded-content': {
          ...theme.mixins.panelBorder.all,
          margin: '8px',
          flexGrow: 1,
        }
      }
    },
  }
}));

export const PgReactTableCell = forwardRef(({row, cell, children, className}, ref)=>{
  let classNames = ['pgrd-row-cell'];
  if (typeof (cell.column.id) == 'string' && cell.column.id.startsWith('btn-')) {
    classNames.push('btn-cell');
  }
  if (cell.column.id == 'btn-edit' && row.getIsExpanded()) {
    classNames.push('expanded-icon-cell');
  }
  if (row.original.row_type === 'warning') {
    classNames.push('row-warning');
  }
  if (row.original.row_type === 'alert') {
    classNames.push('row-alert');
  }
  if(row.original.icon?.[cell.column.id]) {
    classNames.push(row.original.icon[cell.column.id], 'cell-with-icon');
  }
  if(cell.column.columnDef.dataClassName){
    classNames.push(cell.column.columnDef.dataClassName);
  }

  classNames.push(className);

  return (
    <div ref={ref} key={cell.id} style={{
      flex: `var(--col-${cell.column.id.replace(/\W/g, '_')}-size) 0 auto`,
      width: `calc(var(--col-${cell.column.id.replace(/\W/g, '_')}-size)*1px)`,
      ...(cell.column.columnDef.maxSize ? { maxWidth: `${cell.column.columnDef.maxSize}px` } : {})
    }}
    className={classNames.join(' ')}
    title={typeof(cell.getValue()) === 'object' ? '' : String(cell.getValue() ?? '')}>
      <div className='pgrd-row-cell-content'>{children}</div>
    </div>
  );
});

PgReactTableCell.displayName = 'PgReactTableCell';
PgReactTableCell.propTypes = {
  row: PropTypes.object,
  cell: PropTypes.object,
  children: CustomPropTypes.children,
  className: PropTypes.any,
};

export const PgReactTableRow = forwardRef(({ children, className, ...props }, ref)=>{
  return (
    <div className={['pgrt-row', className].join(' ')} ref={ref} {...props}>
      {children}
    </div>
  );
});
PgReactTableRow.displayName = 'PgReactTableRow';
PgReactTableRow.propTypes = {
  children: CustomPropTypes.children,
  className: PropTypes.any,
};

export const PgReactTableRowContent = forwardRef(({children, className, ...props}, ref)=>{
  return (
    <div className={['pgrt-row-content', className].join(' ')} ref={ref} {...props}>
      {children}
    </div>
  );
});
PgReactTableRowContent.displayName = 'PgReactTableRowContent';
PgReactTableRowContent.propTypes = {
  children: CustomPropTypes.children,
  className: PropTypes.any,
};


export function PgReactTableRowExpandContent({row, children}) {
  if(!row.getIsExpanded()) {
    return <></>;
  }
  return (
    <div className='pgrt-expanded-content' style={{ maxWidth: 'calc(var(--expand-width)*1px)' }}>
      {children}
    </div>
  );
}
PgReactTableRowExpandContent.propTypes = {
  row: PropTypes.object,
  children: CustomPropTypes.children,
};

export function PgReactTableHeader({table}) {
  return (
    <div className='pgrt-header'>
      {table.getHeaderGroups().map((headerGroup) => (
        <div key={headerGroup.id} className='pgrt-header-row' style={{  }}>
          {headerGroup.headers.map((header) => (
            <div
              key={header.id}
              className='pgrt-header-cell'
              style={{
                flex: `var(--header-${header?.id.replace(/\W/g, '_')}-size) 0 auto`,
                width: `calc(var(--header-${header?.id.replace(/\W/g, '_')}-size)*1px)`,
                ...(header.column.columnDef.maxSize ? { maxWidth: `${header.column.columnDef.maxSize}px` } : {}),
              }}
            >
              <div title={flexRender(header.column.columnDef.header, header.getContext())}
                style={{cursor: header.column.getCanSort() ? 'pointer' : 'initial'}}
                onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                onKeyDown={header.column.getCanSort() ? getEnterKeyHandler(header.column.getToggleSortingHandler): undefined}
              >
                {flexRender(header.column.columnDef.header, header.getContext())}
                {header.column.getCanSort() && header.column.getIsSorted() &&
                  <span>
                    {header.column.getIsSorted() == 'desc' ?
                      <KeyboardArrowDownIcon style={{ fontSize: '1.2rem' }} />
                      : <KeyboardArrowUpIcon style={{ fontSize: '1.2rem' }} />}
                  </span>}
              </div>
              {header.column.getCanResize() && (
                <div
                  onDoubleClick={() => header.column.resetSize()}
                  onMouseDown={header.getResizeHandler()}
                  onTouchStart={header.getResizeHandler()}
                  className='pgrt-header-resizer'
                />
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
PgReactTableHeader.propTypes = {
  table: PropTypes.object,
};

export function PgReactTableBody({children, style}) {
  return (
    <div className='pgrt-body' style={style}>
      {children}
    </div>
  );
}
PgReactTableBody.propTypes = {
  style: PropTypes.object,
  children: CustomPropTypes.children,
};

export const PgReactTable = forwardRef(({children, table, rootClassName, tableClassName, onScrollFunc, ...props}, ref)=>{
  const columns = table.getAllColumns();

  useEffect(()=>{
    const setMaxExpandWidth = ()=>{
      if(ref.current) {
        ref.current.style['--expand-width'] = (ref.current.getBoundingClientRect().width ?? 430) - 30; //margin,scrollbar,etc.
      }
    };
    const tableResizeObserver = new ResizeObserver(()=>{
      setMaxExpandWidth();
    });
    tableResizeObserver.observe(ref.current);
  }, []);

  const columnSizeVars = React.useMemo(() => {
    const headers = table.getFlatHeaders();
    const colSizes = {};
    for (let value of headers) {
      const header = value;
      colSizes[`--header-${header.id.replace(/\W/g, '_')}-size`] = header.getSize();
      colSizes[`--col-${header.column.id.replace(/\W/g, '_')}-size`] = header.column.getSize();
    }
    return colSizes;
  }, [columns, table.getState().columnSizingInfo]);

  return (
    <StyledDiv className={['pgrt', rootClassName].join(' ')} ref={ref} onScroll={e => onScrollFunc?.(e.target)}>
      <div className={['pgrt-table', tableClassName].join(' ')} style={{ ...columnSizeVars }} {...props}>
        {children}
      </div>
    </StyledDiv>
  );
});
PgReactTable.displayName = 'PgReactTable';
PgReactTable.propTypes = {
  table: PropTypes.object,
  rootClassName: PropTypes.any,
  tableClassName: PropTypes.any,
  children: CustomPropTypes.children,
  onScrollFunc: PropTypes.any,
};

export function getExpandCell({ onClick, title }) {
  const Cell = ({ row }) => {
    const onClickFinal = (e) => {
      e.preventDefault();
      row.toggleExpanded();
      onClick?.(row, e);
    };
    return (
      <PgIconButton
        size="xs"
        icon={
          row.getIsExpanded() ? (
            <KeyboardArrowDownIcon />
          ) : (
            <ChevronRightIcon />
          )
        }
        noBorder
        onClick={onClickFinal}
        aria-label={title}
      />
    );
  };

  Cell.displayName = 'ExpandCell';
  Cell.propTypes = {
    row: PropTypes.any,
  };

  return Cell;
}

export function getSwitchCell() {
  const Cell = ({ getValue }) => {
    return <InputSwitch value={getValue()} readonly />;
  };

  Cell.displayName = 'SwitchCell';
  Cell.propTypes = {
    getValue: PropTypes.func,
  };

  return Cell;
}

export function getCheckboxCell({title}) {
  const Cell = ({ table }) => {
    return (
      <div style={{textAlign: 'center', minWidth: 20}}>
        <Checkbox
          color="primary"
          checked={table.getIsAllRowsSelected()}
          indeterminate={table.getIsSomeRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
          inputProps={{ 'aria-label': title }}
        />
      </div>
    );
  };

  Cell.displayName = 'CheckboxCell';
  Cell.propTypes = {
    table: PropTypes.object,
  };

  return Cell;
}

export function getCheckboxHeaderCell({title}) {
  const Cell = ({ row }) => {
    return (
      <div style={{textAlign: 'center', minWidth: 20}}>
        <Checkbox
          color="primary"
          checked={row.getIsSelected()}
          indeterminate={row.getIsSomeSelected()}
          disabled={!row.getCanSelect()}
          onChange={row.getToggleSelectedHandler()}
          inputProps={{ 'aria-label': title }}
        />
      </div>
    );
  };

  Cell.displayName = 'CheckboxHeaderCell';
  Cell.propTypes = {
    row: PropTypes.object,
  };

  return Cell;
}

export function getEditCell({isDisabled, title}) {
  const Cell = ({ row }) => {
    return <PgIconButton data-test="expand-row" title={title} icon={<EditRoundedIcon fontSize="small" />} className='pgrt-cell-button'
      onClick={()=>{
        row.toggleExpanded();
      }} disabled={isDisabled?.(row)}
    />;
  };

  Cell.displayName = 'EditCell';
  Cell.propTypes = {
    row: PropTypes.any,
  };

  return Cell;
}

export function getDeleteCell({isDisabled, title, onClick}) {
  const Cell = ({ row }) => (
    <PgIconButton data-test="delete-row" title={title} icon={<DeleteRoundedIcon fontSize="small" />}
      onClick={()=>onClick?.(row)}
      className='pgrt-cell-button' disabled={isDisabled?.(row)}
    />
  );

  Cell.displayName = 'DeleteCell';
  Cell.propTypes = {
    row: PropTypes.any,
  };

  return Cell;
}
