define(
  ['jquery', 'underscore', 'underscore.string', 'alertify', 'pgadmin',
  'pgadmin.browser', 'backbone', 'backgrid', 'codemirror', 'backform',
  'pgadmin.tools.debugger.ui', 'wcdocker', 'pgadmin.backform',
  'pgadmin.backgrid', 'pgadmin.browser.frame'],
  function($, _, S, Alertify, pgAdmin, pgBrowser, Backbone, Backgrid, CodeMirror, Backform, get_function_arguments) {

  pgAdmin = pgAdmin || window.pgAdmin || {};

  var pgTools = pgAdmin.Tools = pgAdmin.Tools || {};

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
          name: 'direct_debugger', node: 'function', module: this,
          applies: ['object', 'context'], callback: 'get_function_information',
          category: 'Debugging', priority: 10, label: '{{ _('Debug') }}',
          data: {object: 'function'}, icon: 'fa fa-arrow-circle-right',
          enable: 'can_debug'
        },{
          name: 'global_debugger', node: 'function', module: this,
          applies: ['object', 'context'], callback: 'check_func_debuggable',
          category: 'Debugging', priority: 10, label: '{{ _('Set breakpoint') }}',
          data: {object: 'function'}, icon: 'fa fa-arrow-circle-right',
          enable: 'can_debug'
        },{
          name: 'procedure_direct_debugger', node: 'procedure', module: this,
          applies: ['object', 'context'], callback: 'get_function_information',
          category: 'Debugging', priority: 10, label: '{{ _('Debug') }}',
          data: {object: 'procedure'}, icon: 'fa fa-arrow-circle-right',
          enable: 'can_debug'
        }, {
          name: 'procedure_indirect_debugger', node: 'procedure', module: this,
          applies: ['object', 'context'], callback: 'check_func_debuggable',
          category: 'Debugging', priority: 10, label: '{{ _('Set breakpoint') }}',
          data: {object: 'procedure'}, icon: 'fa fa-arrow-circle-right',
          enable: 'can_debug'
        }, {
          name: 'trigger_function_indirect_debugger', node: 'trigger_function', module: this,
          applies: ['object', 'context'], callback: 'check_func_debuggable',
          priority: 10, label: '{{ _('Set breakpoint') }}', category: 'Debugging',
          icon: 'fa fa-arrow-circle-right', data: {object:'trigger_function'},
          enable: 'can_debug'
        }, {
          name: 'trigger_indirect_debugger', node: 'trigger', module: this,
          applies: ['object', 'context'], callback: 'check_func_debuggable',
          priority: 10, label: '{{ _('Set breakpoint') }}', category: 'Debugging',
          icon: 'fa fa-arrow-circle-right', data: {object:'trigger'},
          enable: 'can_debug'
        }, {
          name: 'package_function_direct_debugger', node: 'edbfunc', module: this,
          applies: ['object', 'context'], callback: 'get_function_information',
          category: 'Debugging', priority: 10, label: '{{ _('Debug') }}',
          data: {object: 'edbfunc'}, icon: 'fa fa-arrow-circle-right',
          enable: 'can_debug'
        },{
          name: 'package_function_global_debugger', node: 'edbfunc', module: this,
          applies: ['object', 'context'], callback: 'check_func_debuggable',
          category: 'Debugging', priority: 10, label: '{{ _('Set breakpoint') }}',
          data: {object: 'edbfunc'}, icon: 'fa fa-arrow-circle-right',
          enable: 'can_debug'
        },{
          name: 'package_procedure_direct_debugger', node: 'edbproc', module: this,
          applies: ['object', 'context'], callback: 'get_function_information',
          category: 'Debugging', priority: 10, label: '{{ _('Debug') }}',
          data: {object: 'edbproc'}, icon: 'fa fa-arrow-circle-right',
          enable: 'can_debug'
        }, {
          name: 'package_procedure_global_debugger', node: 'edbproc', module: this,
          applies: ['object', 'context'], callback: 'check_func_debuggable',
          category: 'Debugging', priority: 10, label: '{{ _('Set breakpoint') }}',
          data: {object: 'edbproc'}, icon: 'fa fa-arrow-circle-right',
          enable: 'can_debug'
        }]);

        // Create and load the new frame required for debugger panel
        this.frame = new pgBrowser.Frame({
          name: 'frm_debugger',
          title: '{{ _('Debugger') }}',
          width: 500,
          isCloseable: true,
          isPrivate: true,
          icon: 'fa fa-arrow-circle-right',
          url: 'about:blank'
        });

        this.frame.load(pgBrowser.docker);
      },
      // It will check weather the function is actually debuggable or not with pre-required condition.
      can_debug: function(itemData, item, data) {
        var t = pgBrowser.tree, i = item, d = itemData;
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

        // Must be a super user or object owner to create breakpoints of any kind
        if (!(treeInfo.server.user.is_superuser || treeInfo.function.funcowner == treeInfo.server.user.name))
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
              function(v, k, o) {
                return (k != 'server-group');
              })
            ),
            function(o) { return o.priority; }
          ),
          function(o) {
            ref = S('%s/%s').sprintf(ref, encodeURI(o._id)).value();
          });

        var args = {
          'URL': _url,
          'BASEURL': '{{ url_for('debugger.index')}}',
          'REF': ref,
          'OBJTYPE': encodeURI(node.type)
        };

        return url.replace(/{(\w+)}/g, function(match, arg) {
          return args[arg];
        });
      },

      check_func_debuggable: function(args, item) {
        var input = args || {},
          t = pgBrowser.tree,
          i = item || t.selected(),
          d = i && i.length == 1 ? t.itemData(i) : undefined,
          node = d && pgBrowser.Nodes[d._type];

        if (!d)
          return;

        var objName = d.label,
            treeInfo = node.getTreeNodeHierarchy.apply(node, [i]),
            _url = this.generate_url('init', treeInfo, node);

        var self = this;
        $.ajax({
          url: _url,
          cache: false,
          success: function(res) {
            self.start_global_debugger();
          },
          error: function(xhr, status, error) {
            try {
              var err = $.parseJSON(xhr.responseText);
              if (err.success == 0) {
                Alertify.alert(err.errormsg);
              }
            } catch (e) {}
          }
        });
      },

      //Callback function when user start the indirect debugging ( Listen to another session to invoke the target )
      start_global_debugger: function(args, item) {
        // Initialize the target and create asynchronous connection and unique transaction ID
        var t = pgBrowser.tree,
          i = t.selected(),
          d = i && i.length == 1 ? t.itemData(i) : undefined,
          node = d && pgBrowser.Nodes[d._type];

        if (!d)
          return;

        var treeInfo = node.getTreeNodeHierarchy.apply(node, [i]);

        if (d._type == "function") {
          var baseUrl = "{{ url_for('debugger.index') }}" + "initialize_target/" + "indirect/" + treeInfo.server._id +
                                "/" + treeInfo.database._id + "/" + treeInfo.schema._id + "/" + treeInfo.function._id;
        }
        else if (d._type == "procedure") {
          var baseUrl = "{{ url_for('debugger.index') }}" + "initialize_target/" + "indirect/" + treeInfo.server._id +
                                "/" + treeInfo.database._id + "/" + treeInfo.schema._id + "/" + treeInfo.procedure._id;
        }
        else if (d._type == "trigger_function") {
          var baseUrl = "{{ url_for('debugger.index') }}" + "initialize_target/" + "indirect/" + treeInfo.server._id +
                                "/" + treeInfo.database._id + "/" + treeInfo.schema._id + "/" + treeInfo.trigger_function._id;
        }
        else if (d._type == "trigger") {
          var baseUrl = "{{ url_for('debugger.index') }}" + "initialize_target/" + "indirect/" + treeInfo.server._id +
                                "/" + treeInfo.database._id + "/" + treeInfo.schema._id + "/" + treeInfo.table._id +
                                "/" + treeInfo.trigger._id;
        }

        $.ajax({
          url: baseUrl,
          method: 'GET',
          success: function(res) {
            var url = "{{ url_for('debugger.index') }}" + "direct/" + res.data.debuggerTransId;

            pgBrowser.Events.once(
              'pgadmin-browser:frame:urlloaded:frm_debugger', function(frame) {
              frame.openURL(url);
            });

            // Create the debugger panel as per the data received from user input dialog.
            var dashboardPanel = pgBrowser.docker.findPanels(
              'dashboard'
              ),
              panel = pgBrowser.docker.addPanel(
                'frm_debugger', wcDocker.DOCK.STACKED, dashboardPanel[0]
              );

              panel.focus();

              // Panel Closed event
              panel.on(wcDocker.EVENT.CLOSED, function() {
                var closeUrl = "{{ url_for('debugger.index') }}" + "close/" + res.data.debuggerTransId;
                $.ajax({
                  url: closeUrl,
                  method: 'GET'
                });
              });
            },
            error: function(e) {
              Alertify.alert(
                'Debugger target Initialize Error'
              );
            }
        });
      },

      /*
        Get the function information for the direct debugging to display the functions arguments and  other informations
        in the user input dialog
      */
      get_function_information: function(args, item) {
        var input = args || {},
          t = pgBrowser.tree,
          i = item || t.selected(),
          d = i && i.length == 1 ? t.itemData(i) : undefined,
          node = d && pgBrowser.Nodes[d._type];

        if (!d)
          return;

        var objName = d.label,
            treeInfo = node.getTreeNodeHierarchy.apply(node, [i]),
            _url = this.generate_url('init', treeInfo, node);

        var self = this;
        $.ajax({
          url: _url,
          cache: false,
          success: function(res) {

            // Open Alertify the dialog to take the input arguments from user if function having input arguments
            if (res.data[0]['require_input']) {
              get_function_arguments(res.data[0], 0);
            }
            else {
	          // Initialize the target and create asynchronous connection and unique transaction ID
	          // If there is no arguments to the functions then we should not ask for for function arguments and
	          // Directly open the panel
              var t = pgBrowser.tree,
                i = t.selected(),
                d = i && i.length == 1 ? t.itemData(i) : undefined,
                node = d && pgBrowser.Nodes[d._type];

              if (!d)
                return;

              var treeInfo = node.getTreeNodeHierarchy.apply(node, [i]);

              if (d._type == "function") {
                var baseUrl = "{{ url_for('debugger.index') }}" + "initialize_target/" + "direct/" + treeInfo.server._id +
                                "/" + treeInfo.database._id + "/" + treeInfo.schema._id + "/" + treeInfo.function._id;
              }
              else {
                var baseUrl = "{{ url_for('debugger.index') }}" + "initialize_target/" + "direct/" + treeInfo.server._id +
                                "/" + treeInfo.database._id + "/" + treeInfo.schema._id + "/" + treeInfo.procedure._id;
              }

              $.ajax({
                url: baseUrl,
                method: 'GET',
                success: function(res) {

                  var url = "{{ url_for('debugger.index') }}" + "direct/" + res.data.debuggerTransId;

                  pgBrowser.Events.once(
                    'pgadmin-browser:frame:urlloaded:frm_debugger', function(frame) {
                    frame.openURL(url);
                  });

                  // Create the debugger panel as per the data received from user input dialog.
                  var dashboardPanel = pgBrowser.docker.findPanels(
                    'dashboard'
                    ),
                    panel = pgBrowser.docker.addPanel(
                      'frm_debugger', wcDocker.DOCK.STACKED, dashboardPanel[0]
                      );

                  panel.focus();

                  // Register Panel Closed event
                  panel.on(wcDocker.EVENT.CLOSED, function() {
                    var closeUrl = "{{ url_for('debugger.index') }}" + "close/" + res.data.debuggerTransId;
                    $.ajax({
                      url: closeUrl,
                      method: 'GET'
                    });
                  });
                },
                error: function(e) {
                  Alertify.alert(
                    'Debugger target Initialize Error',
                    e.responseJSON.errormsg
                  );
                }
              });
            }
          },
          error: function(xhr, status, error) {
            try {
              var err = $.parseJSON(xhr.responseText);
              if (err.success == 0) {
                Alertify.alert('Debugger Error', err.errormsg);
              }
            } catch (e) {}
          }
        });
      }
    };

    return pgAdmin.Tools.Debugger;
  });
