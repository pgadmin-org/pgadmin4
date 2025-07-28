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
import PropTypes from 'prop-types';
import { Box } from '@mui/material';
import { Resizable } from 're-resizable';

const StyledBox = styled(Box)(({theme}) => ({
  ...theme.mixins.panelBorder.all,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden !important',
  height: 'auto',
  width: '100%',
  borderRadius: theme.shape.borderRadius,
  '& .SectionContainer-cardHeader': {
    backgroundColor: theme.otherVars.tableBg,
    borderBottom: '1px solid',
    borderBottomColor: theme.otherVars.borderColor,
    display: 'flex',
    alignItems: 'center',
    '& .SectionContainer-cardTitle': {
      padding: '0.25rem 0.5rem',
      fontWeight: 'bold',
      width: '100%',
    }
  },
  // Added this to remove the borders from pgrt.
  '& .pgrt': {
    borderRight: 'none !important',
    borderLeft: 'none !important',
    borderBottom: 'none !important',
  },
}));

export default function SectionContainer({title, titleExtras, children, style}) {
  return (
    <StyledBox className='SectionContainer-root' style={style}>
      <Resizable
        enable={{ bottom: true }}
        defaultSize={{ height: 'auto', width: '100%' }}
        minHeight={25}
        style={{
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Box className='SectionContainer-cardHeader' title={title}>
          <div className='SectionContainer-cardTitle'>{title}</div>
          <div style={{marginLeft: 'auto'}}>
            {titleExtras}
          </div>
        </Box>
        <Box height="100%" display="flex" flexDirection="column" minHeight={0}>
          {children}
        </Box>
      </Resizable>
    </StyledBox>
  );
}

SectionContainer.propTypes = {
  title: PropTypes.any.isRequired,
  titleExtras: PropTypes.node,
  children: PropTypes.node.isRequired,
  style: PropTypes.object,
};
