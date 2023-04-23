/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import _ from 'lodash';
import pgAdmin from '../../../static/js/pgadmin';
import Mousetrap from 'mousetrap';
import * as commonUtils from '../../../static/js/utils';
import gettext from 'sources/gettext';
import pgWindow from 'sources/window';

const pgBrowser = pgAdmin.Browser = pgAdmin.Browser || {};

pgBrowser.keyboardNavigation = pgBrowser.keyboardNavigation || {};

_.extend(pgBrowser.keyboardNavigation, {
  init: function() {
    Mousetrap.reset();
    if (pgBrowser.preferences_cache.length > 0) {
      this.keyboardShortcut = {
        ...(pgBrowser.get_preference('browser', 'main_menu_file')?.value) && {'file_shortcut': commonUtils.parseShortcutValue(pgBrowser.get_preference('browser', 'main_menu_file')?.value)},
        ...(pgBrowser.get_preference('browser', 'main_menu_object')?.value) && {'object_shortcut': commonUtils.parseShortcutValue(pgBrowser.get_preference('browser', 'main_menu_object')?.value)},
        ...(pgBrowser.get_preference('browser', 'main_menu_tools')?.value) && {'tools_shortcut': commonUtils.parseShortcutValue(pgBrowser.get_preference('browser', 'main_menu_tools')?.value)},
        ...(pgBrowser.get_preference('browser', 'main_menu_help')?.value) && {'help_shortcut': commonUtils.parseShortcutValue(pgBrowser.get_preference('browser', 'main_menu_help')?.value)},
        'left_tree_shortcut': commonUtils.parseShortcutValue(pgBrowser.get_preference('browser', 'browser_tree').value),
        'tabbed_panel_backward': commonUtils.parseShortcutValue(pgBrowser.get_preference('browser', 'tabbed_panel_backward').value),
        'tabbed_panel_forward': commonUtils.parseShortcutValue(pgBrowser.get_preference('browser', 'tabbed_panel_forward').value),
        'sub_menu_query_tool': commonUtils.parseShortcutValue(pgBrowser.get_preference('browser', 'sub_menu_query_tool').value),
        'sub_menu_view_data': commonUtils.parseShortcutValue(pgBrowser.get_preference('browser', 'sub_menu_view_data').value),
        'sub_menu_search_objects': commonUtils.parseShortcutValue(pgBrowser.get_preference('browser', 'sub_menu_search_objects').value),
        'sub_menu_properties': commonUtils.parseShortcutValue(pgBrowser.get_preference('browser', 'sub_menu_properties').value),
        'sub_menu_create': commonUtils.parseShortcutValue(pgBrowser.get_preference('browser', 'sub_menu_create').value),
        'sub_menu_delete': commonUtils.parseShortcutValue(pgBrowser.get_preference('browser', 'sub_menu_delete').value),
        'sub_menu_refresh': commonUtils.parseShortcutValue(pgBrowser.get_preference('browser', 'sub_menu_refresh').value),
        'context_menu': commonUtils.parseShortcutValue(pgBrowser.get_preference('browser', 'context_menu').value),
        'direct_debugging': commonUtils.parseShortcutValue(pgBrowser.get_preference('browser', 'direct_debugging').value),
        'drop_multiple_objects': commonUtils.parseShortcutValue(pgBrowser.get_preference('browser', 'grid_menu_drop_multiple').value),
        'drop_cascade_multiple_objects': commonUtils.parseShortcutValue(pgBrowser.get_preference('browser', 'grid_menu_drop_cascade_multiple').value),
        'add_grid_row': commonUtils.parseShortcutValue(pgBrowser.get_preference('browser', 'add_grid_row').value),
        'open_quick_search': commonUtils.parseShortcutValue(pgBrowser.get_preference('browser', 'open_quick_search').value),

      };
      this.shortcutMethods = {
        ...(pgBrowser.get_preference('browser', 'main_menu_file')?.value) && {'bindMainMenu': {
          'shortcuts': [this.keyboardShortcut.file_shortcut,
            this.keyboardShortcut.object_shortcut, this.keyboardShortcut.tools_shortcut,
            this.keyboardShortcut.help_shortcut],
        }}, // Main menu
        'bindRightPanel': {'shortcuts': [this.keyboardShortcut.tabbed_panel_backward, this.keyboardShortcut.tabbed_panel_forward]}, // Main window panels
        'bindLeftTree': {'shortcuts': this.keyboardShortcut.left_tree_shortcut}, // Main menu,
        'bindSubMenuQueryTool': {'shortcuts': this.keyboardShortcut.sub_menu_query_tool}, // Sub menu - Open Query Tool,
        'bindSubMenuViewData': {'shortcuts': this.keyboardShortcut.sub_menu_view_data}, // Sub menu - Open View Data,
        'bindSubMenuSearchObjects': {'shortcuts': this.keyboardShortcut.sub_menu_search_objects}, // Sub menu - Open search objects,
        'bindSubMenuProperties': {'shortcuts': this.keyboardShortcut.sub_menu_properties}, // Sub menu - Edit Properties,
        'bindSubMenuCreate': {'shortcuts': this.keyboardShortcut.sub_menu_create}, // Sub menu - Create Object,
        'bindSubMenuDelete': {'shortcuts': this.keyboardShortcut.sub_menu_delete}, // Sub menu - Delete object,
        'bindSubMenuRefresh': {'shortcuts': this.keyboardShortcut.sub_menu_refresh, 'bindElem': '#tree'}, // Sub menu - Refresh object,
        'bindContextMenu': {'shortcuts': this.keyboardShortcut.context_menu}, // Sub menu - Open context menu,
        'bindDirectDebugging': {'shortcuts': this.keyboardShortcut.direct_debugging}, // Sub menu - Direct Debugging
        'bindDropMultipleObjects': {'shortcuts': this.keyboardShortcut.drop_multiple_objects}, // Grid Menu Drop Multiple
        'bindDropCascadeMultipleObjects': {'shortcuts': this.keyboardShortcut.drop_cascade_multiple_objects}, // Grid Menu Drop Cascade Multiple
        'bindAddGridRow': {'shortcuts': this.keyboardShortcut.add_grid_row}, // Subnode Grid Add Row
        'bindOpenQuickSearch': {'shortcuts': this.keyboardShortcut.open_quick_search}, // Subnode Grid Refresh Row
      };
      this.bindShortcuts();
    }
  },
  bindShortcuts: function() {
    const self = this;
    _.each(self.shortcutMethods, (keyCombo, callback) => {
      self._bindWithMousetrap(keyCombo.shortcuts, self[callback], keyCombo.bindElem);
    });
  },
  _bindWithMousetrap: function(shortcuts, callback, bindElem) {
    const self = this;
    shortcuts ?? Mousetrap.unbind(shortcuts);
    if (bindElem) {
      const elem = document.querySelector(bindElem);
      Mousetrap(elem).bind(shortcuts, function() {
        callback.apply(this, arguments);
      }.bind(elem));
    } else {
      Mousetrap.bind(shortcuts, function () {
        callback.apply(self, arguments);
      });
    }
  },
  unbindShortcuts: function() {
    // Reset previous events on each instance
    const self = this;
    _.each(self.mousetrapInstances, (obj) => {
      obj['instance'].reset();
    });
    // Clear already processed events
    self.mousetrapInstances = [];
  },
  bindMainMenu: function(event, combo) {
    const shortcut_obj = this.keyboardShortcut;
    let menuLabel = null;
    switch (combo) {
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
      document.querySelector(`#main-menu-container button[data-label="${menuLabel}"]`)?.click();
    }
  },
  bindRightPanel: function(event, combo) {
    let allPanels = pgAdmin.Browser.docker.findPanels();
    let activePanel = 0;
    let nextPanel = allPanels.length - 1;
    let prevPanel = 1;
    let activePanelId = 0;
    let activePanelFlag = false;
    let shortcut_obj = this.keyboardShortcut;

    _.each(pgAdmin.Browser.docker.findPanels(), (panel, index) => {
      if (panel.isVisible() && !activePanelFlag && panel._type !== 'browser') {
        activePanelId = index;
        activePanelFlag = true;
      }
    });

    if (combo === shortcut_obj.tabbed_panel_backward) activePanel = (activePanelId > 0) ? activePanelId - 1 : prevPanel;
    else if (combo === shortcut_obj.tabbed_panel_forward) activePanel = (activePanelId < nextPanel) ? activePanelId + 1 : nextPanel;

    pgAdmin.Browser.docker.findPanels()[activePanel].focus();
    setTimeout(() => {
      if (document.activeElement instanceof HTMLIFrameElement) {
        document.activeElement.blur();
      }
    }, 1000);
  },
  bindLeftTree: function() {
    const tree = this.getTreeDetails();

    document.querySelector('[id="tree"]').focus();
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
  bindSubMenuDelete: function() {
    const tree = this.getTreeDetails();

    if (!tree.d || pgAdmin.Browser.Nodes[tree.t.itemData(tree.i)._type].collection_node === true)
      return;

    // Call delete object callback
    pgAdmin.Browser.Node.callbacks.delete_obj.call(pgAdmin.Browser.Nodes[tree.t.itemData(tree.i)._type]);
  },
  bindSubMenuRefresh: function(event) {
    event.preventDefault();
    const tree = pgBrowser.keyboardNavigation.getTreeDetails();

    // Call refresh object callback
    pgAdmin.Browser.Node.callbacks.refresh.call(pgAdmin.Browser.Nodes[tree.t.itemData(tree.i)._type]);
  },
  bindDirectDebugging: function() {
    const tree = this.getTreeDetails();
    const type = tree.t.itemData(tree.i)._type;

    if (!tree.d || (type !== 'function' && type !== 'procedure'))
      return;

    if (pgAdmin.Tools.Debugger.can_debug(tree.d, tree.i, {'debug_type': 'direct'})) {
      // Call debugger callback
      pgAdmin.Tools.Debugger.get_function_information(pgAdmin.Browser.Nodes[type]);
    }
  },
  isPropertyPanelVisible: function() {
    let isPanelVisible = false;
    _.each(pgAdmin.Browser.docker.findPanels(), (panel) => {
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
});

module.exports = pgAdmin.Browser.keyboardNavigation;
