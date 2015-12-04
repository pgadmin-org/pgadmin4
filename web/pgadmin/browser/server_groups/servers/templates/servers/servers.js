define(
        ['jquery', 'underscore', 'underscore.string', 'pgadmin', 'pgadmin.browser', 'alertify'],
function($, _, S, pgAdmin, pgBrowser, alertify) {

  if (!pgBrowser.Nodes['server']) {
    pgAdmin.Browser.Nodes['server'] = pgAdmin.Browser.Node.extend({
      parent_type: 'server-group',
      type: 'server',
      label: '{{ _('Server') }}',
      Init: function() {

        /* Avoid multiple registration of same menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_server_on_sg', node: 'server-group', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 1, label: '{{ _('Server...') }}',
          data: {action: 'create'}, icon: 'wcTabIcon icon-server'
        }, {
          name: 'create_server', node: 'server', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 3, label: '{{ _('Server...') }}',
          data: {action: 'create'}, icon: 'wcTabIcon icon-server'
        },{
          name: 'drop_server', node: 'server', module: this,
          applies: ['object', 'context'], callback: 'delete_obj',
          category: 'drop', priority: 3, label: '{{ _('Drop Server...') }}',
          icon: 'fa fa-trash', enable: 'is_not_connected'
        },{
          name: 'connect_server', node: 'server', module: this,
          applies: ['object', 'context'], callback: 'connect_server',
          category: 'connect', priority: 4, label: '{{ _('Connect Server...') }}',
          icon: 'fa fa-link', enable : 'is_not_connected'
        },
        {
          name: 'disconnect_server', node: 'server', module: this,
          applies: ['object', 'context'], callback: 'disconnect_server',
          category: 'drop', priority: 5, label: '{{ _('Disconnect Server...') }}',
          icon: 'fa fa-chain-broken', enable : 'is_connected'
        }]);
      },
      is_not_connected: function(node) {
        return (node && node.connected != true);
      },
      is_connected: function(node) {
        return (node && node.connected == true);
      },
      callbacks: {
        /* Connect the server */
        connect_server: function(args){
          var input = args || {};
          obj = this,
          t = pgBrowser.tree,
          i = input.item || t.selected(),
          d = i && i.length == 1 ? t.itemData(i) : undefined;

          if (!d)
            return false;

          connect_to_server(obj, d, t, i);
          return false;
        },
        /* Disconnect the server */
        disconnect_server: function(args) {
          var input = args || {};
          obj = this,
          t = pgBrowser.tree,
          i = 'item' in input ? input.item : t.selected(),
          d = i && i.length == 1 ? t.itemData(i) : undefined;

          if (!d)
            return false;

          alertify.confirm(
            '{{ _('Disconnect the server') }}',
            S('{{ _('Are you sure you want to disconnect the server - %%s ?') }}').sprintf(d.label).value(),
            function(evt) {
              $.ajax({
                url: obj.generate_url(i, 'connect', d, true),
                type:'DELETE',
                success: function(res) {
                  if (res.success == 1) {
                    alertify.success("{{ _('" + res.info + "') }}");
                    d = t.itemData(i);
                    t.removeIcon(i);
                    d.connected = false;
                    d.icon = 'icon-server-not-connected';
                    t.addIcon(i, {icon: d.icon});
                    t.unload(i);
                    t.setInode(i);
                    if (pgBrowser.serverInfo && d._id in pgBrowser.serverInfo) {
                      delete pgBrowser.serverInfo[d._id]
                    }
                    obj.trigger('server-disconnected', obj, i, d);
                  }
                },
                error: function(xhr, status, error) {
                  try {
                    var err = $.parseJSON(xhr.responseText);
                    if (err.success == 0) {
                      msg = S('{{ _(' + err.errormsg + ')}}').value();
                      alertify.error("{{ _('" + err.errormsg + "') }}");
                    }
                  } catch (e) {}
                  t.unload(i);
                }
              });
          },
          function(evt) {
              return true;
          });

          return false;
        },
        /* Connect the server (if not connected), before opening this node */
        beforeopen: function(item, data) {
          if(!data || data._type != 'server') {
            return false;
          }

          pgBrowser.tree.addIcon(item, {icon: data.icon});
          if (!data.connected) {
            connect_to_server(this, data, pgBrowser.tree, item);
            return false;
          }
          return true;
        },
        opened: function(item, data) {
          pgBrowser.serverInfo = pgBrowser.serverInfo || {};
          pgBrowser.serverInfo[data._id] = _.extend({}, data);
        }
      },
      model: pgAdmin.Browser.Node.Model.extend({
        defaults: {
          id: undefined,
          name: null,
          sslmode: 'prefer',
          host: null,
          port: 5432,
          db: null,
          username: null,
          role: null
        },
        schema: [{
          id: 'id', label: '{{ _('ID') }}', type: 'int', group: null,
          mode: ['properties']
        },{
          id: 'name', label:'{{ _('Name') }}', type: 'text', group: null,
          mode: ['properties', 'edit', 'create']
        },{
          id: 'connected', label:'{{ _('Connected') }}', type: 'text', group: null,
          mode: ['properties']
        },{
          id: 'version', label:'{{ _('Version') }}', type: 'text', group: null,
          mode: ['properties'], show: 'isConnected'
        },{
          id: 'comment', label:'{{ _('Comments:') }}', type: 'multiline', group: null,
          mode: ['properties', 'edit', 'create'], disabled: 'notEditMode'
        },{
          id: 'host', label:'{{ _('Host Name/Address') }}', type: 'text', group: "Connection",
          mode: ['properties', 'edit', 'create'], disabled: 'isConnected'
        },{
          id: 'port', label:'{{ _('Port') }}', type: 'int', group: "Connection",
          mode: ['properties', 'edit', 'create'], disabled: 'isConnected'
        },{
          id: 'db', label:'{{ _('Maintenance Database') }}', type: 'text', group: "Connection",
          mode: ['properties', 'edit', 'create'], disabled: 'isConnected'
        },{
          id: 'username', label:'{{ _('User Name') }}', type: 'text', group: "Connection",
          mode: ['properties', 'edit', 'create'], disabled: 'isConnected'
        },{
          id: 'role', label:'{{ _('Role') }}', type: 'text', group: "Connection",
          mode: ['properties', 'edit', 'create'], disabled: 'isConnected'
        },{
          id: 'sslmode', label:'{{ _('SSL Mode') }}', type: 'options', group: "Connection",
          mode: ['properties', 'edit', 'create'], disabled: 'isConnected',
          'options': [
            {label: 'Allow', value: 'allow'},
            {label: 'Prefer', value: 'prefer'},
            {label: 'Require', value: 'require'},
            {label: 'Disable', value: 'disable'},
            {label: 'Verify-CA', value: 'verify-ca'},
            {label: 'Verify-Full', value: 'verify-full'}
          ]
        },{
          id: 'server_type', label: '{{ _('Server Type') }}', type: 'options',
          mode: ['properties'], show: 'isConnected',
          'options': [{% for st in server_types %}
            {label: '{{ st.description }}', value: '{{ st.server_type }}'},{% endfor %}
            {label: '{{ _('Unknown') }}', value: ''}
          ]
        }],
        validate: function() {
          var err = {},
              errmsg;

          if (!this.isNew() && 'id' in this.sessAttrs) {
            var msg = '{{ _('Id can not be changed!') }}';
            err['id'] = msg;
            errmsg = msg;
          }
          if (_.isUndefined(this.get('name')) || String(this.get('name')).replace(/^\s+|\s+$/g, '') == '') {
            err['name'] = '{{ _('Name can be empty!') }}';
            errmsg = errmsg || msg;
          }
          this.errorModel.set(err);

          if (_.size(err)) {
            return err;
          }

          return null;
        },
        isConnected: function(model) {
          return model.get('connected');
        }
      })
    });
    function connect_to_server(obj, data, tree, item) {
      var onFailure = function(xhr, status, error, _model, _data, _tree, _item) {

        tree.setInode(_item);
        tree.addIcon(_item, {icon: 'icon-server-not-connected'});

        alertify.pgNotifier('error', xhr, error, function(msg) {
          setTimeout(function() {
            alertify.dlgServerPass(
              '{{ _('Connect to Server') }}',
              msg, _model, _data, _tree, _item
              ).resizeTo();
          }, 100);
        });
      },
      onSuccess = function(res, model, data, tree, item) {
        tree.deselect(item);
        tree.setInode(item);

        if (res && res.data) {

          if (typeof res.data.icon == 'string') {
            tree.removeIcon(item);
            data.icon = res.data.icon;
            tree.addIcon(item, {icon: data.icon});
          }
          _.extend(data, res.data);

          alertify.success(res.info);
          obj.trigger('server-connected', obj, item, data);

          setTimeout(function() {
            tree.select(item);
            tree.open(item);
          }, 10);
                    
        }
      };

      // Ask Password and send it back to the connect server
      if (!alertify.dlgServerPass) {
        alertify.dialog('dlgServerPass', function factory() {
          return {
            main: function(title, message, model, data, tree, item) {
              this.set('title', title);
              this.message = message;
              this.tree = tree;
              this.nodeData = data;
              this.nodeItem = item;
              this.nodeModel = model;
            },
            setup:function() {
              return {
                buttons:[
                  {
                    text: "{{ _('OK') }}", key: 13, className: "btn btn-primary"
                  },
                  {
                    text: "{{ _('Cancel') }}", className: "btn btn-danger"
                  }
                ],
                focus: { element: '#password', select: true },
                options: {
                  modal: 0, resizable: false, maximizable: false, pinnable: false
                }
              };
            },
            build:function() {},
            prepare:function() {
              this.setContent(this.message);
            },
            callback: function(closeEvent) {
              var _sdata = this.nodeData,
                  _tree = this.tree,
                  _item = this.nodeItem,
                  _model = this.nodeModel;

              if (closeEvent.button.text == "{{ _('OK') }}") {

                var _url = _model.generate_url(_item, 'connect', _sdata, true);

                _tree.setLeaf(_item);
                _tree.removeIcon(_item);
                _tree.addIcon(_item, {icon: 'icon-server-connecting'});

                $.ajax({
                  type: 'POST',
                  timeout: 30000,
                  url: _url,
                  data: $('#frmPassword').serialize(),
                  success: function(res) {
                    return onSuccess(
                      res, _model, _sdata, _tree, _item
                      );
                  },
                  error: function(xhr, status, error) {
                    return onFailure(
                      xhr, status, error, _model, _sdata, _tree, _item
                      );
                  }
                });
              } else {
                _tree.setInode(_item);
                _tree.removeIcon(_item);
                _tree.addIcon(_item, {icon: 'icon-server-not-connected'});
              }
            }
          };
        });
      }

      alertify.confirm(
        '{{ _('Connect to server') }}',
        '{{ _('Do you want to connect the server?') }}',
        function(evt) {
          url = obj.generate_url(item, "connect", data, true);
          $.post(url)
          .done(
            function(res) {
              if (res.success == 1) {
                return onSuccess(res, obj, data, tree, item);
              }
            })
          .fail(
            function(xhr, status, error) {
              return onFailure(xhr, status, error, obj, data, tree, item);
            });
        },
        function() {});
    }
    /* Send PING to indicate that session is alive */
    function server_status(server_id)
    {
      url = "/ping";
      $.post(url)
      .done(function(data) { return true})
      .fail(function(xhr, status, error) { return false})
    }
  }

  return pgBrowser.Nodes['server'];
});
