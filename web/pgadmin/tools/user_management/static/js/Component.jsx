/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useEffect } from 'react';
import { Box, styled, Tab, Tabs } from '@mui/material';
import TabPanel from '../../../../static/js/components/TabPanel';
import url_for from 'sources/url_for';
import Users from './Users';
import Permissions from './Permissions';
import getApiInstance from '../../../../static/js/api_instance';
import Roles from './Roles';

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
    minHeight: 0,
    ...theme.mixins.panelBorder.all,
  }
}));

export default function Component() {
  const [tabValue, setTabValue] = React.useState(0);
  const [roles, setRoles] = React.useState([]);

  const fetchRoles = async () => {
    const url = url_for('user_management.roles');
    const response = await getApiInstance().get(url);
    setRoles(response.data);
  };

  const updateRolePermissions = (rid, permissions) => {
    setRoles(roles.map((r) => {
      if (r.id === rid) {
        return {...r, permissions};
      }
      return r;
    }));
  };

  useEffect(() => {
    fetchRoles();
  }, []);

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
            <Tab label="Roles" />
            <Tab label="Permissions" />
          </Tabs>
        </Box>
        <TabPanel value={tabValue} index={0}>
          <Users roles={roles} />
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          <Roles roles={roles} updateRoles={fetchRoles} />
        </TabPanel>
        <TabPanel value={tabValue} index={2}>
          <Permissions roles={roles} updateRolePermissions={updateRolePermissions} />
        </TabPanel>
      </Box>
    </Root>
  );
}