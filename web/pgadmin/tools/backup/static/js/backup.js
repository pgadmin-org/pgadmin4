/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Backup dialog
define([
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore',
  'pgadmin.alertifyjs', 'backbone', 'pgadmin.backgrid',
  'pgadmin.backform', 'pgadmin.browser', 'sources/utils',
  'tools/backup/static/js/menu_utils',
  'tools/backup/static/js/backup_dialog',
  'sources/nodes/supported_database_node',
], function(
  gettext, url_for, $, _, alertify, Backbone, Backgrid, Backform, pgBrowser,
  commonUtils, menuUtils, globalBackupDialog, supportedNodes
) {

  // if module is already initialized, refer to that.
  if (pgBrowser.Backup) {
    return pgBrowser.Backup;
  }

  /*
  =====================
  TODO LIST FOR BACKUP:
  =====================
  1) Add Object tree on object tab which allows user to select
     objects which can be backed up
  2) Allow user to select/deselect objects
  3) If database is selected in browser
     show all database children objects selected in Object tree
  4) If schema is selected in browser
     show all schema children objects selected in Object tree
  5) If table is selected then show table/schema/database selected
     in Object tree
  6) if root objects like database/schema is not selected and their
     children are selected then add them separately with in tables attribute
     with schema.
  */

  //Backup Model (Server Node)
  var BackupModel = Backbone.Model.extend({
    idAttribute: 'id',
    defaults: {
      file: undefined,
      role: undefined,
      dqoute: false,
      verbose: true,
      type: undefined,
      /* global */
    },
    schema: [{
      id: 'file',
      label: gettext('Filename'),
      type: 'text',
      disabled: false,
      control: Backform.FileControl,
      dialog_type: 'create_file',
      supp_types: ['*', 'sql', 'backup'],
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
      label: gettext('Miscellaneous'),
      contentClass: 'row',
      schema: [{
        id: 'verbose',
        label: gettext('Verbose messages'),
        type: 'switch',
        disabled: false,
        group: gettext('Miscellaneous'),
      }, {
        id: 'dqoute',
        label: gettext('Force double quote on identifiers'),
        type: 'switch',
        disabled: false,
        group: gettext('Miscellaneous'),
        controlLabelClassName: 'control-label pg-el-sm-6 pg-el-12',
        controlsClassName: 'pgadmin-controls pg-el-sm-6 pg-el-12',
      }],
    }, {
      id: 'globals_note',
      label: gettext('Note'),
      text: gettext('Only objects global to the entire database will be backed up, in PLAIN format'),
      type: 'note',
    }, {}],
    validate: function() {
      // TODO: HOW TO VALIDATE ???
      return null;
    },
  });

  //Backup Model (Objects like Database/Schema/Table)
  var BackupObjectModel = Backbone.Model.extend({
    idAttribute: 'id',
    defaults: {
      file: undefined,
      role: undefined,
      format: 'custom',
      verbose: true,
      blobs: true,
      encoding: undefined,
      schemas: [],
      tables: [],
      database: undefined,
    },
    schema: [{
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
            this.field.attributes.dialog_type = 'create_file';
          }

          Backform.InputControl.prototype.render.apply(this, arguments);
          return this;
        },
      }),
      dialog_type: 'create_file',
      supp_types: ['*', 'sql', 'backup'],
      deps: ['format'],
    }, {
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
        label: gettext('Custom'),
        value: 'custom',
      },
      {
        label: gettext('Tar'),
        value: 'tar',
      },
      {
        label: gettext('Plain'),
        value: 'plain',
      },
      {
        label: gettext('Directory'),
        value: 'directory',
      },
      ],
      visible: function(m) {
        if (!_.isUndefined(m.get('type')) && m.get('type') === 'server') {
          setTimeout(function() { m.set('format', 'plain'); }, 10);
          return false;
        }
        return true;
      },
    }, {
      id: 'ratio',
      label: gettext('Compression ratio'),
      type: 'int',
      min: 0,
      max: 9,
      deps: ['format'],
      disabled: function(m) {
        return (m.get('format') === 'tar');
      },
      visible: function(m) {
        if (!_.isUndefined(m.get('type')) && m.get('type') === 'server')
          return false;
        return true;
      },
    }, {
      id: 'encoding',
      label: gettext('Encoding'),
      type: 'text',
      disabled: false,
      node: 'database',
      control: 'node-ajax-options',
      url: 'get_encodings',
      visible: function(m) {
        if (!_.isUndefined(m.get('type')) && m.get('type') === 'server') {
          var t = pgBrowser.tree,
            i = t.selected(),
            d = i && i.length == 1 ? t.itemData(i) : undefined;
          return _.isUndefined(d) ? false : d.version >= 110000;
        }
        return true;
      },
    }, {
      id: 'no_of_jobs',
      label: gettext('Number of jobs'),
      type: 'int',
      deps: ['format'],
      disabled: function(m) {
        return (m.get('format') !== 'directory');
      },
      visible: function(m) {
        if (!_.isUndefined(m.get('type')) && m.get('type') === 'server')
          return false;
        return true;
      },
    }, {
      id: 'role',
      label: gettext('Role name'),
      control: 'node-list-by-name',
      node: 'role',
      select2: {
        allowClear: false,
      },
    },  {
      id: 'server_note',
      label: gettext('Note'),
      text: gettext('The backup format will be PLAIN'),
      type: 'note',
      visible: function(m) {
        return m.get('type') === 'server';
      },
    }, {
      type: 'nested',
      control: 'fieldset',
      label: gettext('Sections'),
      group: gettext('Dump options'),
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
          return m.get('only_data') ||
            m.get('only_schema');
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
          return m.get('only_data') ||
            m.get('only_schema');
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
          return m.get('only_data') ||
            m.get('only_schema');
        },
      }],
      visible: function(m) {
        if (!_.isUndefined(m.get('type')) && m.get('type') === 'server')
          return false;
        return true;
      },
    }, {
      type: 'nested',
      control: 'fieldset',
      label: gettext('Type of objects'),
      group: gettext('Dump options'),
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
          return m.get('pre_data') ||
            m.get('data') ||
            m.get('post_data') ||
            m.get('only_schema');
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
          return m.get('pre_data') ||
            m.get('data') ||
            m.get('post_data') ||
            m.get('only_data');
        },
      }, {
        id: 'blobs',
        label: gettext('Blobs'),
        type: 'switch',
        extraToggleClasses: 'pg-el-sm-6',
        controlLabelClassName: 'control-label pg-el-sm-5 pg-el-12',
        controlsClassName: 'pgadmin-controls pg-el-sm-7 pg-el-12',
        disabled: false,
        group: gettext('Type of objects'),
        visible: function(m) {
          if (!_.isUndefined(m.get('type')) && m.get('type') === 'server') {
            setTimeout(function() { m.set('blobs', false); }, 10);
            return false;
          }
          return true;
        },
      }],
    }, {
      type: 'nested',
      control: 'fieldset',
      label: gettext('Do not save'),
      group: gettext('Dump options'),
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
        id: 'dns_unlogged_tbl_data',
        label: gettext('Unlogged table data'),
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
      group: gettext('Dump options'),
      contentClass: 'row',
      schema: [{
        id: 'use_column_inserts',
        label: gettext('Use Column Inserts'),
        type: 'switch',
        extraToggleClasses: 'pg-el-sm-6',
        controlLabelClassName: 'control-label pg-el-sm-5 pg-el-12',
        controlsClassName: 'pgadmin-controls pg-el-sm-7 pg-el-12',
        disabled: false,
        group: gettext('Queries'),
      }, {
        id: 'use_insert_commands',
        label: gettext('Use Insert Commands'),
        type: 'switch',
        extraToggleClasses: 'pg-el-sm-6',
        controlLabelClassName: 'control-label pg-el-sm-5 pg-el-12',
        controlsClassName: 'pgadmin-controls pg-el-sm-7 pg-el-12',
        disabled: false,
        group: gettext('Queries'),
      }, {
        id: 'include_create_database',
        label: gettext('Include CREATE DATABASE statement'),
        type: 'switch',
        extraToggleClasses: 'pg-el-sm-6',
        controlLabelClassName: 'control-label pg-el-sm-5 pg-el-12',
        controlsClassName: 'pgadmin-controls pg-el-sm-7 pg-el-12',
        disabled: false,
        group: gettext('Queries'),
        visible: function(m) {
          if (!_.isUndefined(m.get('type')) && m.get('type') === 'server')
            return false;
          return true;
        },
      }, {
        id: 'include_drop_database',
        label: gettext('Include DROP DATABASE statement'),
        type: 'switch',
        extraToggleClasses: 'pg-el-sm-6',
        controlLabelClassName: 'control-label pg-el-sm-5 pg-el-12',
        controlsClassName: 'pgadmin-controls pg-el-sm-7 pg-el-12',
        group: gettext('Queries'),
        deps: ['only_data'],
        disabled: function(m) {
          if (m.get('only_data')) {
            setTimeout(function() { m.set('include_drop_database', false); }, 10);
            return true;
          }
          return false;
        },
      }, {
        id: 'load_via_partition_root',
        label: gettext('Load Via Partition Root'),
        type: 'switch',
        extraToggleClasses: 'pg-el-sm-6',
        controlLabelClassName: 'control-label pg-el-sm-5 pg-el-12',
        controlsClassName: 'pgadmin-controls pg-el-sm-7 pg-el-12',
        disabled: false,
        group: gettext('Queries'),
        visible: function(m) {
          if (!_.isUndefined(m.get('type')) && m.get('type') === 'server')
            return false;

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
      label: gettext('Disable'),
      group: gettext('Dump options'),
      contentClass: 'row',
      schema: [{
        id: 'disable_trigger',
        label: gettext('Trigger'),
        type: 'switch',
        extraToggleClasses: 'pg-el-sm-6',
        controlLabelClassName: 'control-label pg-el-sm-5 pg-el-12',
        controlsClassName: 'pgadmin-controls pg-el-sm-7 pg-el-12',
        group: gettext('Disable'),
        deps: ['only_data'],
        disabled: function(m) {
          return !(m.get('only_data'));
        },
      }, {
        id: 'disable_quoting',
        label: gettext('$ quoting'),
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
      label: gettext('Miscellaneous'),
      group: gettext('Dump options'),
      contentClass: 'row',
      schema: [{
        id: 'with_oids',
        label: gettext('With OID(s)'),
        type: 'switch',
        extraToggleClasses: 'pg-el-sm-6',
        controlLabelClassName: 'control-label pg-el-sm-5 pg-el-12',
        controlsClassName: 'pgadmin-controls pg-el-sm-7 pg-el-12',
        deps: ['use_column_inserts', 'use_insert_commands'],
        group: gettext('Miscellaneous'),
        disabled: function(m) {
          var t = pgBrowser.tree,
            i = t.selected(),
            d = i && i.length == 1 ? t.itemData(i) : undefined,
            s = _.isUndefined(d) ? undefined : pgBrowser.Nodes[d._type].getTreeNodeHierarchy(i)['server'];

          if (!_.isUndefined(s) && s.version >= 120000)
            return true;

          if (m.get('use_column_inserts') || m.get('use_insert_commands')) {
            setTimeout(function() { m.set('with_oids', false); }, 10);
            return true;
          }
          return false;
        },
      }, {
        id: 'verbose',
        label: gettext('Verbose messages'),
        type: 'switch',
        extraToggleClasses: 'pg-el-sm-6',
        controlLabelClassName: 'control-label pg-el-sm-5 pg-el-12',
        controlsClassName: 'pgadmin-controls pg-el-sm-7 pg-el-12',
        disabled: false,
        group: gettext('Miscellaneous'),
      }, {
        id: 'dqoute',
        label: gettext('Force double quote on identifiers'),
        type: 'switch',
        extraToggleClasses: 'pg-el-sm-6',
        controlLabelClassName: 'control-label pg-el-sm-5 pg-el-12',
        controlsClassName: 'pgadmin-controls pg-el-sm-7 pg-el-12',
        disabled: false,
        group: gettext('Miscellaneous'),
      }, {
        id: 'use_set_session_auth',
        label: gettext('Use SET SESSION AUTHORIZATION'),
        type: 'switch',
        extraToggleClasses: 'pg-el-sm-6',
        controlLabelClassName: 'control-label pg-el-sm-5 pg-el-12',
        controlsClassName: 'pgadmin-controls pg-el-sm-7 pg-el-12',
        disabled: false,
        group: gettext('Miscellaneous'),
      }],
    }],
    validate: function() {
      return null;
    },
  });

  // Create an Object Backup of pgBrowser class
  pgBrowser.Backup = {
    init: function() {
      if (this.initialized)
        return;

      this.initialized = true;

      // Define the nodes on which the menus to be appear
      var menus = [{
        name: 'backup_global',
        module: this,
        applies: ['tools'],
        callback: 'start_backup_global',
        priority: 12,
        label: gettext('Backup Globals...'),
        icon: 'fa fa-save',
        enable: menuUtils.menuEnabledServer,
        data: {
          data_disabled: gettext('Please select any server from the browser tree to take Backup of global objects.'),
        },
      }, {
        name: 'backup_server',
        module: this,
        applies: ['tools'],
        callback: 'start_backup_server',
        priority: 12,
        label: gettext('Backup Server...'),
        icon: 'fa fa-save',
        enable: menuUtils.menuEnabledServer,
        data: {
          data_disabled: gettext('Please select any server from the browser tree to take Server Backup.'),
        },
      }, {
        name: 'backup_global_ctx',
        module: this,
        node: 'server',
        applies: ['context'],
        callback: 'start_backup_global',
        priority: 12,
        label: gettext('Backup Globals...'),
        icon: 'fa fa-save',
        enable: menuUtils.menuEnabledServer,
        data: {
          data_disabled: gettext('Please select any database or schema or table from the browser tree to take Backup.'),
        },
      }, {
        name: 'backup_server_ctx',
        module: this,
        node: 'server',
        applies: ['context'],
        callback: 'start_backup_server',
        priority: 12,
        label: gettext('Backup Server...'),
        icon: 'fa fa-save',
        enable: menuUtils.menuEnabledServer,
        data: {
          data_disabled: gettext('Please select any server from the browser tree to take Server Backup.'),
        },
      }, {
        name: 'backup_object',
        module: this,
        applies: ['tools'],
        callback: 'backup_objects',
        priority: 11,
        label: gettext('Backup...'),
        icon: 'fa fa-save',
        enable: supportedNodes.enabled.bind(
          null, pgBrowser.treeMenu, menuUtils.backupSupportedNodes
        ),
        data: {
          data_disabled: gettext('Please select any database or schema or table from the browser tree to take Backup.'),
        },
      }];

      for (var idx = 0; idx < menuUtils.backupSupportedNodes.length; idx++) {
        menus.push({
          name: 'backup_' + menuUtils.backupSupportedNodes[idx],
          node: menuUtils.backupSupportedNodes[idx],
          module: this,
          applies: ['context'],
          callback: 'backup_objects',
          priority: 11,
          label: gettext('Backup...'),
          icon: 'fa fa-save',
          enable: supportedNodes.enabled.bind(
            null, pgBrowser.treeMenu, menuUtils.backupSupportedNodes
          ),
        });
      }

      pgBrowser.add_menus(menus);
      return this;
    },
    start_backup_global: function(action, item) {
      let dialog = new globalBackupDialog.BackupDialog(
        pgBrowser,
        $,
        alertify,
        BackupModel
      );
      dialog.draw(action, item, {'globals': true}, pgBrowser.stdW.calc(pgBrowser.stdW.md), pgBrowser.stdH.calc(pgBrowser.stdH.md));
    },
    start_backup_server: function(action, item) {
      let dialog = new globalBackupDialog.BackupDialog(
        pgBrowser,
        $,
        alertify,
        BackupObjectModel
      );
      dialog.draw(action, item, {'server': true}, pgBrowser.stdW.calc(pgBrowser.stdW.md), pgBrowser.stdH.calc(pgBrowser.stdH.md));
    },
    // Callback to draw Backup Dialog for objects
    backup_objects: function(action, treeItem) {
      let dialog = new globalBackupDialog.BackupDialog(
        pgBrowser,
        $,
        alertify,
        BackupObjectModel
      );
      dialog.draw(action, treeItem, null, pgBrowser.stdW.calc(pgBrowser.stdW.md), pgBrowser.stdH.calc(pgBrowser.stdH.md));
    },
  };
  return pgBrowser.Backup;
});
