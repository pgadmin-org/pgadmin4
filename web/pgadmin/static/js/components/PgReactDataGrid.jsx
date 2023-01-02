/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import React, { useContext, useEffect } from 'react';
import ReactDataGrid, { Row } from 'react-data-grid';
import { Box, makeStyles } from '@material-ui/core';
import clsx from 'clsx';
import PropTypes from 'prop-types';
import CustomPropTypes from '../custom_prop_types';
import KeyboardArrowUpIcon from '@material-ui/icons/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';
import gettext from 'sources/gettext';

const useStyles = makeStyles((theme)=>({
  root: {
    height: '100%',
    color: theme.palette.text.primary,
    backgroundColor: theme.otherVars.qtDatagridBg,
    fontSize: '12px',
    border: 'none',
    '--rdg-selection-color': theme.palette.primary.main,
    '& .rdg-cell': {
      ...theme.mixins.panelBorder.right,
      ...theme.mixins.panelBorder.bottom,
      fontWeight: 'abc',
      '&[aria-colindex="1"]': {
        padding: 0,
      },
      '&[aria-selected=true]:not([role="columnheader"])': {
        outlineWidth: '0px',
        outlineOffset: '0px',
      }
    },
    '& .rdg-header-row .rdg-cell': {
      padding: 0,
    },
    '& .rdg-header-row': {
      backgroundColor: theme.palette.background.default,
    },
    '& .rdg-row': {
      backgroundColor: theme.palette.background.default,
      '&[aria-selected=true]': {
        backgroundColor: theme.palette.primary.light,
        color: theme.otherVars.qtDatagridSelectFg,
      },
    }
  },
  cellSelection: {
    '& .rdg-cell': {
      '&[aria-selected=true]:not([role="columnheader"])': {
        outlineWidth: '1px',
        outlineOffset: '-1px',
        backgroundColor: theme.palette.primary.light,
        color: theme.otherVars.qtDatagridSelectFg,
      }
    },
  },
  hasSelectColumn: {
    '& .rdg-cell': {
      '&[aria-selected=true][aria-colindex="1"]': {
        outlineWidth: '2px',
        outlineOffset: '-2px',
        backgroundColor: theme.otherVars.qtDatagridBg,
        color: theme.palette.text.primary,
      }
    },
    '& .rdg-row[aria-selected=true] .rdg-cell:nth-child(1)': {
      backgroundColor: theme.palette.primary.main,
      color: theme.palette.primary.contrastText,
    }
  }
}));

export const GridContextUtils = React.createContext();

function CutomSortIcon({sortDirection}) {
  if(sortDirection == 'DESC') {
    return <KeyboardArrowDownIcon style={{fontSize: '1.2rem'}} />;
  } else if(sortDirection == 'ASC') {
    return <KeyboardArrowUpIcon style={{fontSize: '1.2rem'}} />;
  }
  return <></>;
}
CutomSortIcon.propTypes = {
  sortDirection: PropTypes.string,
};

export function CustomRow({inTest=false, ...props}) {
  const gridUtils = useContext(GridContextUtils);
  const handleKeyDown = (e)=>{
    if(e.code == 'Tab' || e.code == 'ArrowRight' || e.code == 'ArrowLeft') {
      e.stopPropagation();
    }
    if(e.code == 'Enter') {
      gridUtils.onItemEnter?.(props.row);
    }
  };
  const isRowSelected = props.selectedCellIdx >= 0;
  useEffect(()=>{
    if(isRowSelected) {
      gridUtils.onItemSelect?.(props.rowIdx);
    }
  }, [props.selectedCellIdx]);
  if(inTest) {
    return <div data-test='test-div' tabIndex={0} onKeyDown={handleKeyDown}></div>;
  }
  const onRowClick = (...args)=>{
    gridUtils.onItemClick?.(props.rowIdx);
    props.onRowClick?.(...args);
  };
  return (
    <Row {...props} onKeyDown={handleKeyDown} onRowClick={onRowClick} onRowDoubleClick={(row)=>gridUtils.onItemEnter?.(row)}
      selectCell={(row, column)=>props.selectCell(row, column)} aria-selected={isRowSelected}/>
  );
}
CustomRow.propTypes = {
  inTest: PropTypes.bool,
  row: PropTypes.object,
  selectedCellIdx: PropTypes.number,
  onRowClick: PropTypes.func,
  rowIdx: PropTypes.number,
  selectCell: PropTypes.func,
};

export default function PgReactDataGrid({gridRef, className, hasSelectColumn=true, onItemEnter, onItemSelect,
  onItemClick, noRowsText, noRowsIcon,...props}) {
  const classes = useStyles();
  let finalClassName = [classes.root];
  hasSelectColumn && finalClassName.push(classes.hasSelectColumn);
  props.enableCellSelect && finalClassName.push(classes.cellSelection);
  finalClassName.push(className);
  return (
    <GridContextUtils.Provider value={{onItemEnter, onItemSelect, onItemClick}}>
      <ReactDataGrid
        ref={gridRef}
        className={clsx(finalClassName)}
        components={{
          sortIcon: CutomSortIcon,
          rowRenderer: CustomRow,
          noRowsFallback: <Box textAlign="center" gridColumn="1/-1" p={1}>{noRowsIcon}{noRowsText || gettext('No rows found.')}</Box>,
        }}
        {...props}
      />
    </GridContextUtils.Provider>
  );
}

PgReactDataGrid.propTypes = {
  gridRef: CustomPropTypes.ref,
  className: CustomPropTypes.className,
  hasSelectColumn: PropTypes.bool,
  enableCellSelect: PropTypes.bool,
  onItemEnter: PropTypes.func,
  onItemSelect: PropTypes.func,
  onItemClick: PropTypes.func,
  noRowsText: PropTypes.string,
  noRowsIcon: PropTypes.object
};
