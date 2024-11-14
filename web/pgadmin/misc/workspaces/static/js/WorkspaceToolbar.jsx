/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
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

const StyledWorkspaceButton = styled(PgIconButton)(({theme}) => ({
  '&.Buttons-iconButtonDefault': {
    border: 'none',
    borderRight: '2px solid transparent' ,
    borderRadius: 0,
    padding: '8px 6px',
    height: '40px',
    '&.active': {
      borderRightColor: theme.otherVars.activeBorder,
    },
    '&.Mui-disabled': {
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
    <Box style={{borderTop: '1px solid #dde0e6', borderRight: '1px solid #dde0e6'}} display="flex" flexDirection="column" alignItems="center" gap="2px">
      <WorkspaceButton icon={<AccountTreeRoundedIcon />} value={WORKSPACES.DEFAULT} />
      <WorkspaceButton icon={<QueryToolIcon />} value={WORKSPACES.QUERY_TOOL} />
      <WorkspaceButton icon={<TerminalRoundedIcon style={{height: '1.4rem'}}/>} value={WORKSPACES.PSQL_TOOL} />
      <WorkspaceButton icon={<SchemaDiffIcon />} value={WORKSPACES.SCHEMA_DIFF_TOOL} />
      <Box marginTop="auto">
        <WorkspaceButton icon={<SettingsIcon />} menuItem={menus['settings']} />
      </Box>
    </Box>
  );
}

