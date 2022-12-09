/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2022, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import _ from 'lodash';
import gettext from 'sources/gettext';

export default class Menu {
  constructor(name, label, id, index, addSepratior) {
    this.label = label;
    this.name =  name;
    this.id = id;
    this.index = index || 1;
    this.menuItems = [],
    this.addSepratior = addSepratior || false;
  }

  static create(name, label, id, index, addSepratior) {
    let menuObj = new Menu(name, label, id, index, addSepratior);
    return menuObj;
  }

  addMenuItem(menuItem, index=null) {
    if (menuItem instanceof MenuItem) {
      menuItem.parentMenu = this;
      if(index) {
        this.menuItems.splice(index, 0, menuItem);
      } else {
        this.menuItems.push(menuItem);
        Menu.sortMenus(this.menuItems);
      }
    } else {
      throw new Error(gettext('Invalid MenuItem instance'));
    }


  }

  addMenuItems(menuItems) {
    menuItems.forEach((item) => {
      if (item instanceof MenuItem) {
        item.parentMenu = this;
        this.menuItems.push(item);
        if(item?.menu_items && item.menu_items.length > 0) {
          item.menu_items.forEach((i)=> {
            i.parentMenu = item;
          });
          Menu.sortMenus(item.menu_items);
        }
      } else {
        let subItems = Object.values(item);
        subItems.forEach((subItem)=> {
          if (subItem instanceof MenuItem) {
            subItem.parentMenu = this;
            this.menuItems.push(subItem);
          } else {
            throw new Error(gettext('Invalid MenuItem instance'));
          }
        });
      }
    });

    // Sort by alphanumeric ordered first
    this.menuItems.sort(function (a, b) {
      return a.label.localeCompare(b.label);
    });

    // Sort by priority
    this.menuItems.sort(function (a, b) {
      return a.priority - b.priority;
    });

  }

  setMenuItems(menuItems) {
    this.menuItems = menuItems;
    Menu.sortMenus(this.menuItems);

    this.menuItems.forEach((item)=> {
      if(item?.menu_items?.length > 0) {
        Menu.sortMenus(item.menu_items);
      }
    });
  }

  static sortMenus(menuItems) {
    // Sort by alphanumeric ordered first
    menuItems.sort(function (a, b) {
      return a.label.localeCompare(b.label);
    });

    // Sort by priority
    menuItems.sort(function (a, b) {
      return a.priority - b.priority;
    });
  }

  getMenuItems() {
    return this.menuItems;
  }

  static getContextMenus(menuList, item, node) {
    Menu.sortMenus(menuList);

    let ctxMenus = {};
    let ctxIndex = 1;
    menuList.forEach(ctx => {
      let ctx_uid = _.uniqueId('ctx_');
      let sub_ctx_item = {};
      ctx.is_disabled = ctx.disabled(node, item);
      if ('menu_items' in ctx && ctx.menu_items) {
        Menu.sortMenus(ctx.menu_items);
        ctx.menu_items.forEach((c) => {
          c.is_disabled = c.disabled(node, item);
          if (!c.is_disabled) {
            sub_ctx_item[ctx_uid + _.uniqueId('_sub_')] = c.getContextItem(c.label, c.is_disabled);
          }
        });
      }
      if (!ctx.is_disabled) {
        ctxMenus[ctx_uid + '_' + ctx.priority + '_' + + ctxIndex + '_itm'] = ctx.getContextItem(ctx.label, ctx.is_disabled, sub_ctx_item);

        if (_.size(sub_ctx_item) > 0 && ['register', 'create'].includes(ctx.category)) {
          ctxMenus[ctx_uid + '_' + ctx.priority + '_' + + ctxIndex + '_sep'] = '----';
        }
      }
      ctxIndex++;
    });

    return ctxMenus;
  }
}


export class MenuItem {
  constructor(options, onDisableChange, onChangeChacked) {
    let menu_opts = [
      'name', 'label', 'priority', 'module', 'callback', 'data', 'enable',
      'category', 'target', 'url', 'node',
      'checked', 'below', 'menu_items', 'is_checkbox', 'action', 'applies', 'is_native_only', 'type'
    ];
    let defaults = {
      url: '#',
      target: '_self',
      enable: true,
      type: 'normal'
    };
    _.extend(this, defaults, _.pick(options, menu_opts));
    if (!this.callback) {
      this.callback = (item) => {
        if (item.url != '#') {
          window.open(item.url);
        }
      };
    }
    this.onDisableChange = onDisableChange;
    this.changeChecked = onChangeChacked;
  }

  static create(options) {
    return MenuItem(options);
  }

  change_checked(isChecked) {
    this.checked = isChecked;
    this.changeChecked?.(this);
  }

  contextMenuCallback(self) {
    self.callback();
  }

  getContextItem(label, is_disabled, sub_ctx_item) {
    let self = this;
    return {
      name: label,
      disabled: is_disabled,
      callback: () => { this.contextMenuCallback(self); },
      ...(sub_ctx_item && Object.keys(sub_ctx_item).length > 0) && { items: sub_ctx_item }
    };
  }

  setDisabled(disabled) {
    this.is_disabled = disabled;
    this.onDisableChange?.(this.parentMenu, this);
  }

  /*
    * Checks this menu enable/disable state based on the selection.
    */
  disabled(node, item) {
    if (this.enable == undefined) {
      return false;
    }

    if (this.node) {
      if (!node) {
        return true;
      }
      if (_.isArray(this.node) ? (
        _.indexOf(this.node, node) == -1
      ) : (this.node != node._type)) {
        return true;
      }
    }

    if (_.isBoolean(this.enable)) return !this.enable;
    if (_.isFunction(this.enable)) {
      return !this.enable.apply(this.module, [node, item, this.data]);
    }
    if (this.module && _.isBoolean(this.module[this.enable])) {
      return !this.module[this.enable];
    }
    if (this.module && _.isFunction(this.module[this.enable])) {
      return !(this.module[this.enable]).apply(this.module, [node, item, this.data]);
    }

    return false;
  }
}

export function getContextMenu(menu, item, node) {
  return Menu.getContextMenus(menu, item, node);
}
