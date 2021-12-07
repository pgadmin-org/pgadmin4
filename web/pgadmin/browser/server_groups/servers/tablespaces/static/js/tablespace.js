/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { getNodeListByName } from '../../../../../static/js/node_ajax';
import { getNodePrivilegeRoleSchema } from '../../../static/js/privilege.ui';
import { getNodeVariableSchema } from '../../../static/js/variable.ui';
import TablespaceSchema from './tablespace.ui';
import Notify from '../../../../../../static/js/helpers/Notifier';

define('pgadmin.node.tablespace', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore', 'backbone',
  'sources/pgadmin', 'pgadmin.browser', 'pgadmin.alertifyjs',
  'pgadmin.backform', 'pgadmin.browser.collection', 'pgadmin.browser.node.ui',
  'pgadmin.browser.server.privilege',
], function(
  gettext, url_for, $, _, Backbone, pgAdmin, pgBrowser, Alertify, Backform
) {

  if (!pgBrowser.Nodes['coll-tablespace']) {
    pgBrowser.Nodes['coll-tablespace'] =
      pgBrowser.Collection.extend({
        node: 'tablespace',
        label: gettext('Tablespaces'),
        type: 'coll-tablespace',
        columns: ['name', 'spcuser', 'description'],
        hasStatistics: true,
        statsPrettifyFields: [gettext('Size')],
        canDrop: true,
        canDropCascade: false,
      });
  }

  if (!pgBrowser.Nodes['tablespace']) {
    pgBrowser.Nodes['tablespace'] = pgBrowser.Node.extend({
      parent_type: 'server',
      type: 'tablespace',
      sqlAlterHelp: 'sql-altertablespace.html',
      sqlCreateHelp: 'sql-createtablespace.html',
      dialogHelp: url_for('help.static', {'filename': 'tablespace_dialog.html'}),
      label: gettext('Tablespace'),
      hasSQL:  true,
      canDrop: true,
      hasDepends: true,
      hasStatistics: true,
      statsPrettifyFields: [gettext('Size')],
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_tablespace_on_server', node: 'server', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Tablespace...'),
          icon: 'wcTabIcon icon-tablespace', data: {action: 'create'},
          enable: 'can_create_tablespace',
        },{
          name: 'create_tablespace_on_coll', node: 'coll-tablespace', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Tablespace...'),
          icon: 'wcTabIcon icon-tablespace', data: {action: 'create'},
          enable: 'can_create_tablespace',
        },{
          name: 'create_tablespace', node: 'tablespace', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Tablespace...'),
          icon: 'wcTabIcon icon-tablespace', data: {action: 'create'},
          enable: 'can_create_tablespace',
        },{
          name: 'move_tablespace', node: 'tablespace', module: this,
          applies: ['object', 'context'], callback: 'move_objects',
          category: 'move_tablespace', priority: 5,
          label: gettext('Move objects to...'),
          icon: 'fa fa-exchange-alt', data: {action: 'create'},
          enable: 'can_move_objects',
        },
        ]);
      },
      can_create_tablespace: function(node, item) {
        var treeData = pgBrowser.tree.getTreeNodeHierarchy(item),
          server = treeData['server'];

        return server.connected && server.user.is_superuser;
      },
      can_move_objects: function(node, item) {
        var treeData = pgBrowser.tree.getTreeNodeHierarchy(item),
          server = treeData['server'];
        // Only supported PG9.4 and above version
        return server.connected &&
          server.user.is_superuser &&
          server.version >= 90400;
      },
      callbacks: {
        /* Move objects from one tablespace to another */
        move_objects: function(args){
          var input = args || {},
            obj = this,
            t = pgBrowser.tree,
            i = input.item || t.selected(),
            d = i  ? t.itemData(i) : undefined,
            url = obj.generate_url(i, 'move_objects', d, true),
            msql_url = obj.generate_url(i, 'move_objects_sql', d, true);

          if (!d)
            return false;

          // Object model
          var objModel = Backbone.Model.extend({
            idAttribute: 'id',
            defaults: {
              new_tblspc: undefined,
              obj_type: 'all',
              user: undefined,
            },
            initialize: function(attrs, otherArgs) {
              this.selected_ts = otherArgs.selected_ts;
              Backbone.Model.prototype.initialize.apply(this, [attrs, otherArgs]);
            },
            schema: [{
              id: 'tblspc', label: gettext('New tablespace'),
              type: 'text', disabled: false, control: 'node-list-by-name',
              node: 'tablespace', select2: {allowClear: false},
              filter: function(o) {
                return o && (o.label != this.model.selected_ts);
              },
            },{
              id: 'obj_type', label: gettext('Object type'),
              type: 'text', disabled: false, control: 'select2',
              select2: { allowClear: false, width: '100%' },
              options: [
                {label: gettext('All'), value: 'all'},
                {label: gettext('Tables'), value: 'tables'},
                {label: gettext('Indexes'), value: 'indexes'},
                {label: gettext('Materialized views'), value: 'materialized_views'},
              ],
            },{
              id: 'user', label: gettext('Object owner'),
              type: 'text', disabled: false, control: 'node-list-by-name',
              node: 'role', select2: {allowClear: false},
            },{
              id: 'sqltab', label: gettext('SQL'), group: gettext('SQL'),
              type: 'text', disabled: false, control: Backform.SqlTabControl.extend({
                initialize: function() {
                  // Initialize parent class
                  Backform.SqlTabControl.prototype.initialize.apply(this, arguments);
                },
                onTabChange: function(sql_tab_obj) {
                  // Fetch the information only if the SQL tab is visible at the moment.
                  if (this.dialog && sql_tab_obj.shown == this.tabIndex) {
                    var self = this,
                      sql_tab_args = self.model.toJSON();
                    // Add existing tablespace
                    sql_tab_args.old_tblspc = this.model.selected_ts;

                    // Fetches modified SQL
                    $.ajax({
                      url: msql_url,
                      type: 'GET',
                      cache: false,
                      data: sql_tab_args,
                      dataType: 'json',
                      contentType: 'application/json',
                    }).done(function(res) {
                      self.sqlCtrl.clearHistory();
                      self.sqlCtrl.setValue(res.data);
                      self.sqlCtrl.refresh();
                    }).fail(function() {
                      self.model.trigger('pgadmin-view:msql:error');
                    }).always(function() {
                      self.model.trigger('pgadmin-view:msql:fetched');
                    });
                  }
                },
              }),
            }],
            validate: function() {
              return null;
            },
          });

          if(!Alertify.move_objects_dlg) {
            Alertify.dialog('move_objects_dlg' ,function factory() {
              return {
                main: function() {
                  var title = gettext('Move objects to another tablespace');
                  this.set('title', title);
                },
                build: function() {
                  Alertify.pgDialogBuild.apply(this);
                },
                setup:function() {
                  return {
                    buttons: [{
                      text: '', key: 112,
                      className: 'btn btn-primary-icon pull-left fa fa-question pg-alertify-icon-button',
                      attrs:{name:'dialog_help', type:'button', label: gettext('Users'),
                        url: url_for('help.static', {'filename': 'move_objects.html'})},
                    },{
                      text: gettext('Cancel'), key: 27, className: 'btn btn-secondary fa fa-lg fa-times pg-alertify-button',
                    },{
                      text: gettext('OK'), key: 13, className: 'btn btn-primary fa fa-lg fa-save pg-alertify-button',
                    }],
                    // Set options for dialog
                    options: {
                      //disable both padding and overflow control.
                      padding : !1,
                      overflow: !1,
                      modal: false,
                      resizable: true,
                      maximizable: true,
                      pinnable: false,
                      closableByDimmer: false,
                    },
                  };
                },
                hooks: {
                  // Triggered when the dialog is closed
                  onclose: function() {
                    if (this.view) {
                      // clear our backform model/view
                      this.view.remove({data: true, internal: true, silent: true});
                    }
                  },
                },
                prepare: function() {
                  var self = this,
                    $container = $('<div class=\'move_objects\'></div>');
                  //Disbale Okay button
                  this.__internal.buttons[2].element.disabled = true;
                  // Find current/selected node
                  var tree = pgBrowser.tree,
                    _i = tree.selected(),
                    _d = _i && _i.length == 1 ? tree.itemData(_i) : undefined,
                    node = _d && pgBrowser.Nodes[_d._type];

                  if (!_d)
                    return;
                  // Create treeInfo
                  var treeInfo = pgAdmin.tree.getTreeNodeHierarchy.apply(node, [_i]);
                  // Instance of backbone model
                  var newModel = new objModel({}, {node_info: treeInfo, selected_ts: _d.label}),
                    fields = Backform.generateViewSchema(
                      treeInfo, newModel, 'create', node,
                      treeInfo.server, true
                    );

                  var view = this.view = new Backform.Dialog({
                    el: $container, model: newModel, schema: fields,
                  });
                  // Add our class to alertify
                  $(this.elements.body.childNodes[0]).addClass(
                    'alertify_tools_dialog_properties obj_properties'
                  );
                  // Render dialog
                  view.render();

                  this.elements.content.appendChild($container.get(0));

                  // Listen to model & if filename is provided then enable Backup button
                  this.view.model.on('change', function() {
                    if (!_.isUndefined(this.get('tblspc')) && this.get('tblspc') !== '') {
                      this.errorModel.clear();
                      self.__internal.buttons[2].element.disabled = false;
                    } else {
                      self.__internal.buttons[2].element.disabled = true;
                      this.errorModel.set('tblspc', gettext('Please select tablespace.'));
                    }
                  });
                },
                // Callback functions when click on the buttons of the Alertify dialogs
                callback: function(e) {
                  if (e.button.element.name == 'dialog_help') {
                    e.cancel = true;
                    pgBrowser.showHelp(e.button.element.name, e.button.element.getAttribute('url'),
                      null, null);
                    return;
                  }
                  if (e.button.text === gettext('OK')) {
                    var self = this,
                      btn_args =  this.view.model.toJSON();
                    btn_args.old_tblspc = d.label;
                    e.cancel = true;
                    Notify.confirm(
                      gettext('Move objects...'),
                      gettext(
                        'Are you sure you wish to move the objects from %s to %s?',
                        btn_args.old_tblspc, btn_args.tblspc
                      ),
                      function() {
                        $.ajax({
                          url: url,
                          method:'PUT',
                          data:{'data': JSON.stringify(btn_args) },
                        })
                          .done(function(res) {
                            if (res.success) {
                              Notify.success(res.info);
                              self.close();
                            } else {
                              Notify.error(res.errormsg);
                            }
                          })
                          .fail(function(xhr, status, error) {
                            Notify.pgRespErrorNotify(xhr, error);
                          });
                      },
                      function() {
                        // Do nothing as user cancel the operation
                      }
                    );
                  }
                },
              };
            });
          }
          Alertify.move_objects_dlg(true).resizeTo(pgBrowser.stdW.md,pgBrowser.stdH.md);
        },
      },

      getSchema: function(treeNodeInfo, itemNodeData) {
        return new TablespaceSchema(
          ()=>getNodeVariableSchema(this, treeNodeInfo, itemNodeData, false, false),
          (privileges)=>getNodePrivilegeRoleSchema(this, treeNodeInfo, itemNodeData, privileges),
          {
            role: ()=>getNodeListByName('role', treeNodeInfo, itemNodeData),
          },
          {
            spcuser: pgBrowser.serverInfo[treeNodeInfo.server._id].user.name,
          }
        );
      },

      model: pgBrowser.Node.Model.extend({
        idAttribute: 'oid',

        // Default values!
        initialize: function(attrs, args) {
          var isNew = (_.size(attrs) === 0);

          if (isNew) {
            var userInfo = pgBrowser.serverInfo[args.node_info.server._id].user;
            this.set({'spcuser': userInfo.name}, {silent: true});
          }
          pgBrowser.Node.Model.prototype.initialize.apply(this, arguments);
        },

        schema: [
          {
            id: 'name', label: gettext('Name'), cell: 'string',
            type: 'text',
          }, {
            id: 'spcuser', label: gettext('Owner'), cell: 'string',
            type: 'text', control: 'node-list-by-name', node: 'role',
            select2: {allowClear: false},
          }, {
            id: 'description', label: gettext('Comment'), cell: 'string',
            type: 'multiline',
          },
        ],
      }),
    });

  }

  return pgBrowser.Nodes['coll-tablespace'];
});
