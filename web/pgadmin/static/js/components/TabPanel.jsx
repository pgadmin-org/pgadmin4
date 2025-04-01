/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import { Box } from '@mui/material';
import { styled } from '@mui/material/styles';
import PropTypes from 'prop-types';
import CustomPropTypes from '../custom_prop_types';


const StyledBox = styled(Box)(({theme})=>({
  ...theme.mixins.tabPanel,
  '& .TabPanel-content':{
    height: '100%',
  }
}));

/* Material UI does not have any tabpanel component, we create one for us */
export default function TabPanel({children, classNameRoot, className, value, index, ...props}) {
  const active = value === index;
  return (
    <StyledBox className={[classNameRoot].join(' ')} component="div" hidden={!active} data-test="tabpanel" {...props}>
      <Box className={['TabPanel-content', className].join(' ')}>{children}</Box>
    </StyledBox>
  );
}

TabPanel.propTypes = {
  children: CustomPropTypes.children,
  classNameRoot: CustomPropTypes.className,
  className: CustomPropTypes.className,
  value: PropTypes.any.isRequired,
  index: PropTypes.any.isRequired,
};
