/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import { PgMenu, PgMenuDivider, PgMenuItem, PgSubMenu } from './Menu';
import PropTypes from 'prop-types';
import gettext from 'sources/gettext';
import usePreferences from '../../../preferences/static/js/store';

export default function ContextMenu({menuItems, position, onClose, label='context'}) {
  const prefStore = usePreferences.getState();
  const getPgMenuItem = (menuItem, i)=>{
    let shortcut;
    // Fetch shortcut from preferences if defined in menuItem.
    if(menuItem.shortcut_preference) {
      const [module, key] = menuItem.shortcut_preference;
      shortcut = prefStore.getPreferences(module, key)?.value;
    }
    if(menuItem.type == 'separator') {
      return <PgMenuDivider key={i}/>;
    }
    const hasCheck = typeof menuItem.checked == 'boolean';

    return <PgMenuItem
      key={i}
      disabled={menuItem.isDisabled}
      onClick={()=>{
        menuItem.callback();
      }}
      hasCheck={hasCheck}
      checked={menuItem.checked}
      shortcut={shortcut} 
    >{menuItem.label}</PgMenuItem>;
  };

  return (
    <PgMenu
      anchorPoint={{
        x: position?.x,
        y: position?.y
      }}
      open={Boolean(position) && menuItems.length !=0}
      onClose={onClose}
      label={label}
      portal
    >
      {menuItems.length !=0 && menuItems.map((menuItem, i)=>{
        const submenus = menuItem.getMenuItems?.();
        if(submenus) {
          return <PgSubMenu key={label+'-'+menuItem.label} label={menuItem.label}>
            {submenus.map((submenuItem, si)=>{
              return getPgMenuItem(submenuItem, i+'-'+si);
            })}
          </PgSubMenu>;
        }
        return getPgMenuItem(menuItem, i);
      })}
      {menuItems.length == 0 && getPgMenuItem({
        label: gettext('No options'),
        isDisabled: true,
      }, 0)}
    </PgMenu>
  );
}

ContextMenu.propTypes = {
  menuItems: PropTypes.array,
  position: PropTypes.object,
  onClose: PropTypes.func,
  label: PropTypes.string,
};
