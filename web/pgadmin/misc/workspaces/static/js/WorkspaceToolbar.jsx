/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useEffect, useState } from 'react';
import { usePgAdmin } from '../../../../static/js/PgAdminProvider';
import { Box } from '@mui/material';
import { QueryToolIcon, SchemaDiffIcon } from '../../../../static/js/components/ExternalIcon';
import TerminalRoundedIcon from '@mui/icons-material/TerminalRounded';
import SettingsIcon from '@mui/icons-material/Settings';
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded';
import { PgIconButton } from '../../../../static/js/components/Buttons';
import PropTypes from 'prop-types';
import { styled } from '@mui/material/styles';
import { WORKSPACES } from '../../../../browser/static/js/constants';
import { useWorkspace } from './WorkspaceProvider';
import { LAYOUT_EVENTS } from '../../../../static/js/helpers/Layout';
import gettext from 'sources/gettext';

const StyledWorkspaceButton = styled(PgIconButton)(({theme}) => ({
  '&.Buttons-iconButtonDefault': {
    border: 'none',
    borderRight: '2px solid transparent' ,
    borderRadius: 0,
    padding: '8px 6px',
    height: '40px',
    backgroundColor: theme.palette.background.default,
    '&:hover': {
      borderColor: 'transparent',
    },
    '&.active': {
      backgroundColor: theme.otherVars.tree.bgSelected,
      borderRightColor: theme.palette.primary.main,
    },
    '&.Mui-disabled': {
      backgroundColor: theme.palette.background.default,
      borderRightColor: 'transparent',
    }
  },
}));

function WorkspaceButton({menuItem, value, ...props}) {
  const {currentWorkspace, hasOpenTabs, getLayoutObj, onWorkspaceDisabled, changeWorkspace} = useWorkspace();
  const active = value == currentWorkspace;
  const [disabled, setDisabled] = useState();

  useEffect(()=>{
    const layout = getLayoutObj(value);
    const deregInit = layout.eventBus.registerListener(LAYOUT_EVENTS.INIT, ()=>{
      setDisabled(!hasOpenTabs(value));
    });
    const deregChange = layout.eventBus.registerListener(LAYOUT_EVENTS.CHANGE, ()=>{
      setDisabled(!hasOpenTabs(value));
    });
    const deregRemove = layout.eventBus.registerListener(LAYOUT_EVENTS.REMOVE, ()=>{
      setDisabled(!hasOpenTabs(value));
    });

    return ()=>{
      deregInit();
      deregChange();
      deregRemove();
    };
  }, []);

  useEffect(()=>{
    if(disabled && active) {
      onWorkspaceDisabled();
    }
  }, [disabled]);

  return (
    <StyledWorkspaceButton className={active ? 'active': ''} title={menuItem?.label??''} {...props}
      onClick={()=>{
        if(menuItem) {
          menuItem?.callback();
        } else {
          changeWorkspace(value);
        }
      }}
      disabled={disabled}
    />
  );
}
WorkspaceButton.propTypes = {
  menuItem: PropTypes.object,
  active: PropTypes.bool,
  changeWorkspace: PropTypes.func,
  value: PropTypes.string
};

const Root = styled('div')(({theme}) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  ...theme.mixins.panelBorder.top,
  ...theme.mixins.panelBorder.right,
}));

export default function WorkspaceToolbar() {
  const [menus, setMenus] = useState({
    'settings': undefined,
  });

  const pgAdmin = usePgAdmin();
  const checkMenuState = ()=>{
    const fileMenus = pgAdmin.Browser.MainMenus.
      find((m)=>(m.name=='file'))?.
      menuItems;
    setMenus({
      'settings': fileMenus?.find((m)=>(m.name=='mnu_preferences')),
    });
  };

  useEffect(()=>{
    checkMenuState();
  }, []);

  return (
    <Root>
      <WorkspaceButton icon={<AccountTreeRoundedIcon />} value={WORKSPACES.DEFAULT} title={gettext('Default Workspace')} tooltipPlacement="right" />
      <WorkspaceButton icon={<QueryToolIcon />} value={WORKSPACES.QUERY_TOOL} title={gettext('Query Tool Workspace')} tooltipPlacement="right" />
      {pgAdmin['enable_psql'] &&  <WorkspaceButton icon={<TerminalRoundedIcon style={{height: '1.4rem'}}/>} value={WORKSPACES.PSQL_TOOL} title={gettext('PSQL Tool Workspace')} tooltipPlacement="right" />}
      <WorkspaceButton icon={<SchemaDiffIcon />} value={WORKSPACES.SCHEMA_DIFF_TOOL} title={gettext('Schema Diff Workspace')} tooltipPlacement="right" />
      <Box marginTop="auto">
        <WorkspaceButton icon={<SettingsIcon />} menuItem={menus['settings']} title={gettext('Preferences')} tooltipPlacement="right" />
      </Box>
    </Root>
  );
}

