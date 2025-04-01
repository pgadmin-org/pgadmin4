/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import { Box, styled, Tab, Tabs } from '@mui/material';
import TabPanel from '../../../../static/js/components/TabPanel';
import Users from './Users';

const Root = styled('div')(({theme}) => ({
  height: '100%',
  background: theme.palette.grey[400],
  display: 'flex',
  flexDirection: 'column',
  padding: '8px',

  '& .Component-panel': {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    ...theme.mixins.panelBorder.all,
  }
}));

export default function Component() {
  const [tabValue, setTabValue] = React.useState(0);

  return (
    <Root>
      <Box className='Component-panel'>
        <Box>
          <Tabs
            value={tabValue}
            onChange={(_e, selTabValue) => {
              setTabValue(selTabValue);
            }}
            variant="scrollable"
            scrollButtons="auto"
            action={(ref)=>ref?.updateIndicator()}
          >
            <Tab label="Users" />
          </Tabs>
        </Box>
        <TabPanel value={tabValue} index={0}>
          <Users />
        </TabPanel>
      </Box>
    </Root>
  );
}