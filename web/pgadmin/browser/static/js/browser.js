/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define('pgadmin.browser', [
  'sources/tree/tree',
  'sources/gettext', 'sources/url_for', 'require', 'jquery', 'underscore',
  'bootstrap', 'sources/pgadmin', 'pgadmin.alertifyjs', 'bundled_codemirror',
  'sources/check_node_visibility', './toolbar', 'pgadmin.help',
  'sources/csrf', 'sources/utils', 'sources/window', 'pgadmin.browser.utils',
  'wcdocker', 'jquery.contextmenu', 'jquery.aciplugin', 'jquery.acitree',
  'pgadmin.browser.preferences', 'pgadmin.browser.messages',
  'pgadmin.browser.menu', 'pgadmin.browser.panel', 'pgadmin.browser.layout',
  'pgadmin.browser.error', 'pgadmin.browser.frame',
  'pgadmin.browser.node', 'pgadmin.browser.collection', 'pgadmin.browser.activity',
  'sources/codemirror/addon/fold/pgadmin-sqlfoldcode',
  'pgadmin.browser.keyboard', 'sources/tree/pgadmin_tree_save_state','jquery.acisortable', 'jquery.acifragment',
], function(
  tree,
  gettext, url_for, require, $, _,
  Bootstrap, pgAdmin, Alertify, codemirror,
  checkNodeVisibility, toolBar, help, csrfToken, pgadminUtils, pgWindow
) {
  window.jQuery = window.$ = $;
  // Some scripts do export their object in the window only.
  // Generally the one, which do no have AMD support.
  var wcDocker = window.wcDocker;
  $ = $ || window.jQuery || window.$;
  var CodeMirror = codemirror.default;

  var pgBrowser = pgAdmin.Browser = pgAdmin.Browser || {};
  var select_object_msg = gettext('Please select an object in the tree view.');

  csrfToken.setPGCSRFToken(pgAdmin.csrf_token_header, pgAdmin.csrf_token);

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
      data.sort(function(a, b) {
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
        fullRow: true,
      });

      b.tree = $('#tree').aciTree('api');
      b.treeMenu.register($('#tree'));

      b.treeMenu.registerDraggableType({
        'collation domain domain_constraints fts_configuration fts_dictionary fts_parser fts_template synonym table partition type sequence package view mview foreign_table edbvar' : (data, item)=>{
          return pgadminUtils.fully_qualify(b, data, item);
        },
        'schema column database cast event_trigger extension language foreign_data_wrapper foreign_server user_mapping compound_trigger index index_constraint primary_key unique_constraint check_constraint exclusion_constraint foreign_key rule' : (data)=>{
          return pgadminUtils.quote_ident(data._label);
        },
        'trigger trigger_function' : (data)=>{
          return data._label;
        },
        'edbfunc function edbproc procedure' : (data, item)=>{
          let newData = {...data},
            parsedFunc = null,
            dropVal = '',
            curPos = {from: 0, to: 0};

          parsedFunc = pgadminUtils.parseFuncParams(newData._label);
          newData._label = parsedFunc.func_name;
          dropVal = pgadminUtils.fully_qualify(b, newData, item);

          if(parsedFunc.params.length > 0) {
            dropVal = dropVal + '(';
            curPos.from =  dropVal.length;
            dropVal = dropVal + parsedFunc.params[0][0];
            curPos.to = dropVal.length;

            for(let i=1; i<parsedFunc.params.length; i++) {
              dropVal = dropVal + ', ' + parsedFunc.params[i][0];
            }

            dropVal = dropVal + ')';
          } else {
            dropVal = dropVal + '()';
            curPos.from = curPos.to = dropVal.length + 1;
          }

          return {
            text: dropVal,
            cur: curPos,
          };
        },
      });
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
    // Standard Widths and Height for dialogs in px
    stdW: {
      sm: 500,
      md: 700,
      lg: 900,
      default: 500,
      // If you change above values then make sure to update
      // calc method logic
      calc: (passed_width) => {
        let iw = window.innerWidth;
        if(iw > passed_width){
          return passed_width;
        }else{
          if (iw > pgAdmin.Browser.stdW.lg)
            return pgAdmin.Browser.stdW.lg;
          else if (iw > pgAdmin.Browser.stdW.md)
            return pgAdmin.Browser.stdW.md;
          else if (iw > pgAdmin.Browser.stdW.sm)
            return pgAdmin.Browser.stdW.sm;
          else
            // if avilable screen resolution is still
            // less then return the width value as it
            return iw;
        }

      },
    },
    stdH: {
      sm: 200,
      md: 400,
      lg: 550,
      default: 550,
      // If you change above values then make sure to update
      // calc method logic
      calc: (passed_height) => {
        // We are excluding sm as it is too small for dialog
        let ih = window.innerHeight;
        if (ih > passed_height){
          return passed_height;
        }else{
          if (ih > pgAdmin.Browser.stdH.lg)
            return pgAdmin.Browser.stdH.lg;
          else if (ih > pgAdmin.Browser.stdH.md)
            return pgAdmin.Browser.stdH.md;
          else
            // if avilable screen resolution is still
            // less then return the height value as it
            return ih;
        }
      },
    },
    // Default panels
    panels: {
      // Panel to keep the left hand browser tree
      'browser': new pgAdmin.Browser.Panel({
        name: 'browser',
        title: gettext('Browser'),
        showTitle: true,
        isCloseable: false,
        isPrivate: true,
        icon: '',
        content: '<div id="tree" class="aciTree"></div>',
        onCreate: function(panel) {
          toolBar.initializeToolbar(panel, wcDocker);
        },
      }),
      // Properties of the object node
      'properties': new pgAdmin.Browser.Panel({
        name: 'properties',
        title: gettext('Properties'),
        icon: '',
        width: 500,
        isCloseable: false,
        isPrivate: true,
        elContainer: true,
        content: '<div class="obj_properties container-fluid"><div role="status" class="pg-panel-message">' + select_object_msg + '</div></div>',
        events: panelEvents,
        onCreate: function(myPanel, $container) {
          $container.addClass('pg-no-overflow');
        },
      }),
      // Statistics of the object
      'statistics': new pgAdmin.Browser.Panel({
        name: 'statistics',
        title: gettext('Statistics'),
        icon: '',
        width: 500,
        isCloseable: false,
        isPrivate: true,
        content: '<div class="negative-space p-2"><div role="status" class="pg-panel-message pg-panel-statistics-message">' + select_object_msg + '</div><div class="pg-panel-statistics-container d-none"></div></div>',
        events: panelEvents,
      }),
      // Reversed engineered SQL for the object
      'sql': new pgAdmin.Browser.Panel({
        name: 'sql',
        title: gettext('SQL'),
        icon: '',
        width: 500,
        isCloseable: false,
        isPrivate: true,
        content: '<label for="sql-textarea" class="sr-only">' + gettext('SQL Code') + '</label><div class="sql_textarea"><textarea id="sql-textarea" name="sql-textarea" title="' + gettext('SQL Code') + '"></textarea></div>',
      }),
      // Dependencies of the object
      'dependencies': new pgAdmin.Browser.Panel({
        name: 'dependencies',
        title: gettext('Dependencies'),
        icon: '',
        width: 500,
        isCloseable: false,
        isPrivate: true,
        content: '<div class="negative-space p-2"><div role="status" class="pg-panel-message pg-panel-depends-message">' + select_object_msg + '</div><div class="pg-panel-dependencies-container d-none"></div></div>',
        events: panelEvents,
      }),
      // Dependents of the object
      'dependents': new pgAdmin.Browser.Panel({
        name: 'dependents',
        title: gettext('Dependents'),
        icon: '',
        width: 500,
        isCloseable: false,
        isPrivate: true,
        content: '<div class="negative-space p-2"><div role="status" class="pg-panel-message pg-panel-depends-message">' + select_object_msg + '</div><div class="pg-panel-dependents-container d-none"></div></div>',
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
    masterpass_callback_queue: [],
    // Enable/disable menu options
    enable_disable_menus: function(item) {
      // Mechanism to enable/disable menus depending on the condition.
      var obj = this,
        // menu navigation bar
        navbar = $('#navbar-menu > ul').first(),
        // Drop down menu for objects
        $obj_mnu = navbar.find('li#mnu_obj .dropdown-menu').first(),
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

      toolBar.enable(gettext('View Data'), false);
      toolBar.enable(gettext('Filtered Rows'), false);

      // All menus from the object menus (except the create drop-down
      // menu) needs to be removed.
      $obj_mnu.empty();

      // All menus (except for the object menus) are already present.
      // They will just require to check, wheather they are
      // enabled/disabled.
      _.each([
        {m: 'file', id: '#mnu_file'},
        {m: 'management', id: '#mnu_management'},
        {m: 'tools', id: '#mnu_tools'},
        {m: 'help', id:'#mnu_help'}], function(o) {
        _.each( obj.menus[o.m], function(m) { update_menuitem(m); });
      });

      // Create the object menu dynamically
      if (item && obj.menus['object'] && obj.menus['object'][d._type]) {
        pgAdmin.Browser.MenuCreator(
          obj.Nodes, $obj_mnu, obj.menus['object'][d._type], obj.menu_categories, d, item
        );
      } else {
        // Create a dummy 'no object seleted' menu
        var create_submenu = pgAdmin.Browser.MenuGroup(
          obj.menu_categories['create'], [{
            $el: $('<li><a class="dropdown-item disabled" href="#" role="menuitem">' + gettext('No object selected') + '</a></li>'),
            priority: 1,
            category: 'create',
            update: function() {},
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

      // Cache preferences
      obj.cache_preferences();
      obj.add_panels();
      // Initialize the Docker
      obj.docker = new wcDocker(
        '#dockerContainer', {
          allowContextMenu: true,
          allowCollapse: false,
          loadingClass: 'pg-sp-icon',
          themePath: url_for('static', {
            'filename': 'css',
          }),
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
        obj.restore_layout(obj.docker, layout, obj.buildDefaultLayout.bind(obj));

        obj.docker.on(wcDocker.EVENT.LAYOUT_CHANGED, function() {
          obj.save_current_layout('Browser/Layout', obj.docker);
        });
      }

      // Syntax highlight the SQL Pane
      obj.editor = CodeMirror.fromTextArea(
        document.getElementById('sql-textarea'), {
          lineNumbers: true,
          mode: 'text/x-pgsql',
          readOnly: true,
          extraKeys: pgAdmin.Browser.editor_shortcut_keys,
          screenReaderLabel: gettext('SQL'),
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
            obj.Nodes, $div, menus, obj.menu_categories, d, item, context_menu
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

      let headers = {};
      headers[pgAdmin.csrf_token_header] = pgAdmin.csrf_token;

      // Ping the server every 5 minutes
      setInterval(function() {
        $.ajax({
          url: url_for('misc.cleanup'),
          type:'POST',
          headers: headers,
        })
          .done(function() {})
          .fail(function() {});
      }, 300000);

      obj.set_master_password('');

      obj.Events.on('pgadmin:browser:tree:add', obj.onAddTreeNode, obj);
      obj.Events.on('pgadmin:browser:tree:update', obj.onUpdateTreeNode, obj);
      obj.Events.on('pgadmin:browser:tree:refresh', obj.onRefreshTreeNode, obj);
      obj.Events.on('pgadmin-browser:tree:loadfail', obj.onLoadFailNode, obj);

      obj.bind_beforeunload();

      /* User UI activity */
      obj.log_activity(); /* The starting point */
      obj.register_to_activity_listener(document);
      obj.start_inactivity_timeout_daemon();
    },

    init_master_password: function() {
      let self = this;
      // Master password dialog
      if (!Alertify.dlgMasterPass) {
        Alertify.dialog('dlgMasterPass', function factory() {
          return {
            main: function(title, message, reset) {
              this.set('title', title);
              this.message = message;
              this.reset = reset;
            },
            build: function() {
              Alertify.pgDialogBuild.apply(this);
            },
            setup:function() {
              return {
                buttons:[{
                  text: '',
                  className: 'btn btn-primary-icon pull-left fa fa-question pg-alertify-icon-button',
                  attrs: {
                    name: 'dialog_help',
                    type: 'button',
                    label: gettext('Master password'),
                    url: url_for('help.static', {
                      'filename': 'master_password.html',
                    }),
                  },
                },{
                  text: gettext('Reset Master Password'), className: 'btn btn-secondary fa fa-trash-alt pg-alertify-button pull-left',
                },{
                  text: gettext('Cancel'), className: 'btn btn-secondary fa fa-times pg-alertify-button',
                  key: 27,
                },{
                  text: gettext('OK'), key: 13, className: 'btn btn-primary fa fa-check pg-alertify-button',
                }],
                focus: {element: '#password', select: true},
                options: {
                  modal: true, resizable: false, maximizable: false, pinnable: false,
                },
              };
            },
            prepare:function() {
              let _self = this;
              _self.setContent(_self.message);
              /* Reset button hide */
              if(!_self.reset) {
                $(_self.__internal.buttons[1].element).addClass('d-none');
              } else {
                $(_self.__internal.buttons[1].element).removeClass('d-none');
              }
            },
            callback: function(event) {
              let parentDialog = this;

              if (event.index == 3) {
                /* OK Button */
                self.set_master_password(
                  $('#frmMasterPassword #password').val(),
                  true,parentDialog.set_callback,
                );
              } else if(event.index == 2) {
                /* Cancel button */
                self.masterpass_callback_queue = [];
              } else if(event.index == 1) {
                /* Reset Button */
                event.cancel = true;

                Alertify.confirm(gettext('Reset Master Password'),
                  gettext('This will remove all the saved passwords. This will also remove established connections to '
                    + 'the server and you may need to reconnect again. Do you wish to continue?'),
                  function() {
                    /* If user clicks Yes */
                    self.reset_master_password();
                    parentDialog.close();
                    return true;
                  },
                  function() {/* If user clicks No */ return true;}
                ).set('labels', {
                  ok: gettext('Yes'),
                  cancel: gettext('No'),
                });
              } else if(event.index == 0) {
                /* help Button */
                event.cancel = true;
                self.showHelp(
                  event.button.element.name,
                  event.button.element.getAttribute('url'),
                  null, null
                );
                return;
              }
            },
          };
        });
      }
    },

    check_master_password: function(on_resp_callback) {
      $.ajax({
        url: url_for('browser.check_master_password'),
        type: 'GET',
        contentType: 'application/json',
      }).done((res)=> {
        if(on_resp_callback) {
          if(res.data) {
            on_resp_callback(true);
          } else {
            on_resp_callback(false);
          }
        }
      }).fail(function(xhr, status, error) {
        Alertify.pgRespErrorNotify(xhr, error);
      });
    },

    reset_master_password: function() {
      let self = this;
      $.ajax({
        url: url_for('browser.set_master_password'),
        type: 'DELETE',
        contentType: 'application/json',
      }).done((res)=> {
        if(!res.data) {
          self.set_master_password('');
        }
      }).fail(function(xhr, status, error) {
        Alertify.pgRespErrorNotify(xhr, error);
      });
    },

    set_master_password: function(password='', button_click=false, set_callback=()=>{}) {
      let data=null, self = this;

      data = JSON.stringify({
        'password': password,
        'button_click': button_click,
      });

      self.masterpass_callback_queue.push(set_callback);

      $.ajax({
        url: url_for('browser.set_master_password'),
        type: 'POST',
        data: data,
        dataType: 'json',
        contentType: 'application/json',
      }).done((res)=> {
        if(!res.data.present) {
          self.init_master_password();
          Alertify.dlgMasterPass(res.data.title, res.data.content, res.data.reset);
        } else {
          setTimeout(()=>{
            while(self.masterpass_callback_queue.length > 0) {
              let callback = self.masterpass_callback_queue.shift();
              callback();
            }
          }, 500);
        }
      }).fail(function(xhr, status, error) {
        Alertify.pgRespErrorNotify(xhr, error);
      });
    },

    bind_beforeunload: function() {
      $(window).on('beforeunload', function(e) {
        /* Can open you in new tab */
        let openerBrowser = pgWindow.default.pgAdmin.Browser;

        let tree_save_interval = pgBrowser.get_preference('browser', 'browser_tree_state_save_interval'),
          confirm_on_refresh_close = openerBrowser.get_preference('browser', 'confirm_on_refresh_close');

        if (!_.isUndefined(tree_save_interval) && tree_save_interval.value !== -1)
          pgAdmin.Browser.browserTreeState.save_state();

        if(!_.isUndefined(confirm_on_refresh_close) && confirm_on_refresh_close.value) {
          /* This message will not be displayed in Chrome, Firefox, Safari as they have disabled it*/
          let msg = gettext('Are you sure you want to close the %s browser?', pgBrowser.utils.app_name);
          e.originalEvent.returnValue = msg;
          return msg;
        }
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
            var _menus;

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
              _menus = pgMenu[a][m.node] = pgMenu[a][m.node] || {};
            } else if (_.isString(m.category)) {
              _menus = pgMenu[a][m.category] = pgMenu[a][m.category] || {};
            }
            else {
              _menus = pgMenu[a];
            }

            let get_menuitem_obj = function(_m) {
              return new MenuItem({
                name: _m.name, label: _m.label, module: _m.module,
                category: _m.category, callback: _m.callback,
                priority: _m.priority, data: _m.data, url: _m.url || '#',
                target: _m.target, icon: _m.icon,
                enable: (_m.enable == '' ? true : (_.isString(_m.enable) &&
                  _m.enable.toLowerCase() == 'false') ?
                  false : _m.enable),
                node: _m.node, checked: _m.checked,
              });
            };

            if (!_.has(_menus, m.name)) {
              _menus[m.name] = get_menuitem_obj(m);

              if(m.menu_items) {
                let sub_menu_items = [];

                for(let i=0; i<m.menu_items.length; i++) {
                  sub_menu_items.push(get_menuitem_obj(m.menu_items[i]));
                }
                _menus[m.name]['menu_items'] = sub_menu_items;
              }
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
        {menu: 'management', id: '#mnu_management'},
        {menu: 'tools', id: '#mnu_tools'},
        {menu: 'help', id:'#mnu_help'}],
      function(o) {
        var $mnu = navbar.children(o.id).first(),
          $dropdown = $mnu.children('.dropdown-menu').first();
        $dropdown.empty();

        if (pgAdmin.Browser.MenuCreator(
          obj.Nodes, $dropdown, obj.menus[o.menu], obj.menu_categories
        )) {
          $mnu.removeClass('d-none');
        }
      });

      navbar.children('#mnu_obj').removeClass('d-none');
      obj.enable_disable_menus();
    },
    // General function to handle callbacks for object or dialog help.
    showHelp: function(type, url, node, item) {
      if (type == 'object_help') {
        // Construct the URL
        var server = node.getTreeNodeHierarchy(item).server;
        var baseUrl = pgBrowser.utils.pg_help_path;
        if (server.server_type == 'ppas') {
          baseUrl = pgBrowser.utils.edbas_help_path;
        }

        var fullUrl = help.getHelpUrl(baseUrl, url, server.version, server.server_type);

        window.open(fullUrl, 'postgres_help');
      } else if(type == 'dialog_help') {
        window.open(url, 'pgadmin_help');
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
          var _ctx = this, data;

          _ctx.success = traversePath;
          if (_ctx.p.length) {
            data = _ctx.p.shift();
            // This is the parent node.
            // Replace the parent-id of the data, which could be different
            // from the given hierarchy.
            if (!_ctx.p.length) {
              data._id = _data._pid;
              _ctx.success = addItemNode;
            }
            _ctx.b._findTreeChildNode(
              _ctx.i, data, _ctx
            );
            // if parent node is null
            if (!_data._pid) {
              addItemNode.apply(_ctx, arguments);
            }
          }
          return true;
        }.bind(ctx),
        addItemNode = function() {
          // Append the new data in the tree under the current item.
          // We may need to pass it to proper collection node.
          var _ctx = this,
            first = (_ctx.i || this.t.wasLoad(_ctx.i)) &&
            this.t.first(_ctx.i),
            findChildNode = function(success, notFound) {
              var __ctx = this;
              __ctx.success = success;
              __ctx.notFound = notFound;

              __ctx.b._findTreeChildNode(__ctx.i, _data, __ctx);
            }.bind(_ctx),
            selectNode = function() {
              this.t.openPath(this.i);
              this.t.select(this.i);
              if (
                _ctx.o && _ctx.o.success && typeof(_ctx.o.success) == 'function'
              ) {
                _ctx.o.success.apply(_ctx.t, [_ctx.i, _data]);
              }
            }.bind(_ctx),
            addNode = function() {
              var __ctx = this,
                items = __ctx.t.children(__ctx.i),
                s = 0, e = items.length - 1, i,
                linearSearch = function() {
                  while (e >= s) {
                    i = items.eq(s);
                    var d = __ctx.t.itemData(i);
                    if (d._type === 'column') {
                      if (pgAdmin.numeric_comparator(d._id, _data._id) == 1)
                        return true;
                    } else {
                      if (pgAdmin.natural_sort(d._label, _data._label) == 1)
                        return true;
                    }
                    s++;
                  }
                  //when the current element is greater than the end element
                  if (e != items.length - 1) {
                    i = items.eq(e+1);
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
                    d = __ctx.t.itemData(i);
                    if (d._type === 'column') {
                      if (pgAdmin.numeric_comparator(d._id, _data._id) != -1)
                        return true;
                    } else {
                      if (pgAdmin.natural_sort(d._label, _data._label) != -1)
                        return true;
                    }
                    i = items.eq(e);
                    d = __ctx.t.itemData(i);
                    let result;
                    if (d._type === 'column') {
                      result = pgAdmin.numeric_comparator(d._id, _data._id);
                    } else {
                      result = pgAdmin.natural_sort(d._label, _data._label);
                    }
                    if (result !=1) {
                      if (e != items.length - 1) {
                        i = items.eq(e+1);
                        return true;
                      }
                      i = null;
                      return false;
                    }
                    m = s + Math.round((e - s) / 2);
                    i = items.eq(m);
                    d = __ctx.t.itemData(i);
                    if(d._type === 'column'){
                      result = pgAdmin.numeric_comparator(d._id, _data._id);
                    } else {
                      result = pgAdmin.natural_sort(d._label, _data._label);
                    }
                    //result will never become 0 because of remove operation
                    //which happens with updateTreeNode
                    if (result == 0)
                      return true;

                    if (result == -1) {
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
                __ctx.t.before(i, {
                  itemData: _data,
                  success: function() {
                    if (
                      __ctx.o && __ctx.o.success && typeof(__ctx.o.success) == 'function'
                    ) {
                      __ctx.o.success.apply(__ctx.t, [i, _data]);
                    }
                  },
                  fail: function() {
                    console.warn('Failed to add before...', arguments);
                    if (
                      __ctx.o && __ctx.o.fail && typeof(__ctx.o.fail) == 'function'
                    ) {
                      __ctx.o.fail.apply(__ctx.t, [i, _data]);
                    }
                  },
                });
              } else {
                var _append = function() {
                  var ___ctx = this,
                    is_parent_loaded_before = ___ctx.t.wasLoad(___ctx.i),
                    _parent_data = ___ctx.t.itemData(___ctx.i);

                  ___ctx.t.append(___ctx.i, {
                    itemData: _data,
                    success: function(item, options) {
                      var _i = $(options.items[0]);
                      // Open the item path only if its parent is loaded
                      // or parent type is same as nodes
                      if(
                        is_parent_loaded_before &&
                          _parent_data &&  _parent_data._type.search(
                          _data._type
                        ) > -1
                      ) {
                        ___ctx.t.openPath(_i);
                        ___ctx.t.select(_i);
                      } else {
                        if (_parent_data) {
                          // Unload the parent node so that we'll get
                          // latest data when we try to expand it
                          ___ctx.t.unload(___ctx.i, {
                            success: function (_item) {
                              // Lets try to load it now
                              ___ctx.t.open(_item);
                            },
                          });
                        }
                      }
                      if (
                        ___ctx.o && ___ctx.o.success &&
                          typeof(___ctx.o.success) == 'function'
                      ) {
                        ___ctx.o.success.apply(___ctx.t, [_i, _data]);
                      }
                    },
                    fail: function() {
                      console.warn('Failed to append...', arguments);
                      if (
                        ___ctx.o && ___ctx.o.fail &&
                          typeof(___ctx.o.fail) == 'function'
                      ) {
                        ___ctx.o.fail.apply(___ctx.t, [___ctx.i, _data]);
                      }
                    },
                  });
                }.bind(__ctx);

                if (__ctx.i && !__ctx.t.isInode(__ctx.i)) {
                  __ctx.t.setInode(__ctx.i, {success: _append});
                } else {
                  // Handle case for node without parent i.e. server-group
                  // or if parent node's inode is true.
                  _append();
                }
              }
            }.bind(_ctx);

          // Parent node do not have any children, let me unload it.
          if (!first && _ctx.t.wasLoad(_ctx.i)) {
            _ctx.t.unload(_ctx.i, {
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
            if(_parent && _parent.length == 0 && ctx.op == 'UPDATE') {
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
          var _ctx = this, data;

          _ctx.success = traversePath;
          if (_ctx.p.length) {
            data = _ctx.p.shift();
            // This is the node, we can now do the required operations.
            // We should first delete the existing node, if the parent-id is
            // different.
            if (!_ctx.p.length) {
              if (_ctx.op == 'RECREATE') {
                _ctx.load = false;
                _ctx.success = deleteNode;
                _ctx.notFound = findNewParent;
              } else {
                _ctx.success = updateNode;
                _ctx.notFound = errorOut;
              }
            }
            _ctx.b._findTreeChildNode(
              _ctx.i, data, _ctx
            );
          } else if (_ctx.p.length == 1) {
            _ctx.notFound = findNewParent;
          }
          return true;
        }.bind(ctx),
        addItemNode = function() {
          var _ctx = this,
            first = (_ctx.i || this.t.wasLoad(_ctx.i)) &&
            this.t.first(_ctx.i),
            findChildNode = function(success, notFound) {
              var __ctx = this;
              __ctx.success = success;
              __ctx.notFound = notFound;

              __ctx.b._findTreeChildNode(__ctx.i, _new, __ctx);
            }.bind(_ctx),
            selectNode = function() {
              this.t.openPath(this.i);
              this.t.select(this.i);
              if (
                _ctx.o && _ctx.o.success && typeof(_ctx.o.success) == 'function'
              ) {
                _ctx.o.success.apply(_ctx.t, [_ctx.i, _new]);
              }
            }.bind(_ctx),
            addNode = function() {
              var __ctx = this,
                items = __ctx.t.children(__ctx.i),
                s = 0, e = items.length - 1, i,
                linearSearch = function() {
                  while (e >= s) {
                    i = items.eq(s);
                    var d = __ctx.t.itemData(i);
                    if (d._type === 'column') {
                      if (pgAdmin.numeric_comparator(d._id, _new._id) == 1)
                        return true;
                    } else {
                      if (pgAdmin.natural_sort(d._label, _new._label) == 1)
                        return true;
                    }
                    s++;
                  }
                  if (e != items.length - 1) {
                    i = items.eq(e+1);
                    return true;
                  }
                  i = null;
                  return false;
                },
                binarySearch = function() {
                  while (e - s > 22) {
                    i = items.eq(s);
                    var d = __ctx.t.itemData(i);
                    if (d._type === 'column') {
                      if (pgAdmin.numeric_comparator(d._id, _new._id) != -1)
                        return true;
                    } else {
                      if (pgAdmin.natural_sort(d._label, _new._label) != -1)
                        return true;
                    }
                    i = items.eq(e);
                    d = __ctx.t.itemData(i);
                    let result;
                    if (d._type === 'column') {
                      result = pgAdmin.numeric_comparator(d._id, _new._id);
                    } else {
                      result = pgAdmin.natural_sort(d._label, _new._label);
                    }
                    if (result !=1) {
                      if (e != items.length - 1) {
                        i = items.eq(e+1);
                        return true;
                      }
                      i = null;
                      return false;
                    }
                    var m = s + Math.round((e - s) / 2);
                    i = items.eq(m);
                    d = __ctx.t.itemData(i);
                    if(d._type === 'column'){
                      result = pgAdmin.numeric_comparator(d._id, _new._id);
                    } else {
                      result = pgAdmin.natural_sort(d._label, _new._label);
                    }
                    //result will never become 0 because of remove operation
                    //which happens with updateTreeNode
                    if (result == 0)
                      return true;

                    if (result == -1) {
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
                __ctx.t.before(i, {
                  itemData: _new,
                  success: function() {
                    var new_item = $(arguments[1].items[0]);
                    __ctx.t.openPath(new_item);
                    __ctx.t.select(new_item);
                    if (
                      __ctx.o && __ctx.o.success && typeof(__ctx.o.success) == 'function'
                    ) {
                      __ctx.o.success.apply(__ctx.t, [i, _old, _new]);
                    }
                  },
                  fail: function() {
                    console.warn('Failed to add before..', arguments);
                    if (
                      __ctx.o && __ctx.o.fail && typeof(__ctx.o.fail) == 'function'
                    ) {
                      __ctx.o.fail.apply(__ctx.t, [i, _old, _new]);
                    }
                  },
                });
              } else {
                var _appendNode = function() {
                  __ctx.t.append(__ctx.i, {
                    itemData: _new,
                    success: function() {
                      var new_item = $(arguments[1].items[0]);
                      __ctx.t.openPath(new_item);
                      __ctx.t.select(new_item);
                      if (
                        __ctx.o && __ctx.o.success && typeof(__ctx.o.success) == 'function'
                      ) {
                        __ctx.o.success.apply(__ctx.t, [__ctx.i, _old, _new]);
                      }
                    },
                    fail: function() {
                      console.warn('Failed to append...', arguments);
                      if (
                        __ctx.o && __ctx.o.fail && typeof(__ctx.o.fail) == 'function'
                      ) {
                        __ctx.o.fail.apply(__ctx.t, [__ctx.i, _old, _new]);
                      }
                    },
                  });
                };

                // If the current node's inode is false
                if (__ctx.i && !__ctx.t.isInode(__ctx.i)) {
                  __ctx.t.setInode(__ctx.i, {success: _appendNode});
                } else {
                  // Handle case for node without parent i.e. server-group
                  // or if parent node's inode is true.
                  _appendNode();
                }

              }
            }.bind(_ctx);

          // Parent node do not have any children, let me unload it.
          if (!first && _ctx.t.wasLoad(_ctx.i)) {
            _ctx.t.unload(_ctx.i, {
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
      if ((
        _old._type == 'server' && _new._type == 'server' && (
          _old._pid != _new._pid ||
          _old._label != _new._label ||
          _old.icon != _new.icon
        )) || _old._pid != _new._pid || _old._label != _new._label ||
        _old._id != _new._id
      ) {
        ctx.op = 'RECREATE';
        traversePath();
      } else {
        ctx.op = 'UPDATE';
        traversePath();
      }
    },

    onRefreshTreeNode: function(_i, _opts) {
      var _d = _i && this.tree.itemData(_i),
        n = _d && _d._type && this.Nodes[_d._type],
        ctx = {
          b: this, // Browser
          d: _d, // current parent
          i: _i, // current item
          p: null, // path of the old object
          pathOfTreeItems: [], // path items
          t: this.tree, // Tree Api
          o: _opts,
        },
        isOpen,
        idx = -1;

      this.Events.trigger('pgadmin-browser:tree:refreshing', _i, _d, n);

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
      var fetchNodeInfo = function(__i, __d, __n) {
        var info = __n.getTreeNodeHierarchy(__i),
          url = __n.generate_url(__i, 'nodes', __d, true);

        $.ajax({
          url: url,
          type: 'GET',
          cache: false,
          dataType: 'json',
        })
          .done(function(res) {
          // Node information can come as result/data
            var newData = res.result || res.data;

            newData._label = newData.label;
            newData.label = _.escape(newData.label);

            ctx.t.setLabel(ctx.i, {label: newData.label});
            ctx.t.addIcon(ctx.i, {icon: newData.icon});
            ctx.t.setId(ctx.i, {id: newData.id});
            if (newData.inode)
              ctx.t.setInode(ctx.i, {inode: true});

            // This will update the tree item data.
            var itemData = ctx.t.itemData(ctx.i);
            _.extend(itemData, newData);

            if (
              __n.can_expand && typeof(__n.can_expand) == 'function'
            ) {
              if (!__n.can_expand(itemData)) {
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
                xhr, error, status, {item: __i, info: info}
              )
            ) {
              var contentType = xhr.getResponseHeader('Content-Type'),
                jsonResp = (
                  contentType &&
                  contentType.indexOf('application/json') == 0 &&
                  JSON.parse(xhr.responseText)
                ) || {};

              if (xhr.status == 410 && jsonResp.success == 0) {
                var parent = ctx.t.parent(ctx.i);

                ctx.t.remove(ctx.i, {
                  success: function() {
                    if (parent) {
                    // Try to refresh the parent on error
                      try {
                        pgBrowser.Events.trigger(
                          'pgadmin:browser:tree:refresh', parent
                        );
                      } catch (e) { console.warn(e.stack || e); }
                    }
                  },
                });
              }

              Alertify.pgNotifier(error, xhr, gettext('Error retrieving details for the node.'), function (msg) {
                if (msg == 'CRYPTKEY_SET') {
                  fetchNodeInfo(__i, __d, __n);
                } else {
                  console.warn(arguments);
                }
              });
            }
          });
      }.bind(this);

      if (n && n.collection_node) {
        var p = ctx.i = this.tree.parent(_i),
          unloadNode = function() {
            this.tree.unload(_i, {
              success: function() {
                _i = p;
                _d = ctx.d = ctx.t.itemData(ctx.i);
                n = ctx.b.Nodes[_d._type];
                _i = p;
                fetchNodeInfo(_i, _d, n);
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
          success: fetchNodeInfo.bind(this, _i, _d, n),
          fail: function() {
            console.warn(arguments);
          },
        });
      } else if (!this.tree.isInode(_i) && _d.inode) {
        this.tree.setInode(_i, {
          success: fetchNodeInfo.bind(this, _i, _d, n),
          fail: function() {
            console.warn(arguments);
          },
        });
      } else {
        fetchNodeInfo(_i, _d, n);
      }
    },

    onLoadFailNode: function(_nodeData) {
      let self = this,
        isSelected = self.tree.isSelected(_nodeData);

      /** Check if master password set **/
      self.check_master_password((is_set)=>{
        if(!is_set) {
          self.set_master_password('', ()=>{
            if(isSelected) { self.tree.select(_nodeData); }
            self.tree.open(_nodeData);
          });
        }
      });
    },

    removeChildTreeNodesById: function(_parentNode, _collType, _childIds) {
      var tree_local = pgBrowser.tree;
      if(_parentNode && _collType) {
        var children = tree_local.children(_parentNode),
          idx = 0, size = children.length,
          childNode, childNodeData;

        _parentNode = null;

        for (; idx < size; idx++) {
          childNode = children.eq(idx);
          childNodeData = tree_local.itemData(childNode);

          if (childNodeData._type == _collType) {
            _parentNode = childNode;
            break;
          }
        }
      }

      if (_parentNode) {
        children = tree_local.children(_parentNode);
        idx = 0;
        size = children.length;

        for (; idx < size; idx++) {
          childNode = children.eq(idx);
          childNodeData = tree_local.itemData(childNode);

          if (_childIds.indexOf(childNodeData._id) != -1) {
            pgBrowser.removeTreeNode(childNode, false, _parentNode);
          }
        }
        return true;
      }
      return false;
    },

    removeTreeNode: function(_node, _selectNext, _parentNode) {
      var tree_local = pgBrowser.tree,
        nodeToSelect = null;

      if (!_node)
        return false;

      if (_selectNext) {
        nodeToSelect = tree_local.next(_node);
        if (!nodeToSelect || !nodeToSelect.length) {
          nodeToSelect = tree_local.prev(_node);

          if (!nodeToSelect || !nodeToSelect.length) {
            if (!_parentNode) {
              nodeToSelect = tree_local.parent(_node);
            } else {
              nodeToSelect = _parentNode;
            }
          }
        }
        if (nodeToSelect)
          tree_local.select(nodeToSelect);
      }
      tree_local.remove(_node);
      return true;
    },

    findSiblingTreeNode: function(_node, _id) {
      var tree_local = pgBrowser.tree,
        parentNode = tree_local.parent(_node),
        siblings = tree_local.children(parentNode),
        idx = 0, nodeData, node;

      for(; idx < siblings.length; idx++) {
        node = siblings.eq(idx);
        nodeData = tree_local.itemData(node);

        if (nodeData && nodeData._id == _id)
          return node;
      }
      return null;
    },

    findParentTreeNodeByType: function(_node, _parentType) {
      var tree_local = pgBrowser.tree,
        nodeData,
        node = _node;

      do {
        nodeData = tree_local.itemData(node);
        if (nodeData && nodeData._type == _parentType)
          return node;
        node = tree_local.hasParent(node) ? tree_local.parent(node) : null;
      } while (node);

      return null;
    },

    findChildCollectionTreeNode: function(_node, _collType) {
      var tree_local = pgBrowser.tree,
        nodeData, idx = 0,
        node,
        children = _node && tree_local.children(_node);

      if (!children || !children.length)
        return null;

      for(; idx < children.length; idx++) {
        node = children.eq(idx);
        nodeData = tree_local.itemData(node);

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
        fetchNodeInfo = function(__callback) {
          if (!_arrayIds.length) {
            if (__callback) {
              __callback();
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
      var traverseNodes = function(__d) {
        var __ctx = this, idx = 0, ctx, d,
          size = (__d.branch && __d.branch.length) || 0,
          findNode = function(i_findNode, d_findNode, ctx_findNode) {
            setTimeout(
              function() {
                ctx_findNode.b._findTreeChildNode(i_findNode, d_findNode, ctx_findNode);
              }, 0
            );
          };

        for (; idx < size; idx++) {
          d = __d.branch[idx];
          var n = __ctx.b.Nodes[d._type];
          ctx = {
            b: __ctx.b,
            t: __ctx.t,
            pathOfTreeItems: [],
            i: __ctx.i,
            d: d,
            select: __ctx.select,
            hasId: n && !n.collection_node,
            o: __ctx.o,
            load: true,
          };
          ctx.success = function() {
            this.b._refreshNode.call(this.b, this, this.d);
          }.bind(ctx);
          findNode(__ctx.i, d, ctx);
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

      'Alt-Up': 'goLineUp',
      'Alt-Down': 'goLineDown',

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

    // This function will return the name and version of the browser.
    get_browser: function() {
      var ua=navigator.userAgent,tem,M=ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
      if(/trident/i.test(M[1])) {
        tem=/\brv[ :]+(\d+)/g.exec(ua) || [];
        return {name:'IE', version:(tem[1]||'')};
      }

      if(M[1]==='Chrome') {
        tem=ua.match(/\bOPR|Edge\/(\d+)/);
        if(tem!=null) {return {name:tem[0], version:tem[1]};}
      }

      M=M[2]? [M[1], M[2]]: [navigator.appName, navigator.appVersion, '-?'];
      if((tem=ua.match(/version\/(\d+)/i))!=null) {M.splice(1,1,tem[1]);}
      return {
        name: M[0],
        version: M[1],
      };
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

  return pgAdmin.Browser;
});
