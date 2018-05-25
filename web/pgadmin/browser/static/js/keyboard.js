import _ from 'underscore';
import pgAdmin from '../../../static/js/pgadmin';
import $ from 'jquery';
import Mousetrap from 'mousetrap';
import * as commonUtils from '../../../static/js/utils';
import dialogTabNavigator from '../../../static/js/dialog_tab_navigator';

const pgBrowser = pgAdmin.Browser = pgAdmin.Browser || {};

pgBrowser.keyboardNavigation = pgBrowser.keyboardNavigation || {};

_.extend(pgBrowser.keyboardNavigation, {
  init: function() {
    Mousetrap.reset();
    if (pgBrowser.preferences_cache.length > 0) {
      this.keyboardShortcut = {
        'file_shortcut': commonUtils.parseShortcutValue(pgBrowser.get_preference('browser', 'main_menu_file').value),
        'object_shortcut': commonUtils.parseShortcutValue(pgBrowser.get_preference('browser', 'main_menu_object').value),
        'tools_shortcut': commonUtils.parseShortcutValue(pgBrowser.get_preference('browser', 'main_menu_tools').value),
        'help_shortcut': commonUtils.parseShortcutValue(pgBrowser.get_preference('browser', 'main_menu_help').value),
        'left_tree_shortcut': commonUtils.parseShortcutValue(pgBrowser.get_preference('browser', 'browser_tree').value),
        'tabbed_panel_backward': commonUtils.parseShortcutValue(pgBrowser.get_preference('browser', 'tabbed_panel_backward').value),
        'tabbed_panel_forward': commonUtils.parseShortcutValue(pgBrowser.get_preference('browser', 'tabbed_panel_forward').value),
        'sub_menu_query_tool': commonUtils.parseShortcutValue(pgBrowser.get_preference('browser', 'sub_menu_query_tool').value),
        'sub_menu_view_data': commonUtils.parseShortcutValue(pgBrowser.get_preference('browser', 'sub_menu_view_data').value),
        'sub_menu_properties': commonUtils.parseShortcutValue(pgBrowser.get_preference('browser', 'sub_menu_properties').value),
        'sub_menu_create': commonUtils.parseShortcutValue(pgBrowser.get_preference('browser', 'sub_menu_create').value),
        'sub_menu_delete': commonUtils.parseShortcutValue(pgBrowser.get_preference('browser', 'sub_menu_delete').value),
        'sub_menu_refresh': commonUtils.parseShortcutValue(pgBrowser.get_preference('browser', 'sub_menu_refresh').value),
        'context_menu': commonUtils.parseShortcutValue(pgBrowser.get_preference('browser', 'context_menu').value),
        'direct_debugging': commonUtils.parseShortcutValue(pgBrowser.get_preference('browser', 'direct_debugging').value),
      };
      this.shortcutMethods = {
        'bindMainMenu': {
          'shortcuts': [this.keyboardShortcut.file_shortcut,
            this.keyboardShortcut.object_shortcut, this.keyboardShortcut.tools_shortcut,
            this.keyboardShortcut.help_shortcut],
        }, // Main menu
        'bindRightPanel': {'shortcuts': [this.keyboardShortcut.tabbed_panel_backward, this.keyboardShortcut.tabbed_panel_forward]}, // Main window panels
        'bindMainMenuLeft': {'shortcuts': 'left', 'bindElem': '.pg-navbar'}, // Main menu
        'bindMainMenuRight': {'shortcuts': 'right', 'bindElem': '.pg-navbar'}, // Main menu
        'bindMainMenuUpDown': {'shortcuts': ['up', 'down']}, // Main menu
        'bindLeftTree': {'shortcuts': this.keyboardShortcut.left_tree_shortcut}, // Main menu,
        'bindSubMenuQueryTool': {'shortcuts': this.keyboardShortcut.sub_menu_query_tool}, // Sub menu - Open Query Tool,
        'bindSubMenuViewData': {'shortcuts': this.keyboardShortcut.sub_menu_view_data}, // Sub menu - Open View Data,
        'bindSubMenuProperties': {'shortcuts': this.keyboardShortcut.sub_menu_properties}, // Sub menu - Edit Properties,
        'bindSubMenuCreate': {'shortcuts': this.keyboardShortcut.sub_menu_create}, // Sub menu - Create Object,
        'bindSubMenuDelete': {'shortcuts': this.keyboardShortcut.sub_menu_delete}, // Sub menu - Delete object,
        'bindSubMenuRefresh': {'shortcuts': this.keyboardShortcut.sub_menu_refresh, 'bindElem': '#tree'}, // Sub menu - Refresh object,
        'bindContextMenu': {'shortcuts': this.keyboardShortcut.context_menu}, // Sub menu - Open context menu,
        'bindDirectDebugging': {'shortcuts': this.keyboardShortcut.direct_debugging}, // Sub menu - Direct Debugging
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
  bindMainMenu: function(event, combo) {
    const shortcut_obj = this.keyboardShortcut;
    if (combo === shortcut_obj.file_shortcut) $('#mnu_file a.dropdown-toggle').dropdown('toggle');
    if (combo === shortcut_obj.object_shortcut) $('#mnu_obj a.dropdown-toggle').first().dropdown('toggle');
    if (combo === shortcut_obj.tools_shortcut) $('#mnu_tools a.dropdown-toggle').dropdown('toggle');
    if (combo === shortcut_obj.help_shortcut) $('#mnu_help a.dropdown-toggle').dropdown('toggle');
  },
  bindRightPanel: function(event, combo) {
    let allPanels = pgAdmin.Browser.docker.findPanels();
    let activePanel = 0;
    let nextPanel = allPanels.length;
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
  bindMainMenuLeft: function(event) {
    let prevMenu;
    if ($(event.target).hasClass('menu-link')) { // Menu items
      prevMenu = $(event.target).parent().parent().parent().prev('.dropdown');
    }
    else if ($(event.target).parent().hasClass('dropdown-submenu')) { // Sub menu
      $(event.target).parent().toggleClass('open');
      return;
    }
    else { //Menu headers
      prevMenu = $(event.target).parent().prev('.dropdown');
    }

    if (prevMenu.hasClass('hide')) prevMenu = prevMenu.prev('.dropdown'); // Skip hidden menus

    prevMenu.find('a:first').dropdown('toggle');
  },
  bindMainMenuRight: function(event) {
    let nextMenu;
    if ($(event.target).hasClass('menu-link')) { // Menu items
      nextMenu = $(event.target).parent().parent().parent().next('.dropdown');
    }
    else if ($(event.target).parent().hasClass('dropdown-submenu')) { // Sub menu
      $(event.target).parent().toggleClass('open');
      return;
    }
    else { //Menu headers
      nextMenu = $(event.target).parent().next('.dropdown');
    }

    if (nextMenu.hasClass('hide')) nextMenu = nextMenu.next('.dropdown'); // Skip hidden menus

    nextMenu.find('a:first').dropdown('toggle');
  },
  bindMainMenuUpDown: function(event, combo) {
    // Handle Sub-menus
    if (combo === 'up' && $(event.target).parent().prev().prev('.dropdown-submenu').length > 0) {
      $(event.target).parent().prev().prev('.dropdown-submenu').find('a:first').trigger('focus');
    } else {
      if ($(event.target).parent().hasClass('dropdown-submenu')) {
        $(event.target).parent().parent().parent().find('a:first').dropdown('toggle');
        $(event.target).parent().parent().children().eq(2).find('a:first').trigger('focus');
      }
    }
  },
  bindLeftTree: function() {
    const tree = this.getTreeDetails();

    $('#tree').trigger('focus');
    tree.t.focus(tree.i);
    tree.t.select(tree.i);
  },
  bindSubMenuQueryTool: function() {
    const tree = this.getTreeDetails();

    if (!tree.d)
      return;

    // Call data grid method to render query tool
    pgAdmin.DataGrid.show_query_tool('', tree.i);
  },
  bindSubMenuViewData: function() {
    const tree = this.getTreeDetails();

    if (!tree.d)
      return;

    // Call data grid method to render view data
    pgAdmin.DataGrid.show_data_grid({'mnuid': 1}, tree.i);
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

    if (!tree.d || pgAdmin.Browser.Nodes[tree.t.itemData(tree.i)._type].collection_node === true)
      return;

    // Open properties dialog in edit mode
    pgAdmin.Browser.Node.callbacks.show_obj_properties.call(
      pgAdmin.Browser.Nodes[tree.t.itemData(tree.i)._type], {action: 'create'}
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
  bindContextMenu: function(event) {
    const tree = this.getTreeDetails();
    const left = $(event.srcElement).find('.aciTreeEntry').position().left + 70;
    const top = $(event.srcElement).find('.aciTreeEntry').position().top + 70;

    tree.t.blur(tree.i);
    $('#tree').trigger('blur');
    // Call context menu and set position
    tree.i.children().contextMenu({x: left, y: top});
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
  getTreeDetails: function() {
    const aciTree = pgAdmin.Browser.tree;
    const selectedTreeNode = aciTree.selected().length > 0 ? aciTree.selected() : aciTree.first();
    const selectedTreeNodeData = selectedTreeNode && selectedTreeNode.length === 1 ? aciTree.itemData(selectedTreeNode) : undefined;

    return {
      t: aciTree,
      i: selectedTreeNode,
      d: selectedTreeNodeData,
    };
  },
  getDialogTabNavigator: function(dialog) {
    const backward_shortcut = pgBrowser.get_preference('browser', 'dialog_tab_backward').value;
    const forward_shortcut = pgBrowser.get_preference('browser', 'dialog_tab_forward').value;

    return new dialogTabNavigator.dialogTabNavigator(dialog, backward_shortcut, forward_shortcut);
  },
});

module.exports = pgAdmin.Browser.keyboardNavigation;
