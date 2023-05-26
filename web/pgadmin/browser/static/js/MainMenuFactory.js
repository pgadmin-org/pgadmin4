/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import gettext from 'sources/gettext';
import pgAdmin from 'sources/pgadmin';
import Menu, { MenuItem } from '../../../static/js/helpers/Menu';
import getApiInstance from '../../../static/js/api_instance';
import url_for from 'sources/url_for';
import Notifier from '../../../static/js/helpers/Notifier';
import { getBrowser } from '../../../static/js/utils';
import { isMac } from '../../../static/js/keyboard_shortcuts';

const MAIN_MENUS = [
  { label: gettext('File'), name: 'file', id: 'mnu_file', index: 0,  addSepratior: true },
  { label: gettext('Object'), name: 'object', id: 'mnu_obj', index: 1, addSepratior: true },
  { label: gettext('Tools'), name: 'tools', id: 'mnu_tools', index: 2, addSepratior: true },
  { label: gettext('Help'), name: 'help', id: 'mnu_help', index: 5, addSepratior: false }
];

let { name: browser } = getBrowser();
if (browser == 'Nwjs') {
  let controlKey = isMac() ? 'cmd' : 'ctrl';
  let fullScreenKey = isMac() ? 'F' : 'F10';

  const RUNTIME_MENUS_OPTIONS = {
    runtime : {
      label: gettext('Runtime'),
      name: 'runtime',
      priority: 999,
      submenus: {
        configure: { label: gettext('Configure...'), name: 'configure', priority: 0, enable: true},
        view_log: { label: gettext('View log...'), name: 'view_log', priority: 1, enable: true},
        enter_full_screen: { label: gettext('Enter Full Screen'), name: 'enter_full_screen', enable: true, priority: 2, key: fullScreenKey, modifiers: isMac() ?`${controlKey}+ctrl` : controlKey},
        actual_size: { label: gettext('Actual Size'), name: 'actual_size', priority: 3, enable: true, key: '0', modifiers: controlKey},
        zoom_in: { label: gettext('Zoom In'), name: 'zoom_in', priority: 4, enable: true, key: '+', modifiers: controlKey},
        zoom_out: { label: gettext('Zoom Out'), name: 'zoom_out', enable: true, priority: 5, key: '-', modifiers: controlKey},
      }
    }
  };

  pgAdmin.Browser.RUNTIME_MENUS_OPTIONS = RUNTIME_MENUS_OPTIONS;
}




export default class MainMenuFactory {
  static createMainMenus() {
    pgAdmin.Browser.MainMenus = [];
    MAIN_MENUS.forEach((_menu) => {
      let menuObj = Menu.create(_menu.name, _menu.label, _menu.id, _menu.index, _menu.addSepratior);
      pgAdmin.Browser.MainMenus.push(menuObj);
      // Don't add menuItems for Object menu as it's menuItems get changed on tree selection.
      if(_menu.name !== 'object') {
        menuObj.addMenuItems(Object.values(pgAdmin.Browser.all_menus_cache[_menu.name]));
        menuObj.getMenuItems().forEach((menuItem, index)=> {
          menuItem?.getMenuItems()?.forEach((item, indx)=> {
            item.below && menuItem?.getMenuItems().splice(indx+1, 0, MainMenuFactory.getSeparator());
          });
          if(menuItem.below) {
            menuObj.addMenuItem(MainMenuFactory.getSeparator(), index+1);
          }
        });
      }
    });

    pgAdmin.Browser.enable_disable_menus();
  }

  static getSeparator(label, priority) {
    return new MenuItem({type: 'separator', label, priority});
  }

  static refreshMainMenuItems(menu, menuItems) {
    menu.setMenuItems(menuItems);
    pgAdmin.Browser.Events.trigger('pgadmin:nw-refresh-menu-item', menu);
  }

  static createMenuItem(options) {
    return new MenuItem({...options, callback: () => {
      // Some callbacks registered in 'callbacks' check and call specifiec callback function
      if (options.module && 'callbacks' in options.module && options.module.callbacks[options.callback]) {
        options.module.callbacks[options.callback].apply(options.module, [options.data, pgAdmin.Browser.tree?.selected()]);
      } else if (options.module && options.module[options.callback]) {
        options.module[options.callback].apply(options.module, [options.data, pgAdmin.Browser.tree?.selected()]);
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

  static getContextMenu(menuList) {
    Menu.sortMenus(menuList);
    return menuList;
  }

  static checkNoMenuOptionForNode(d){
    let selectedNodeFromNodes=pgAdmin.Browser.Nodes[d._type];
    let selectedNode=pgAdmin.Browser.tree.selected();
    let flag=!_.isUndefined(selectedNodeFromNodes.showMenu);
    if(flag){
      var showMenu = selectedNodeFromNodes.showMenu(d, selectedNode);
      return {flag:showMenu?false:flag,showMenu};
    } else{
      return {flag,showMenu:undefined};
    }
  }
}
