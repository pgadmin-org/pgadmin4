/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2022, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import {MenuItem as NewMenuItem} from '../../../../static/js/helpers/Menu';
import { MainMenus } from '../MainMenuFactory';
import pgAdmin from 'sources/pgadmin';
import { getBrowser } from '../../../../static/js/utils';


//  Allow us to
const getMenuName = (item) => {
  return item.label;
};

export function menuSearch(param, props) {
  param = param.trim();
  const setState = props.setState;
  let result = [];

  const iterItem = (subMenus, path, parentPath) => {
    subMenus.forEach((subMenu) =>{
      if(subMenu instanceof NewMenuItem) {
        if(subMenu.type != 'separator' && subMenu?.label?.toLowerCase().indexOf(param.toLowerCase()) != -1){
          let localPath = path;
          if(parentPath) {
            localPath = `${parentPath} > ${path} `;
          }
          subMenu.path = localPath;
          let selectedNode = pgAdmin.Browser.tree.selected();
          if(subMenu.path == 'Object') {
            if(selectedNode && selectedNode._metadata.data._type == subMenu.module.parent_type) {
              result.push(subMenu);
            }
          } else {
            result.push(subMenu);
          }
        }
        if(subMenu.getMenuItems()) {
          iterItem(subMenu.getMenuItems(), getMenuName(subMenu), path);
        }
      } else {
        if(typeof(subMenu) == 'object' && !(subMenu instanceof NewMenuItem)) {
          iterItem(Object.values(subMenu), path, parentPath);
        } else {
          iterItem(subMenu, path, parentPath);
        }
      }
    });
  };

  // Starting Point
  let {name: browser} = getBrowser();
  const mainMenus = browser == 'Nwjs' ? pgAdmin.Browser.MainMenus : MainMenus;
  if(browser == 'Nwjs') {
    mainMenus.forEach((menu) => {
      let subMenus = menu.menuItems;
      iterItem(subMenus, getMenuName(menu));
    });
  } else {
    mainMenus.forEach((menu) => {
      let subMenus = [];
      if(menu.name == 'object') {
        let selectedNode = pgAdmin.Browser.tree.selected();
        if(selectedNode) {
          subMenus = pgAdmin.Browser.all_menus_cache[menu.name][selectedNode._metadata.data._type];
        }
      } else {
        subMenus = pgAdmin.Browser.all_menus_cache[menu.name];
      }
      iterItem(Object.values(subMenus), getMenuName(menu));
    });
  }

  setState(state => ({
    ...state,
    fetched: true,
    data: result,
  }));
}
