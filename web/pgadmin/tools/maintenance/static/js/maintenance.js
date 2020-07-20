/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
define([
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore',
  'pgadmin.alertifyjs', 'sources/pgadmin', 'pgadmin.browser', 'backbone',
  'backgrid', 'backform', 'sources/utils',
  'tools/maintenance/static/js/menu_utils',
  'sources/nodes/supported_database_node',
  'pgadmin.backform', 'pgadmin.backgrid',
  'pgadmin.browser.node.ui',
], function(
  gettext, url_for, $, _, Alertify, pgAdmin, pgBrowser, Backbone, Backgrid,
  Backform, commonUtils,
  menuUtils, supportedNodes
) {

  pgAdmin = pgAdmin || window.pgAdmin || {};

  var pgTools = pgAdmin.Tools = pgAdmin.Tools || {};

  // Return back, this has been called more than once
  if (pgAdmin.Tools.maintenance)
    return pgAdmin.Tools.maintenance;

  // Main model for Maintenance functionality
  var MaintenanceModel = Backbone.Model.extend({
    defaults: {
      op: 'VACUUM',
      vacuum_full: false,
      vacuum_freeze: false,
      vacuum_analyze: false,
      verbose: true,
    },
    initialize: function() {
      var node_info = arguments[1]['node_info'];
      // If node is Unique or Primary key then set op to reindex
      if ('primary_key' in node_info || 'unique_constraint' in node_info ||
        'index' in node_info) {
        this.set('op', 'REINDEX');
        this.set('verbose', false);
      }
    },
    schema: [{
      id: 'op',
      label: gettext('Maintenance operation'),
      cell: 'string',
      type: 'radioModern',
      controlsClassName: 'pgadmin-controls col-12 col-sm-8',
      controlLabelClassName: 'control-label col-sm-4 col-12',
      group: gettext('Options'),
      value: 'VACUUM',
      options: [{
        'label': 'VACUUM',
        'value': 'VACUUM',
      },
      {
        'label': 'ANALYZE',
        'value': 'ANALYZE',
      },
      {
        'label': 'REINDEX',
        'value': 'REINDEX',
      },
      {
        'label': 'CLUSTER',
        'value': 'CLUSTER',
      },
      ],
    },
    {
      type: 'nested',
      control: 'fieldset',
      label: gettext('Vacuum'),
      group: gettext('Options'),
      contentClass: 'row',
      schema: [{
        id: 'vacuum_full',
        group: gettext('Vacuum'),
        disabled: 'isDisabled',
        type: 'switch',
        extraToggleClasses: 'pg-el-sm-4',
        controlLabelClassName: 'control-label pg-el-sm-5 pg-el-12',
        controlsClassName: 'pgadmin-controls pg-el-sm-7 pg-el-12',
        label: gettext('FULL'),
        deps: ['op'],
      }, {
        id: 'vacuum_freeze',
        deps: ['op'],
        disabled: 'isDisabled',
        type: 'switch',
        extraToggleClasses: 'pg-el-sm-4',
        controlLabelClassName: 'control-label pg-el-sm-5 pg-el-12',
        controlsClassName: 'pgadmin-controls pg-el-sm-7 pg-el-12',
        label: gettext('FREEZE'),
        group: gettext('Vacuum'),
      }, {
        id: 'vacuum_analyze',
        deps: ['op'],
        disabled: 'isDisabled',
        type: 'switch',
        extraToggleClasses: 'pg-el-sm-4',
        controlLabelClassName: 'control-label pg-el-sm-5 pg-el-12',
        controlsClassName: 'pgadmin-controls pg-el-sm-7 pg-el-12',
        label: gettext('ANALYZE'),
        group: gettext('Vacuum'),
      }],
    },
    {
      id: 'verbose',
      group: gettext('Options'),
      deps: ['op'],
      type: 'switch',
      label: gettext('Verbose Messages'),
      disabled: 'isDisabled',
    },
    ],

    // Enable/Disable the items based on the user maintenance operation
    // selection.
    isDisabled: function(m) {
      var node_info = this.node_info;

      switch (this.name) {
      case 'vacuum_full':
      case 'vacuum_freeze':
      case 'vacuum_analyze':
        return (m.get('op') != 'VACUUM');
      case 'verbose':
        if ('primary_key' in node_info || 'unique_constraint' in node_info ||
            'index' in node_info) {
          if (m.get('op') == 'REINDEX') {
            setTimeout(function() {
              m.set('verbose', false);
            }, 10);
            return true;
          }
        }
        return m.get('op') == 'REINDEX';
      default:
        return false;
      }
    },
  });

  pgTools.maintenance = {
    init: function() {

      // We do not want to initialize the module multiple times.
      if (this.initialized)
        return;

      this.initialized = true;

      var menus = [{
        name: 'maintenance',
        module: this,
        applies: ['tools'],
        callback: 'callback_maintenance',
        priority: 10,
        label: gettext('Maintenance...'),
        icon: 'fa fa-wrench',
        enable: supportedNodes.enabled.bind(
          null, pgBrowser.treeMenu, menuUtils.maintenanceSupportedNodes
        ),
      }];

      // Add supported menus into the menus list
      for (var idx = 0; idx < menuUtils.maintenanceSupportedNodes.length; idx++) {
        menus.push({
          name: 'maintenance_context_' + menuUtils.maintenanceSupportedNodes[idx],
          node: menuUtils.maintenanceSupportedNodes[idx],
          module: this,
          applies: ['context'],
          callback: 'callback_maintenance',
          priority: 10,
          label: gettext('Maintenance...'),
          icon: 'fa fa-wrench',
          enable: supportedNodes.enabled.bind(
            null, pgBrowser.treeMenu, menuUtils.maintenanceSupportedNodes
          ),
        });
      }
      pgBrowser.add_menus(menus);
    },

    /*
      Open the dialog for the maintenance functionality
    */
    callback_maintenance: function(args, item) {
      var i = item || pgBrowser.tree.selected(),
        server_data = null;

      while (i) {
        var node_data = pgBrowser.tree.itemData(i);
        if (node_data._type == 'server') {
          server_data = node_data;
          break;
        }

        if (pgBrowser.tree.hasParent(i)) {
          i = $(pgBrowser.tree.parent(i));
        } else {
          Alertify.alert(gettext('Please select server or child node from tree.'));
          break;
        }
      }

      if (!server_data) {
        return;
      }

      var module = 'paths',
        preference_name = 'pg_bin_dir',
        msg = gettext('Please configure the PostgreSQL Binary Path in the Preferences dialog.');

      if ((server_data.type && server_data.type == 'ppas') ||
        server_data.server_type == 'ppas') {
        preference_name = 'ppas_bin_dir';
        msg = gettext('Please configure the EDB Advanced Server Binary Path in the Preferences dialog.');
      }

      var preference = pgBrowser.get_preference(module, preference_name);

      if (preference) {
        if (!preference.value) {
          Alertify.alert(gettext('Configuration required'), msg);
          return;
        }
      } else {
        Alertify.alert(gettext('Failed to load preference %s of module %s', preference_name, module));
        return;
      }

      var self = this,
        t = pgBrowser.tree;

      i = item || t.selected();

      var d = i && i.length == 1 ? t.itemData(i) : undefined;

      if (!d)
        return;

      var node = pgBrowser.Nodes[d._type],
        treeInfo = node.getTreeNodeHierarchy.apply(node, [i]);

      if (treeInfo.database._label.indexOf('=') >= 0) {
        Alertify.alert(
          gettext('Maintenance error'),
          gettext('Maintenance job creation failed. '+
          'Databases with = symbols in the name cannot be maintained using this utility.')
        );
        return;
      }

      if (!Alertify.MaintenanceDialog) {
        Alertify.dialog('MaintenanceDialog', function factory() {

          return {
            main: function(title) {
              this.set('title', title);
            },
            setup: function() {
              return {
                buttons: [{
                  text: '',
                  className: 'btn btn-primary-icon pull-left fa fa-info pg-alertify-icon-button',
                  attrs: {
                    name: 'object_help',
                    type: 'button',
                    url: 'maintenance.html',
                    label: gettext('Maintenance'),
                    'aria-label': gettext('Object Help'),
                  },
                }, {
                  text: '',
                  key: 112,
                  className: 'btn btn-primary-icon pull-left fa fa-question pg-alertify-icon-button',
                  attrs: {
                    name: 'dialog_help',
                    type: 'button',
                    label: gettext('Maintenance'),
                    'aria-label': gettext('Help'),
                    url: url_for(
                      'help.static', {
                        'filename': 'maintenance_dialog.html',
                      }
                    ),
                  },
                }, {
                  text: gettext('Cancel'),
                  key: 27,
                  className: 'btn btn-secondary fa fa-lg fa-times pg-alertify-button',
                  'data-btn-name': 'cancel',
                }, {
                  text: gettext('OK'),
                  key: 13,
                  className: 'btn btn-primary fa fa-lg fa-check pg-alertify-button',
                  'data-btn-name': 'ok',
                }],
                options: {
                  modal: 0,
                  pinnable: false,
                  //disable both padding and overflow control.
                  padding: !1,
                  overflow: !1,
                },
              };
            },
            // Callback functions when click on the buttons of the Alertify dialogs
            callback: function(e) {
              var sel_item = pgBrowser.tree.selected(),
                itemData = sel_item && sel_item.length == 1 ? pgBrowser.tree.itemData(sel_item) : undefined,
                sel_node = itemData && pgBrowser.Nodes[itemData._type];

              if (e.button.element.name == 'dialog_help' || e.button.element.name == 'object_help') {
                e.cancel = true;
                pgBrowser.showHelp(e.button.element.name, e.button.element.getAttribute('url'),
                  sel_node, sel_item);
                return;
              }

              if (e.button['data-btn-name'] === 'ok') {

                var schema = undefined,
                  table = undefined,
                  primary_key = undefined,
                  unique_constraint = undefined,
                  index = undefined;

                if (!itemData)
                  return;

                var node_hierarchy = sel_node.getTreeNodeHierarchy.apply(sel_node, [sel_item]);

                if (node_hierarchy.schema != undefined) {
                  schema = node_hierarchy.schema._label;
                }

                if (node_hierarchy.partition != undefined) {
                  table = node_hierarchy.partition._label;
                } else if (node_hierarchy.table != undefined) {
                  table = node_hierarchy.table._label;
                } else if (node_hierarchy.mview != undefined) {
                  table = node_hierarchy.mview._label;
                }

                if (node_hierarchy.primary_key != undefined) {
                  primary_key = node_hierarchy.primary_key._label;
                } else if (node_hierarchy.unique_constraint != undefined) {
                  unique_constraint = node_hierarchy.unique_constraint._label;
                } else if (node_hierarchy.index != undefined) {
                  index = node_hierarchy.index._label;
                }

                this.view.model.set({
                  'database': node_hierarchy.database._label,
                  'schema': schema,
                  'table': table,
                  'primary_key': primary_key,
                  'unique_constraint': unique_constraint,
                  'index': index,
                });

                $.ajax({
                  url: url_for(
                    'maintenance.create_job', {
                      'sid': node_hierarchy.server._id,
                      'did': node_hierarchy.database._id,
                    }),
                  method: 'POST',
                  data: {
                    'data': JSON.stringify(this.view.model.toJSON()),
                  },
                })
                  .done(function(res) {
                    if (res.data && res.data.status) {
                    //Do nothing as we are creating the job and exiting from the main dialog
                      Alertify.success(res.data.info);
                      pgBrowser.Events.trigger('pgadmin-bgprocess:created', self);
                    } else {
                      Alertify.alert(
                        gettext('Maintenance job creation failed.'),
                        res.errormsg
                      );
                    }
                  })
                  .fail(function() {
                    Alertify.alert(
                      gettext('Maintenance job creation failed.')
                    );
                  });
              }
            },
            build: function() {
              Alertify.pgDialogBuild.apply(this);
            },
            hooks: {
              onclose: function() {
                if (this.view) {
                  this.view.remove({
                    data: true,
                    internal: true,
                    silent: true,
                  });
                }
              },
              onshow: function() {
                var container = $(this.elements.body).find('.tab-content:first > .tab-pane.active:first');
                commonUtils.findAndSetFocus(container);
              },
            },
            prepare: function() {
              // Main maintenance tool dialog container
              var $container = $('<div class=\'maintenance_dlg\'></div>');
              var tree = pgBrowser.tree,
                sel_item = tree.selected(),
                itemInfo = sel_item && sel_item.length == 1 ? tree.itemData(sel_item) : undefined,
                nodeData = itemInfo && pgBrowser.Nodes[itemInfo._type];

              if (!itemInfo)
                return;

              var treeData = nodeData.getTreeNodeHierarchy.apply(nodeData, [sel_item]);

              var newModel = new MaintenanceModel({}, {
                  node_info: treeData,
                }),
                fields = Backform.generateViewSchema(
                  treeData, newModel, 'create', nodeData, treeData.server, true
                );

              var view = this.view = new Backform.Dialog({
                el: $container,
                model: newModel,
                schema: fields,
              });

              $(this.elements.body.childNodes[0]).addClass('alertify_tools_dialog_properties obj_properties');
              view.render();

              // If node is Index, Unique or Primary key then disable vacuum & analyze button
              if (itemInfo._type == 'primary_key' || itemInfo._type == 'unique_constraint' ||
                itemInfo._type == 'index') {
                var vacuum_analyze_btns = $container.find(
                  '.btn-group label.btn:lt(2)'
                ).addClass('disabled');
                // Find reindex button element & add active class to it
                var reindex_btn = vacuum_analyze_btns[1].nextElementSibling;
                $(reindex_btn).trigger('click');
              }

              view.$el.attr('tabindex', -1);
              this.elements.content.appendChild($container.get(0));
            },
          };
        });
      }

      const baseUrl = url_for('maintenance.utility_exists', {
        'sid': server_data._id,
      });

      // Check psql utility exists or not.
      $.ajax({
        url: baseUrl,
        type:'GET',
      })
        .done(function(res) {
          if (!res.success) {
            Alertify.alert(
              gettext('Utility not found'),
              res.errormsg
            );
            return;
          }
          // Open the Alertify dialog
          Alertify.MaintenanceDialog(gettext('Maintenance...')).set('resizable', true)
            .resizeTo(pgAdmin.Browser.stdW.md,pgAdmin.Browser.stdH.md);
        })
        .fail(function() {
          Alertify.alert(
            gettext('Utility not found'),
            gettext('Failed to fetch Utility information')
          );
          return;
        });
    },
  };

  return pgAdmin.Tools.maintenance;
});
