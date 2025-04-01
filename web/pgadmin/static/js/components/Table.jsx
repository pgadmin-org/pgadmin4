/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import { styled } from '@mui/material/styles';
import CustomPropTypes from '../custom_prop_types';

const StyledTable = styled('table')(({theme})=>({
  borderSpacing: 0,
  width: '100%',
  overflow: 'auto',
  backgroundColor: theme.otherVars.tableBg,
  border: '1px solid '+theme.otherVars.borderColor,
  '& tbody td, & thead th': {
    margin: 0,
    padding: theme.spacing(0.5),
    border: '1px solid '+ theme.otherVars.borderColor,
    borderBottom: 'none',
    position: 'relative',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    userSelect: 'text',
    maxWidth: '250px',
    '&:first-of-type':{
      borderLeft: 'none',
    },
  },
  '& thead tr:first-of-type th': {
    borderTop: 'none',
  },
  '& tbody tr:last-of-type': {
    '&:hover td': {
      borderBottomColor: theme.palette.primary.main,
    },
    '& td': {
      borderBottomColor: theme.otherVars.borderColor,
    }
  },
  '& th': {
    fontWeight: theme.typography.fontWeightBold,
    padding: theme.spacing(1, 0.5),
    textAlign: 'left',
  },
  '& tbody > tr': {
    '&:hover': {
      backgroundColor: theme.palette.primary.light,
      '& td': {
        borderBottom: '1px solid '+theme.palette.primary.main,
        borderTop: '1px solid '+theme.palette.primary.main,
      },
      '&:last-of-type td': {
        borderBottomColor: theme.palette.primary.main,
      },
    },
  },
})

);

export default function Table({children, classNameRoot, ...props}) {
  return (
    <StyledTable className={[classNameRoot].join(' ')} {...props}>{children}</StyledTable>
  );
}

Table.propTypes = {
  children: CustomPropTypes.children,
  classNameRoot: CustomPropTypes.className
};
