/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import _ from 'lodash';
import gettext from 'sources/gettext';

export default class Menu {
  constructor(name, label, id, index, addSeprator, hasDynamicMenuItems) {
    this.label = label;
    this.name = name;
    this.id = id;
    this.index = index || 1;
    this.menuItems = [];
    this.addSeprator = addSeprator || false;
    this.hasDynamicMenuItems = hasDynamicMenuItems;
  }

  static create(name, label, id, index, addSeprator, hasDynamicMenuItems) {
    let menuObj = new Menu(name, label, id, index, addSeprator, hasDynamicMenuItems);
    return menuObj;
  }

  serialize() {
    return {
      id: this.id,
      label: this.label,
      name: this.name,
      index: this.index,
      addSeprator: this.addSeprator,
    };
  }

  addMenuItem(menuItem, index=null) {
    if (menuItem instanceof MenuItem) {
      menuItem.parentMenu = this;
      if(index) {
        this.menuItems.splice(index, 0, menuItem);
      } else {
        this.menuItems.push(menuItem);
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
  }

  clearMenuItems() {
    this.menuItems = [];
  }

  static sortMenus(menuItems) {
    if(!menuItems || menuItems.length <=0) {
      return;
    }
    // Sort by alphanumeric ordered first
    menuItems.sort(function (a, b) {
      return a.label.localeCompare(b.label);
    });

    // Sort by priority
    menuItems.sort(function (a, b) {
      return a.priority - b.priority;
    });

    menuItems.forEach((mi)=>{
      Menu.sortMenus(mi.getMenuItems());
    });
  }

  getMenuItems() {
    return this.menuItems;
  }
}


export class MenuItem {
  constructor(options, onDisableChange) {
    let allowedOptions = [
      'name', 'label', 'priority', 'module', 'callback', 'data', 'enable',
      'category', 'target', 'url', 'node', 'single',
      'checked', 'below', 'menu_items', 'is_checkbox', 'action', 'applies', 'is_native_only', 'type',
    ];
    let defaults = {
      url: '#',
      target: '_self',
      enable: true,
    };
    _.extend(this, defaults, _.pick(options, allowedOptions));
    if (!this.callback) {
      this.callback = (item) => {
        if (item.url != '#') {
          window.open(item.url);
        }
      };
    }
    this.onDisableChange = onDisableChange;
    this._isDisabled = true;
    this.checkAndSetDisabled();
  }

  static create(options) {
    return MenuItem(options);
  }

  serialize() {
    return {
      name: this.name,
      label: this.label,
      enabled: !this.isDisabled,
      priority: this.priority,
      type: [true, false].includes(this.checked) ? 'checkbox' : this.type,
      checked: this.checked,
    };
  }

  change_checked(isChecked) {
    this.checked = isChecked;
  }

  addMenuItems(items) {
    this.menu_items = this.menu_items ?? [];
    this.menu_items = this.menu_items.concat(items);
  }

  getMenuItems() {
    return this.menu_items;
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

  checkAndSetDisabled(node, item, forceDisable) {
    if(!_.isUndefined(forceDisable)) {
      this._isDisabled = forceDisable;
    } else {
      this._isDisabled = this.disabled(node, item);
    }
    this.onDisableChange?.(this.parentMenu, this);
  }

  get isDisabled() {
    return this._isDisabled;
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
    if (_.isFunction(this.enable) && node) {
      return !this.enable.apply(this.module, [node, item, this.data]);
    }
    if (this.module && _.isBoolean(this.module[this.enable])) {
      return !this.module[this.enable];
    }
    if(!node) {
      return true;
    }
    if (this.module && _.isFunction(this.module[this.enable])) {
      return !(this.module[this.enable])(node, item, this.data);
    }

    return false;
  }
}
