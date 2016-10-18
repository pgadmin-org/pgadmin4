define('pgadmin.browser',
        ['require', 'jquery', 'underscore', 'underscore.string', 'bootstrap',
        'pgadmin', 'alertify', 'codemirror', 'codemirror/mode/sql/sql', 'wcdocker',
        'jquery.contextmenu', 'jquery.aciplugin', 'jquery.acitree',
        'pgadmin.alertifyjs', 'pgadmin.browser.messages',
        'pgadmin.browser.menu', 'pgadmin.browser.panel',
        'pgadmin.browser.error', 'pgadmin.browser.frame',
        'pgadmin.browser.node', 'pgadmin.browser.collection'

       ],
function(require, $, _, S, Bootstrap, pgAdmin, Alertify, CodeMirror) {

  // Some scripts do export their object in the window only.
  // Generally the one, which do no have AMD support.
  var wcDocker = window.wcDocker;
  $ = $ || window.jQuery || window.$;
  Bootstrap = Bootstrap || window.Bootstrap;

  pgAdmin.Browser = pgAdmin.Browser || {};

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
    var data = JSON.parse(payload).data.sort(function(a, b) {
        return pgAdmin.natural_sort(a.label, b.label, {'_type': a._type});
    });
    _.each(data, function(d){
      d._label = d.label;
      d.label = _.escape(d.label);
    })
    return data;
  };

  var initializeBrowserTree = pgAdmin.Browser.initializeBrowserTree =
    function(b) {
      $('#tree').aciTree({
        ajax: {
          url: '{{ url_for('browser.get_nodes') }}',
          converters: {
            'text json': processTreeData,
          }
        },
        ajaxHook: function(item, settings) {
          if (item != null) {
            var d = this.itemData(item);
            n = b.Nodes[d._type];
            if (n)
              settings.url = n.generate_url(item, 'children', d, true);
          }
        },
        loaderDelay: 100,
        show: {
          duration: 75
        },
        hide: {
          duration: 75
        },
        view: {
          duration: 75
        }
      });

      b.tree = $('#tree').aciTree('api');
    };

  // Extend the browser class attributes
  _.extend(pgAdmin.Browser, {
    // The base url for browser
    URL: '{{ url_for('browser.index') }}',
    // We do have docker of type wcDocker to take care of different
    // containers. (i.e. panels, tabs, frames, etc.)
    docker:null,
    // Reversed Engineer query for the selected database node object goes
    // here
    editor:null,
    // Left hand browser tree
    tree:null,
    // list of script to be loaded, when a certain type of node is loaded
    // It will be used to register extensions, tools, child node scripts,
    // etc.
    scripts: {},
    // Default panels
    panels: {
      // Panel to keep the left hand browser tree
      'browser': new pgAdmin.Browser.Panel({
        name: 'browser',
        title: '{{ _('Browser') }}',
        showTitle: true,
        isCloseable: false,
        isPrivate: true,
        icon: 'fa fa-binoculars',
        content: '<div id="tree" class="aciTree"></div>'
      }),
      // Properties of the object node
      'properties': new pgAdmin.Browser.Panel({
        name: 'properties',
        title: '{{ _('Properties') }}',
        icon: 'fa fa-cogs',
        width: 500,
        isCloseable: false,
        isPrivate: true,
        elContainer: true,
        content: '<div class="obj_properties"><div class="alert alert-info pg-panel-message">{{ _('Please select an object in the tree view.') }}</div></div>',
        events: panelEvents,
        onCreate: function(myPanel, $container) {
          $container.addClass('pg-no-overflow');
        }
      }),
      // Statistics of the object
      'statistics': new pgAdmin.Browser.Panel({
        name: 'statistics',
        title: '{{ _('Statistics') }}',
        icon: 'fa fa-line-chart',
        width: 500,
        isCloseable: false,
        isPrivate: true,
        content: '<div><div class="alert alert-info pg-panel-message pg-panel-statistics-message">{{ _('Please select an object in the tree view.') }}</div><div class="pg-panel-statistics-container hidden"></div></div>',
        events: panelEvents
      }),
      // Reversed engineered SQL for the object
      'sql': new pgAdmin.Browser.Panel({
        name: 'sql',
        title: '{{ _('SQL') }}',
        icon: 'fa fa-file-text-o',
        width: 500,
        isCloseable: false,
        isPrivate: true,
        content: '<textarea id="sql-textarea" name="sql-textarea"></textarea>'
      }),
      // Dependencies of the object
      'dependencies': new pgAdmin.Browser.Panel({
        name: 'dependencies',
        title: '{{ _('Dependencies') }}',
        icon: 'fa fa-hand-o-up',
        width: 500,
        isCloseable: false,
        isPrivate: true,
        content: '<div><div class="alert alert-info pg-panel-message pg-panel-depends-message">{{ _('Please select an object in the tree view.') }}</div><div class="pg-panel-depends-container hidden"></div></div>',
        events: panelEvents
      }),
      // Dependents of the object
      'dependents': new pgAdmin.Browser.Panel({
        name: 'dependents',
        title: '{{ _('Dependents') }}',
        icon: 'fa fa-hand-o-down',
        width: 500,
        isCloseable: false,
        isPrivate: true,
        content: '<div><div class="alert alert-info pg-panel-message pg-panel-depends-message">{{ _('Please select an object in the tree view.') }}</div><div class="pg-panel-depends-container hidden"></div></div>',
        events: panelEvents
      })/* Add hooked-in panels by extensions */{% for panel_item in current_app.panels %}{% if not panel_item.isIframe %},'{{ panel_item.name }}' : new pgAdmin.Browser.Panel({
        name: '{{ panel_item.name }}',
        title: '{{ panel_item.title }}',
        icon: '{{ panel_item.icon }}',
        width: {{ panel_item.width }},
        height: {{ panel_item.height }},
        showTitle: {% if panel_item.showTitle %}true{% else %}false{% endif %},
        isCloseable: {% if panel_item.isCloseable %}true{% else %}false{% endif %},
        isPrivate: {% if panel_item.isPrivate %}true{% else %}false{% endif %},
        content: '{{ panel_item.content }}'{% if panel_item.events is not none %},
        events: {{ panel_item.events }} {% endif %}
      }){% endif %}{% endfor %}
    },
    // We also support showing dashboards, HTML file, external URL
    frames: {
      /* Add hooked-in frames by extensions */{% for panel_item in current_app.panels %}{% if panel_item.isIframe %}
      '{{ panel_item.name }}' : new pgAdmin.Browser.Frame({
        name: '{{ panel_item.name }}',
        title: '{{ panel_item.title }}',
        icon: '{{ panel_item.icon }}',
        width: {{ panel_item.width }},
        height: {{ panel_item.height }},
        showTitle: {% if panel_item.showTitle %}true{% else %}false{% endif %},
        isCloseable: {% if panel_item.isCloseable %}true{% else %}false{% endif %},
        isPrivate: {% if panel_item.isPrivate %}true{% else %}false{% endif %},
        url: '{{ panel_item.content }}'
     }),{% endif %}{% endfor %}
    },
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
      help: {}
    },
    menu_categories: {
      /* name, label (pair) */
      'create': {
        label: '{{ _('Create')|safe }}',
        priority: 1,
        /* separator above this menu */
        above: false,
        below: true,
        icon: 'fa fa-magic',
        single: true
      }
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
          tabOrientation: wcDocker.TAB.TOP
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
      var obj = this, j, e,
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
          _.each(
            obj.menus[o.m],
            function(m, k) {
              update_menuitem(m);
            });
        });

      // Create the object menu dynamically
      if (item && obj.menus['object'] && obj.menus['object'][d._type]) {
        pgAdmin.Browser.MenuCreator(
          $obj_mnu, obj.menus['object'][d._type], obj.menu_categories, d, item
        )
      } else {
        // Create a dummy 'no object seleted' menu
        create_submenu = pgAdmin.Browser.MenuGroup(
          obj.menu_categories['create'], [{
            $el: $('<li class="menu-item disabled"><a href="#">{{ _("No object selected") }}</a></li>'),
            priority: 1,
            category: 'create',
            update: function() {}
          }], false);
        $obj_mnu.append(create_submenu.$el);
      }
    },
    init: function() {
      var obj=this;
      if (obj.initialized) {
        return;
      }
      obj.initialized = true;

      // Store the main browser layout
      $(window).bind('unload', function() {
          if(obj.docker) {
            state = obj.docker.save();
            settings = { setting: "Browser/Layout", value: state };
            $.ajax({
              type: 'POST',
              url: "{{ url_for('settings.store') }}",
              data: settings,
              async:false
            });
          }
        return true;
      });

      // Initialize the Docker
      obj.docker = new wcDocker(
        '#dockerContainer', {
        allowContextMenu: true,
        allowCollapse: false,
        themePath: '../static/css/wcDocker/Themes',
        theme: 'pgadmin'
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
        var layout = '{{ layout }}';

        // Try to restore the layout if there is one
        if (layout != '') {
          try {
            obj.docker.restore(layout)
          }
          catch(err) {
            obj.docker.clear();
            obj.buildDefaultLayout()
          }
        } else {
          obj.buildDefaultLayout()
        }
      }

      // Syntax highlight the SQL Pane
      obj.editor = CodeMirror.fromTextArea(
          document.getElementById("sql-textarea"), {
            lineNumbers: true,
            lineWrapping: true,
            mode: "text/x-pgsql",
            readOnly: true,
            extraKeys: pgAdmin.Browser.editor_shortcut_keys,
            tabSize: pgAdmin.Browser.editor_options.tabSize
          });

      setTimeout(function() {
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
            items: context_menu
          };
        }
      });

      // Treeview event handler
      $('#tree').on('acitree', function(event, api, item, eventName, options) {
        var d = item ? obj.tree.itemData(item) : null;

        switch (eventName) {
          // When a node is added in the browser tree, we need to
          // load the registered scripts
          case "added":
            if (d) {
              /* Loading all the scripts registered to be loaded on this node */
              if (obj.scripts && obj.scripts[d._type]) {
                var scripts = _.extend({}, obj.scripts[d._type]);

                /*
                 * We can remove it from the Browser.scripts object as
                 * these're about to be loaded.
                 *
                 * This will make sure that we check for the script to be
                 * loaded only once.
                 *
                 */
                delete obj.scripts[d._type];

                setTimeout(function() {
                  _.each(scripts, function(s) {
                    if (!s.loaded) {
                      require([s.name], function(m) {
                        s.loaded = true;
                        // Call the initializer (if present)
                        if (m && m.init && typeof m.init == 'function') {
                          try {
                            m.init();
                            obj.Events.trigger(
                              'pgadmin:module:' + s.name + ':initialized', m, obj
                            );
                          } catch (err) {
                            console.log("Error running module init script for '" + s.path + "'");
                            console.log(err);

                            obj.report_error(
                              '{{ _('Error Initializing script - ') }}' + s.path, err);
                          }
                        }
                      }, function() {
                        console.log("Error loading script - " + s.path);
                        console.log(arguments);
                        obj.report_error(
                          '{{ _('Error loading script - ') }}' + s.path);
                      }).bind(s);
                    }
                  });
                }, 1);
              }
            }
            break;
        }

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
            console.log(e);
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
          console.log(e);
        }
        return true;
      });

      // There are some scripts which needed to be loaded immediately,
      // but - not all. We will will need to generate all the menus only
      // after they all were loaded completely.
      var counter = {total: 0, loaded: 0};
      {% for script in current_app.javascripts %}{% if 'when' in script %}
      {% if script.when %}/* Registering '{{ script.path }}.js' to be loaded when a node '{{ script.when }}' is loaded */
      this.register_script('{{ script.when }}', '{{ script.name }}', '{{ script.path }}.js');{% else %}/* Loading '{{ script.path }}' */
      counter.total += 1;
      this.load_module('{{ script.name }}', '{{ script.path }}', counter);{% endif %}{% endif %}{% endfor %}

      var geneate_menus = function() {
        // Generate the menu items only when all the initial scripts
        // were loaded completely.
        //
        // First - register the menus from the other
        // modules/extensions.
        if (counter.total == counter.loaded) {
{% for key in ('File', 'Edit', 'Object' 'Tools', 'Management', 'Help') %}{% set menu_items = current_app.menu_items['%s_items' % key.lower()] %}{% if menu_items|length > 0 %}{% set hasMenus = False %}
          obj.add_menus([{% for item in menu_items %}{% if hasMenus %},{% endif %}{
            name: "{{ item.name }}",
            {% if item.module %}module: {{ item.module }},
            {% endif %}{% if item.url %}url: "{{ item.url }}",
            {% endif %}{% if item.target %}target: "{{ item.target }}",
            {% endif %}{% if item.callback %}callback: "{{ item.callback }}",
            {% endif %}{% if item.category %}category: "{{ item.category }}",
            {% endif %}{% if item.icon %}icon: '{{ item.icon }}',
            {% endif %}{% if item.data %}data: {{ item.data }},
            {% endif %}label: '{{ item.label }}', applies: ['{{ key.lower() }}'],
            priority: {{ item.priority }},
            enable: '{{ item.enable }}'
          }{% set hasMenus = True %}{% endfor %}]);
{% endif %}{% endfor %}
          obj.create_menus();
        } else {
          // recall after some time
          setTimeout(function() { geneate_menus(); }, 300);
        }
      };
      geneate_menus();

      // Ping the server every 5 minutes
      setInterval(function() {
        $.ajax({
          url: '{{ url_for('misc.ping') }}',
          type:'POST',
          success: function() {},
          error: function() {}
          });
        }, 300000);
      obj.Events.on('pgadmin:browser:tree:add', obj.onAddTreeNode, obj);
      obj.Events.on('pgadmin:browser:tree:update', obj.onUpdateTreeNode, obj);
      obj.Events.on('pgadmin:browser:tree:refresh', obj.onRefreshTreeNode, obj);
    },
    // load the module right now
    load_module: function(name, path, c) {
      var obj = this;
      require([name],function(m) {
        try {
          // initialze the module (if 'init' function present).
          if (m.init && typeof(m.init) == 'function')
            m.init();
        } catch (e) {
          // Log this exception on console to understand the issue properly.
          console.log(e);
          obj.report_error(
            '{{ _('Error loading script - ') }}' + path);
        }
        if (c)
        c.loaded += 1;
      }, function() {
        // Log the arguments on console to understand the issue properly.
        console.log(arguments);
        obj.report_error(
          '{{ _('Error loading script - ') }}' + path);
      });
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
        single: single
      }
    },
    // Add menus of module/extension at appropriate menu
    add_menus: function(menus) {
      var pgMenu = this.menus;
      var MenuItem = pgAdmin.Browser.MenuItem;
      _.each(menus, function(m) {
        _.each(m.applies, function(a) {
          /* We do support menu type only from this list */
          if ($.inArray(a, [
              'context', 'file', 'edit', 'object',
              'management', 'tools', 'help']) >= 0) {
            var menus;
            pgMenu[a] = pgMenu[a] || {};
            if (_.isString(m.node)) {
              menus = pgMenu[a][m.node] = pgMenu[a][m.node] || {};
            } else if (_.isString(m.category)) {
              menus = pgMenu[a][m.category] = pgMenu[a][m.category] || {};
            }
            else {
              menus = pgMenu[a];
            }

            if (_.has(menus, m.name)) {
              console && console.log && console.log(m.name +
                ' has been ignored!\nIt already exists in the ' +
                a +
                ' list of menus!');
            } else {
              menus[m.name] = new MenuItem({
                name: m.name, label: m.label, module: m.module,
                category: m.category, callback: m.callback,
                priority: m.priority, data: m.data, url: m.url,
                target: m.target, icon: m.icon,
                enable: (m.enable == '' ? true : (_.isString(m.enable) &&
                   m.enable.toLowerCase() == 'false') ?
                  false : m.enable),
                node: m.node
              });
            }
          } else  {
            console && console.log &&
              console.log(
                  "Developer warning: Category '" +
                  a +
                  "' is not supported!\nSupported categories are: context, file, edit, object, tools, management, help");
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
          var menus = {};

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
      if (type == "object_help") {
        // See if we can find an existing panel, if not, create one
        pnlSqlHelp = this.docker.findPanels('pnl_sql_help')[0];

        if (pnlSqlHelp == null) {
          pnlProperties = this.docker.findPanels('properties')[0];
          this.docker.addPanel('pnl_sql_help', wcDocker.DOCK.STACKED, pnlProperties);
          pnlSqlHelp = this.docker.findPanels('pnl_sql_help')[0];
        }

        // Construct the URL
        server = node.getTreeNodeHierarchy(item).server;

        baseUrl = '{{ pg_help_path }}'
        if (server.server_type == 'ppas') {
          baseUrl = '{{ edbas_help_path }}'
        }

        major = Math.floor(server.version / 10000)
        minor = Math.floor(server.version / 100) - (major * 100)

        baseUrl = baseUrl.replace('$VERSION$', major + '.' + minor)
        if (!S(baseUrl).endsWith('/')) {
          baseUrl = baseUrl + '/'
        }
        fullUrl = baseUrl+ url;
        // Update the panel
        iframe = $(pnlSqlHelp).data('embeddedFrame');
        pnlSqlHelp.title('Help: '+ label);

        pnlSqlHelp.focus();
        iframe.openURL(fullUrl);
      } else if(type == "dialog_help") {
        // See if we can find an existing panel, if not, create one
        pnlDialogHelp = this.docker.findPanels('pnl_online_help')[0];

        if (pnlDialogHelp == null) {
          pnlProperties = this.docker.findPanels('properties')[0];
          this.docker.addPanel('pnl_online_help', wcDocker.DOCK.STACKED, pnlProperties);
          pnlDialogHelp = this.docker.findPanels('pnl_online_help')[0];
        }

        // Update the panel
        iframe = $(pnlDialogHelp).data('embeddedFrame');

        pnlDialogHelp.focus();
        iframe.openURL(url);
      }
    },

    get_preference: function (module, preference_name) {
      var preference = null;
      $.ajax({
        async: false,
        url: "{{ url_for('preferences.preferences') }}" +"/"+ module +"/"+ preference_name,
        success: function(res) {
          preference = res;
        },
        error: function(xhr, status, error) {

        }
      });

      return preference;
    },

    _findTreeChildNode: function(_i, _d, _o) {
      var loaded = _o.t.wasLoad(_i),
          done = true,
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
                  _o.pI.push({coll: false, item: i, d: _d});

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
                  _o.pI.push({coll: true, item: i, d: d});

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
          }
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
            pI: [], // path Item
            t: this.tree, // Tree Api
            o: _opts
          },
          traversePath = function() {
            var ctx = this, i, d;

            ctx.success = traversePath;
            if (ctx.p.length) {
              d = ctx.p.shift();
              // This is the parent node.
              // Replace the parent-id of the data, which could be different
              // from the given hierarchy.
              if (!ctx.p.length) {
                d._id = _data._pid;
                ctx.success = addItemNode;
              }
              ctx.b._findTreeChildNode(
                ctx.i, d, ctx
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
                          d = ctx.t.itemData(i);
                          if (
                            pgAdmin.natural_sort(
                              d._label, _data._label, {'_type': d._type}
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
                        var d, m;
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
                              d._label, _data._label, {'_type': d._type}
                            ) != -1
                          )
                            return true;
                          i = items.eq(e);
                          d = ctx.t.itemData(i);
                          if (
                            pgAdmin.natural_sort(
                              d._label, _data._label, {'_type': d._type}
                            ) != 1
                          )
                            return true;
                          m = Math.round((e - s) / 2);
                          i = items.eq(e);
                          d = ctx.t.itemData(i);
                          if (
                            pgAdmin.natural_sort(
                              d._label, _data._label, {'_type': d._type}
                            ) == 1
                          ) {
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
                        console.log('Add before..');
                        if (
                          ctx.o && ctx.o.success && typeof(ctx.o.success) == 'function'
                        ) {
                          ctx.o.success.apply(ctx.t, [i, _data]);
                        }
                      },
                      fail: function() {
                        console.log('Failed to add before..');
                        if (
                          ctx.o && ctx.o.fail && typeof(ctx.o.fail) == 'function'
                        ) {
                          ctx.o.fail.apply(ctx.t, [i, _data]);
                        }
                      }
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
                              if(_parent_data._type.search(_data._type) > -1 ||
                                is_parent_loaded_before) {
                                ctx.t.openPath(i);
                                ctx.t.select(i);
                              } else {
                                // Unload the parent node so that we'll get
                                // latest data when we try to expand it
                                ctx.t.unload(ctx.i);
                              }
                              if (
                                ctx.o && ctx.o.success &&
                                typeof(ctx.o.success) == 'function'
                              ) {
                                ctx.o.success.apply(ctx.t, [i, _data]);
                              }
                            },
                            fail: function() {
                              console.log('Failed to append');
                              if (
                                ctx.o && ctx.o.fail &&
                                typeof(ctx.o.fail) == 'function'
                              ) {
                                ctx.o.fail.apply(ctx.t, [ctx.i, _data]);
                              }
                            }
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
                }.bind(this)
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
            pI: [], // path items
            t: this.tree, // Tree Api
            o: _opts,
            load: true,
            old: _old,
            new: _new,
            op: null
          },
          errorOut = function() {
            var fail = this.o && this.o.fail;
            if (fail && typeof(fail) == 'function') {
              fail.apply(this.t, [this.i, _new, _old]);
            }
          }.bind(ctx),
          deleteNode = function() {
            var pI = this.pI,
                findParent = function() {
                  if (pI.length) {
                    pI.pop();
                    var length = pI.length;
                    this.i = (length && pI[length - 1].item) || null;
                    this.d = (length && pI[length - 1].d) || null;

                    // It is a collection item, let's find the node item
                    if (length && pI[length - 1].coll) {
                      pI.pop();
                      length = pI.length;
                      this.i = (length && pI[length - 1].item) || null;
                      this.d = (length && pI[length - 1].d) || null;
                    }
                  } else {
                    this.i = null;
                    this.d = null;
                  }
                }.bind(this);

            // Remove the current node first.
            if (
              this.i && this.d && this.old._id == this.d._id &&
              this.old._type == this.d._type
            ) {
              this.t.remove(this.i);

              // Find the parent
              findParent();
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
              }
              return;
            }
            errorOut();

          }.bind(ctx),
          findNewParent = function(_d) {
            var findParent = function() {
              if (pI.length) {
                pI.pop();
                var length = pI.length;
                this.i = (length && pI[length - 1].item) || null;
                this.d = (length && pI[length - 1].d) || null;

                // It is a collection item, let's find the node item
                if (length && pI[length - 1].coll) {
                  pI.pop();
                  length = pI.length;
                  this.i = (length && pI[length - 1].item) || null;
                  this.d = (length && pI[length - 1].d) || null;
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

              if (_d._type == old._type) {
                // We were already searching the old object under the parent.
                findParent();
                _d = this.d;
                // Find the grand parent
                findParent();
              }
              console.log(_d);
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
                // Found the currect
                _.extend(this.d, this.new._id);
                this.t.setLabel(ctx.i, {label: this.new.label});
                this.t.addIcon(ctx.i, {icon: this.new.icon});
                this.t.setId(ctx.id, {id: this.new.id});
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
            var ctx = this, i, d;

            ctx.success = traversePath;
            if (ctx.p.length) {
              d = ctx.p.shift();
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
                ctx.i, d, ctx
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
                          d = ctx.t.itemData(i);
                          if (d.label > _new.label)
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
                        var d, m;
                        // Binary search only outperforms Linear search for n > 44.
                        // Reference:
                        // https://en.wikipedia.org/wiki/Binary_search_algorithm#cite_note-30
                        //
                        // We will try until it's half.
                        while (e - s > 22) {
                          i = items.eq(s);
                          d = ctx.t.itemData(i);
                          if (d.label > _new.label)
                            return true;
                          i = items.eq(e);
                          d = ctx.t.itemData(i);
                          if (d.label < _new.label)
                            return true;
                          m = Math.round((e - s) / 2);
                          i = items.eq(e);
                          d = ctx.t.itemData(i);
                          if (d.label < _new.label) {
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
                        console.log('Add before..');
                        if (
                          ctx.o && ctx.o.success && typeof(ctx.o.success) == 'function'
                        ) {
                          ctx.o.success.apply(ctx.t, [i, _old, _new]);
                        }
                      },
                      fail: function() {
                        console.log('Failed to add before..');
                        if (
                          ctx.o && ctx.o.fail && typeof(ctx.o.fail) == 'function'
                        ) {
                          ctx.o.fail.apply(ctx.t, [i, _old, _new]);
                        }
                      }
                    });
                  } else {
                    ctx.t.append(ctx.i, {
                      itemData: _new,
                      success: function() {
                        console.log('Appended');
                        if (
                          ctx.o && ctx.o.success && typeof(ctx.o.success) == 'function'
                        ) {
                          ctx.o.success.apply(ctx.t, [ctx.i, _old, _new]);
                        }
                      },
                      fail: function() {
                        console.log('Failed to append');
                        if (
                          ctx.o && ctx.o.fail && typeof(ctx.o.fail) == 'function'
                        ) {
                          ctx.o.fail.apply(ctx.t, [ctx.i, _old, _new]);
                        }
                      }
                    });
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
                }.bind(this)
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
      ctx.pI.push(_old);
      _new._label = _new.label;
      _new.label = _.escape(_new.label);

      if (_old._pid != _new._pid) {
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
            pI: [], // path items
            t: this.tree, // Tree Api
            o: _opts
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
              _id: d._id, _type: d._type, branch: d.branch, open: d.open
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
          }
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
              success: function(res) {
                // Node information can come as result/data
                var data = res.result || res.data;

                data._label = data.label;
                data.label = _.escape(data.label);
                var d = ctx.t.itemData(ctx.i);
                _.extend(d, data);
                ctx.t.setLabel(ctx.i, {label: _d.label});
                ctx.t.addIcon(ctx.i, {icon: _d.icon});
                ctx.t.setId(ctx.i, {id: _d.id});

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
              },
              error: function(xhr, error, status) {
                if (
                  !Alertify.pgHandleItemError(
                    xhr, error, status, {item: _i, info: info}
                  )
                ) {
                  var msg = xhr.responseText,
                      contentType = xhr.getResponseHeader('Content-Type'),
                      msg = xhr.responseText,
                      jsonResp = (
                        contentType &&
                        contentType.indexOf('application/json') == 0 &&
                        $.parseJSON(xhr.responseText)
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
                          } catch(e) {}
                        }
                      }
                    });
                  }

                  Alertify.pgNotifier(
                    error, xhr, "{{ _("Error retrieving details for the node.") }}",
                    function() {
                       console.log(arguments);
                    }
                  );
                }
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
                fail: function() {
                  console.log(arguments);
                }
              });
            }.bind(this);
        if (!this.tree.isInode(_i)) {
          this.tree.setInode(_i, {
            success: unloadNode
          });
        } else {
          unloadNode();
        }
      } else if (isOpen) {
        this.tree.unload(_i, {
          success: fetchNodeInfo.bind(this, _i, d, n),
          fail: function() {
            console.log(arguments);
          }
        });
      } else if (!this.tree.isInode(_i) && d.inode) {
        this.tree.setInode(_i, {
          success: fetchNodeInfo.bind(this, _i, d, n),
          fail: function() {
            console.log(arguments);
          }
        });
      } else {
        fetchNodeInfo(_i, d, n);
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
              n = _ctx.b.Nodes[d._type];
              ctx = {
                b: _ctx.b,
                t: _ctx.t,
                pI: [],
                i: _ctx.i,
                d: d,
                select: _ctx.select,
                hasId: !n.collection_node,
                o: _ctx.o,
                load: true
              };
              ctx.success = function() {
                this.b._refreshNode.call(this.b, this, this.d);
              }.bind(ctx)
              findNode(_ctx.i, d, ctx);
            }
          }.bind(_ctx, _d);

       if (!_d || !_d.open)
         return;

       if (!_ctx.t.isOpen(_ctx.i)) {
         _ctx.t.open(_ctx.i, {
           unanimated: true,
           success: traverseNodes,
           fail: function() { /* Do nothing */ }
         });
       } else {
         traverseNodes();
       }

    },

    editor_shortcut_keys: {
      // Autocomplete sql command
      "Ctrl-Space": "autocomplete",
      "Cmd-Space": "autocomplete",

      // Select All text
      "Ctrl-A": "selectAll",
      "Cmd-A": "selectAll",

      // Redo text
      "Ctrl-Y": "redo",
      "Cmd-Y": "redo",

      // Undo text
      "Ctrl-Z": "undo",
      "Cmd-Z": "undo",

      // Delete Line
      "Ctrl-D": "deleteLine",
      "Cmd-D": "deleteLine",

      // Go to start/end of Line
      "Alt-Left": "goLineStart",
      "Alt-Right": "goLineEnd",

      // Move word by word left/right
      "Ctrl-Alt-Left": "goGroupLeft",
      "Cmd-Alt-Left": "goGroupLeft",
      "Ctrl-Alt-Right": "goGroupRight",
      "Cmd-Alt-Right": "goGroupRight"
    },
    editor_options: {
      tabSize: '{{ editor_tab_size }}'
    }

  });

  /* Remove paste event mapping from CodeMirror's emacsy KeyMap binding
   * specific to Mac LineNumber:5797 - lib/Codemirror.js
   * It is preventing default paste event(Cmd-V) from triggering
   * in runtime.
   */
  delete CodeMirror.keyMap.emacsy["Ctrl-V"];

  // Use spaces instead of tab
  if ('{{ editor_use_spaces }}' == 'True') {
    pgAdmin.Browser.editor_shortcut_keys.Tab = "insertSoftTab";
  }

  window.onbeforeunload = function(ev) {
    var e = ev || window.event,
        msg = '{{ _('Do you really want to leave the page?') }}';

    // For IE and Firefox prior to version 4
    if (e) {
      e.returnValue = msg;
    }

    // For Safari
    return msg;
  };

  return pgAdmin.Browser;
});
