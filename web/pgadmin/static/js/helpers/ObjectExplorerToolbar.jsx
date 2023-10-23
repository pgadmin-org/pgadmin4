import React, { useEffect, useState } from 'react';
import { usePgAdmin } from '../BrowserComponent';
import { Box } from '@material-ui/core';
import { QueryToolIcon, RowFilterIcon, TerminalIcon, ViewDataIcon } from '../components/ExternalIcon';
import SearchOutlinedIcon from '@material-ui/icons/SearchOutlined';
import { PgIconButton } from '../components/Buttons';
import _ from 'lodash';
import PropTypes from 'prop-types';
import CustomPropTypes from '../custom_prop_types';


function ToolbarButton({menuItem, icon}) {
  return (
    <PgIconButton title={menuItem?.label??''} icon={icon} size="xs"
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
    'view_all_rows_context_table': undefined,
    'view_filtered_rows_context_table': undefined,
    'search_objects': undefined,
    'psql': undefined,
  });
  const pgAdmin = usePgAdmin();

  useEffect(()=>{
    pgAdmin.Browser.Events.on('pgadmin:nw-enable-disable-menu-items', _.debounce(()=>{
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
        'view_all_rows_context_table': viewMenus?.find((m)=>(m.name=='view_all_rows_context_table')),
        'view_filtered_rows_context_table': viewMenus?.find((m)=>(m.name=='view_filtered_rows_context_table')),
        'search_objects': toolsMenus?.find((m)=>(m.name=='search_objects')),
        'psql': toolsMenus?.find((m)=>(m.name=='psql'))
      });
    }, 100));
  }, []);

  return (
    <Box display="flex" alignItems="center" gridGap={'2px'}>
      <ToolbarButton icon={<QueryToolIcon />} menuItem={menus['query_tool']} />
      <ToolbarButton icon={<ViewDataIcon />} menuItem={menus['view_all_rows_context_table']} />
      <ToolbarButton icon={<RowFilterIcon />} menuItem={menus['view_filtered_rows_context_table']} />
      <ToolbarButton icon={<SearchOutlinedIcon style={{height: '1.4rem'}} />} menuItem={menus['search_objects']} />
      <ToolbarButton icon={<TerminalIcon />} menuItem={menus['psql']} />
    </Box>
  );
}
