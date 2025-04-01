/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { forwardRef } from 'react';
import { styled } from '@mui/material/styles';
import CustomPropTypes from '../custom_prop_types';
import { Box } from '@mui/material';

const StyledBox = styled(Box)(({theme})=>({
  backgroundColor: theme.palette.background.default,
  display: 'flex',
  flexDirection: 'column',
  '& .ModalContent-footer': {
    display: 'flex',
    justifyContent: 'flex-end',
    padding: '0.5rem',
    ...theme.mixins.panelBorder?.top,
    gap: '5px',
    '&.ModalContent-iconButtonStyle': {
      marginLeft: 'auto',
      marginRight: '4px'
    },
  },
}));

export const ModalContent = forwardRef(({children, ...props }, ref) => {
  return (
    <StyledBox style={{height: '100%'}} ref={ref}  {...props}>{children}</StyledBox>
  );
});
ModalContent.displayName = 'ModalContent';
ModalContent.propTypes = {
  children: CustomPropTypes.children,
};


export function ModalFooter({children, classNameRoot, ...props}) {
  return (
    <StyledBox className={[classNameRoot]} {...props}>
      <Box className='ModalContent-footer'>
        {children}
      </Box>
    </StyledBox>
  );
}

ModalFooter.propTypes = {
  children: CustomPropTypes.children,
  classNameRoot: CustomPropTypes.className
};
