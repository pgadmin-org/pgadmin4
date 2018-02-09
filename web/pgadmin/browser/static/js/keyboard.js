/* eslint-disable */
define(
   ['underscore', 'underscore.string', 'sources/pgadmin', 'jquery', 'mousetrap'],
function(_, S, pgAdmin, $, Mousetrap) {
  'use strict';

  var pgBrowser = pgAdmin.Browser = pgAdmin.Browser || {};

  pgBrowser.keyboardNavigation = pgBrowser.keyboardNavigation || {};

  _.extend(pgBrowser.keyboardNavigation, {
    init: function() {
      Mousetrap.reset();
      if (pgBrowser.preferences_cache.length > 0) {
        var getShortcut = this.parseShortcutValue;
        this.keyboardShortcut = {
          'file_shortcut': getShortcut(pgBrowser.get_preference('browser', 'main_menu_file').value),
          'object_shortcut': getShortcut(pgBrowser.get_preference('browser', 'main_menu_object').value),
          'tools_shortcut': getShortcut(pgBrowser.get_preference('browser', 'main_menu_tools').value),
          'help_shortcut': getShortcut(pgBrowser.get_preference('browser', 'main_menu_help').value),
          'left_tree_shortcut': getShortcut(pgBrowser.get_preference('browser', 'browser_tree').value),
          'tabbed_panel_backward': getShortcut(pgBrowser.get_preference('browser', 'tabbed_panel_backward').value),
          'tabbed_panel_forward': getShortcut(pgBrowser.get_preference('browser', 'tabbed_panel_forward').value),
          'sub_menu_query_tool': getShortcut(pgBrowser.get_preference('browser', 'sub_menu_query_tool').value),
          'sub_menu_view_data': getShortcut(pgBrowser.get_preference('browser', 'sub_menu_view_data').value),
          'sub_menu_properties': getShortcut(pgBrowser.get_preference('browser', 'sub_menu_properties').value),
          'sub_menu_create': getShortcut(pgBrowser.get_preference('browser', 'sub_menu_create').value),
          'sub_menu_delete': getShortcut(pgBrowser.get_preference('browser', 'sub_menu_delete').value),
          'context_menu': getShortcut(pgBrowser.get_preference('browser', 'context_menu').value),
          'direct_debugging': getShortcut(pgBrowser.get_preference('browser', 'direct_debugging').value)
        };
        this.shortcutMethods = {
          'bindMainMenu': {'shortcuts': [this.keyboardShortcut.file_shortcut,
           this.keyboardShortcut.object_shortcut, this.keyboardShortcut.tools_shortcut,
           this.keyboardShortcut.help_shortcut]}, // Main menu
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
          'bindContextMenu': {'shortcuts': this.keyboardShortcut.context_menu}, // Sub menu - Open context menu,
          'bindDirectDebugging': {'shortcuts': this.keyboardShortcut.direct_debugging} // Sub menu - Direct Debugging
        };
      this.bindShortcuts();
      }
    },
    bindShortcuts: function() {
      var self = this;
      _.each(self.shortcutMethods, function(keyCombo, callback) {
        self._bindWithMousetrap(keyCombo.shortcuts, self[callback], keyCombo.bindElem);
      });
    },
    _bindWithMousetrap: function(shortcuts, callback, bindElem) {
      var self = this;
      if (bindElem) {
        var elem = document.querySelector(bindElem);
        Mousetrap(elem).bind(shortcuts, function() {
          callback.apply(this, arguments);
        }.bind(elem));
      } else {
        Mousetrap.bind(shortcuts, function() {
          callback.apply(self, arguments);
        });
      }
    },
    attachShortcut: function(shortcut, callback, bindElem) {
      this._bindWithMousetrap(shortcut, callback, bindElem);
    },
    detachShortcut: function(shortcut, bindElem) {
      if (bindElem) Mousetrap(bindElem).unbind(shortcut);
      else Mousetrap.unbind(shortcut);
    },
    bindMainMenu: function(e, combo) {
      var shortcut_obj = this.keyboardShortcut;
      if (combo == shortcut_obj.file_shortcut) $('#mnu_file a.dropdown-toggle').dropdown('toggle');
      if (combo == shortcut_obj.object_shortcut) $('#mnu_obj a.dropdown-toggle').first().dropdown('toggle');
      if (combo == shortcut_obj.tools_shortcut) $('#mnu_tools a.dropdown-toggle').dropdown('toggle');
      if (combo == shortcut_obj.help_shortcut) $('#mnu_help a.dropdown-toggle').dropdown('toggle');
    },
    bindRightPanel: function(e, combo) {
      var allPanels = pgAdmin.Browser.docker.findPanels(),
        activePanel = 0,
        nextPanel = allPanels.length,
        prevPanel = 1,
        activePanelId = 0,
        activePanelFlag = false,
        shortcut_obj = this.keyboardShortcut;

      _.each(pgAdmin.Browser.docker.findPanels(), function(panel, index){
        if (panel.isVisible() && !activePanelFlag && panel._type != 'browser'){
          activePanelId = index;
          activePanelFlag = true;
        }
      });

      if (combo == shortcut_obj.tabbed_panel_backward) activePanel = (activePanelId > 0) ? activePanelId - 1 : prevPanel;
      else if (combo == shortcut_obj.tabbed_panel_forward) activePanel = (activePanelId < nextPanel) ? activePanelId + 1 : nextPanel;

      pgAdmin.Browser.docker.findPanels()[activePanel].focus();
      setTimeout(function() {
        if (document.activeElement instanceof HTMLIFrameElement) {
          document.activeElement.blur();
        }
      }, 1000);
    },
    bindMainMenuLeft: function(e) {
      var prevMenu;
      if ($(e.target).hasClass('menu-link')) { // Menu items
        prevMenu = $(e.target).parent().parent().parent().prev('.dropdown');
      }
      else if ($(e.target).parent().hasClass('dropdown-submenu')) { // Sub menu
        $(e.target).parent().toggleClass('open');
        return;
      }
      else { //Menu headers
        prevMenu = $(e.target).parent().prev('.dropdown');
      }

      if (prevMenu.hasClass('hide')) prevMenu = prevMenu.prev('.dropdown'); // Skip hidden menus

      prevMenu.find('a:first').dropdown('toggle');
    },
    bindMainMenuRight: function(e) {
      var nextMenu;
      if ($(e.target).hasClass('menu-link')) { // Menu items
        nextMenu = $(e.target).parent().parent().parent().next('.dropdown');
      }
      else if ($(e.target).parent().hasClass('dropdown-submenu')) { // Sub menu
        $(e.target).parent().toggleClass('open');
        return;
      }
      else { //Menu headers
        nextMenu = $(e.target).parent().next('.dropdown');
      }

      if (nextMenu.hasClass('hide')) nextMenu = nextMenu.next('.dropdown'); // Skip hidden menus

      nextMenu.find('a:first').dropdown('toggle');
    },
    bindMainMenuUpDown: function(e, combo) {
      // Handle Sub-menus
      if (combo == 'up' && $(e.target).parent().prev().prev('.dropdown-submenu').length > 0) {
        $(e.target).parent().prev().prev('.dropdown-submenu').find('a:first').focus();
      } else {
        if ($(e.target).parent().hasClass('dropdown-submenu')) {
          $(e.target).parent().parent().parent().find('a:first').dropdown('toggle');
          $(e.target).parent().parent().children().eq(2).find('a:first').focus();
        }
      }
    },
    bindLeftTree: function() {
      var tree = this.getTreeDetails();

      $('#tree').focus();
      tree.t.focus(tree.i);
      tree.t.select(tree.i);
    },
    bindSubMenuQueryTool: function() {
      var tree = this.getTreeDetails();

      if (!tree.d)
        return;

      // Call data grid method to render query tool
      pgAdmin.DataGrid.show_query_tool('', tree.i);
    },
    bindSubMenuViewData: function() {
      var tree = this.getTreeDetails();

      if (!tree.d)
        return;

      // Call data grid method to render view data
      pgAdmin.DataGrid.show_data_grid({'mnuid': 1}, tree.i);
    },
    bindSubMenuProperties: function() {
      var tree = this.getTreeDetails();

      if (!tree.d || pgAdmin.Browser.Nodes[tree.t.itemData(tree.i)._type].collection_node == true)
        return;

      // Open properties dialog in edit mode
      pgAdmin.Browser.Node.callbacks.show_obj_properties.call(
        pgAdmin.Browser.Nodes[tree.t.itemData(tree.i)._type], {action: 'edit'}
      );
    },
    bindSubMenuCreate: function() {
      var tree = this.getTreeDetails();

      if (!tree.d || pgAdmin.Browser.Nodes[tree.t.itemData(tree.i)._type].collection_node == true)
        return;

      // Open properties dialog in edit mode
      pgAdmin.Browser.Node.callbacks.show_obj_properties.call(
        pgAdmin.Browser.Nodes[tree.t.itemData(tree.i)._type], {action: 'create'}
      );
    },
    bindSubMenuDelete: function() {
      var tree = this.getTreeDetails();

      if (!tree.d || pgAdmin.Browser.Nodes[tree.t.itemData(tree.i)._type].collection_node == true)
        return;

      // Call delete object callback
      pgAdmin.Browser.Node.callbacks.delete_obj.call(pgAdmin.Browser.Nodes[tree.t.itemData(tree.i)._type]);
    },
    bindContextMenu: function(e) {
      var tree = this.getTreeDetails(),
          e = window.event,
          left = $(e.srcElement).find('.aciTreeEntry').position().left + 70,
          top = $(e.srcElement).find('.aciTreeEntry').position().top + 70;

      tree.t.blur(tree.i);
      $('#tree').blur();
      // Call context menu and set position
      var ctx = tree.i.children().contextMenu({x: left, y:top});
    },
    bindDirectDebugging: function(e) {
      var tree = this.getTreeDetails(),
          type = tree.t.itemData(tree.i)._type;

      if (!tree.d || (type != 'function' && type != 'procedure'))
        return;

      if(pgAdmin.Tools.Debugger.can_debug(tree.d, tree.i, {'debug_type': 'direct'})) {
        // Call debugger callback
        pgAdmin.Tools.Debugger.get_function_information(pgAdmin.Browser.Nodes[type]);
      }
    },
    parseShortcutValue: function(obj) {
      var shortcut = "";
      if (obj.alt) { shortcut += 'alt+'; }
      if (obj.shift) { shortcut += 'shift+'; }
      if (obj.control) { shortcut += 'ctrl+'; }
      shortcut += String.fromCharCode(obj.key.key_code).toLowerCase();
      return shortcut;
    },
    getTreeDetails: function() {
      var t = pgAdmin.Browser.tree,
      i = t.selected().length > 0 ? t.selected() : t.first(),
      d = i && i.length == 1 ? t.itemData(i) : undefined;

      return {
        t: t,
        i: i,
        d: d
      }
    }

  });

  return pgAdmin.keyboardNavigation;
});
