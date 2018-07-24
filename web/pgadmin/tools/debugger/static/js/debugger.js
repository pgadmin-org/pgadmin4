define([
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore',
  'underscore.string', 'alertify', 'sources/pgadmin', 'pgadmin.browser',
  'backbone', 'pgadmin.backgrid', 'codemirror', 'pgadmin.backform',
  'pgadmin.tools.debugger.ui', 'pgadmin.tools.debugger.utils',
  'wcdocker', 'pgadmin.browser.frame',
], function(
  gettext, url_for, $, _, S, Alertify, pgAdmin, pgBrowser, Backbone, Backgrid,
  CodeMirror, Backform, get_function_arguments, debuggerUtils
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
        label: gettext('Set breakpoint'),
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
        label: gettext('Set breakpoint'),
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
        label: gettext('Set breakpoint'),
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
        label: gettext('Set breakpoint'),
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
        label: gettext('Set breakpoint'),
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
        label: gettext('Set breakpoint'),
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
        icon: 'fa fa-arrow-circle-right',
        url: 'about:blank',
      });

      this.frame.load(pgBrowser.docker);

      let self = this;
      let cacheIntervalId = setInterval(function() {
        try {
          self.preferences = window.top.pgAdmin.Browser;
          clearInterval(cacheIntervalId);
        }
        catch(err) {
          clearInterval(cacheIntervalId);
          throw err;
        }
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
        d_ = info && info.length == 1 ? tree.itemData(info) : undefined,
        node = d_ && pgBrowser.Nodes[d_._type];

      if (!d_)
        return false;

      var treeInfo = node.getTreeNodeHierarchy.apply(node, [info]);

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
          ref = S('%s/%s').sprintf(ref, encodeURI(o._id)).value();
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
        d = i && i.length == 1 ? t.itemData(i) : undefined,
        node = d && pgBrowser.Nodes[d._type];

      if (!d)
        return;

      var treeInfo = node.getTreeNodeHierarchy.apply(node, [i]),
        _url = this.generate_url('init', treeInfo, node);

      var self = this;
      $.ajax({
        url: _url,
        cache: false,
      })
      .done(function() {
        self.start_global_debugger();
      })
      .fail(function(xhr) {
        try {
          var err = JSON.parse(xhr.responseText);
          if (err.success == 0) {
            Alertify.alert(gettext('Debugger Error'), err.errormsg);
          }
        } catch (e) {
          console.warn(e.stack || e);
        }
      });
    },

    //Callback function when user start the indirect debugging ( Listen to another session to invoke the target )
    start_global_debugger: function(args, item) {
      // Initialize the target and create asynchronous connection and unique transaction ID
      var t = pgBrowser.tree,
        i = item || t.selected(),
        d = i && i.length == 1 ? t.itemData(i) : undefined,
        node = d && pgBrowser.Nodes[d._type],
        self = this;

      if (!d)
        return;

      var treeInfo = node.getTreeNodeHierarchy.apply(node, [i]),
        baseUrl;

      if (d._type == 'function') {
        baseUrl = url_for(
          'debugger.initialize_target_for_function', {
            'debug_type': 'indirect',
            'sid': treeInfo.server._id,
            'did': treeInfo.database._id,
            'scid': treeInfo.schema._id,
            'func_id': treeInfo.function._id,
          }
        );
      } else if (d._type == 'procedure') {
        baseUrl = url_for(
          'debugger.initialize_target_for_function', {
            'debug_type': 'indirect',
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

        if (self.preferences.debugger_new_browser_tab) {
          window.open(url, '_blank');
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
            );

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
        }
      })
      .fail(function(xhr) {
        try {
          var err = JSON.parse(xhr.responseText);
          if (err.success == 0) {
            Alertify.alert(gettext('Debugger Error'), err.errormsg);
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
        d = i && i.length == 1 ? t.itemData(i) : undefined,
        node = d && pgBrowser.Nodes[d._type],
        self = this;

      if (!d)
        return;

      var treeInfo = node.getTreeNodeHierarchy.apply(node, [i]),
        _url = this.generate_url('init', treeInfo, node);

      $.ajax({
        url: _url,
        cache: false,
      })
      .done(function(res) {

        // Open Alertify the dialog to take the input arguments from user if function having input arguments
        if (res.data[0]['require_input']) {
          get_function_arguments(res.data[0], 0);
        } else {
          // Initialize the target and create asynchronous connection and unique transaction ID
          // If there is no arguments to the functions then we should not ask for for function arguments and
          // Directly open the panel
          var t = pgBrowser.tree,
            i = t.selected(),
            d = i && i.length == 1 ? t.itemData(i) : undefined,
            node = d && pgBrowser.Nodes[d._type];

          if (!d)
            return;

          var treeInfo = node.getTreeNodeHierarchy.apply(node, [i]),
            baseUrl;

          if (d._type == 'function') {
            baseUrl = url_for(
              'debugger.initialize_target_for_function', {
                'debug_type': 'direct',
                'sid': treeInfo.server._id,
                'did': treeInfo.database._id,
                'scid': treeInfo.schema._id,
                'func_id': treeInfo.function._id,
              }
            );
          } else {
            baseUrl = url_for(
              'debugger.initialize_target_for_function', {
                'debug_type': 'direct',
                'sid': treeInfo.server._id,
                'did': treeInfo.database._id,
                'scid': treeInfo.schema._id,
                'func_id': debuggerUtils.getProcedureId(treeInfo),
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

            if (self.preferences.debugger_new_browser_tab) {
              window.open(url, '_blank');
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
                );

              panel.focus();

              // Register Panel Closed event
              panel.on(wcDocker.EVENT.CLOSED, function() {
                var closeUrl = url_for('debugger.close', {
                  'trans_id': res.data.debuggerTransId,
                });
                $.ajax({
                  url: closeUrl,
                  method: 'DELETE',
                });
              });
            }
          })
          .fail(function(e) {
            Alertify.alert(
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
            Alertify.alert(gettext('Debugger Error'), err.errormsg);
          }
        } catch (e) {
          console.warn(e.stack || e);
        }
      });
    },
  };

  return pgAdmin.Tools.Debugger;
});
