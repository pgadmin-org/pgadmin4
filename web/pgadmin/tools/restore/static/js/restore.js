/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define('tools.restore', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore', 'backbone',
  'pgadmin.alertifyjs', 'pgadmin.browser',
  'pgadmin.backgrid', 'pgadmin.backform', 'sources/utils',
  'tools/restore/static/js/menu_utils',
  'sources/nodes/supported_database_node',
  'tools/restore/static/js/restore_dialog',
], function(
  gettext, url_for, $, _, Backbone, alertify, pgBrowser, Backgrid, Backform,
  commonUtils, menuUtils, supportedNodes, restoreDialog
) {

  // if module is already initialized, refer to that.
  if (pgBrowser.Restore) {
    return pgBrowser.Restore;
  }

  //Restore Model (Objects like Database/Schema/Table)
  var RestoreObjectModel = Backbone.Model.extend({
    idAttribute: 'id',
    defaults: {
      custom: false,
      file: undefined,
      role: undefined,
      format: 'custom',
      verbose: true,
      blobs: true,
      encoding: undefined,
      database: undefined,
      schemas: undefined,
      tables: undefined,
      functions: undefined,
      triggers: undefined,
      trigger_funcs: undefined,
      indexes: undefined,
    },

    // Default values!
    initialize: function(attrs) {
      // Set default options according to node type selection by user
      var node_type = attrs.node_data.type;

      if (node_type) {
        // Only_Schema option
        if (node_type === 'function' || node_type === 'index' ||
          node_type === 'trigger') {
          this.set({
            'only_schema': true,
          }, {
            silent: true,
          });
        }

        // Only_Data option
        if (node_type === 'table') {
          this.set({
            'only_data': true,
          }, {
            silent: true,
          });
        }

        // Clean option
        if (node_type === 'function' || node_type === 'trigger_function') {
          this.set({
            'clean': true,
          }, {
            silent: true,
          });
        }
      }
      Backbone.Model.prototype.initialize.apply(this, arguments);
    },
    schema: [{
      id: 'format',
      label: gettext('Format'),
      type: 'text',
      disabled: false,
      control: 'select2',
      select2: {
        allowClear: false,
        width: '100%',
      },
      options: [{
        label: gettext('Custom or tar'),
        value: 'custom',
      },
      {
        label: gettext('Directory'),
        value: 'directory',
      },
      ],
    }, {
      id: 'file',
      label: gettext('Filename'),
      type: 'text',
      disabled: false,
      control: Backform.FileControl.extend({
        render: function() {
          var attributes = this.model.toJSON();
          if (attributes.format == 'directory') {
            this.field.attributes.dialog_type = 'select_folder';
          }
          else {
            this.field.attributes.dialog_type = 'select_file';
          }

          Backform.InputControl.prototype.render.apply(this, arguments);
          return this;
        },
      }),
      dialog_type: 'select_file',
      supp_types: ['*', 'backup', 'sql', 'patch'],
      deps: ['format'],
    }, {
      id: 'no_of_jobs',
      label: gettext('Number of jobs'),
      type: 'int',
    }, {
      id: 'role',
      label: gettext('Role name'),
      control: 'node-list-by-name',
      node: 'role',
      select2: {
        allowClear: false,
      },
    }, {
      type: 'nested',
      control: 'fieldset',
      label: gettext('Sections'),
      group: gettext('Restore options'),
      contentClass: 'row',
      schema: [{
        id: 'pre_data',
        label: gettext('Pre-data'),
        type: 'switch',
        extraToggleClasses: 'pg-el-sm-6',
        controlLabelClassName: 'control-label pg-el-sm-5 pg-el-12',
        controlsClassName: 'pgadmin-controls pg-el-sm-7 pg-el-12',
        group: gettext('Sections'),
        deps: ['only_data', 'only_schema'],
        disabled: function(m) {
          return this.node.type !== 'function' && this.node.type !== 'table' &&
            this.node.type !== 'trigger' &&
            this.node.type !== 'trigger_function' &&
            (m.get('only_data') || m.get('only_schema'));
        },
      }, {
        id: 'data',
        label: gettext('Data'),
        type: 'switch',
        extraToggleClasses: 'pg-el-sm-6',
        controlLabelClassName: 'control-label pg-el-sm-5 pg-el-12',
        controlsClassName: 'pgadmin-controls pg-el-sm-7 pg-el-12',
        group: gettext('Sections'),
        deps: ['only_data', 'only_schema'],
        disabled: function(m) {
          return this.node.type !== 'function' && this.node.type !== 'table' &&
            this.node.type !== 'trigger' &&
            this.node.type !== 'trigger_function' &&
            (m.get('only_data') || m.get('only_schema'));
        },
      }, {
        id: 'post_data',
        label: gettext('Post-data'),
        type: 'switch',
        extraToggleClasses: 'pg-el-sm-6',
        controlLabelClassName: 'control-label pg-el-sm-5 pg-el-12',
        controlsClassName: 'pgadmin-controls pg-el-sm-7 pg-el-12',
        group: gettext('Sections'),
        deps: ['only_data', 'only_schema'],
        disabled: function(m) {
          return this.node.type !== 'function' && this.node.type !== 'table' &&
            this.node.type !== 'trigger' &&
            this.node.type !== 'trigger_function' &&
            (m.get('only_data') || m.get('only_schema'));
        },
      }],
    }, {
      type: 'nested',
      control: 'fieldset',
      label: gettext('Type of objects'),
      group: gettext('Restore options'),
      contentClass: 'row',
      schema: [{
        id: 'only_data',
        label: gettext('Only data'),
        type: 'switch',
        extraToggleClasses: 'pg-el-sm-6',
        controlLabelClassName: 'control-label pg-el-sm-5 pg-el-12',
        controlsClassName: 'pgadmin-controls pg-el-sm-7 pg-el-12',
        group: gettext('Type of objects'),
        deps: ['pre_data', 'data', 'post_data', 'only_schema'],
        disabled: function(m) {
          return (this.node.type !== 'database' && this.node.type !== 'schema') ||
            (m.get('pre_data') ||
              m.get('data') ||
              m.get('post_data') ||
              m.get('only_schema')
            );
        },
      }, {
        id: 'only_schema',
        label: gettext('Only schema'),
        type: 'switch',
        extraToggleClasses: 'pg-el-sm-6',
        controlLabelClassName: 'control-label pg-el-sm-5 pg-el-12',
        controlsClassName: 'pgadmin-controls pg-el-sm-7 pg-el-12',
        group: gettext('Type of objects'),
        deps: ['pre_data', 'data', 'post_data', 'only_data'],
        disabled: function(m) {
          return (this.node.type !== 'database' && this.node.type !== 'schema') ||
            (m.get('pre_data') ||
              m.get('data') ||
              m.get('post_data') ||
              m.get('only_data')
            );
        },
      }],
    }, {
      type: 'nested',
      control: 'fieldset',
      label: gettext('Do not save'),
      group: gettext('Restore options'),
      contentClass: 'row',
      schema: [{
        id: 'dns_owner',
        label: gettext('Owner'),
        type: 'switch',
        extraToggleClasses: 'pg-el-sm-6',
        controlLabelClassName: 'control-label pg-el-sm-5 pg-el-12',
        controlsClassName: 'pgadmin-controls pg-el-sm-7 pg-el-12',
        disabled: false,
        group: gettext('Do not save'),
      }, {
        id: 'dns_privilege',
        label: gettext('Privilege'),
        type: 'switch',
        extraToggleClasses: 'pg-el-sm-6',
        controlLabelClassName: 'control-label pg-el-sm-5 pg-el-12',
        controlsClassName: 'pgadmin-controls pg-el-sm-7 pg-el-12',
        disabled: false,
        group: gettext('Do not save'),
      }, {
        id: 'dns_tablespace',
        label: gettext('Tablespace'),
        type: 'switch',
        extraToggleClasses: 'pg-el-sm-6',
        controlLabelClassName: 'control-label pg-el-sm-5 pg-el-12',
        controlsClassName: 'pgadmin-controls pg-el-sm-7 pg-el-12',
        disabled: false,
        group: gettext('Do not save'),
      }, {
        id: 'no_comments',
        label: gettext('Comments'),
        type: 'switch',
        extraToggleClasses: 'pg-el-sm-6',
        controlLabelClassName: 'control-label pg-el-sm-5 pg-el-12',
        controlsClassName: 'pgadmin-controls pg-el-sm-7 pg-el-12',
        disabled: false,
        group: gettext('Do not save'),
        visible: function() {
          var t = pgBrowser.tree,
            i = t.selected(),
            d = i && i.length == 1 ? t.itemData(i) : undefined,
            s = _.isUndefined(d) ? undefined : pgBrowser.Nodes[d._type].getTreeNodeHierarchy(i)['server'];

          return _.isUndefined(s) ? false : s.version >= 110000;
        },
      }],
    }, {
      type: 'nested',
      control: 'fieldset',
      label: gettext('Queries'),
      group: gettext('Restore options'),
      contentClass: 'row',
      schema: [{
        id: 'include_create_database',
        label: gettext('Include CREATE DATABASE statement'),
        type: 'switch',
        extraToggleClasses: 'pg-el-sm-6',
        controlLabelClassName: 'control-label pg-el-sm-5 pg-el-12',
        controlsClassName: 'pgadmin-controls pg-el-sm-7 pg-el-12',
        disabled: false,
        group: gettext('Queries'),
      }, {
        id: 'clean',
        label: gettext('Clean before restore'),
        type: 'switch',
        extraToggleClasses: 'pg-el-sm-6',
        controlLabelClassName: 'control-label pg-el-sm-5 pg-el-12',
        controlsClassName: 'pgadmin-controls pg-el-sm-7 pg-el-12',
        group: gettext('Queries'),
        disabled: function() {
          return this.node.type === 'function' ||
            this.node.type === 'trigger_function';
        },
      }, {
        id: 'single_transaction',
        label: gettext('Single transaction'),
        type: 'switch',
        extraToggleClasses: 'pg-el-sm-6',
        controlLabelClassName: 'control-label pg-el-sm-5 pg-el-12',
        controlsClassName: 'pgadmin-controls pg-el-sm-7 pg-el-12',
        disabled: false,
        group: gettext('Queries'),
      }],
    }, {
      type: 'nested',
      control: 'fieldset',
      label: gettext('Disable'),
      group: gettext('Restore options'),
      contentClass: 'row',
      schema: [{
        id: 'disable_trigger',
        label: gettext('Trigger'),
        type: 'switch',
        extraToggleClasses: 'pg-el-sm-6',
        controlLabelClassName: 'control-label pg-el-sm-5 pg-el-12',
        controlsClassName: 'pgadmin-controls pg-el-sm-7 pg-el-12',
        group: gettext('Disable'),
      }, {
        id: 'no_data_fail_table',
        label: gettext('No data for Failed Tables'),
        type: 'switch',
        extraToggleClasses: 'pg-el-sm-6',
        controlLabelClassName: 'control-label pg-el-sm-5 pg-el-12',
        controlsClassName: 'pgadmin-controls pg-el-sm-7 pg-el-12',
        disabled: false,
        group: gettext('Disable'),
      }],
    }, {
      type: 'nested',
      control: 'fieldset',
      label: gettext('Miscellaneous / Behavior'),
      group: gettext('Restore options'),
      contentClass: 'row',
      schema: [{
        id: 'verbose',
        label: gettext('Verbose messages'),
        type: 'switch',
        extraToggleClasses: 'pg-el-sm-6',
        controlLabelClassName: 'control-label pg-el-sm-5 pg-el-12',
        controlsClassName: 'pgadmin-controls pg-el-sm-7 pg-el-12',
        disabled: false,
        group: gettext('Miscellaneous / Behavior'),
      }, {
        id: 'use_set_session_auth',
        label: gettext('Use SET SESSION AUTHORIZATION'),
        type: 'switch',
        extraToggleClasses: 'pg-el-sm-6',
        controlLabelClassName: 'control-label pg-el-sm-5 pg-el-12',
        controlsClassName: 'pgadmin-controls pg-el-sm-7 pg-el-12',
        disabled: false,
        group: gettext('Miscellaneous / Behavior'),
      }, {
        id: 'exit_on_error',
        label: gettext('Exit on error'),
        type: 'switch',
        extraToggleClasses: 'pg-el-sm-6',
        controlLabelClassName: 'control-label pg-el-sm-5 pg-el-12',
        controlsClassName: 'pgadmin-controls pg-el-sm-7 pg-el-12',
        disabled: false,
        group: gettext('Miscellaneous / Behavior'),
      }],
    }],
    validate: function() {
      return null;
    },
  });

  // Create an Object Restore of pgBrowser class
  pgBrowser.Restore = {
    init: function() {
      if (this.initialized)
        return;

      this.initialized = true;

      // Define the nodes on which the menus to be appear
      var menus = [{
        name: 'restore_object',
        module: this,
        applies: ['tools'],
        callback: 'restore_objects',
        priority: 13,
        label: gettext('Restore...'),
        icon: 'fa fa-upload',
        enable: supportedNodes.enabled.bind(
          null, pgBrowser.treeMenu, menuUtils.restoreSupportedNodes
        ),
      }];

      for (var idx = 0; idx < menuUtils.restoreSupportedNodes.length; idx++) {
        menus.push({
          name: 'restore_' + menuUtils.restoreSupportedNodes[idx],
          node: menuUtils.restoreSupportedNodes[idx],
          module: this,
          applies: ['context'],
          callback: 'restore_objects',
          priority: 13,
          label: gettext('Restore...'),
          icon: 'fa fa-upload',
          enable: supportedNodes.enabled.bind(
            null, pgBrowser.treeMenu, menuUtils.restoreSupportedNodes
          ),
        });
      }

      pgBrowser.add_menus(menus);
      return this;
    },
    // Callback to draw Backup Dialog for objects
    restore_objects: function(action, treeItem) {
      let dialog = new restoreDialog.RestoreDialog(
        pgBrowser, $, alertify, RestoreObjectModel
      );
      dialog.draw(action, treeItem, pgBrowser.stdW.calc(pgBrowser.stdW.md), pgBrowser.stdH.calc(pgBrowser.stdH.md));
    },
  };
  return pgBrowser.Restore;
});
