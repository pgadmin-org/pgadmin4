import React from 'react';
import ReactDataGrid from 'react-data-grid';
import { makeStyles } from '@material-ui/core';
import clsx from 'clsx';
import PropTypes from 'prop-types';
import CustomPropTypes from '../custom_prop_types';

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
      fontWeight: 'normal',
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


export default function PgReactDataGrid({gridRef, className, hasSelectColumn=true, ...props}) {
  const classes = useStyles();
  let finalClassName = [classes.root];
  hasSelectColumn && finalClassName.push(classes.hasSelectColumn);
  props.enableCellSelect && finalClassName.push(classes.cellSelection);
  finalClassName.push(className);
  return <ReactDataGrid
    ref={gridRef}
    className={clsx(finalClassName)}
    {...props}
  />;
}

PgReactDataGrid.propTypes = {
  gridRef: CustomPropTypes.ref,
  className: CustomPropTypes.className,
  hasSelectColumn: PropTypes.bool,
  enableCellSelect: PropTypes.bool,
};
