/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import Notify from '../../../../static/js/helpers/Notifier';

define([
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore',
  'alertify', 'sources/pgadmin', 'pgadmin.browser',
  'backbone', 'pgadmin.backgrid', 'codemirror', 'pgadmin.backform',
  'pgadmin.tools.debugger.ui', 'pgadmin.tools.debugger.utils',
  'tools/datagrid/static/js/show_query_tool', 'sources/utils',
  'pgadmin.authenticate.kerberos', 'tools/datagrid/static/js/datagrid_panel_title',
  'wcdocker', 'pgadmin.browser.frame',
], function(
  gettext, url_for, $, _, Alertify, pgAdmin, pgBrowser, Backbone, Backgrid,
  CodeMirror, Backform, get_function_arguments, debuggerUtils, showQueryTool,
  pgadminUtils, Kerberos, panelTitleFunc
) {
  var pgTools = pgAdmin.Tools = pgAdmin.Tools || {},
    wcDocker = window.wcDocker;

  /* Return back, this has been called more than once */
  if (pgAdmin.Tools.Debugger)
    return pgAdmin.Tools.Debugger;

  pgTools.Debugger = {
    init: function() {
      // We do not want to initialize the module multiple times.
      if (this.initialized)
        return;

      this.initialized = true;

      // Initialize the context menu to display the debugging options when user open the context menu for functions
      pgBrowser.add_menus([{
        name: 'direct_debugger',
        node: 'function',
        module: this,
        applies: ['object', 'context'],
        callback: 'get_function_information',
        category: gettext('Debugging'),
        priority: 10,
        label: gettext('Debug'),
        data: {
          object: 'function',
        },
        icon: 'fa fa-arrow-circle-right',
        enable: 'can_debug',
      }, {
        name: 'global_debugger',
        node: 'function',
        module: this,
        applies: ['object', 'context'],
        callback: 'check_func_debuggable',
        category: gettext('Debugging'),
        priority: 10,
        label: gettext('Set Breakpoint'),
        data: {
          object: 'function',
          debug_type: 'indirect',
        },
        icon: 'fa fa-arrow-circle-right',
        enable: 'can_debug',
      }, {
        name: 'procedure_direct_debugger',
        node: 'procedure',
        module: this,
        applies: ['object', 'context'],
        callback: 'get_function_information',
        category: gettext('Debugging'),
        priority: 10,
        label: gettext('Debug'),
        data: {
          object: 'procedure',
        },
        icon: 'fa fa-arrow-circle-right',
        enable: 'can_debug',
      }, {
        name: 'procedure_indirect_debugger',
        node: 'procedure',
        module: this,
        applies: ['object', 'context'],
        callback: 'check_func_debuggable',
        category: gettext('Debugging'),
        priority: 10,
        label: gettext('Set Breakpoint'),
        data: {
          object: 'procedure',
          debug_type: 'indirect',
        },
        icon: 'fa fa-arrow-circle-right',
        enable: 'can_debug',
      }, {
        name: 'trigger_function_indirect_debugger',
        node: 'trigger_function',
        module: this,
        applies: ['object', 'context'],
        callback: 'check_func_debuggable',
        priority: 10,
        label: gettext('Set Breakpoint'),
        category: gettext('Debugging'),
        icon: 'fa fa-arrow-circle-right',
        data: {
          object: 'trigger_function',
          debug_type: 'indirect',
        },
        enable: 'can_debug',
      }, {
        name: 'trigger_indirect_debugger',
        node: 'trigger',
        module: this,
        applies: ['object', 'context'],
        callback: 'check_func_debuggable',
        priority: 10,
        label: gettext('Set Breakpoint'),
        category: gettext('Debugging'),
        icon: 'fa fa-arrow-circle-right',
        data: {
          object: 'trigger',
          debug_type: 'indirect',
        },
        enable: 'can_debug',
      }, {
        name: 'package_function_direct_debugger',
        node: 'edbfunc',
        module: this,
        applies: ['object', 'context'],
        callback: 'get_function_information',
        category: gettext('Debugging'),
        priority: 10,
        label: gettext('Debug'),
        data: {
          object: 'edbfunc',
        },
        icon: 'fa fa-arrow-circle-right',
        enable: 'can_debug',
      }, {
        name: 'package_function_global_debugger',
        node: 'edbfunc',
        module: this,
        applies: ['object', 'context'],
        callback: 'check_func_debuggable',
        category: gettext('Debugging'),
        priority: 10,
        label: gettext('Set Breakpoint'),
        data: {
          object: 'edbfunc',
          debug_type: 'indirect',
        },
        icon: 'fa fa-arrow-circle-right',
        enable: 'can_debug',
      }, {
        name: 'package_procedure_direct_debugger',
        node: 'edbproc',
        module: this,
        applies: ['object', 'context'],
        callback: 'get_function_information',
        category: gettext('Debugging'),
        priority: 10,
        label: gettext('Debug'),
        data: {
          object: 'edbproc',
        },
        icon: 'fa fa-arrow-circle-right',
        enable: 'can_debug',
      }, {
        name: 'package_procedure_global_debugger',
        node: 'edbproc',
        module: this,
        applies: ['object', 'context'],
        callback: 'check_func_debuggable',
        category: gettext('Debugging'),
        priority: 10,
        label: gettext('Set Breakpoint'),
        data: {
          object: 'edbproc',
          debug_type: 'indirect',
        },
        icon: 'fa fa-arrow-circle-right',
        enable: 'can_debug',
      }]);

      // Create and load the new frame required for debugger panel
      this.frame = new pgBrowser.Frame({
        name: 'frm_debugger',
        title: gettext('Debugger'),
        width: 500,
        isCloseable: true,
        isPrivate: true,
        icon: 'fa fa-bug',
        url: 'about:blank',
      });

      this.frame.load(pgBrowser.docker);

      let self = this;
      let cacheIntervalId = setInterval(function() {
        if(pgBrowser.preference_version() > 0) {
          self.preferences = pgBrowser.get_preferences_for_module('debugger');
          clearInterval(cacheIntervalId);
        }
      },0);

      pgBrowser.onPreferencesChange('debugger', function() {
        self.preferences = pgBrowser.get_preferences_for_module('debugger');
      });
    },
    // It will check weather the function is actually debuggable or not with pre-required condition.
    can_debug: function(itemData, item, data) {
      var t = pgBrowser.tree,
        i = item,
        d = itemData;
      // To iterate over tree to check parent node
      while (i) {
        if ('catalog' == d._type) {
          //Check if we are not child of catalog
          return false;
        }
        i = t.hasParent(i) ? t.parent(i) : null;
        d = i ? t.itemData(i) : null;
      }

      // Find the function is really available in database
      var tree = pgBrowser.tree,
        info = tree.selected(),
        d_ = info ? tree.itemData(info) : undefined;

      if (!d_)
        return false;

      var treeInfo = tree.getTreeNodeHierarchy(info);

      // For indirect debugging user must be super user
      if (data && data.debug_type && data.debug_type == 'indirect' &&
        !treeInfo.server.user.is_superuser)
        return false;

      // Fetch object owner
      var obj_owner = treeInfo.function && treeInfo.function.funcowner ||
        treeInfo.procedure && treeInfo.procedure.funcowner ||
        treeInfo.edbfunc && treeInfo.edbfunc.funcowner ||
        treeInfo.edbproc && treeInfo.edbproc.funcowner;

      // Must be a super user or object owner to create breakpoints of any kind
      if (!(treeInfo.server.user.is_superuser || obj_owner == treeInfo.server.user.name))
        return false;

      // For trigger node, language will be undefined - we should allow indirect debugging for trigger node
      if ((d_.language == undefined && d_._type == 'trigger') ||
        (d_.language == undefined && d_._type == 'edbfunc') ||
        (d_.language == undefined && d_._type == 'edbproc')) {
        return true;
      }

      if (d_.language != 'plpgsql' && d_.language != 'edbspl') {
        return false;
      }

      return true;
    },
    /*
      For the direct debugging, we need to fetch the function information to display in the dialog so "generate_url"
      will dynamically generate the URL from the server_id, database_id, schema_id and function id.
    */
    generate_url: function(_url, treeInfo, node) {
      var url = '{BASEURL}{URL}/{OBJTYPE}{REF}',
        ref = '';

      _.each(
        _.sortBy(
          _.values(
            _.pick(treeInfo,
              function(v, k) {
                return (k != 'server_group');
              })
          ),
          function(o) {
            return o.priority;
          }
        ),
        function(o) {
          ref = pgadminUtils.sprintf('%s/%s', ref, encodeURI(o._id));
        });

      var args = {
        'URL': _url,
        'BASEURL': url_for('debugger.index'),
        'REF': ref,
        'OBJTYPE': encodeURI(node.type),
      };

      return url.replace(/{(\w+)}/g, function(match, arg) {
        return args[arg];
      });
    },

    check_func_debuggable: function(args, item) {
      var t = pgBrowser.tree,
        i = item || t.selected(),
        d = i ? t.itemData(i) : undefined,
        node = d && pgBrowser.Nodes[d._type];

      if (!d)
        return;

      var treeInfo = t.getTreeNodeHierarchy(i),
        _url = this.generate_url('init', treeInfo, node);

      var self = this;
      $.ajax({
        url: _url,
        cache: false,
      })
        .done(function(res) {
          self.start_global_debugger(args, item, res.data.trans_id);
        })
        .fail(function(xhr) {
          try {
            var err = JSON.parse(xhr.responseText);
            if (err.success == 0) {
              Notify.alert(gettext('Debugger Error'), err.errormsg);
            }
          } catch (e) {
            console.warn(e.stack || e);
          }
        });
    },

    //Callback function when user start the indirect debugging ( Listen to another session to invoke the target )
    start_global_debugger: function(args, item, trans_id) {
      // Initialize the target and create asynchronous connection and unique transaction ID

      var self = this;
      var t = pgBrowser.tree,
        i = item || t.selected(),
        d = i ? t.itemData(i) : undefined,
        tree_data = pgBrowser.tree.translateTreeNodeIdFromReactTree(i),
        db_data = pgBrowser.tree.findNode(tree_data[3]),
        dbNode = db_data.domNode;

      if (!d)
        return;

      var treeInfo = t.getTreeNodeHierarchy(i),
        baseUrl;

      if (d._type == 'function' || d._type == 'edbfunc') {
        baseUrl = url_for(
          'debugger.initialize_target_for_function', {
            'debug_type': 'indirect',
            'trans_id': trans_id,
            'sid': treeInfo.server._id,
            'did': treeInfo.database._id,
            'scid': treeInfo.schema._id,
            'func_id': debuggerUtils.getFunctionId(treeInfo),
          }
        );
      } else if (d._type == 'procedure' || d._type == 'edbproc') {
        baseUrl = url_for(
          'debugger.initialize_target_for_function', {
            'debug_type': 'indirect',
            'trans_id': trans_id,
            'sid': treeInfo.server._id,
            'did': treeInfo.database._id,
            'scid': treeInfo.schema._id,
            'func_id': debuggerUtils.getProcedureId(treeInfo),
          }
        );
      } else if (d._type == 'trigger_function') {
        baseUrl = url_for(
          'debugger.initialize_target_for_function', {
            'debug_type': 'indirect',
            'trans_id': trans_id,
            'sid': treeInfo.server._id,
            'did': treeInfo.database._id,
            'scid': treeInfo.schema._id,
            'func_id': treeInfo.trigger_function._id,
          }
        );
      } else if (d._type == 'trigger' && 'table' in treeInfo) {
        baseUrl = url_for(
          'debugger.initialize_target_for_trigger', {
            'debug_type': 'indirect',
            'trans_id': trans_id,
            'sid': treeInfo.server._id,
            'did': treeInfo.database._id,
            'scid': treeInfo.schema._id,
            'func_id': treeInfo.table._id,
            'tri_id': treeInfo.trigger._id,
          }
        );
      } else if (d._type == 'trigger' && 'view' in treeInfo) {
        baseUrl = url_for(
          'debugger.initialize_target_for_trigger', {
            'debug_type': 'indirect',
            'trans_id': trans_id,
            'sid': treeInfo.server._id,
            'did': treeInfo.database._id,
            'scid': treeInfo.schema._id,
            'func_id': treeInfo.view._id,
            'tri_id': treeInfo.trigger._id,
          }
        );
      }

      $.ajax({
        url: baseUrl,
        method: 'GET',
      })
        .done(function(res) {
          var url = url_for('debugger.direct', {
            'trans_id': res.data.debuggerTransId,
          });
          var browser_preferences = pgBrowser.get_preferences_for_module('browser');
          var open_new_tab = browser_preferences.new_browser_tab_open;
          if (open_new_tab && open_new_tab.includes('debugger')) {
            window.open(url, '_blank');
            // Send the signal to runtime, so that proper zoom level will be set.
            setTimeout(function() {
              pgBrowser.send_signal_to_runtime('Runtime new window opened');
            }, 500);
          } else {
            pgBrowser.Events.once(
              'pgadmin-browser:frame:urlloaded:frm_debugger',
              function(frame) {
                frame.openURL(url);
              });

            // Create the debugger panel as per the data received from user input dialog.
            var dashboardPanel = pgBrowser.docker.findPanels(
                'properties'
              ),
              panel = pgBrowser.docker.addPanel(
                'frm_debugger', wcDocker.DOCK.STACKED, dashboardPanel[0]
              ),
              db_label = treeInfo.database.label;

            if(res.data.data_obj.db_name != treeInfo.database.label) {
              db_label = res.data.data_obj.db_name;
              var message = `Current database has been moved or renamed to ${db_label}. Click on the OK button to refresh the database name.`;
              panelTitleFunc.refresh_db_node(message, dbNode);
            }

            var label = treeInfo.function ? treeInfo.function.label : treeInfo.trigger_function ? treeInfo.trigger_function.label : treeInfo.trigger ? treeInfo.trigger.label : treeInfo.procedure.label;
            debuggerUtils.setDebuggerTitle(panel, browser_preferences, label, db_label, db_label, null, pgBrowser);

            panel.focus();

            // Panel Closed event
            panel.on(wcDocker.EVENT.CLOSED, function() {
              var closeUrl = url_for('debugger.close', {
                'trans_id': res.data.debuggerTransId,
              });
              $.ajax({
                url: closeUrl,
                method: 'DELETE',
              });
            });

            // Panel Rename event
            panel.on(wcDocker.EVENT.RENAME, function(panel_data) {
              Alertify.prompt('', panel_data.$titleText[0].textContent,
                // We will execute this function when user clicks on the OK button
                function(evt, value) {
                  if(value) {
                    // Remove the leading and trailing white spaces.
                    value = value.trim();
                    let preferences = pgBrowser.get_preferences_for_module('browser');
                    var name = treeInfo.function ? treeInfo.function.label : treeInfo.trigger_function ? treeInfo.trigger_function.label : treeInfo.trigger ? treeInfo.trigger.label : treeInfo.procedure.label;
                    debuggerUtils.setDebuggerTitle(panel, preferences, name, treeInfo.schema.label, treeInfo.database.label, value, pgBrowser);
                  }
                },
                // We will execute this function when user clicks on the Cancel
                // button.  Do nothing just close it.
                function(evt) { evt.cancel = false; }
              ).set({'title': gettext('Rename Panel')});
            });
          }
        })
        .fail(function(xhr) {
          try {
            var err = JSON.parse(xhr.responseText);
            if (err.errormsg.search('Ticket expired') !== -1) {
              let fetchTicket = Kerberos.fetch_ticket();
              fetchTicket.then(
                function() {
                  self.start_global_debugger();
                },
                function(error) {
                  Notify.alert(gettext('Debugger Error'), error);
                }
              );
            } else {
              if (err.success == 0) {
                Notify.alert(gettext('Debugger Error'), err.errormsg);
              }
            }
          } catch (e) {
            console.warn(e.stack || e);
          }
        });
    },

    /*
      Get the function information for the direct debugging to display the functions arguments and  other informations
      in the user input dialog
    */
    get_function_information: function(args, item) {

      var t = pgBrowser.tree,
        i = item || t.selected(),
        d = i ? t.itemData(i) : undefined,
        node = d && pgBrowser.Nodes[d._type],
        tree_data = pgBrowser.tree.translateTreeNodeIdFromReactTree(i),
        db_data = pgBrowser.tree.findNode(tree_data[3]),
        dbNode = db_data.domNode;

      if (!d)
        return;

      var is_edb_proc = d._type == 'edbproc';

      var treeInfo = t.getTreeNodeHierarchy(i),
        _url = this.generate_url('init', treeInfo, node);

      $.ajax({
        url: _url,
        cache: false,
      })
        .done(function(res) {

          let debug_info = res.data.debug_info,
            trans_id = res.data.trans_id;
          // Open Alertify the dialog to take the input arguments from user if function having input arguments
          if (debug_info[0]['require_input']) {
            get_function_arguments(debug_info[0], 0, is_edb_proc, trans_id);
          } else {
          // Initialize the target and create asynchronous connection and unique transaction ID
          // If there is no arguments to the functions then we should not ask for for function arguments and
          // Directly open the panel
            var _t = pgBrowser.tree,
              _i = _t.selected(),
              _d = _i ? _t.itemData(_i) : undefined;

            if (!_d)
              return;

            var newTreeInfo = _t.getTreeNodeHierarchy(_i),
              baseUrl;

            if (_d._type == 'function' || _d._type == 'edbfunc') {
              baseUrl = url_for(
                'debugger.initialize_target_for_function', {
                  'debug_type': 'direct',
                  'trans_id': trans_id,
                  'sid': newTreeInfo.server._id,
                  'did': newTreeInfo.database._id,
                  'scid': newTreeInfo.schema._id,
                  'func_id': debuggerUtils.getFunctionId(newTreeInfo),
                }
              );
            } else if(_d._type == 'procedure' || _d._type == 'edbproc') {
              baseUrl = url_for(
                'debugger.initialize_target_for_function', {
                  'debug_type': 'direct',
                  'trans_id': trans_id,
                  'sid': newTreeInfo.server._id,
                  'did': newTreeInfo.database._id,
                  'scid': newTreeInfo.schema._id,
                  'func_id': debuggerUtils.getProcedureId(newTreeInfo),
                }
              );
            }

            $.ajax({
              url: baseUrl,
              method: 'GET',
            })
              .done(function(res) {

                var data = res.data;

                var url = url_for('debugger.direct', {
                  'trans_id': trans_id,
                });

                var browser_preferences = pgBrowser.get_preferences_for_module('browser');
                var open_new_tab = browser_preferences.new_browser_tab_open;
                if (open_new_tab && open_new_tab.includes('debugger')) {
                  window.open(url, '_blank');
                  // Send the signal to runtime, so that proper zoom level will be set.
                  setTimeout(function() {
                    pgBrowser.send_signal_to_runtime('Runtime new window opened');
                  }, 500);
                } else {
                  pgBrowser.Events.once(
                    'pgadmin-browser:frame:urlloaded:frm_debugger',
                    function(frame) {
                      frame.openURL(url);
                    });

                  // Create the debugger panel as per the data received from user input dialog.
                  var dashboardPanel = pgBrowser.docker.findPanels(
                      'properties'
                    ),
                    panel = pgBrowser.docker.addPanel(
                      'frm_debugger', wcDocker.DOCK.STACKED, dashboardPanel[0]
                    ),
                    db_label = newTreeInfo.database.label;
                  pgadminUtils.registerDetachEvent(panel);

                  if(data && data.data_obj && data.data_obj.db_name != newTreeInfo.database.label) {
                    db_label = data.data_obj.db_name;
                    var message = `Current database has been moved or renamed to ${db_label}. Click on the OK button to refresh the database name.`;
                    panelTitleFunc.refresh_db_node(message, dbNode);
                  }

                  var label = newTreeInfo.function ? newTreeInfo.function.label : newTreeInfo.trigger_function ? newTreeInfo.trigger_function.label : newTreeInfo.trigger ? newTreeInfo.trigger.label : newTreeInfo.procedure.label;
                  debuggerUtils.setDebuggerTitle(panel, browser_preferences, label, newTreeInfo.schema.label, db_label, null, pgBrowser);

                  panel.focus();

                  // Register Panel Closed event
                  panel.on(wcDocker.EVENT.CLOSED, function() {
                    var closeUrl = url_for('debugger.close', {
                      'trans_id': trans_id,
                    });
                    $.ajax({
                      url: closeUrl,
                      method: 'DELETE',
                    });
                  });

                  // Panel Rename event
                  panel.on(wcDocker.EVENT.RENAME, function(panel_data) {
                    Alertify.prompt('', panel_data.$titleText[0].textContent,
                      // We will execute this function when user clicks on the OK button
                      function(evt, value) {
                        if(value) {
                          // Remove the leading and trailing white spaces.
                          value = value.trim();
                          let preferences = pgBrowser.get_preferences_for_module('browser');
                          var name = treeInfo.function ? treeInfo.function.label : treeInfo.trigger_function ? treeInfo.trigger_function.label : treeInfo.trigger ? treeInfo.trigger.label : treeInfo.procedure.label;
                          debuggerUtils.setDebuggerTitle(panel, preferences, name, treeInfo.schema.label, treeInfo.database.label, value, pgBrowser);
                        }
                      },
                      // We will execute this function when user clicks on the Cancel
                      // button.  Do nothing just close it.
                      function(evt) { evt.cancel = false; }
                    ).set({'title': gettext('Rename Panel')});
                  });
                }
              })
              .fail(function(e) {
                Notify.alert(
                  gettext('Debugger Target Initialization Error'),
                  e.responseJSON.errormsg
                );
              });
          }
        })
        .fail(function(xhr) {
          try {
            var err = JSON.parse(xhr.responseText);
            if (err.success == 0) {
              Notify.alert(gettext('Debugger Error'), err.errormsg);
            }
          } catch (e) {
            console.warn(e.stack || e);
          }
        });
    },
  };

  return pgAdmin.Tools.Debugger;
});
