define('pgadmin.browser', [
  'sources/tree/tree',
  'sources/gettext', 'sources/url_for', 'require', 'jquery', 'underscore', 'underscore.string',
  'bootstrap', 'sources/pgadmin', 'pgadmin.alertifyjs', 'bundled_codemirror',
  'sources/check_node_visibility', 'pgadmin.browser.utils', 'wcdocker',
  'jquery.contextmenu', 'jquery.aciplugin', 'jquery.acitree', 'pgadmin.browser.preferences',
  'pgadmin.browser.messages',
  'pgadmin.browser.menu', 'pgadmin.browser.panel',
  'pgadmin.browser.error', 'pgadmin.browser.frame',
  'pgadmin.browser.node', 'pgadmin.browser.collection',
  'sources/codemirror/addon/fold/pgadmin-sqlfoldcode',
  'pgadmin.browser.keyboard',
], function(
  tree,
  gettext, url_for, require, $, _, S, Bootstrap, pgAdmin, Alertify,
  codemirror, checkNodeVisibility
) {
  window.jQuery = window.$ = $;
  // Some scripts do export their object in the window only.
  // Generally the one, which do no have AMD support.
  var wcDocker = window.wcDocker;
  $ = $ || window.jQuery || window.$;
  Bootstrap = Bootstrap || window.Bootstrap;
  var CodeMirror = codemirror.default;

  var pgBrowser = pgAdmin.Browser = pgAdmin.Browser || {};
  var select_object_msg = gettext('Please select an object in the tree view.');

  var panelEvents = {};
  panelEvents[wcDocker.EVENT.VISIBILITY_CHANGED] = function() {
    if (this.isVisible()) {
      var obj = pgAdmin.Browser,
        i   = obj.tree ? obj.tree.selected() : undefined,
        d   = i && i.length == 1 ? obj.tree.itemData(i) : undefined;

      if (d && obj.Nodes[d._type].callbacks['selected'] &&
        _.isFunction(obj.Nodes[d._type].callbacks['selected'])) {
        return obj.Nodes[d._type].callbacks['selected'].apply(
            obj.Nodes[d._type], [i, d, obj]);
      }
    }
  };

  var processTreeData = function(payload) {
    var data = JSON.parse(payload).data;
    if (data.length && data[0]._type !== 'column' &&
      data[0]._type !== 'catalog_object_column') {
      data = data.sort(function(a, b) {
        return pgAdmin.natural_sort(a.label, b.label);
      });
    }
    _.each(data, function(d){
      d._label = d.label;
      d.label = _.escape(d.label);
    });
    return data;
  };

  var initializeBrowserTree = pgAdmin.Browser.initializeBrowserTree =
    function(b) {
      $('#tree').aciTree({
        ajax: {
          url: url_for('browser.nodes'),
          converters: {
            'text json': processTreeData,
          },
        },
        ajaxHook: function(item, settings) {
          if (item != null) {
            var d = this.itemData(item);
            var n = b.Nodes[d._type];
            if (n)
              settings.url = n.generate_url(item, 'children', d, true);
          }
        },
        loaderDelay: 100,
        show: {
          duration: 75,
        },
        hide: {
          duration: 75,
        },
        view: {
          duration: 75,
        },
        animateRoot: true,
        unanimated: false,
      });

      b.tree = $('#tree').aciTree('api');
      b.treeMenu.register($('#tree'));
    };

  // Extend the browser class attributes
  _.extend(pgAdmin.Browser, {
    // The base url for browser
    URL: url_for('browser.index'),
    // We do have docker of type wcDocker to take care of different
    // containers. (i.e. panels, tabs, frames, etc.)
    docker:null,
    // Reversed Engineer query for the selected database node object goes
    // here
    editor:null,
    // Left hand browser tree
    tree:null,
    treeMenu: new tree.Tree(),
    // list of script to be loaded, when a certain type of node is loaded
    // It will be used to register extensions, tools, child node scripts,
    // etc.
    scripts: {},
    // Default panels
    panels: {
      // Panel to keep the left hand browser tree
      'browser': new pgAdmin.Browser.Panel({
        name: 'browser',
        title: gettext('Browser'),
        showTitle: true,
        isCloseable: false,
        isPrivate: true,
        icon: 'fa fa-binoculars',
        content: '<div id="tree" class="aciTree"></div>',
      }),
      // Properties of the object node
      'properties': new pgAdmin.Browser.Panel({
        name: 'properties',
        title: gettext('Properties'),
        icon: 'fa fa-cogs',
        width: 500,
        isCloseable: false,
        isPrivate: true,
        elContainer: true,
        content: '<div class="obj_properties"><div class="alert alert-info pg-panel-message">' + select_object_msg + '</div></div>',
        events: panelEvents,
        onCreate: function(myPanel, $container) {
          $container.addClass('pg-no-overflow');
        },
      }),
      // Statistics of the object
      'statistics': new pgAdmin.Browser.Panel({
        name: 'statistics',
        title: gettext('Statistics'),
        icon: 'fa fa-line-chart',
        width: 500,
        isCloseable: false,
        isPrivate: true,
        content: '<div><div class="alert alert-info pg-panel-message pg-panel-statistics-message">' + select_object_msg + '</div><div class="pg-panel-statistics-container hidden"></div></div>',
        events: panelEvents,
      }),
      // Reversed engineered SQL for the object
      'sql': new pgAdmin.Browser.Panel({
        name: 'sql',
        title: gettext('SQL'),
        icon: 'fa fa-file-text-o',
        width: 500,
        isCloseable: false,
        isPrivate: true,
        content: '<div class="sql_textarea"><textarea id="sql-textarea" name="sql-textarea"></textarea></div>',
      }),
      // Dependencies of the object
      'dependencies': new pgAdmin.Browser.Panel({
        name: 'dependencies',
        title: gettext('Dependencies'),
        icon: 'fa fa-hand-o-up',
        width: 500,
        isCloseable: false,
        isPrivate: true,
        content: '<div><div class="alert alert-info pg-panel-message pg-panel-depends-message">' + select_object_msg + '</div><div class="pg-panel-depends-container hidden"></div></div>',
        events: panelEvents,
      }),
      // Dependents of the object
      'dependents': new pgAdmin.Browser.Panel({
        name: 'dependents',
        title: gettext('Dependents'),
        icon: 'fa fa-hand-o-down',
        width: 500,
        isCloseable: false,
        isPrivate: true,
        content: '<div><div class="alert alert-info pg-panel-message pg-panel-depends-message">' + select_object_msg + '</div><div class="pg-panel-depends-container hidden"></div></div>',
        events: panelEvents,
      }),
    },
    // We also support showing dashboards, HTML file, external URL
    frames: {},
    /* Menus */
    // pgAdmin.Browser.MenuItem.add_menus(...) will register all the menus
    // in this container
    menus: {
      // All context menu goes here under certain menu types.
      // i.e. context: {'server': [...], 'server-group': [...]}
      context: {},
      // File menus
      file: {},
      // Edit menus
      edit: {},
      // Object menus
      object: {},
      // Management menus
      management: {},
      // Tools menus
      tools: {},
      // Help menus
      help: {},
    },
    add_panels: function() {
      /* Add hooked-in panels by extensions */
      var panels = JSON.parse(pgBrowser.panels_items);
      _.each(panels, function(panel) {
        if (panel.isIframe) {
          pgBrowser.frames[panel.name] = new pgBrowser.Frame({
            name: panel.name,
            title: panel.title,
            icon: panel.icon,
            width: panel.width,
            height: panel.height,
            showTitle: panel.showTitle,
            isCloseable: panel.isCloseable,
            isPrivate: panel.isPrivate,
            url: panel.content,
          });
        } else {
          pgBrowser.panels[panel.name] = new pgBrowser.Panel({
            name: panel.name,
            title: panel.title,
            icon: panel.icon,
            width: panel.width,
            height: panel.height,
            showTitle: panel.showTitle,
            isCloseable: panel.isCloseable,
            isPrivate: panel.isPrivate,
            content: (panel.content) ? panel.content : '',
            events: (panel.events) ? panel.events : '',
            canHide: (panel.canHide) ? panel.canHide : '',
          });
        }
      });

    },
    menu_categories: {
      /* name, label (pair) */
      'create': {
        label: gettext('Create'),
        priority: 1,
        /* separator above this menu */
        above: false,
        below: true,
        /* icon: 'fa fa-magic', */
        single: true,
      },
    },
    // A callback to load/fetch a script when a certain node is loaded
    register_script: function(n, m, p) {
      var scripts = this.scripts;
      scripts[n] = _.isArray(scripts[n]) ? scripts[n] : [];
      scripts[n].push({'name': m, 'path': p, loaded: false});
    },
    // Build the default layout
    buildDefaultLayout: function() {
      var browserPanel = this.docker.addPanel('browser', wcDocker.DOCK.LEFT);
      var dashboardPanel = this.docker.addPanel(
        'dashboard', wcDocker.DOCK.RIGHT, browserPanel);
      this.docker.addPanel('properties', wcDocker.DOCK.STACKED, dashboardPanel, {
        tabOrientation: wcDocker.TAB.TOP,
      });
      this.docker.addPanel('sql', wcDocker.DOCK.STACKED, dashboardPanel);
      this.docker.addPanel(
        'statistics', wcDocker.DOCK.STACKED, dashboardPanel);
      this.docker.addPanel(
        'dependencies', wcDocker.DOCK.STACKED, dashboardPanel);
      this.docker.addPanel(
        'dependents', wcDocker.DOCK.STACKED, dashboardPanel);
    },
    // Enable/disable menu options
    enable_disable_menus: function(item) {
      // Mechanism to enable/disable menus depending on the condition.
      var obj = this,
        // menu navigation bar
        navbar = $('#navbar-menu > ul').first(),
        // Drop down menu for objects
        $obj_mnu = navbar.find('li#mnu_obj > ul.dropdown-menu').first(),
        // data for current selected object
        d = obj.tree.itemData(item),
        update_menuitem = function(m) {
          if (m instanceof pgAdmin.Browser.MenuItem) {
            m.update(d, item);
          } else {
            for (var key in m) {
              update_menuitem(m[key]);
            }
          }
        };

      // All menus from the object menus (except the create drop-down
      // menu) needs to be removed.
      $obj_mnu.empty();

      // All menus (except for the object menus) are already present.
      // They will just require to check, wheather they are
      // enabled/disabled.
      _.each([
        {m: 'file', id: '#mnu_file'},
        {m: 'edit', id: '#mnu_edit'},
        {m: 'management', id: '#mnu_management'},
        {m: 'tools', id: '#mnu_tools'},
        {m: 'help', id:'#mnu_help'}], function(o) {
        _.each( obj.menus[o.m], function(m) { update_menuitem(m); });
      });

      // Create the object menu dynamically
      if (item && obj.menus['object'] && obj.menus['object'][d._type]) {
        pgAdmin.Browser.MenuCreator(
          $obj_mnu, obj.menus['object'][d._type], obj.menu_categories, d, item
        );
      } else {
        // Create a dummy 'no object seleted' menu
        var create_submenu = pgAdmin.Browser.MenuGroup(
          obj.menu_categories['create'], [{
            $el: $('<li class="menu-item disabled"><a href="#">' + gettext('No object selected') + '</a></li>'),
            priority: 1,
            category: 'create',
            update: function() {},
          }], false);
        $obj_mnu.append(create_submenu.$el);
      }
    },
    save_current_layout: function(obj) {
      if(obj.docker) {
        var state = obj.docker.save();
        var settings = { setting: 'Browser/Layout', value: state };
        $.ajax({
          type: 'POST',
          url: url_for('settings.store_bulk'),
          data: settings,
        });
      }
    },
    init: function() {
      var obj=this;
      if (obj.initialized) {
        return;
      }
      obj.initialized = true;

      // Cache preferences
      obj.cache_preferences();
      obj.add_panels();
      // Initialize the Docker
      obj.docker = new wcDocker(
        '#dockerContainer', {
          allowContextMenu: true,
          allowCollapse: false,
          themePath: '../static/css/',
          theme: 'webcabin.overrides.css',
        });
      if (obj.docker) {
        // Initialize all the panels
        _.each(obj.panels, function(panel, name) {
          obj.panels[name].load(obj.docker);
        });
        // Initialize all the frames
        _.each(obj.frames, function(frame, name) {
          obj.frames[name].load(obj.docker);
        });

        // Stored layout in database from the previous session
        var layout = pgBrowser.utils.layout;

        // Try to restore the layout if there is one
        if (layout != '') {
          try {
            obj.docker.restore(layout);
          }
          catch(err) {
            obj.docker.clear();
            obj.buildDefaultLayout();
          }
        } else {
          obj.buildDefaultLayout();
        }

        // Listen to panel attach/detach event so that last layout will be remembered
        _.each(obj.panels, function(panel) {
          if (panel.panel) {
            panel.panel.on(wcDocker.EVENT.ATTACHED, function() {
              obj.save_current_layout(obj);
            });
            panel.panel.on(wcDocker.EVENT.DETACHED, function() {
              obj.save_current_layout(obj);
            });
            panel.panel.on(wcDocker.EVENT.MOVE_ENDED, function() {
              obj.save_current_layout(obj);
            });
          }
        });
      }

      // Syntax highlight the SQL Pane
      obj.editor = CodeMirror.fromTextArea(
        document.getElementById('sql-textarea'), {
          lineNumbers: true,
          mode: 'text/x-pgsql',
          readOnly: true,
          extraKeys: pgAdmin.Browser.editor_shortcut_keys,
        });
      /* Cache may take time to load for the first time
       * Reflect the changes once cache is available
       */
      let cacheIntervalId = setInterval(()=> {
        let sqlEditPreferences = obj.get_preferences_for_module('sqleditor');
        if(sqlEditPreferences) {
          clearInterval(cacheIntervalId);
          obj.reflectPreferences('sqleditor');
        }
      }, 500);

      /* Check for sql editor preference changes */
      obj.onPreferencesChange('sqleditor', function() {
        obj.reflectPreferences('sqleditor');
      });

      setTimeout(function() {
        obj.editor.setValue('-- ' + select_object_msg);
        obj.editor.refresh();
      }, 10);

      // Initialise the treeview
      initializeBrowserTree(obj);

      // Build the treeview context menu
      $('#tree').contextMenu({
        selector: '.aciTreeLine',
        autoHide: false,
        build: function(element) {
          var item = obj.tree.itemFrom(element),
            d = obj.tree.itemData(item),
            menus = obj.menus['context'][d._type],
            $div = $('<div></div>'),
            context_menu = {};

          pgAdmin.Browser.MenuCreator(
            $div, menus, obj.menu_categories, d, item, context_menu
          );

          return {
            autoHide: false,
            items: context_menu,
          };
        },
        events: {
          hide: function() {
            // Return focus to the tree
            obj.keyboardNavigation.bindLeftTree();
          },
        },
      });

      // Treeview event handler
      $('#tree').on('acitree', function(event, api, item, eventName, options) {
        var d = item ? obj.tree.itemData(item) : null;
        var node;

        if (d && obj.Nodes[d._type]) {
          node = obj.Nodes[d._type];

            /* If the node specific callback returns false, we will also return
             * false for further processing.
             */
          if (_.isObject(node.callbacks) &&
            eventName in node.callbacks &&
              typeof node.callbacks[eventName] == 'function' &&
              !node.callbacks[eventName].apply(
                node, [item, d, obj, options, eventName])) {
            return false;
          }
          /* Raise tree events for the nodes */
          try {
            node.trigger(
              'browser-node.' + eventName, node, item, d
            );
          } catch (e) {
            console.warn(e.stack || e);
          }
        }

        try {
          obj.Events.trigger(
            'pgadmin-browser:tree', eventName, item, d
          );
          obj.Events.trigger(
            'pgadmin-browser:tree:' + eventName, item, d, node
          );
        } catch (e) {
          console.warn(e.stack || e);
        }
        return true;
      });

      // Register scripts and add menus
      pgBrowser.utils.registerScripts(this);
      pgBrowser.utils.addMenus(obj);

      // Ping the server every 5 minutes
      setInterval(function() {
        $.ajax({
          url: url_for('misc.cleanup'),
          type:'POST',
        })
        .done(function() {})
        .fail(function() {});
      }, 300000);
      obj.Events.on('pgadmin:browser:tree:add', obj.onAddTreeNode, obj);
      obj.Events.on('pgadmin:browser:tree:update', obj.onUpdateTreeNode, obj);
      obj.Events.on('pgadmin:browser:tree:refresh', obj.onRefreshTreeNode, obj);
    },

    add_menu_category: function(
      id, label, priority, icon, above_separator, below_separator, single
    ) {
      this.menu_categories[id] = {
        label: label,
        priority: priority,
        icon: icon,
        above: (above_separator === true),
        below: (below_separator === true),
        single: single,
      };
    },

    // Add menus of module/extension at appropriate menu
    add_menus: function(menus) {
      var self = this,
        pgMenu = this.menus,
        MenuItem = pgAdmin.Browser.MenuItem;
      _.each(menus, function(m) {
        _.each(m.applies, function(a) {
          /* We do support menu type only from this list */
          if ($.inArray(a, [
            'context', 'file', 'edit', 'object',
            'management', 'tools', 'help']) >= 0) {
            var menus;

              // If current node is not visible in browser tree
              // then return from here
            if(!checkNodeVisibility(self, m.node)) {
              return;
            } else if(_.has(m, 'module') && !_.isUndefined(m.module)) {
                // If module to which this menu applies is not visible in
                // browser tree then also we do not display menu
              if(!checkNodeVisibility(self, m.module.type)) {
                return;
              }
            }

            pgMenu[a] = pgMenu[a] || {};
            if (_.isString(m.node)) {
              menus = pgMenu[a][m.node] = pgMenu[a][m.node] || {};
            } else if (_.isString(m.category)) {
              menus = pgMenu[a][m.category] = pgMenu[a][m.category] || {};
            }
            else {
              menus = pgMenu[a];
            }

            if (!_.has(menus, m.name)) {
              menus[m.name] = new MenuItem({
                name: m.name, label: m.label, module: m.module,
                category: m.category, callback: m.callback,
                priority: m.priority, data: m.data, url: m.url || '#',
                target: m.target, icon: m.icon,
                enable: (m.enable == '' ? true : (_.isString(m.enable) &&
                    m.enable.toLowerCase() == 'false') ?
                      false : m.enable),
                node: m.node,
              });
            }
          } else  {
            console.warn(
                'Developer warning: Category \'' +
                  a +
                  '\' is not supported!\nSupported categories are: context, file, edit, object, tools, management, help'
              );
          }
        });
      });
    },
    // Create the menus
    create_menus: function() {

      /* Create menus */
      var navbar = $('#navbar-menu > ul').first();
      var obj = this;

      _.each([
        {menu: 'file', id: '#mnu_file'},
        {menu: 'edit', id: '#mnu_edit'},
        {menu: 'management', id: '#mnu_management'},
        {menu: 'tools', id: '#mnu_tools'},
        {menu: 'help', id:'#mnu_help'}],
        function(o) {
          var $mnu = navbar.children(o.id).first(),
            $dropdown = $mnu.children('.dropdown-menu').first();
          $dropdown.empty();

          if (pgAdmin.Browser.MenuCreator(
            $dropdown, obj.menus[o.menu], obj.menu_categories
          )) {
            $mnu.removeClass('hide');
          }
        });

      navbar.children('#mnu_obj').removeClass('hide');
      obj.enable_disable_menus();
    },
    // General function to handle callbacks for object or dialog help.
    showHelp: function(type, url, node, item, label) {
      var iframe, pnlProperties;
      if (type == 'object_help') {
        // See if we can find an existing panel, if not, create one
        var pnlSqlHelp = this.docker.findPanels('pnl_sql_help')[0];

        if (pnlSqlHelp == null) {
          pnlProperties = this.docker.findPanels('properties')[0];
          this.docker.addPanel('pnl_sql_help', wcDocker.DOCK.STACKED, pnlProperties);
          pnlSqlHelp = this.docker.findPanels('pnl_sql_help')[0];
        }

        // Construct the URL
        var server = node.getTreeNodeHierarchy(item).server;
        var baseUrl = pgBrowser.utils.pg_help_path;
        if (server.server_type == 'ppas') {
          baseUrl = pgBrowser.utils.edbas_help_path;
        }

        var major = Math.floor(server.version / 10000),
          minor = Math.floor(server.version / 100) - (major * 100);

        baseUrl = baseUrl.replace('$VERSION$', major + '.' + minor);
        if (!S(baseUrl).endsWith('/')) {
          baseUrl = baseUrl + '/';
        }
        var fullUrl = baseUrl+ url;
        // Update the panel
        iframe = $(pnlSqlHelp).data('embeddedFrame');
        pnlSqlHelp.title('Help: '+ label);

        pnlSqlHelp.focus();
        iframe.openURL(fullUrl);
      } else if(type == 'dialog_help') {
        if(this.docker) {
          // See if we can find an existing panel, if not, create one
          var pnlDialogHelp = this.docker.findPanels('pnl_online_help')[0];

          if (pnlDialogHelp == null) {
            pnlProperties = this.docker.findPanels('properties')[0];
            this.docker.addPanel('pnl_online_help', wcDocker.DOCK.STACKED, pnlProperties);
            pnlDialogHelp = this.docker.findPanels('pnl_online_help')[0];
          }

          // Update the panel
          iframe = $(pnlDialogHelp).data('embeddedFrame');

          pnlDialogHelp.focus();
          iframe.openURL(url);
        } else {
          // We have added new functionality of opening Query tool & debugger in new
          // browser tab, In that case we will not have docker object available
          // so we will open dialog help in new browser tab
          window.open(url, '_blank');
        }
      }
    },
    _findTreeChildNode: function(_i, _d, _o) {
      var loaded = _o.t.wasLoad(_i),
        onLoad = function() {
          var items = _o.t.children(_i),
            i, d, n, idx = 0, size = items.length;
          for (; idx < size; idx++) {
            i = items.eq(idx);
            d = _o.t.itemData(i);
            if (d._type === _d._type) {
              if (!_o.hasId || d._id == _d._id) {
                _o.i = i;
                _o.d = _d;
                _o.pathOfTreeItems.push({coll: false, item: i, d: _d});

                _o.success();
                return;
              }
            } else {
              n = _o.b.Nodes[d._type];
              // Are we looking at the collection node for the given node?
              if (
                n && n.collection_node && d.nodes &&
                  _.indexOf(d.nodes, _d._type) != -1
              ) {
                _o.i = i;
                _o.d = null;
                _o.pathOfTreeItems.push({coll: true, item: i, d: d});

                // Set load to false when the current collection node's inode is false
                if (!_o.t.isInode(i)) {
                  _o.load = false;
                }
                _o.b._findTreeChildNode(i, _d, _o);
                return;
              }
            }
          }
          _o.notFound && typeof(_o.notFound) == 'function' &&
            _o.notFound(_d);
        };

      if (!loaded && _o.load) {
        _o.t.open(_i, {
          success: onLoad,
          unanimated: true,
          fail: function() {
            var fail = _o && _o.o && _o.o.fail;

            if (
              fail && typeof(fail) == 'function'
            ) {
              fail.apply(_o.t, []);
            }
          },
        });
      } else if (loaded) {
        onLoad();
      } else {
        _o.notFound && typeof(_o.notFound) == 'function' &&
          _o.notFound(_d);
      }

      return;
    },

    onAddTreeNode: function(_data, _hierarchy, _opts) {
      var ctx = {
          b: this, // Browser
          d: null, // current parent
          hasId: true,
          i: null, // current item
          p: _.toArray(_hierarchy || {}).sort(
          function(a, b) {
            return (a.priority === b.priority) ? 0 : (
              a.priority < b.priority ? -1 : 1
            );
          }
        ), // path of the parent
          pathOfTreeItems: [], // path Item
          t: this.tree, // Tree Api
          o: _opts,
        },
        traversePath = function() {
          var ctx = this, data;

          ctx.success = traversePath;
          if (ctx.p.length) {
            data = ctx.p.shift();
            // This is the parent node.
            // Replace the parent-id of the data, which could be different
            // from the given hierarchy.
            if (!ctx.p.length) {
              data._id = _data._pid;
              ctx.success = addItemNode;
            }
            ctx.b._findTreeChildNode(
              ctx.i, data, ctx
            );
            // if parent node is null
            if (!_data._pid) {
              addItemNode.apply(ctx, arguments);
            }
          }
          return true;
        }.bind(ctx),
        addItemNode = function() {
          // Append the new data in the tree under the current item.
          // We may need to pass it to proper collection node.
          var ctx = this,
            first = (ctx.i || this.t.wasLoad(ctx.i)) &&
            this.t.first(ctx.i),
            findChildNode = function(success, notFound) {
              var ctx = this;
              ctx.success = success;
              ctx.notFound = notFound;

              ctx.b._findTreeChildNode(ctx.i, _data, ctx);
            }.bind(ctx),
            selectNode = function() {
              this.t.openPath(this.i);
              this.t.select(this.i);
              if (
                ctx.o && ctx.o.success && typeof(ctx.o.success) == 'function'
              ) {
                ctx.o.success.apply(ctx.t, [ctx.i, _data]);
              }
            }.bind(ctx),
            addNode = function() {
              var ctx = this,
                items = ctx.t.children(ctx.i),
                s = 0, e = items.length - 1, i,
                linearSearch = function() {
                  while (e >= s) {
                    i = items.eq(s);
                    var d = ctx.t.itemData(i);
                    if (
                      pgAdmin.natural_sort(
                        d._label, _data._label
                      ) == 1
                    )
                      return true;
                    s++;
                  }
                  if (e != items.length - 1) {
                    i = items.eq(e);
                    return true;
                  }
                  i = null;
                  return false;
                },
                binarySearch = function() {
                  var d, m, res;
                  // Binary search only outperforms Linear search for n > 44.
                  // Reference:
                  // https://en.wikipedia.org/wiki/Binary_search_algorithm#cite_note-30
                  //
                  // We will try until it's half.
                  while (e - s > 22) {
                    i = items.eq(s);
                    d = ctx.t.itemData(i);
                    if (
                      pgAdmin.natural_sort(
                        d._label, _data._label
                      ) != -1
                    )
                      return true;
                    i = items.eq(e);
                    d = ctx.t.itemData(i);
                    if (
                      pgAdmin.natural_sort(
                        d._label, _data._label
                      ) != 1
                    )
                      return true;
                    m = s + Math.round((e - s) / 2);
                    i = items.eq(m);
                    d = ctx.t.itemData(i);
                    res = pgAdmin.natural_sort(d._label, _data._label);
                    if (res == 0)
                      return true;

                    if (res == -1) {
                      s = m + 1;
                      e--;
                    } else {
                      s++;
                      e = m - 1;
                    }
                  }
                  return linearSearch();
                };

              if (binarySearch()) {
                ctx.t.before(i, {
                  itemData: _data,
                  success: function() {
                    if (
                      ctx.o && ctx.o.success && typeof(ctx.o.success) == 'function'
                    ) {
                      ctx.o.success.apply(ctx.t, [i, _data]);
                    }
                  },
                  fail: function() {
                    console.warn('Failed to add before...', arguments);
                    if (
                      ctx.o && ctx.o.fail && typeof(ctx.o.fail) == 'function'
                    ) {
                      ctx.o.fail.apply(ctx.t, [i, _data]);
                    }
                  },
                });
              } else {
                var _append = function() {
                  var ctx = this,
                    is_parent_loaded_before = ctx.t.wasLoad(ctx.i),
                    _parent_data = ctx.t.itemData(ctx.i);

                  ctx.t.append(ctx.i, {
                    itemData: _data,
                    success: function(item, options) {
                      var i = $(options.items[0]);
                      // Open the item path only if its parent is loaded
                      // or parent type is same as nodes
                      if(
                        is_parent_loaded_before &&
                          _parent_data &&  _parent_data._type.search(
                            _data._type
                          ) > -1
                      ) {
                        ctx.t.openPath(i);
                        ctx.t.select(i);
                      } else {
                        if (_parent_data) {
                          // Unload the parent node so that we'll get
                          // latest data when we try to expand it
                          ctx.t.unload(ctx.i, {
                            success: function (item) {
                              // Lets try to load it now
                              ctx.t.open(item);
                            },
                          });
                        }
                      }
                      if (
                        ctx.o && ctx.o.success &&
                          typeof(ctx.o.success) == 'function'
                      ) {
                        ctx.o.success.apply(ctx.t, [i, _data]);
                      }
                    },
                    fail: function() {
                      console.warn('Failed to append...', arguments);
                      if (
                        ctx.o && ctx.o.fail &&
                          typeof(ctx.o.fail) == 'function'
                      ) {
                        ctx.o.fail.apply(ctx.t, [ctx.i, _data]);
                      }
                    },
                  });
                }.bind(ctx);

                if (ctx.i && !ctx.t.isInode(ctx.i)) {
                  ctx.t.setInode(ctx.i, {success: _append});
                } else {
                  // Handle case for node without parent i.e. server-group
                  // or if parent node's inode is true.
                  _append();
                }
              }
            }.bind(ctx);

          // Parent node do not have any children, let me unload it.
          if (!first && ctx.t.wasLoad(ctx.i)) {
            ctx.t.unload(ctx.i, {
              success: function() {
                findChildNode(
                  selectNode,
                  function() {
                    var o = this && this.o;
                    if (
                      o && o.fail && typeof(o.fail) == 'function'
                    ) {
                      o.fail.apply(this.t, [this.i, _data]);
                    }
                  }.bind(this)
                );
              }.bind(this),
              fail: function() {
                var o = this && this.o;
                if (
                  o && o.fail && typeof(o.fail) == 'function'
                ) {
                  o.fail.apply(this.t, [this.i, _data]);
                }
              }.bind(this),
            });
            return;
          }

          // We can find the collection node using _findTreeChildNode
          // indirectly.
          findChildNode(selectNode, addNode);
        }.bind(ctx);

      if (!ctx.t.wasInit() || !_data) {
        return;
      }
      _data._label = _data.label;
      _data.label = _.escape(_data.label);

      traversePath();
    },

    onUpdateTreeNode: function(_old, _new, _hierarchy, _opts) {
      var ctx = {
          b: this, // Browser
          d: null, // current parent
          i: null, // current item
          hasId: true,
          p: _.toArray(_hierarchy || {}).sort(
          function(a, b) {
            return (a.priority === b.priority) ? 0 : (
              a.priority < b.priority ? -1 : 1
            );
          }
        ), // path of the old object
          pathOfTreeItems: [], // path items
          t: this.tree, // Tree Api
          o: _opts,
          load: true,
          old: _old,
          new: _new,
          op: null,
        },
        errorOut = function() {
          var fail = this.o && this.o.fail;
          if (fail && typeof(fail) == 'function') {
            fail.apply(this.t, [this.i, _new, _old]);
          }
        }.bind(ctx),
        deleteNode = function() {
          var self = this,
            pathOfTreeItems = this.pathOfTreeItems,
            findParent = function() {
              if (pathOfTreeItems.length) {
                pathOfTreeItems.pop();
                var length = pathOfTreeItems.length;
                this.i = (length && pathOfTreeItems[length - 1].item) || null;
                this.d = (length && pathOfTreeItems[length - 1].d) || null;

                // It is a collection item, let's find the node item
                if (length && pathOfTreeItems[length - 1].coll) {
                  pathOfTreeItems.pop();
                  length = pathOfTreeItems.length;
                  this.i = (length && pathOfTreeItems[length - 1].item) || null;
                  this.d = (length && pathOfTreeItems[length - 1].d) || null;
                }
              } else {
                this.i = null;
                this.d = null;
              }
            }.bind(this);

          var _item_parent = (this.i
            && this.t.hasParent(this.i)
              && this.t.parent(this.i)) || null,
            _item_grand_parent = _item_parent ?
            (this.t.hasParent(_item_parent)
              && this.t.parent(_item_parent))
            : null;

          // Remove the current node first.
          if (
            this.i && this.d && this.old._id == this.d._id &&
              this.old._type == this.d._type
          ) {
            var _parent = this.t.parent(this.i) || null;

            // If there is no parent then just update the node
            if(_parent.length == 0 && ctx.op == 'UPDATE') {
              updateNode();
            } else {
              var postRemove = function() {
                // If item has parent but no grand parent
                if (_item_parent && !_item_grand_parent) {
                  var parent = null;
                  // We need to search in all parent siblings (eg: server groups)
                  var parents = this.t.siblings(this.i) || [];
                  parents.push(this.i[0]);
                  _.each(parents, function (p) {
                    var d = self.t.itemData($(p));
                    // If new server group found then assign it parent
                    if(d._id == self.new._pid) {
                      parent = p;
                      self.pathOfTreeItems.push({coll: true, item: parent, d: d});
                    }
                  });

                  if (parent) {
                    this.load = true;

                    this.success = function() {
                      addItemNode();
                    }.bind(this);
                    // We can refresh the collection node, but - let's not bother about
                    // it right now.
                    this.notFound = errorOut;

                    // var _d = {_id: this.new._pid, _type: self.d._type};
                    parent = $(parent);
                    var loaded = this.t.wasLoad(parent),
                      onLoad = function() {
                        self.i = parent;
                        self.d = self.d;
                        self.pathOfTreeItems.push({coll: false, item: parent, d: self.d});
                        self.success();
                        return;
                      };

                    if (!loaded && self.load) {
                      self.t.open(parent, {
                        success: onLoad,
                        unanimated: true,
                        fail: function() {
                          var fail = self && self.o && self.o.fail;

                          if (
                            fail && typeof(fail) == 'function'
                          ) {
                            fail.apply(self.t, []);
                          }
                        },
                      });
                    } else {
                      onLoad();
                    }
                  }
                  return;
                } else {
                  // This is for rest of the nodes
                  var _parentData = this.d;
                  // Find the grand-parent, or the collection node of parent.
                  findParent();

                  if (this.i) {
                    this.load = true;

                    this.success = function() {
                      addItemNode();
                    }.bind(this);
                    // We can refresh the collection node, but - let's not bother about
                    // it right now.
                    this.notFound = errorOut;

                    // Find the new parent
                    this.b._findTreeChildNode(
                      this.i, {_id: this.new._pid, _type: _parentData._type}, this
                    );
                  } else {
                    addItemNode();
                  }
                  return;
                }
              }.bind(this);

              // If there is a parent then we can remove the node
              this.t.remove(this.i, {
                success: function() {
                  // Find the parent
                  findParent();
                  // If server group have no children then close it and set inode
                  // and unload it so it can fetch new data on next expand
                  if (_item_parent && !_item_grand_parent && _parent
                    && self.t.children(_parent).length == 0) {
                    self.t.setInode(_parent, {
                      success: function() {
                        self.t.unload(_parent, {success: function() {
                          setTimeout(postRemove);
                        }}
                          );
                      },
                    });
                  } else {
                    setTimeout(postRemove);
                  }
                  return true;
                },
              }
              );
            }

          }
          errorOut();

        }.bind(ctx),
        findNewParent = function(_d) {
          var findParent = function() {
            var pathOfTreeItems = this.pathOfTreeItems;

            if (pathOfTreeItems.length) {
              pathOfTreeItems.pop();
              var length = pathOfTreeItems.length;
              this.i = (length && pathOfTreeItems[length - 1].item) || null;
              this.d = (length && pathOfTreeItems[length - 1].d) || null;

              // It is a collection item, let's find the node item
              if (length && pathOfTreeItems[length - 1].coll) {
                pathOfTreeItems.pop();
                length = pathOfTreeItems.length;
                this.i = (length && pathOfTreeItems[length - 1].item) || null;
                this.d = (length && pathOfTreeItems[length - 1].d) || null;
              }
            } else {
              this.i = null;
              this.d = null;
            }
          }.bind(this);

          // old parent was not found, can we find the new parent?
          if (this.i) {
            this.load = true;
            this.success = function() {
              addItemNode();
            }.bind(this);

            if (_d._type == this.old._type) {
              // We were already searching the old object under the parent.
              findParent();
              _d = this.d;
              // Find the grand parent
              findParent();
            }
            _d = this.new._pid;

            // We can refresh the collection node, but - let's not bother about
            // it right now.
            this.notFound = errorOut;

            // Find the new parent
            this.b._findTreeChildNode(this.i, _d, this);
          } else {
            addItemNode();
          }
        }.bind(ctx),
        updateNode = function() {
          if (
            this.i && this.d && this.new._type == this.d._type
          ) {
            var self = this,
              _id = this.d._id;
            if (this.new._id != this.d._id) {
              // Found the new oid, update its node_id
              var node_data = this.t.itemData(ctx.i);
              node_data._id = _id = this.new._id;
            }
            if (this.new._id == _id) {
              // Found the current
              _.extend(this.d, {
                '_id': this.new._id,
                '_label': this.new._label,
                'label': this.new.label,
              });
              this.t.setLabel(ctx.i, {label: this.new.label});
              this.t.addIcon(ctx.i, {icon: this.new.icon});
              this.t.setId(ctx.i, {id: this.new.id});
              this.t.openPath(this.i);
              this.t.deselect(this.i);

              // select tree item after few milliseconds
              setTimeout(function() {
                self.t.select(self.i);
              }, 10);
            }
          }
          var success = this.o && this.o.success;
          if (success && typeof(success) == 'function') {
            success.apply(this.t, [this.i, _old, _new]);
          }
        }.bind(ctx),
        traversePath = function() {
          var ctx = this, data;

          ctx.success = traversePath;
          if (ctx.p.length) {
            data = ctx.p.shift();
            // This is the node, we can now do the required operations.
            // We should first delete the existing node, if the parent-id is
            // different.
            if (!ctx.p.length) {
              if (ctx.op == 'RECREATE') {
                ctx.load = false;
                ctx.success = deleteNode;
                ctx.notFound = findNewParent;
              } else {
                ctx.success = updateNode;
                ctx.notFound = errorOut;
              }
            }
            ctx.b._findTreeChildNode(
              ctx.i, data, ctx
            );
          } else if (ctx.p.length == 1) {
            ctx.notFound = findNewParent;
          }
          return true;
        }.bind(ctx),
        addItemNode = function() {
          var ctx = this,
            first = (ctx.i || this.t.wasLoad(ctx.i)) &&
            this.t.first(ctx.i),
            findChildNode = function(success, notFound) {
              var ctx = this;
              ctx.success = success;
              ctx.notFound = notFound;

              ctx.b._findTreeChildNode(ctx.i, _new, ctx);
            }.bind(ctx),
            selectNode = function() {
              this.t.openPath(this.i);
              this.t.select(this.i);
              if (
                ctx.o && ctx.o.success && typeof(ctx.o.success) == 'function'
              ) {
                ctx.o.success.apply(ctx.t, [ctx.i, _new]);
              }
            }.bind(ctx),
            addNode = function() {
              var ctx = this,
                items = ctx.t.children(ctx.i),
                s = 0, e = items.length - 1, i,
                linearSearch = function() {
                  while (e >= s) {
                    i = items.eq(s);
                    var d = ctx.t.itemData(i);
                    if (
                      pgAdmin.natural_sort(
                        d._label, _new._label
                      ) == 1
                    )
                      return true;
                    s++;
                  }
                  if (e != items.length - 1) {
                    i = items.eq(e);
                    return true;
                  }
                  i = null;
                  return false;
                },
                binarySearch = function() {
                  while (e - s > 22) {
                    i = items.eq(s);
                    var d = ctx.t.itemData(i);
                    if (
                      pgAdmin.natural_sort(
                        d._label, _new._label
                      ) != -1
                    )
                      return true;
                    i = items.eq(e);
                    d = ctx.t.itemData(i);
                    if (
                      pgAdmin.natural_sort(
                        d._label, _new._label
                      ) != 1
                    )
                      return true;
                    var m = s + Math.round((e - s) / 2);
                    i = items.eq(m);
                    d = ctx.t.itemData(i);
                    var res = pgAdmin.natural_sort(d._label, _new._label);
                    if (res == 0)
                      return true;

                    if (res == -1) {
                      s = m + 1;
                      e--;
                    } else {
                      s++;
                      e = m - 1;
                    }
                  }
                  return linearSearch();
                };

              if (binarySearch()) {
                ctx.t.before(i, {
                  itemData: _new,
                  success: function() {
                    var new_item = $(arguments[1].items[0]);
                    ctx.t.openPath(new_item);
                    ctx.t.select(new_item);
                    if (
                      ctx.o && ctx.o.success && typeof(ctx.o.success) == 'function'
                    ) {
                      ctx.o.success.apply(ctx.t, [i, _old, _new]);
                    }
                  },
                  fail: function() {
                    console.warn('Failed to add before..', arguments);
                    if (
                      ctx.o && ctx.o.fail && typeof(ctx.o.fail) == 'function'
                    ) {
                      ctx.o.fail.apply(ctx.t, [i, _old, _new]);
                    }
                  },
                });
              } else {
                var _appendNode = function() {
                  ctx.t.append(ctx.i, {
                    itemData: _new,
                    success: function() {
                      var new_item = $(arguments[1].items[0]);
                      ctx.t.openPath(new_item);
                      ctx.t.select(new_item);
                      if (
                        ctx.o && ctx.o.success && typeof(ctx.o.success) == 'function'
                      ) {
                        ctx.o.success.apply(ctx.t, [ctx.i, _old, _new]);
                      }
                    },
                    fail: function() {
                      console.warn('Failed to append...', arguments);
                      if (
                        ctx.o && ctx.o.fail && typeof(ctx.o.fail) == 'function'
                      ) {
                        ctx.o.fail.apply(ctx.t, [ctx.i, _old, _new]);
                      }
                    },
                  });
                };

                // If the current node's inode is false
                if (ctx.i && !ctx.t.isInode(ctx.i)) {
                  ctx.t.setInode(ctx.i, {success: _appendNode});
                } else {
                  // Handle case for node without parent i.e. server-group
                  // or if parent node's inode is true.
                  _appendNode();
                }

              }
            }.bind(ctx);

          // Parent node do not have any children, let me unload it.
          if (!first && ctx.t.wasLoad(ctx.i)) {
            ctx.t.unload(ctx.i, {
              success: function() {
                findChildNode(
                  selectNode,
                  function() {
                    var o = this && this.o;
                    if (
                      o && o.fail && typeof(o.fail) == 'function'
                    ) {
                      o.fail.apply(this.t, [this.i, _old, _new]);
                    }
                  }.bind(this)
                );
              }.bind(this),
              fail: function() {
                var o = this && this.o;
                if (
                  o && o.fail && typeof(o.fail) == 'function'
                ) {
                  o.fail.apply(this.t, [this.i, _old, _new]);
                }
              }.bind(this),
            });
            return;
          }

          // We can find the collection node using _findTreeChildNode
          // indirectly.
          findChildNode(selectNode, addNode);
        }.bind(ctx);

      if (!ctx.t.wasInit() || !_new || !_old) {
        return;
      }
      ctx.pathOfTreeItems.push(_old);
      _new._label = _new.label;
      _new.label = _.escape(_new.label);

      // We need to check if this is collection node and have
      // children count, if yes then add count with label too
      if(ctx.b.Nodes[_new._type].is_collection) {
        if ('collection_count' in _old && _old['collection_count'] > 0) {
          _new.label = _.escape(_new._label) +
            ' <span>(' + _old['collection_count'] + ')</span>';
        }
      }

      // If server icon/background changes then also we need to re-create it
      if(_old._type == 'server' && _new._type == 'server' &&
        ( _old._pid != _new._pid ||
          _old._label != _new._label ||
            _old.icon != _new.icon )
      ) {
        ctx.op = 'RECREATE';
        traversePath();
      } else if (_old._pid != _new._pid || _old._label != _new._label) {
        ctx.op = 'RECREATE';
        traversePath();
      } else {
        ctx.op = 'UPDATE';
        traversePath();
      }
    },

    onRefreshTreeNode: function(_i, _opts) {
      var d = _i && this.tree.itemData(_i),
        n = d && d._type && this.Nodes[d._type],
        ctx = {
          b: this, // Browser
          d: d, // current parent
          i: _i, // current item
          p: null, // path of the old object
          pathOfTreeItems: [], // path items
          t: this.tree, // Tree Api
          o: _opts,
        },
        isOpen,
        idx = -1;

      if (!n) {
        _i = null;
        ctx.i = null;
        ctx.d = null;
      } else {
        isOpen = (this.tree.isInode(_i) && this.tree.isOpen(_i));
      }

      ctx.branch = ctx.t.serialize(
        _i, {}, function(i, el, d) {
          idx++;
          if (!idx || (d.inode && d.open)) {
            return {
              _id: d._id, _type: d._type, branch: d.branch, open: d.open,
            };
          }
        });

      if (!n) {
        ctx.t.destroy({
          success: function() {
            initializeBrowserTree(ctx.b);
            ctx.t = ctx.b.tree;
            ctx.i = null;
            ctx.b._refreshNode(ctx, ctx.branch);
          },
          error: function() {
            var fail = (_opts.o && _opts.o.fail) || _opts.fail;

            if (typeof(fail) == 'function') {
              fail();
            }
          },
        });
        return;
      }
      var fetchNodeInfo = function(_i, _d, _n) {
        var info = _n.getTreeNodeHierarchy(_i),
          url = _n.generate_url(_i, 'nodes', _d, true);

        $.ajax({
          url: url,
          type: 'GET',
          cache: false,
          dataType: 'json',
        })
        .done(function(res) {
          // Node information can come as result/data
          var data = res.result || res.data;

          data._label = data.label;
          data.label = _.escape(data.label);
          var d = ctx.t.itemData(ctx.i);
          _.extend(d, data);
          ctx.t.setLabel(ctx.i, {label: _d.label});
          ctx.t.addIcon(ctx.i, {icon: _d.icon});
          ctx.t.setId(ctx.i, {id: _d.id});
          ctx.t.setInode(ctx.i, {inode: data.inode});

          if (
            _n.can_expand && typeof(_n.can_expand) == 'function'
          ) {
            if (!_n.can_expand(d)) {
              ctx.t.unload(ctx.i);
              return;
            }
          }
          ctx.b._refreshNode(ctx, ctx.branch);
          var success = (ctx.o && ctx.o.success) || ctx.success;
          if (success && typeof(success) == 'function') {
            success();
          }
        })
        .fail(function(xhr, error, status) {
          if (
            !Alertify.pgHandleItemError(
              xhr, error, status, {item: _i, info: info}
            )
          ) {
            var contentType = xhr.getResponseHeader('Content-Type'),
              jsonResp = (
                contentType &&
                  contentType.indexOf('application/json') == 0 &&
                  JSON.parse(xhr.responseText)
              ) || {};

            if (xhr.status == 410 && jsonResp.success == 0) {
              var p = ctx.t.parent(ctx.i);

              ctx.t.remove(ctx.i, {
                success: function() {
                  if (p) {
                    // Try to refresh the parent on error
                    try {
                      pgBrowser.Events.trigger(
                        'pgadmin:browser:tree:refresh', p
                      );
                    } catch (e) { console.warn(e.stack || e); }
                  }
                },
              });
            }

            Alertify.pgNotifier(
              error, xhr, gettext('Error retrieving details for the node.'),
              function() { console.warn(arguments); }
            );
          }
        });
      }.bind(this);

      if (n && n.collection_node) {
        var p = ctx.i = this.tree.parent(_i),
          unloadNode = function() {
            this.tree.unload(_i, {
              success: function() {
                _i = p;
                d = ctx.d = ctx.t.itemData(ctx.i);
                n = ctx.b.Nodes[d._type];
                _i = p;
                fetchNodeInfo(_i, d, n);
              },
              fail: function() { console.warn(arguments); },
            });
          }.bind(this);
        if (!this.tree.isInode(_i)) {
          this.tree.setInode(_i, { success: unloadNode });
        } else {
          unloadNode();
        }
      } else if (isOpen) {
        this.tree.unload(_i, {
          success: fetchNodeInfo.bind(this, _i, d, n),
          fail: function() {
            console.warn(arguments);
          },
        });
      } else if (!this.tree.isInode(_i) && d.inode) {
        this.tree.setInode(_i, {
          success: fetchNodeInfo.bind(this, _i, d, n),
          fail: function() {
            console.warn(arguments);
          },
        });
      } else {
        fetchNodeInfo(_i, d, n);
      }
    },

    removeChildTreeNodesById: function(_parentNode, _collType, _childIds) {
      var tree = pgBrowser.tree;
      if(_parentNode && _collType) {
        var children = tree.children(_parentNode),
          idx = 0, size = children.length,
          childNode, childNodeData;

        _parentNode = null;

        for (; idx < size; idx++) {
          childNode = children.eq(idx);
          childNodeData = tree.itemData(childNode);

          if (childNodeData._type == _collType) {
            _parentNode = childNode;
            break;
          }
        }
      }

      if (_parentNode) {
        children = tree.children(_parentNode);
        idx = 0;
        size = children.length;

        for (; idx < size; idx++) {
          childNode = children.eq(idx);
          childNodeData = tree.itemData(childNode);

          if (_childIds.indexOf(childNodeData._id) != -1) {
            pgBrowser.removeTreeNode(childNode, false, _parentNode);
          }
        }
        return true;
      }
      return false;
    },

    removeTreeNode: function(_node, _selectNext, _parentNode) {
      var tree = pgBrowser.tree,
        nodeToSelect = null;

      if (!_node)
        return false;

      if (_selectNext) {
        nodeToSelect = tree.next(_node);
        if (!nodeToSelect || !nodeToSelect.length) {
          nodeToSelect = tree.prev(_node);

          if (!nodeToSelect || !nodeToSelect.length) {
            if (!_parentNode) {
              nodeToSelect = tree.parent(_node);
            } else {
              nodeToSelect = _parentNode;
            }
          }
        }
        if (nodeToSelect)
          tree.select(nodeToSelect);
      }
      tree.remove(_node);
      return true;
    },

    findSiblingTreeNode: function(_node, _id) {
      var tree = pgBrowser.tree,
        parentNode = tree.parent(_node),
        siblings = tree.children(parentNode),
        idx = 0, nodeData, node;

      for(; idx < siblings.length; idx++) {
        node = siblings.eq(idx);
        nodeData = tree.itemData(node);

        if (nodeData && nodeData._id == _id)
          return node;
      }
      return null;
    },

    findParentTreeNodeByType: function(_node, _parentType) {
      var tree = pgBrowser.tree,
        nodeData,
        node = _node;

      do {
        nodeData = tree.itemData(node);
        if (nodeData && nodeData._type == _parentType)
          return node;
        node = tree.hasParent(node) ? tree.parent(node) : null;
      } while (node);

      return null;
    },

    findChildCollectionTreeNode: function(_node, _collType) {
      var tree = pgBrowser.tree,
        nodeData, idx = 0,
        node = _node,
        children = _node && tree.children(_node);

      if (!children || !children.length)
        return null;

      for(; idx < children.length; idx++) {
        node = children.eq(idx);
        nodeData = tree.itemData(node);

        if (nodeData && nodeData._type == _collType)
          return node;
      }
      return null;
    },

    addChildTreeNodes: function(_treeHierarchy, _node, _type, _arrayIds, _callback) {
      var module = _type in pgBrowser.Nodes && pgBrowser.Nodes[_type],
        childTreeInfo = _arrayIds.length && _.extend(
          {}, _.mapObject(_treeHierarchy, function(_val) {
            _val.priority -= 1; return _val;
          })),
        arrayChildNodeData = [],
        fetchNodeInfo = function(_callback) {
          if (!_arrayIds.length) {
            if (_callback) {
              _callback();
            }
            return;
          }

          var childDummyInfo = {
              '_id': _arrayIds.pop(), '_type': _type, 'priority': 0,
            },
            childNodeUrl;

          childTreeInfo[_type] = childDummyInfo;
          childNodeUrl = module.generate_url(
            null, 'nodes', childDummyInfo, true, childTreeInfo
          );

          $.ajax({
            url: childNodeUrl,
            dataType: 'json',
          })
          .done(function(res) {
            if (res.success) {
              arrayChildNodeData.push(res.data);
            }
            fetchNodeInfo(_callback);
          })
          .fail(function(xhr, status, error) {
            Alertify.pgRespErrorNotify(xhr, error);
            fetchNodeInfo(_callback);
          });
        };


      if (!module) {
        console.warn(
          'Developer: Couldn\'t find the module for the given child: ',
          _.clone(arguments)
        );
        return;
      }

      if (pgBrowser.tree.wasLoad(_node) || pgBrowser.tree.isLeaf(_node)) {
        fetchNodeInfo(function() {
          _.each(arrayChildNodeData, function(_nodData) {
            pgBrowser.Events.trigger(
              'pgadmin:browser:tree:add', _nodData, _treeHierarchy
            );
          });

          if (_callback) {
            _callback();
          }
        });
      } else {
        if (_callback) {
          _callback();
        }
      }
    },

    _refreshNode: function(_ctx, _d) {
      var traverseNodes = function(_d) {
        var _ctx = this, idx = 0, ctx, d,
          size = (_d.branch && _d.branch.length) || 0,
          findNode = function(_i, __d, __ctx) {
            setTimeout(
              function() {
                __ctx.b._findTreeChildNode(_i, __d, __ctx);
              }, 0
            );
          };

        for (; idx < size; idx++) {
          d = _d.branch[idx];
          var n = _ctx.b.Nodes[d._type];
          ctx = {
            b: _ctx.b,
            t: _ctx.t,
            pathOfTreeItems: [],
            i: _ctx.i,
            d: d,
            select: _ctx.select,
            hasId: n && !n.collection_node,
            o: _ctx.o,
            load: true,
          };
          ctx.success = function() {
            this.b._refreshNode.call(this.b, this, this.d);
          }.bind(ctx);
          findNode(_ctx.i, d, ctx);
        }
      }.bind(_ctx, _d);

      if (!_d || !_d.open)
        return;

      if (!_ctx.t.isOpen(_ctx.i)) {
        _ctx.t.open(_ctx.i, {
          unanimated: true,
          success: traverseNodes,
          fail: function() { /* Do nothing */ },
        });
      } else {
        traverseNodes();
      }

    },

    editor_shortcut_keys: {
      // Autocomplete sql command
      'Ctrl-Space': 'autocomplete',
      'Cmd-Space': 'autocomplete',

        // Select All text
      'Ctrl-A': 'selectAll',
      'Cmd-A': 'selectAll',

        // Redo text
      'Ctrl-Y': 'redo',
      'Cmd-Y': 'redo',

        // Undo text
      'Ctrl-Z': 'undo',
      'Cmd-Z': 'undo',

        // Delete Line
      'Ctrl-D': 'deleteLine',
      'Cmd-D': 'deleteLine',

        // Go to start/end of Line
      'Alt-Left': 'goLineStart',
      'Alt-Right': 'goLineEnd',

        // Move word by word left/right
      'Ctrl-Alt-Left': 'goGroupLeft',
      'Cmd-Alt-Left': 'goGroupLeft',
      'Ctrl-Alt-Right': 'goGroupRight',
      'Cmd-Alt-Right': 'goGroupRight',

        // Allow user to delete Tab(s)
      'Shift-Tab': 'indentLess',
    },
    editor_options: {
      tabSize: parseInt(pgBrowser.utils.tabSize),
      wrapCode: pgBrowser.utils.wrapCode,
      insert_pair_brackets: pgBrowser.utils.insertPairBrackets,
      brace_matching: pgBrowser.utils.braceMatching,
      indent_with_tabs: pgBrowser.utils.is_indent_with_tabs,
    },
  });

    /* Remove paste event mapping from CodeMirror's emacsy KeyMap binding
     * specific to Mac LineNumber:5797 - lib/Codemirror.js
     * It is preventing default paste event(Cmd-V) from triggering
     * in runtime.
     */
  delete CodeMirror.keyMap.emacsy['Ctrl-V'];

  // Use spaces instead of tab
  if (pgBrowser.utils.useSpaces == 'True') {
    pgAdmin.Browser.editor_shortcut_keys.Tab = 'insertSoftTab';
  }

  window.onbeforeunload = function() {
    var e = window.event,
      msg = S(gettext('Are you sure you wish to close the %s browser?')).sprintf(pgBrowser.utils.app_name).value();

    // For IE and Firefox prior to version 4
    if (e) {
      e.returnValue = msg;
    }

    // For Safari
    return msg;
  };


  return pgAdmin.Browser;
});
