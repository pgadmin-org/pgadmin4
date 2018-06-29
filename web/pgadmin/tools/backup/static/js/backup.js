// Backup dialog
define([
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore',
  'underscore.string', 'pgadmin.alertifyjs', 'backbone', 'pgadmin.backgrid',
  'pgadmin.backform', 'pgadmin.browser', 'sources/utils',
  'tools/backup/static/js/menu_utils',
  'tools/backup/static/js/backup_dialog',
  'sources/nodes/supported_database_node',
], function(
  gettext, url_for, $, _, S, alertify, Backbone, Backgrid, Backform, pgBrowser,
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

  Backform.CustomSwitchControl = Backform.SwitchControl.extend({
    template: _.template([
      '<label class="<%=Backform.controlLabelClassName%> custom_switch_label_class"><%=label%></label>',
      '<div class="<%=Backform.controlsClassName%> custom_switch_control_class">',
      '  <div class="checkbox">',
      '    <label>',
      '      <input type="checkbox" class="<%=extraClasses.join(\' \')%>"',
      '        name="<%=name%>" <%=value ? "checked=\'checked\'" : ""%>',
      '        <%=disabled ? "disabled" : ""%> <%=required ? "required" : ""%> />',
      '    </label>',
      '  </div>',
      '</div>',
      '<% if (helpMessage && helpMessage.length) { %>',
      '  <span class="<%=Backform.helpMessageClassName%>"><%=helpMessage%></span>',
      '<% } %>',
    ].join('\n')),
    className: 'pgadmin-control-group form-group pg-el-md-6 pg-el-xs-12',
  });

  //Backup Model (Server Node)
  var BackupModel = Backbone.Model.extend({
    idAttribute: 'id',
    defaults: {
      file: undefined,
      role: undefined,
      dqoute: false,
      verbose: true,
      type: undefined,
      /* global, server */
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
      schema: [{
        id: 'verbose',
        label: gettext('Verbose messages'),
        control: Backform.CustomSwitchControl,
        disabled: false,
        group: gettext('Miscellaneous'),
      }, {
        id: 'dqoute',
        label: gettext('Force double quote on identifiers'),
        control: Backform.CustomSwitchControl,
        disabled: false,
        group: gettext('Miscellaneous'),
      }],
    }, {
      id: 'server_note',
      label: gettext('Note'),
      text: gettext('The backup format will be PLAIN'),
      type: 'note',
      visible: function(m) {
        return m.get('type') === 'server';
      },
    }, {
      id: 'globals_note',
      label: gettext('Note'),
      text: gettext('Only objects global to the entire database will be backed up in PLAIN format'),
      type: 'note',
      visible: function(m) {
        return m.get('type') === 'globals';
      },
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
    }, {
      id: 'ratio',
      label: gettext('Compression ratio'),
      type: 'int',
      min: 0,
      max: 9,
      disabled: false,
    }, {
      id: 'encoding',
      label: gettext('Encoding'),
      type: 'text',
      disabled: false,
      node: 'database',
      control: 'node-ajax-options',
      url: 'get_encodings',
    }, {
      id: 'no_of_jobs',
      label: gettext('Number of jobs'),
      type: 'int',
      deps: ['format'],
      disabled: function(m) {
        return !(m.get('format') === 'Directory');
      },
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
      group: gettext('Dump options'),
      schema: [{
        id: 'pre_data',
        label: gettext('Pre-data'),
        control: Backform.CustomSwitchControl,
        group: gettext('Sections'),
        deps: ['only_data', 'only_schema'],
        disabled: function(m) {
          return m.get('only_data') ||
            m.get('only_schema');
        },
      }, {
        id: 'data',
        label: gettext('Data'),
        control: Backform.CustomSwitchControl,
        group: gettext('Sections'),
        deps: ['only_data', 'only_schema'],
        disabled: function(m) {
          return m.get('only_data') ||
            m.get('only_schema');
        },
      }, {
        id: 'post_data',
        label: gettext('Post-data'),
        control: Backform.CustomSwitchControl,
        group: gettext('Sections'),
        deps: ['only_data', 'only_schema'],
        disabled: function(m) {
          return m.get('only_data') ||
            m.get('only_schema');
        },
      }],
    }, {
      type: 'nested',
      control: 'fieldset',
      label: gettext('Type of objects'),
      group: gettext('Dump options'),
      schema: [{
        id: 'only_data',
        label: gettext('Only data'),
        control: Backform.CustomSwitchControl,
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
        control: Backform.CustomSwitchControl,
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
        control: Backform.CustomSwitchControl,
        disabled: false,
        group: gettext('Type of objects'),
      }],
    }, {
      type: 'nested',
      control: 'fieldset',
      label: gettext('Do not save'),
      group: gettext('Dump options'),
      schema: [{
        id: 'dns_owner',
        label: gettext('Owner'),
        control: Backform.CustomSwitchControl,
        disabled: false,
        group: gettext('Do not save'),
      }, {
        id: 'dns_privilege',
        label: gettext('Privilege'),
        control: Backform.CustomSwitchControl,
        disabled: false,
        group: gettext('Do not save'),
      }, {
        id: 'dns_tablespace',
        label: gettext('Tablespace'),
        control: Backform.CustomSwitchControl,
        disabled: false,
        group: gettext('Do not save'),
      }, {
        id: 'dns_unlogged_tbl_data',
        label: gettext('Unlogged table data'),
        control: Backform.CustomSwitchControl,
        disabled: false,
        group: gettext('Do not save'),
      }],
    }, {
      type: 'nested',
      control: 'fieldset',
      label: gettext('Queries'),
      group: gettext('Dump options'),
      schema: [{
        id: 'use_column_inserts',
        label: gettext('Use Column Inserts'),
        control: Backform.CustomSwitchControl,
        disabled: false,
        group: gettext('Queries'),
      }, {
        id: 'use_insert_commands',
        label: gettext('Use Insert Commands'),
        control: Backform.CustomSwitchControl,
        disabled: false,
        group: gettext('Queries'),
      }, {
        id: 'include_create_database',
        label: gettext('Include CREATE DATABASE statement'),
        control: Backform.CustomSwitchControl,
        disabled: false,
        group: gettext('Queries'),
      }, {
        id: 'include_drop_database',
        label: gettext('Include DROP DATABASE statement'),
        control: Backform.CustomSwitchControl,
        disabled: false,
        group: gettext('Queries'),
      }],
    }, {
      type: 'nested',
      control: 'fieldset',
      label: gettext('Disable'),
      group: gettext('Dump options'),
      schema: [{
        id: 'disable_trigger',
        label: gettext('Trigger'),
        control: Backform.CustomSwitchControl,
        group: gettext('Disable'),
        deps: ['only_data'],
        disabled: function(m) {
          return !(m.get('only_data'));
        },
      }, {
        id: 'disable_quoting',
        label: gettext('$ quoting'),
        control: Backform.CustomSwitchControl,
        disabled: false,
        group: gettext('Disable'),
      }],
    }, {
      type: 'nested',
      control: 'fieldset',
      label: gettext('Miscellaneous'),
      group: gettext('Dump options'),
      schema: [{
        id: 'with_oids',
        label: gettext('With OID(s)'),
        control: Backform.CustomSwitchControl,
        disabled: false,
        group: gettext('Miscellaneous'),
      }, {
        id: 'verbose',
        label: gettext('Verbose messages'),
        control: Backform.CustomSwitchControl,
        disabled: false,
        group: gettext('Miscellaneous'),
      }, {
        id: 'dqoute',
        label: gettext('Force double quote on identifiers'),
        control: Backform.CustomSwitchControl,
        disabled: false,
        group: gettext('Miscellaneous'),
      }, {
        id: 'use_set_session_auth',
        label: gettext('Use SET SESSION AUTHORIZATION'),
        control: Backform.CustomSwitchControl,
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
        icon: 'fa fa-floppy-o',
        enable: menuUtils.menuEnabledServer,
      }, {
        name: 'backup_server',
        module: this,
        applies: ['tools'],
        callback: 'start_backup_server',
        priority: 12,
        label: gettext('Backup Server...'),
        icon: 'fa fa-floppy-o',
        enable: menuUtils.menuEnabledServer,
      }, {
        name: 'backup_global_ctx',
        module: this,
        node: 'server',
        applies: ['context'],
        callback: 'start_backup_global',
        priority: 12,
        label: gettext('Backup Globals...'),
        icon: 'fa fa-floppy-o',
        enable: menuUtils.menuEnabledServer,
      }, {
        name: 'backup_server_ctx',
        module: this,
        node: 'server',
        applies: ['context'],
        callback: 'start_backup_server',
        priority: 12,
        label: gettext('Backup Server...'),
        icon: 'fa fa-floppy-o',
        enable: menuUtils.menuEnabledServer,
      }, {
        name: 'backup_object',
        module: this,
        applies: ['tools'],
        callback: 'backup_objects',
        priority: 11,
        label: gettext('Backup...'),
        icon: 'fa fa-floppy-o',
        enable: supportedNodes.enabled.bind(
          null, pgBrowser.treeMenu, menuUtils.backupSupportedNodes
        ),
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
          icon: 'fa fa-floppy-o',
          enable: supportedNodes.enabled.bind(
            null, pgBrowser.treeMenu, menuUtils.backupSupportedNodes
          ),
        });
      }

      pgBrowser.add_menus(menus);
      return this;
    },
    start_backup_global: function(action, item) {
      var params = {
        'globals': true,
      };
      this.start_backup_global_server.apply(
        this, [action, item, params]
      );
    },
    start_backup_server: function(action, item) {
      var params = {
        'server': true,
      };
      this.start_backup_global_server.apply(
        this, [action, item, params]
      );
    },

    // Callback to draw Backup Dialog for globals/server
    start_backup_global_server: function(action, treeItem, params) {
      let dialog = new globalBackupDialog.BackupDialog(
        pgBrowser,
        $,
        alertify,
        BackupModel
      );
      dialog.draw(action, treeItem, params);
    },

    // Callback to draw Backup Dialog for objects
    backup_objects: function(action, treeItem) {
      let dialog = new globalBackupDialog.BackupDialog(
        pgBrowser,
        $,
        alertify,
        BackupObjectModel
      );
      dialog.draw(action, treeItem, null);
    },
  };
  return pgBrowser.Backup;
});
