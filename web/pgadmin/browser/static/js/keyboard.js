/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import _ from 'lodash';
import pgAdmin from '../../../static/js/pgadmin';
import hotkeys from 'hotkeys-js';
import * as commonUtils from '../../../static/js/utils';
import gettext from 'sources/gettext';
import pgWindow from 'sources/window';
import usePreferences from '../../../preferences/static/js/store';


const pgBrowser = pgAdmin.Browser = pgAdmin.Browser || {};

pgBrowser.keyboardNavigation = pgBrowser.keyboardNavigation || {};

hotkeys.filter = function () {
  return true;
};

_.extend(pgBrowser.keyboardNavigation, {
  iframeEventsChannel:new BroadcastChannel('iframe-events'),
  init: function() {
    this.iframeEventsChannel.onmessage = (ev) =>{
      hotkeys.trigger(ev.data);
    };

    usePreferences.subscribe((prefStore)=>{
      hotkeys.unbind();
      if (prefStore.version > 0) {
        this.keyboardShortcut = {
          ...(prefStore.getPreferences('browser', 'main_menu_file')?.value) && {'file_shortcut': commonUtils.parseShortcutValue(prefStore.getPreferences('browser', 'main_menu_file')?.value)},
          ...(prefStore.getPreferences('browser', 'main_menu_object')?.value) && {'object_shortcut': commonUtils.parseShortcutValue(prefStore.getPreferences('browser', 'main_menu_object')?.value)},
          ...(prefStore.getPreferences('browser', 'main_menu_tools')?.value) && {'tools_shortcut': commonUtils.parseShortcutValue(prefStore.getPreferences('browser', 'main_menu_tools')?.value)},
          ...(prefStore.getPreferences('browser', 'main_menu_help')?.value) && {'help_shortcut': commonUtils.parseShortcutValue(prefStore.getPreferences('browser', 'main_menu_help')?.value)},
          'left_tree_shortcut': commonUtils.parseShortcutValue(prefStore.getPreferences('browser', 'browser_tree')?.value),
          'tabbed_panel_backward': commonUtils.parseShortcutValue(prefStore.getPreferences('browser', 'tabbed_panel_backward')?.value),
          'tabbed_panel_forward': commonUtils.parseShortcutValue(prefStore.getPreferences('browser', 'tabbed_panel_forward')?.value),
          'sub_menu_query_tool': commonUtils.parseShortcutValue(prefStore.getPreferences('browser', 'sub_menu_query_tool')?.value),
          'sub_menu_view_data': commonUtils.parseShortcutValue(prefStore.getPreferences('browser', 'sub_menu_view_data')?.value),
          'sub_menu_search_objects': commonUtils.parseShortcutValue(prefStore.getPreferences('browser', 'sub_menu_search_objects')?.value),
          'sub_menu_properties': commonUtils.parseShortcutValue(prefStore.getPreferences('browser', 'sub_menu_properties')?.value),
          'sub_menu_create': commonUtils.parseShortcutValue(prefStore.getPreferences('browser', 'sub_menu_create')?.value),
          'sub_menu_delete': commonUtils.parseShortcutValue(prefStore.getPreferences('browser', 'sub_menu_delete')?.value),
          'sub_menu_refresh': commonUtils.parseShortcutValue(prefStore.getPreferences('browser', 'sub_menu_refresh')?.value),
          'direct_debugging': commonUtils.parseShortcutValue(prefStore.getPreferences('browser', 'direct_debugging')?.value),
          'add_grid_row': commonUtils.parseShortcutValue(prefStore.getPreferences('browser', 'add_grid_row')?.value),
          'open_quick_search': commonUtils.parseShortcutValue(prefStore.getPreferences('browser', 'open_quick_search')?.value),
          'close_tab_panel': commonUtils.parseShortcutValue(prefStore.getPreferences('browser', 'close_tab_panel')?.value),

        };
        this.shortcutMethods = {
          ...(prefStore.getPreferences('browser', 'main_menu_file')?.value) && {'bindMainMenu': {
            'shortcuts': [this.keyboardShortcut.file_shortcut,
              this.keyboardShortcut.object_shortcut, this.keyboardShortcut.tools_shortcut,
              this.keyboardShortcut.help_shortcut],
          }}, // Main menu
          'bindRightPanel': {'shortcuts': [this.keyboardShortcut.tabbed_panel_backward, this.keyboardShortcut.tabbed_panel_forward, this.keyboardShortcut.close_tab_panel]}, // Main window panels
          'bindLeftTree': {'shortcuts': this.keyboardShortcut.left_tree_shortcut}, // Main menu,
          'bindSubMenuQueryTool': {'shortcuts': this.keyboardShortcut.sub_menu_query_tool}, // Sub menu - Open Query Tool,
          'bindSubMenuViewData': {'shortcuts': this.keyboardShortcut.sub_menu_view_data}, // Sub menu - Open View Data,
          'bindSubMenuSearchObjects': {'shortcuts': this.keyboardShortcut.sub_menu_search_objects}, // Sub menu - Open search objects,
          'bindSubMenuProperties': {'shortcuts': this.keyboardShortcut.sub_menu_properties}, // Sub menu - Edit Properties,
          'bindSubMenuCreate': {'shortcuts': this.keyboardShortcut.sub_menu_create}, // Sub menu - Create Object,
          'bindSubMenuDelete': {'shortcuts': this.keyboardShortcut.sub_menu_delete}, // Sub menu - Delete object,
          'bindSubMenuRefresh': {'shortcuts': this.keyboardShortcut.sub_menu_refresh, 'bindElem': '#tree'}, // Sub menu - Refresh object,
          'bindDirectDebugging': {'shortcuts': this.keyboardShortcut.direct_debugging}, // Sub menu - Direct Debugging
          'bindAddGridRow': {'shortcuts': this.keyboardShortcut.add_grid_row}, // Subnode Grid Add Row
          'bindOpenQuickSearch': {'shortcuts': this.keyboardShortcut.open_quick_search}, // Subnode Grid Refresh Row
        };
        this.shortcutsString=Object.values(this.shortcutMethods).map(i=>i.shortcuts).join(',');
        // Checks if the tab is iframe or not, if iframe then calls the function 'setupIframeEventsBroadcast'
        if (window.self != window.top) {
          this.setupIframeEventsBroadcast();
        } else {
          this.bindShortcuts();
        }
      }
    });
  },
  //Sends the pressed keyboard shortcut from iframe to parent
  triggerIframeEventsBroadcast: function(event,checkShortcuts=false){
    const shortcut = {
      alt:event?.altKey,
      shift:event?.shiftKey,
      control:event?.ctrlKey,
      key:{
        char:event?.key
      }
    };
    const currShortcutString = commonUtils.parseShortcutValue(shortcut);
    if (checkShortcuts && !this.shortcutsString.split(',').includes(currShortcutString)){
      return;
    }
    this.iframeEventsChannel.postMessage(currShortcutString);
  },
  //listens to keyboard events and triggers the 'triggerIframeEventsBroadcast' for shortcuts
  setupIframeEventsBroadcast:function() {
    const self=this;
    hotkeys(self.shortcutsString,(event)=>{
      this.triggerIframeEventsBroadcast(event);
    });
  },
  bindShortcuts: function() {
    const self = this;
    _.each(self.shortcutMethods, (keyCombo, callback) => {
      self._bindWithHotkeys(keyCombo.shortcuts, self[callback]);
    });
  },
  _bindWithHotkeys: function(shortcuts, callback) {
    const self = this;
    hotkeys(shortcuts.toString(), function (event, combo) {
      if(!combo){
        combo = this;
      }
      callback.apply(self, [event, combo]);
    });
  },
  bindMainMenu: function(event, combo) {
    const shortcut_obj = this.keyboardShortcut;
    let menuLabel = null;
    switch (combo.key) {
    case shortcut_obj.file_shortcut:
      menuLabel = gettext('File');
      break;
    case shortcut_obj.object_shortcut:
      menuLabel = gettext('Object');
      break;
    case shortcut_obj.tools_shortcut:
      menuLabel = gettext('Tools');
      break;
    case shortcut_obj.help_shortcut:
      menuLabel = gettext('Help');
      break;
    default:
      break;
    }

    if(menuLabel) {
      document.querySelector(`div[data-test="app-menu-bar"] button[data-label="${menuLabel}"]`)?.click();
    }
  },
  bindRightPanel: function(event, combo) {
    const self = this;
    const shortcutObj = this.keyboardShortcut;
    const activeElement = document.activeElement;

    if (activeElement.closest('.dock-tab-btn')) {
      const currDockTab = activeElement.closest('.dock-tab-btn');
      const dockLayout = currDockTab.closest('.dock-layout');
      const dockLayoutTabs = dockLayout ? Array.from(dockLayout.querySelectorAll('.dock-tab-btn')) : null;

      if (dockLayoutTabs && dockLayoutTabs.length > 1) {
        const activeTabIndex = dockLayoutTabs.indexOf(currDockTab);
        self._focusTab(dockLayoutTabs, activeTabIndex, shortcutObj, combo);
      }
    }
    else if (activeElement.nodeName === 'IFRAME' || activeElement.closest('.dock-tabpane.dock-tabpane-active')) {
      let activeTabId = '';
      activeTabId = (activeElement.nodeName === 'IFRAME') ? activeElement.id : activeElement.closest('.dock-tabpane.dock-tabpane-active').id;
      const dockLayout = document.getElementById('root');
      const dockLayoutTabs = dockLayout ? Array.from(dockLayout.querySelectorAll('.dock-tab-btn')) : null;

      if (dockLayoutTabs && dockLayoutTabs.length > 1 && activeTabId) {
        const activeTabIndex = dockLayoutTabs.findIndex(tab => tab.id.slice(14) === activeTabId);
        self._focusTab(dockLayoutTabs, activeTabIndex, shortcutObj, combo);
      }
    }
    else if (activeElement === document.body || document.querySelector('div[data-test="app-menu-bar"]')) {
      const activeTabs = document.getElementsByClassName('dock-tabpane dock-tabpane-active');

      if (activeTabs.length > 1) {
        const activeTabId = activeTabs[1].id;
        const dockLayout = document.getElementById('root');
        const dockLayoutTabs = dockLayout ? Array.from(dockLayout.querySelectorAll('.dock-tab-btn')) : null;

        if (dockLayoutTabs && dockLayoutTabs.length > 1 && activeTabId) {
          const activeTabIndex = dockLayoutTabs.findIndex(tab => tab.id.slice(14) === activeTabId);
          self._focusTab(dockLayoutTabs, activeTabIndex, shortcutObj, combo);
        }
      }
    }
  },
  _focusTab: function(dockLayoutTabs, activeTabIdx, shortcut_obj, combo){
    if(combo.key === shortcut_obj.close_tab_panel) {
      const panelId = dockLayoutTabs[activeTabIdx].id?.slice(14);
      if (panelId) {
        pgAdmin.Browser.docker.default_workspace.close(panelId);
      }
    } else {
      if (combo.key === shortcut_obj.tabbed_panel_backward) activeTabIdx = (activeTabIdx + dockLayoutTabs.length - 1) % dockLayoutTabs.length;
      else if (combo.key === shortcut_obj.tabbed_panel_forward) activeTabIdx = (activeTabIdx + 1) % dockLayoutTabs.length;
      dockLayoutTabs[activeTabIdx]?.click();
      dockLayoutTabs[activeTabIdx]?.focus();
    }
  },
  bindLeftTree: function() {
    const tree = this.getTreeDetails();

    document.querySelector('[id="id-object-explorer"]').focus();
    tree.t.select(tree.i);
  },
  bindSubMenuQueryTool: function() {
    const tree = this.getTreeDetails();

    if (!tree.d)
      return;

    // Call data grid method to render query tool
    pgAdmin.Tools.SQLEditor.showQueryTool('', tree.i);
  },
  bindSubMenuViewData: function() {
    const tree = this.getTreeDetails();

    if (!tree.d)
      return;

    // Call data grid method to render view data
    pgAdmin.Tools.SQLEditor.showViewData({'mnuid': 1}, tree.i);
  },
  bindSubMenuSearchObjects: function() {
    const tree = this.getTreeDetails();

    if (!tree.d)
      return;

    // Call show search object to open the search object dialog.
    pgAdmin.Tools.SearchObjects.show_search_objects('', tree.i);
  },
  bindSubMenuProperties: function() {
    const tree = this.getTreeDetails();

    if (!tree.d || pgAdmin.Browser.Nodes[tree.t.itemData(tree.i)._type].collection_node === true)
      return;

    // Open properties dialog in edit mode
    pgAdmin.Browser.Node.callbacks.show_obj_properties.call(
      pgAdmin.Browser.Nodes[tree.t.itemData(tree.i)._type], {action: 'edit'}
    );
  },
  bindSubMenuCreate: function() {
    const tree = this.getTreeDetails();
    let node_obj = pgAdmin.Browser.Nodes[tree.t.itemData(tree.i)._type];
    if (!tree.d){
      return;
    } else if(node_obj.collection_node === true) {
      if(node_obj.node) {
        node_obj = pgAdmin.Browser.Nodes[node_obj.node];
      } else {
        return;
      }
    }

    // Open properties dialog in edit mode
    pgAdmin.Browser.Node.callbacks.show_obj_properties.call(
      node_obj, {action: 'create', item: tree.i}
    );
  },
  bindSubMenuDelete: function(event) {
    const tree = this.getTreeDetails();
    if (!tree.d || pgAdmin.Browser.Nodes[tree.t.itemData(tree.i)._type].collection_node === true || !event?.target?.classList?.contains('file-tree'))
      return;

    // Call delete object callback
    pgAdmin.Browser.Node.callbacks.delete_obj.call(pgAdmin.Browser.Nodes[tree.t.itemData(tree.i)._type]);
  },
  bindSubMenuRefresh: function(event) {
    event?.preventDefault();
    const tree = pgBrowser.keyboardNavigation.getTreeDetails();

    // Call refresh object callback
    pgAdmin.Browser.Node.callbacks.refresh.call(pgAdmin.Browser.Nodes[tree.t.itemData(tree.i)._type]);
  },
  bindDirectDebugging: function() {
    const tree = this.getTreeDetails();
    const type = tree.t.itemData(tree.i)._type;

    if (!tree.d || (type !== 'function' && type !== 'procedure'))
      return;

    if (pgAdmin.Tools.Debugger.canDebug(tree.d, tree.i, {'debug_type': 'direct'})) {
      // Call debugger callback
      pgAdmin.Tools.Debugger.getFunctionInformation(pgAdmin.Browser.Nodes[type]);
    }
  },
  isPropertyPanelVisible: function() {
    let isPanelVisible = false;
    _.each(pgAdmin.Browser.docker.default_workspace.findPanels(), (panel) => {
      if (panel._type === 'properties')
        isPanelVisible = panel.isVisible();
    });
    return isPanelVisible;
  },
  getTreeDetails: function() {
    const tree = pgAdmin.Browser.tree;
    const selectedTreeNode = tree.selected() ? tree.selected() : tree.first();
    const selectedTreeNodeData = selectedTreeNode ? tree.itemData(selectedTreeNode) : undefined;

    return {
      t: tree,
      i: selectedTreeNode,
      d: selectedTreeNodeData,
    };
  },
  bindOpenQuickSearch: function() {
    pgWindow.pgAdmin.Browser.all_menus_cache.help.mnu_quick_search_help.callback();
  },
  bindAddGridRow: function() {
    let gridElem = document.activeElement.closest('.pgrt')?.parentElement;
    if (gridElem) {
      gridElem.querySelector('button[data-test="add-row"]')?.click();
    }
  }
});

module.exports = pgAdmin.Browser.keyboardNavigation;
