/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import gettext from 'sources/gettext';
import pgAdmin from 'sources/pgadmin';
import Menu, { MenuItem } from '../../../static/js/helpers/Menu';
import getApiInstance from '../../../static/js/api_instance';
import url_for from 'sources/url_for';

const MAIN_MENUS = [
  { label: gettext('File'), name: 'file', id: 'mnu_file', index: 0, addSeprator: true, hasDynamicMenuItems: false },
  { label: gettext('Object'), name: 'object', id: 'mnu_obj', index: 1, addSeprator: true, hasDynamicMenuItems: true },
  { label: gettext('Tools'), name: 'tools', id: 'mnu_tools', index: 2, addSeprator: true, hasDynamicMenuItems: false },
  { label: gettext('Help'), name: 'help', id: 'mnu_help', index: 5, addSeprator: false, hasDynamicMenuItems: false }
];

export default class MainMenuFactory {
  static electronCallbacks = {};

  static toElectron() {
    // we support 2 levels of submenu
    return pgAdmin.Browser.MainMenus.map((m)=>{
      return {
        ...m.serialize(),
        submenu: m.menuItems.map((sm)=>{
          const smName = `${m.name}_${sm.name}`;
          MainMenuFactory.electronCallbacks[smName] = sm.callback;
          return {
            ...sm.serialize(),
            submenu: sm.getMenuItems()?.map((smsm)=>{
              MainMenuFactory.electronCallbacks[`${smName}_${smsm.name}`] = smsm.callback;
              return {
                ...smsm.serialize(),
              };
            })
          };
        })
      };
    });
  }

  static createMainMenus() {
    pgAdmin.Browser.MainMenus = [];
    MAIN_MENUS.forEach((_menu) => {
      let menuObj = Menu.create(_menu.name, _menu.label, _menu.id, _menu.index, _menu.addSeprator, _menu.hasDynamicMenuItems);
      pgAdmin.Browser.MainMenus.push(menuObj);
      // Don't add menuItems for hasDynamicMenuItems true as it's menuItems get changed on tree selection.
      if(!_menu.hasDynamicMenuItems) {
        menuObj.clearMenuItems();
        menuObj.addMenuItems(MainMenuFactory.createMenuItems(pgAdmin.Browser.all_menus_cache[_menu.name]));
      }
    });

    // enable disable will take care of dynamic menus.
    MainMenuFactory.enableDisableMenus();

    window.electronUI?.onMenuClick((menuName)=>{
      MainMenuFactory.electronCallbacks[menuName]?.();
    });

    window.electronUI?.setMenus(MainMenuFactory.toElectron());
  }

  static getSeparator(label, priority) {
    return new MenuItem({type: 'separator', label, priority});
  }

  static createMenuItem(options) {
    return new MenuItem({...options, callback: () => {
      // Some callbacks registered in 'callbacks' check and call specifiec callback function
      if (options.module && 'callbacks' in options.module && options.module.callbacks[options.callback]) {
        options.module.callbacks[options.callback].apply(options.module, [options.data, pgAdmin.Browser.tree?.selected()]);
      } else if (options?.module?.[options.callback]) {
        options.module[options.callback](options.data, pgAdmin.Browser.tree?.selected());
      } else if (options?.callback) {
        options.callback(options);
      } else if (options.url != '#') {
        let api = getApiInstance();
        api(
          url_for('tools.initialize')
        ).then(()=>{
          window.open(options.url);
        }).catch(()=>{
          pgAdmin.Browser.notifier.error(gettext('Error in opening window'));
        });
      }
    }}, (menu, item)=> {
      pgAdmin.Browser.Events.trigger('pgadmin:enable-disable-menu-items', menu, item);
      window.electronUI?.enableDisableMenuItems(menu?.serialize(), item?.serialize());
    });
  }

  static enableDisableMenus(item) {
    let itemData = item ? pgAdmin.Browser.tree.itemData(item) : undefined;

    const checkForItems = (items)=>{
      items.forEach((mitem) => {
        const subItems = mitem.getMenuItems() ?? [];
        if(subItems.length > 0) {
          checkForItems(subItems);
        } else {
          mitem.checkAndSetDisabled(itemData, item);
        }
      });
    };

    // Non dynamic menus will be required to check whether enabled/disabled.
    pgAdmin.Browser.MainMenus.filter((m)=>(!m.hasDynamicMenuItems)).forEach((menu) => {
      checkForItems(menu.getMenuItems());
    });

    pgAdmin.Browser.MainMenus.filter((m)=>(m.hasDynamicMenuItems)).forEach((menu) => {
      let menuItemList = MainMenuFactory.getDynamicMenu(menu.name, item, itemData);
      menu.setMenuItems(menuItemList);
    });

    // set the context menu as well
    pgAdmin.Browser.BrowserContextMenu = MainMenuFactory.getDynamicMenu('context', item, itemData, true);

    window.electronUI?.setMenus(MainMenuFactory.toElectron());

    pgAdmin.Browser.Events.trigger('pgadmin:refresh-app-menu');
  }

  static checkNoMenuOptionForNode(itemData){
    if(!itemData) {
      return true;
    }
    let selectedNodeFromNodes=pgAdmin.Browser.Nodes[itemData._type];
    let selectedNode=pgAdmin.Browser.tree.selected();
    return selectedNodeFromNodes.showMenu?.(itemData, selectedNode) ?? true;
  }

  static createMenuItems(items, skipDisabled=false, checkAndSetDisabled=()=>true) {
    let retVal = [];
    let categories = {};

    const getNewMenuItem = (i)=>{
      const mi = MainMenuFactory.createMenuItem({...i});
      checkAndSetDisabled?.(mi);
      if(skipDisabled && mi.isDisabled) {
        return null;
      }
      return mi;
    };

    const getMenuCategory = (catName)=>{
      let category = pgAdmin.Browser.menu_categories[catName];

      if(!category) {
        // generate category on the fly.
        category = {
          name: catName,
          label: catName,
          priority: 10,
        };
      }

      let cmi = categories[category.name];
      if(!cmi) {
        cmi = getNewMenuItem({...category});
        // for easily finding again, note down.
        categories[category.name] = cmi;
      }
      return cmi;
    };

    const applySeparators = (mi)=>{
      const newItems = [];
      if(mi.above) {
        newItems.push(MainMenuFactory.getSeparator(mi.label, mi.priority));
      }
      newItems.push(mi);
      if(mi.below) {
        newItems.push(MainMenuFactory.getSeparator(mi.label, mi.priority));
      }
      return newItems;
    };

    Object.entries(items).forEach(([k, i])=>{
      if('name' in i) {
        const mi = getNewMenuItem(i);
        if(!mi) return;

        if(i.category??'common' != 'common') {
          const cmi = getMenuCategory(i.category);
          if(cmi) {
            cmi.addMenuItems([...applySeparators(mi)]);
          } else {
            retVal.push(...applySeparators(mi));
          }
        } else {
          retVal.push(...applySeparators(getNewMenuItem(i)));
        }
      } else {
        // Can be a category
        const cmi = getMenuCategory(k);
        if(cmi) {
          cmi.addMenuItems(MainMenuFactory.createMenuItems(i, skipDisabled, checkAndSetDisabled));
        }
      }
    });

    // Push the category menus
    Object.values(categories).forEach((cmi)=>{
      const items = cmi.getMenuItems();

      // if there is only one menu in the category, then no need of the category.
      if(items.length <= 1 && !cmi.single) {
        retVal = retVal.concat(items);
        return;
      }
      retVal.push(...applySeparators(cmi));
    });

    Menu.sortMenus(retVal ?? []);
    return retVal;
  }

  static getDynamicMenu(name, item, itemData, skipDisabled=false) {
    if(!item) {
      return [MainMenuFactory.createMenuItem({
        name: '',
        label: gettext('No object selected'),
        category: 'create',
        priority: 1,
        enable: false,
      })];
    }
    const showMenu = MainMenuFactory.checkNoMenuOptionForNode(itemData);
    if(!showMenu){
      return [MainMenuFactory.createMenuItem({
        enable : false,
        label: gettext('No menu available for this object.'),
        name:'',
        priority: 1,
        category: 'create',
      })];
    } else {
      const nodeTypeMenus = pgAdmin.Browser.all_menus_cache[name]?.[itemData._type] ?? [];
      const menuItemList = MainMenuFactory.createMenuItems(nodeTypeMenus, skipDisabled, (mi)=>{
        return mi.checkAndSetDisabled(itemData, item);
      });
      if(menuItemList.length == 0) {
        return [MainMenuFactory.createMenuItem({
          enable : false,
          label: gettext('No menu available for this object.'),
          name:'',
          priority: 1,
          category: 'create',
        })];
      }
      return menuItemList;
    }
  }
}
