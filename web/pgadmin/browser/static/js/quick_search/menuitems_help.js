/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import gettext from 'sources/gettext';



//  Allow us to
const getMenuName = (item) => {
  let aLinks = item.getElementsByTagName('a');
  let name;
  if (aLinks.length > 0) {
    name = (aLinks[0].text).trim();
    name = name.replace(/\.+$/g, '');
  }
  return name;
};

export function menuSearch(param, props) {
  let LAST_MENU;
  param = param.trim();
  const setState = props.setState;
  let result = [];

  if (window.pgAdmin.Browser.utils.app_name) {
    LAST_MENU = gettext('About '+ window.pgAdmin.Browser.utils.app_name);
  }

  // Here we will add the matches
  const parseLI = (_menu, path) => {
    let _name = getMenuName(_menu);
    if (_name && _name.toLowerCase().indexOf(param.toLowerCase()) != -1) {
      let _res = {};
      _res[_name] = path;
      _res['element'] = _menu.children[0];
      result.push(_res);
    }
    // Check if last menu then update the parent component's state
    if (_name === LAST_MENU) {
      setState(state => ({
        ...state,
        fetched: true,
        data: result,
      }));
    }
  };

  // Recursive function to search in UL
  const parseUL = (menu, path) => {
    const menus = Array.from(menu.children);
    menus.forEach((_menu) => {
      let _name, _path;
      if (_menu.tagName == 'UL') {
        _name = getMenuName(_menu);
        _path = `${path}/${_name}`;
        iterItem(_menu, _path);
      } else if (_menu.tagName == 'LI') {
        if (_menu.classList.contains('dropdown-submenu')) {
          _name = getMenuName(_menu);
          _path = `${path}/${_name}`;
          iterItem(_menu, _path);
        } else {
          parseLI(_menu, path);
        }
      }
    });
  };

  // Expects LI of menus which contains A & UL
  const iterItem = (menu, path) => {
    const subMenus = Array.from(menu.children);
    subMenus.forEach((_menu) => {
      if (_menu.tagName == 'UL') {
        parseUL(_menu, path);
      }
    });
  };

  // Starting Point
  const navbar = document.querySelector('.navbar-nav');
  const mainMenus = Array.from(navbar.children);

  mainMenus.forEach((menu) => {
    iterItem(menu, getMenuName(menu));
  });
}
