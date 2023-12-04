import React, { useEffect, useState } from 'react';
import { usePgAdmin } from '../BrowserComponent';
import { Box } from '@material-ui/core';
import { QueryToolIcon, RowFilterIcon, TerminalIcon, ViewDataIcon } from '../components/ExternalIcon';
import SearchOutlinedIcon from '@material-ui/icons/SearchOutlined';
import { PgButtonGroup, PgIconButton } from '../components/Buttons';
import _ from 'lodash';
import PropTypes from 'prop-types';
import CustomPropTypes from '../custom_prop_types';


function ToolbarButton({menuItem, icon, ...props}) {
  return (
    <PgIconButton title={menuItem?.label??''} icon={icon} {...props} size="xs"
      disabled={menuItem?.isDisabled??true} onClick={()=>menuItem?.callback()} />
  );
}
ToolbarButton.propTypes = {
  menuItem: PropTypes.object,
  icon: CustomPropTypes.children,
};

export default function ObjectExplorerToolbar() {
  const [menus, setMenus] = useState({
    'query_tool': undefined,
    'view_all_rows_context': undefined,
    'view_filtered_rows_context': undefined,
    'search_objects': undefined,
    'psql': undefined,
  });
  const pgAdmin = usePgAdmin();
  const checkMenuState = ()=>{
    const viewMenus = pgAdmin.Browser.MainMenus.
      find((m)=>(m.name=='object'))?.
      menuItems?.
      find((m)=>(m.name=='view_data'))?.
      menu_items;

    const toolsMenus = pgAdmin.Browser.MainMenus.
      find((m)=>(m.name=='tools'))?.
      menuItems;

    setMenus({
      'query_tool': toolsMenus?.find((m)=>(m.name=='query_tool')),
      'view_all_rows_context': viewMenus?.find((m)=>(m.name=='view_all_rows_context_' + m.node)),
      'view_filtered_rows_context': viewMenus?.find((m)=>(m.name=='view_filtered_rows_context_' + m.node)),
      'search_objects': toolsMenus?.find((m)=>(m.name=='search_objects')),
      'psql': toolsMenus?.find((m)=>(m.name=='psql'))
    });
  };

  useEffect(()=>{
    const deregister = pgAdmin.Browser.Events.on('pgadmin:nw-enable-disable-menu-items', _.debounce(checkMenuState, 100));
    checkMenuState();
    return ()=>{
      deregister();
    };
  }, []);

  return (
    <Box display="flex" alignItems="center" gridGap={'2px'}>
      <PgButtonGroup size="small">
        <ToolbarButton icon={<QueryToolIcon />} menuItem={menus['query_tool']} />
        <ToolbarButton icon={<ViewDataIcon />} menuItem={menus['view_all_rows_context']} />
        <ToolbarButton icon={<RowFilterIcon />} menuItem={menus['view_filtered_rows_context']} />
        <ToolbarButton icon={<SearchOutlinedIcon style={{height: '1.4rem'}} />} menuItem={menus['search_objects']} />
        {!_.isUndefined(menus['psql']) && <ToolbarButton icon={<TerminalIcon />} menuItem={menus['psql']} />}
      </PgButtonGroup>
    </Box>
  );
}
