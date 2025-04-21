/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import React, { useCallback, useContext, useEffect, useMemo } from 'react';
import ReactDataGrid, { Row } from 'react-data-grid';
import { Box } from '@mui/material';
import PropTypes from 'prop-types';
import CustomPropTypes from '../custom_prop_types';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import gettext from 'sources/gettext';
import { styled } from '@mui/material/styles';

const StyledReactDataGrid = styled(ReactDataGrid)(({theme})=>({
  '&.ReactGrid-root': {
    height: '100%',
    color: theme.palette.text.primary,
    backgroundColor: theme.otherVars.qtDatagridBg,
    fontSize: '12px',
    border: 'none',
    userSelect: 'none',
    '--rdg-selection-color': theme.palette.primary.main,
    '& .rdg-cell': {
      ...theme.mixins.panelBorder.right,
      ...theme.mixins.panelBorder.bottom,
      fontWeight: 'abc',
      whiteSpace: 'pre',
      '&[aria-colindex="1"]': {
        padding: 0,
      },
      '&[aria-selected=true]:not([aria-colindex="1"]):not([role="columnheader"])': {
        outlineWidth: '0px',
        outlineOffset: '0px',
      },
      '& .rdg-cell-value': {
        height: '100%',
      },
      '&.rdg-cell-copied[aria-selected=false][role="gridcell"]': {
        backgroundColor: 'inherit',
      }
    },
    '& .rdg-header-row .rdg-cell': {
      padding: 0,

      '& .rdg-header-sort-name': {
        margin: 'auto 0',
      }
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
  '&.ReactGrid-cellSelection': {
    '& .rdg-cell': {
      '&[aria-selected=true]:not([aria-colindex="1"]):not([role="columnheader"])': {
        outlineWidth: '1px',
        outlineOffset: '-1px',
        backgroundColor: theme.palette.primary.light,
        color: theme.otherVars.qtDatagridSelectFg,
      }
    },
  },
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
    return <div data-test='test-div' tabIndex={-1} onKeyDown={handleKeyDown}></div>;
  }

  const onCellClick = (args) => {
    gridUtils.onItemClick?.(args.row.rowIdx);
    props.onRowClick?.(args.row);
  };

  const onCellDoubleClick = (args) => {
    gridUtils.onItemEnter?.(args.row);
  };

  return (
    <Row {...props} onKeyDown={handleKeyDown} onCellClick={onCellClick} onCellDoubleClick={onCellDoubleClick}
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

  let finalClassName = ['ReactGrid-root'];
  hasSelectColumn && finalClassName.push('ReactGrid-hasSelectColumn');
  props.enableCellSelect && finalClassName.push('ReactGrid-cellSelection');
  finalClassName.push(className);
  const valObj = useMemo(() => ({onItemEnter, onItemSelect, onItemClick}), [onItemEnter, onItemSelect, onItemClick]);

  const renderRow = useCallback((key, props) => {
    return <CustomRow key={key} {...props} />;
  }, []);

  const renderSortStatus = useCallback((props) => {
    return <CutomSortIcon {...props} />;
  }, []);

  return (
    <GridContextUtils.Provider value={valObj}>
      <StyledReactDataGrid
        ref={gridRef}
        className={finalClassName.join(' ')}
        renderers={{
          renderRow,
          renderSortStatus,
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
