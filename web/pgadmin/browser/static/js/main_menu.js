/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2022, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import gettext from 'sources/gettext';
import pgAdmin from 'sources/pgadmin';
import { getBrowser } from '../../../static/js/utils';
import Menu, { MenuItem } from './new_menu';
import getApiInstance from '../../../static/js/api_instance';
import url_for from 'sources/url_for';
import Notifier from '../../../static/js/helpers/Notifier';

export let MainMenus = [
  { label: gettext('File'), name: 'file', id: 'mnu_file', index: 0,  addSepratior: true },
  { label: gettext('Object'), name: 'object', id: 'mnu_obj', index: 1, addSepratior: true },
  { label: gettext('Tools'), name: 'tools', id: 'mnu_tools', index: 2, addSepratior: true },
  { label: gettext('Help'), name: 'help', id: 'mnu_help', index: 5, addSepratior: false }
];

let {name: browser} = getBrowser();

export default function createMainMenus() {
  pgAdmin.Browser.MainMenus = [];
  MainMenus.forEach((_menu) => {
    let menuObj = Menu.create(_menu.name, _menu.label, _menu.id, _menu.index, _menu.addSepratior);
    pgAdmin.Browser.MainMenus.push(menuObj);
    // Don't add menuItems for Object menu as it's menuItems get changed on tree selection.
    if(_menu.name !== 'object') {
      menuObj.addMenuItems(Object.values(pgAdmin.Browser.menus[_menu.name]));
      menuObj.menuItems.forEach((menuItem, index)=> {
        menuItem?.menu_items?.forEach((item, indx)=> {
          item.below && menuItem?.menu_items.splice(indx+1, 0, getSeparator());
        });
        if(menuItem.below) {
          menuObj.addMenuItem(getSeparator(), index+1);
        }
      });
    }
  });
}

function getSeparator() {
  return new MenuItem({type: 'separator'});
}

export function refreshMainMenuItems(menu, menuItems) {
  if(browser == 'Nwjs') {
    menu.setMenuItems(menuItems);
    pgAdmin.Browser.Events.trigger('pgadmin:nw-refresh-menu-item', menu);
  }
}

// Factory to create menu items for main menu.
export class MainMenuItemFactory {
  static create(options) {
    return new MenuItem({...options, callback: () => {
      // Some callbacks registered in 'callbacks' check and call specifiec callback function
      if (options.module && 'callbacks' in options.module && options.module.callbacks[options.callback]) {
        options.module.callbacks[options.callback].apply(options.module, [options.data, pgAdmin.Browser.tree.selected()]);
      } else if (options.module && options.module[options.callback]) {
        options.module[options.callback].apply(options.module, [options.data, pgAdmin.Browser.tree.selected()]);
      } else if (options?.callback) {
        options.callback(options);
      } else {
        if (options.url != '#') {
          let api = getApiInstance();
          api(
            url_for('tools.initialize')
          ).then(()=>{
            window.open(options.url);
          }).catch(()=>{
            Notifier.error(gettext('Error in opening window'));
          });
        }
      }
    }}, (menu, item)=> {
      pgAdmin.Browser.Events.trigger('pgadmin:nw-enable-disable-menu-items', menu, item);
    }, (item) => {
      pgAdmin.Browser.Events.trigger('pgadmin:nw-update-checked-menu-item', item);
    });
  }
}
