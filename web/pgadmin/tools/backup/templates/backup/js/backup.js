define([
      'jquery', 'underscore', 'underscore.string', 'alertify',
      'pgadmin.browser', 'backbone', 'backgrid', 'backform', 'pgadmin.browser.node'
      ],

  // This defines Backup dialog
  function($, _, S, alertify, pgBrowser, Backbone, Backgrid, Backform, pgNode) {

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

    var CustomSwitchControl = Backform.CustomSwitchControl = Backform.SwitchControl.extend({
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
          '<% } %>'
        ].join("\n")),
        className: 'pgadmin-control-group form-group pg-el-md-6 pg-el-xs-12'
    });

    //Backup Model (Server Node)
    var BackupModel = Backbone.Model.extend({
      idAttribute: 'id',
      defaults: {
        file: undefined,
        role: undefined,
        dqoute: false,
        verbose: true,
        type: undefined /* global, server */
      },
      schema: [{
        id: 'file', label: '{{ _('Filename') }}',
        type: 'text', disabled: false, control: Backform.FileControl,
        dialog_type: 'create_file', supp_types: ['*', 'sql', 'backup']
      },{
        id: 'role', label: '{{ _('Role name') }}',
        control: 'node-list-by-name', node: 'role',
        select2: { allowClear: false }
      },{
        type: 'nested', control: 'fieldset', label: '{{ _('Miscellaneous') }}',
        schema:[{
          id: 'verbose', label: '{{ _('Verbose messages') }}',
          control: Backform.CustomSwitchControl, disabled: false,
          group: '{{ _('Miscellaneous') }}'
        },{
          id: 'dqoute', label: '{{ _('Force double quote on identifiers') }}',
          control: Backform.CustomSwitchControl, disabled: false,
          group: '{{ _('Miscellaneous') }}'
        }]
      },{
        id: 'server_note', label: '{{ _('Note') }}',
        text: '{{ _('The backup format will be PLAIN') }}',
        type: 'note', visible: function(m){
          return m.get('type') === 'server';
        }
      },{
        id: 'globals_note', label: '{{ _('Note') }}',
        text: '{{ _('Only objects global to the entire database will be backed up in PLAIN format') }}',
        type: 'note', visible: function(m){
          return m.get('type') === 'globals';
        }
     },{
     }],
      validate: function() {
        // TODO: HOW TO VALIDATE ???
        return null;
      }
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
        database: undefined
      },
      schema: [{
        id: 'file', label: '{{ _('Filename') }}',
        type: 'text', disabled: false, control: Backform.FileControl,
        dialog_type: 'create_file', supp_types: ['*', 'sql', 'backup']
      },{
        id: 'format', label: '{{ _('Format') }}',
        type: 'text', disabled: false,
        control: 'select2', select2: {
            allowClear: false,
            width: "100%"
        },
        options: [
          {label: "Custom", value: "custom"},
          {label: "Tar", value: "tar"},
          {label: "Plain", value: "plain"},
          {label: "Directory", value: "directory"}
        ]
      },{
        id: 'ratio', label: '{{ _('Compression ratio') }}',
        type: 'int', min: 0, max:9, disabled: false
      },{
        id: 'encoding', label: '{{ _('Encoding') }}',
        type: 'text', disabled: false,  node: 'database',
        control: 'node-ajax-options', url: 'get_encodings'
      },{
        id: 'no_of_jobs', label: '{{ _('Number of jobs') }}',
        type: 'int', deps: ['format'], disabled: function(m) {
          return !(m.get('format') === "Directory");
        }
      },{
        id: 'role', label: '{{ _('Role name') }}',
        control: 'node-list-by-name', node: 'role',
        select2: { allowClear: false }
      },{
        type: 'nested', control: 'fieldset', label: '{{ _('Sections') }}',
        group: '{{ _('Dump options') }}',
        schema:[{
          id: 'pre_data', label: '{{ _('Pre-data') }}',
          control: Backform.CustomSwitchControl, group: '{{ _('Sections') }}',
          deps: ['only_data', 'only_schema'], disabled: function(m) {
            return m.get('only_data')
                   || m.get('only_schema');
          }
        },{
          id: 'data', label: '{{ _('Data') }}',
          control: Backform.CustomSwitchControl, group: '{{ _('Sections') }}',
          deps: ['only_data', 'only_schema'], disabled: function(m) {
            return m.get('only_data')
                   || m.get('only_schema');
          }
        },{
          id: 'post_data', label: '{{ _('Post-data') }}',
          control: Backform.CustomSwitchControl, group: '{{ _('Sections') }}',
          deps: ['only_data', 'only_schema'], disabled: function(m) {
            return m.get('only_data')
                   || m.get('only_schema');
          }
        }]
      },{
        type: 'nested', control: 'fieldset', label: '{{ _('Type of objects') }}',
        group: '{{ _('Dump options') }}',
        schema:[{
          id: 'only_data', label: '{{ _('Only data') }}',
          control: Backform.CustomSwitchControl, group: '{{ _('Type of objects') }}',
          deps: ['pre_data', 'data', 'post_data','only_schema'], disabled: function(m) {
            return m.get('pre_data')
                   || m.get('data')
                   || m.get('post_data')
                   || m.get('only_schema');
          }
        },{
          id: 'only_schema', label: '{{ _('Only schema') }}',
          control: Backform.CustomSwitchControl, group: '{{ _('Type of objects') }}',
          deps: ['pre_data', 'data', 'post_data', 'only_data'], disabled: function(m) {
            return m.get('pre_data')
                   || m.get('data')
                   || m.get('post_data')
                   || m.get('only_data');
          }
        },{
          id: 'blobs', label: '{{ _('Blobs') }}',
          control: Backform.CustomSwitchControl, disabled: false, group: '{{ _('Type of objects') }}'
        }]
      },{
        type: 'nested', control: 'fieldset', label: '{{ _('Do not save') }}',
        group: '{{ _('Dump options') }}',
        schema:[{
          id: 'dns_owner', label: '{{ _('Owner') }}',
          control: Backform.CustomSwitchControl, disabled: false, group: '{{ _('Do not save') }}'
        },{
          id: 'dns_privilege', label: '{{ _('Privilege') }}',
          control: Backform.CustomSwitchControl, disabled: false, group: '{{ _('Do not save') }}'
        },{
          id: 'dns_tablespace', label: '{{ _('Tablespace') }}',
          control: Backform.CustomSwitchControl, disabled: false, group: '{{ _('Do not save') }}'
        },{
          id: 'dns_unlogged_tbl_data', label: '{{ _('Unlogged table data') }}',
          control: Backform.CustomSwitchControl, disabled: false, group: '{{ _('Do not save') }}'
        }]
      },{
        type: 'nested', control: 'fieldset', label: '{{ _('Queries') }}',
        group: '{{ _('Dump options') }}',
        schema:[{
          id: 'use_column_inserts', label: '{{ _('Use Column Inserts') }}',
          control: Backform.CustomSwitchControl, disabled: false, group: '{{ _('Queries') }}'
        },{
          id: 'use_insert_commands', label: '{{ _('Use Insert Commands') }}',
          control: Backform.CustomSwitchControl, disabled: false, group: '{{ _('Queries') }}'
        },{
          id: 'include_create_database', label: '{{ _('Include CREATE DATABASE statement') }}',
          control: Backform.CustomSwitchControl, disabled: false, group: '{{ _('Queries') }}'
        },{
          id: 'include_drop_database', label: '{{ _('Include DROP DATABASE statement') }}',
          control: Backform.CustomSwitchControl, disabled: false, group: '{{ _('Queries') }}'
        }]
      },{
        type: 'nested', control: 'fieldset', label: '{{ _('Disable') }}',
        group: '{{ _('Dump options') }}',
        schema:[{
          id: 'disable_trigger', label: '{{ _('Trigger') }}',
          control: Backform.CustomSwitchControl, group: '{{ _('Disable') }}',
          deps: ['only_data'], disabled: function(m) {
            return !(m.get('only_data'));
          }
        },{
          id: 'disable_quoting', label: '{{ _('$ quoting') }}',
          control: Backform.CustomSwitchControl, disabled: false, group: '{{ _('Disable') }}'
        }]
      },{
        type: 'nested', control: 'fieldset', label: '{{ _('Miscellaneous') }}',
        group: '{{ _('Dump options') }}',
        schema:[{
          id: 'with_oids', label: '{{ _('With OID(s)') }}',
          control: Backform.CustomSwitchControl, disabled: false, group: '{{ _('Miscellaneous') }}'
        },{
          id: 'verbose', label: '{{ _('Verbose messages') }}',
          control: Backform.CustomSwitchControl, disabled: false, group: '{{ _('Miscellaneous') }}'
        },{
          id: 'dqoute', label: '{{ _('Force double quote on identifiers') }}',
          control: Backform.CustomSwitchControl, disabled: false, group: '{{ _('Miscellaneous') }}'
        },{
          id: 'use_set_session_auth', label: '{{ _('Use SET SESSION AUTHORIZATION') }}',
          control: Backform.CustomSwitchControl, disabled: false, group: '{{ _('Miscellaneous') }}'
        }]
      }],
      validate: function() {
        return null;
      }
    });

    // Create an Object Backup of pgBrowser class
    pgBrowser.Backup  = {
      init: function() {
        if (this.initialized)
          return;

        this.initialized = true;

        // Define list of nodes on which backup context menu option appears
        var backup_supported_nodes = [
              'database', 'schema', 'table'
            ];

        /**
          Enable/disable backup menu in tools based
          on node selected
          if selected node is present in supported_nodes,
          menu will be enabled otherwise disabled.
          Also, hide it for system view in catalogs
        */
        menu_enabled = function(itemData, item, data) {
          var t = pgBrowser.tree, i = item, d = itemData;
          var parent_item = t.hasParent(i) ? t.parent(i): null,
              parent_data = parent_item ? t.itemData(parent_item) : null;
            if(!_.isUndefined(d) && !_.isNull(d) && !_.isNull(parent_data))
              return (
                (_.indexOf(backup_supported_nodes, d._type) !== -1 &&
                parent_data._type != 'catalog') ? true: false
              );
            else
              return false;
        };

        menu_enabled_server = function(itemData, item, data) {
          var t = pgBrowser.tree, i = item, d = itemData;
          var parent_item = t.hasParent(i) ? t.parent(i): null,
              parent_data = parent_item ? t.itemData(parent_item) : null;
              // If server node selected && connected
              if(!_.isUndefined(d) && !_.isNull(d))
                return (('server' === d._type) && d.connected);
              else
                false;
        };

        // Define the nodes on which the menus to be appear
        var menus = [{
          name: 'backup_global', module: this,
          applies: ['tools'], callback: 'start_backup_global',
          priority: 12, label: '{{_("Backup Globals...") }}',
          icon: 'fa fa-floppy-o', enable: menu_enabled_server
        },{
          name: 'backup_server', module: this,
          applies: ['tools'], callback: 'start_backup_server',
          priority: 12, label: '{{_("Backup Server...") }}',
          icon: 'fa fa-floppy-o', enable: menu_enabled_server
        },{
          name: 'backup_global_ctx', module: this, node: 'server',
          applies: ['context'], callback: 'start_backup_global',
          priority: 12, label: '{{_("Backup Globals...") }}',
          icon: 'fa fa-floppy-o', enable: menu_enabled_server
        },{
          name: 'backup_server_ctx', module: this, node: 'server',
          applies: ['context'], callback: 'start_backup_server',
          priority: 12, label: '{{_("Backup Server...") }}',
          icon: 'fa fa-floppy-o', enable: menu_enabled_server
        },{
          name: 'backup_object', module: this,
          applies: ['tools'], callback: 'backup_objects',
          priority: 11, label: '{{_("Backup...") }}',
          icon: 'fa fa-floppy-o', enable: menu_enabled
        }];

        for (var idx = 0; idx < backup_supported_nodes.length; idx++) {
          menus.push({
            name: 'backup_' + backup_supported_nodes[idx],
            node: backup_supported_nodes[idx], module: this,
            applies: ['context'], callback: 'backup_objects',
            priority: 11, label: '{{_("Backup...") }}',
            icon: 'fa fa-floppy-o', enable: menu_enabled
            });
        }

        pgAdmin.Browser.add_menus(menus);
        return this;
      },
      start_backup_global: function(action, item) {
        var params = {'globals': true };
        this.start_backup_global_server.apply(
          this, [action, item, params]
        );
      },
      start_backup_server: function(action, item) {
        var params = {'server': true };
        this.start_backup_global_server.apply(
          this, [action, item, params]
        );
      },

      // Callback to draw Backup Dialog for globals/server
      start_backup_global_server: function(action, item, params) {
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
            alertify.alert("{{ _("Please select server or child node from tree.") }}");
            break;
          }
        }

        if (!server_data) {
          return;
        }

        var module = 'paths',
          preference_name = 'pg_bin_dir',
          msg = '{{ _('Please configure the PostgreSQL Binary Path in the Preferences dialog.') }}';

        if ((server_data.type && server_data.type == 'ppas') ||
            server_data.server_type == 'ppas') {
          preference_name = 'ppas_bin_dir';
          msg = '{{ _('Please configure the EDB Advanced Server Binary Path in the Preferences dialog.') }}';
        }

        var preference = pgBrowser.get_preference(module, preference_name);

        if(preference) {
          if (!preference.value) {
            alertify.alert('{{ _("Configuration required") }}', msg);
            return;
          }
        } else {
          alertify.alert(S('{{ _('Failed to load preference %s of module %s') }}').sprintf(preference_name, module).value());
          return;
        }

        var of_type = undefined;

        // Set Notes according to type of backup
        if (!_.isUndefined(params['globals']) && params['globals']) {
          of_type = 'globals';
        } else {
          of_type = 'server';
        }

        var DialogName = 'BackupDialog_' + of_type,
            DialogTitle = ((of_type == 'globals') ?
              '{{ _('Backup Globals...') }}' :
              '{{ _('Backup Server...') }}');

        if(!alertify[DialogName]) {
          alertify.dialog(DialogName ,function factory() {
            return {
               main: function(title) {
                this.set('title', title);
               },
               build: function() {
                alertify.pgDialogBuild.apply(this);
               },
               setup:function() {
                return {
                  buttons: [{
                      text: '', key: 27, className: 'btn btn-default pull-left fa fa-lg fa-info',
                      attrs:{name:'object_help', type:'button', url: 'backup.html', label: '{{ _('Backup') }}'}
                    },{
                      text: '', key: 27, className: 'btn btn-default pull-left fa fa-lg fa-question',
                      attrs:{name:'dialog_help', type:'button', label: '{{ _('Backup') }}',
                      url: '{{ url_for('help.static', filename='backup_dialog.html') }}'
                      }
                    },{
                    text: '{{ _('Backup') }}', key: 27, className: 'btn btn-primary fa fa-lg fa-save pg-alertify-button'
                    },{
                    text: '{{ _('Cancel') }}', key: 27, className: 'btn btn-danger fa fa-lg fa-times pg-alertify-button'
                  }],
                  // Set options for dialog
                  options: {
                    title: DialogTitle,
                    //disable both padding and overflow control.
                    padding : !1,
                    overflow: !1,
                    model: 0,
                    resizable: true,
                    maximizable: true,
                    pinnable: false,
                    closableByDimmer: false,
                    modal: false
                  }
                };
              },
              hooks: {
                // Triggered when the dialog is closed
                onclose: function() {
                  if (this.view) {
                    // clear our backform model/view
                    this.view.remove({data: true, internal: true, silent: true});
                  }
                }
              },
              prepare: function() {
                var self = this;
                // Disable Backup button until user provides Filename
                this.__internal.buttons[2].element.disabled = true;

                var $container = $("<div class='backup_dialog'></div>");
                // Find current/selected node
                var t = pgBrowser.tree,
                  i = t.selected(),
                  d = i && i.length == 1 ? t.itemData(i) : undefined,
                  node = d && pgBrowser.Nodes[d._type];

                if (!d)
                  return;
                // Create treeInfo
                var treeInfo = node.getTreeNodeHierarchy.apply(node, [i]);
                // Instance of backbone model
                var newModel = new BackupModel(
                  {type: of_type}, {node_info: treeInfo}
                  ),
                  fields = Backform.generateViewSchema(
                    treeInfo, newModel, 'create', node, treeInfo.server, true
                  );

                var view = this.view = new Backform.Dialog({
                  el: $container, model: newModel, schema: fields
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
                    if (!_.isUndefined(this.get('file')) && this.get('file') !== '') {
                      this.errorModel.clear();
                      self.__internal.buttons[2].element.disabled = false;
                    } else {
                      self.__internal.buttons[2].element.disabled = true;
                      this.errorModel.set('file', '{{ _('Please provide a filename') }}')
                    }
                });
              },
              // Callback functions when click on the buttons of the Alertify dialogs
              callback: function(e) {
                // Fetch current server id
                  var t = pgBrowser.tree,
                    i = t.selected(),
                    d = i && i.length == 1 ? t.itemData(i) : undefined,
                    node = d && pgBrowser.Nodes[d._type];

                if (e.button.element.name == "dialog_help" || e.button.element.name == "object_help") {
                  e.cancel = true;
                  pgBrowser.showHelp(e.button.element.name, e.button.element.getAttribute('url'),
                    node, i, e.button.element.getAttribute('label'));
                  return;
                }

                if (e.button.text === '{{ _('Backup') }}') {

                  if (!d)
                    return;

                  var treeInfo = node.getTreeNodeHierarchy.apply(node, [i]);

                  var self = this,
                    baseUrl = "{{ url_for('backup.index') }}" +
                      "create_job/" + treeInfo.server._id,
                    args =  this.view.model.toJSON();

                  $.ajax({
                    url: baseUrl,
                    method: 'POST',
                    data:{ 'data': JSON.stringify(args) },
                    success: function(res) {
                      if (res.success) {
                        alertify.notify(
                          '{{ _('Backup job created.') }}', 'success',
                          5
                        );
                        pgBrowser.Events.trigger('pgadmin-bgprocess:created', self);
                      } else {
                        console.log(res);
                      }
                    },
                    error: function(xhr, status, error) {
                      try {
                        var err = $.parseJSON(xhr.responseText);
                        alertify.alert(
                          '{{ _('Backup job failed.') }}',
                          err.errormsg
                        );
                      } catch (e) {}
                    }
                  });
                }
              }
          };
       });
      }
        alertify[DialogName](true).resizeTo('60%','50%');
     },

      // Callback to draw Backup Dialog for objects
      backup_objects: function(action, treeItem) {

        var i = treeItem || pgBrowser.tree.selected(),
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
            alertify.alert("{{ _("Please select server or child node from tree.") }}");
            break;
          }
        }

        if (!server_data) {
          return;
        }

        var module = 'paths',
          preference_name = 'pg_bin_dir',
          msg = '{{ _('Please set binary path for PostgreSQL Server from preferences.') }}';

        if ((server_data.type && server_data.type == 'ppas') ||
            server_data.server_type == 'ppas') {
          preference_name = 'ppas_bin_dir';
          msg = '{{ _('Please set binary path for EDB Advanced Server from preferences.') }}';
        }

        var preference = pgBrowser.get_preference(module, preference_name);

        if(preference) {
          if (!preference.value) {
            alertify.alert(msg);
            return;
          }
        } else {
          alertify.alert(S('{{ _('Failed to load preference %s of module %s') }}').sprintf(preference_name, module).value());
          return;
        }

        var title = S('{{ 'Backup (%s: %s)' }}'),
            tree = pgBrowser.tree,
            item = treeItem || tree.selected(),
            data = item && item.length == 1 && tree.itemData(item),
            node = data && data._type && pgBrowser.Nodes[data._type];

        if (!node)
          return;

        title = title.sprintf(node.label, data.label).value();

        if(!alertify.backup_objects) {
          // Create Dialog title on the fly with node details
          alertify.dialog('backup_objects' ,function factory() {
            return {
               main: function(title) {
                this.set('title', title);
               },
               build: function() {
                alertify.pgDialogBuild.apply(this);
               },
               setup:function() {
                return {
                  buttons: [{
                      text: '', key: 27, className: 'btn btn-default pull-left fa fa-lg fa-info',
                      attrs:{name:'object_help', type:'button', url: 'backup.html', label: '{{ _('Backup') }}'}
                    },{
                      text: '', key: 27, className: 'btn btn-default pull-left fa fa-lg fa-question',
                      attrs:{name:'dialog_help', type:'button', label: '{{ _('Backup') }}',
                      url: '{{ url_for('help.static', filename='backup_dialog.html') }}'}
                    },{
                    text: '{{ _('Backup') }}', key: 27, className: 'btn btn-primary fa fa-lg fa-save pg-alertify-button'
                    },{
                    text: '{{ _('Cancel') }}', key: 27, className: 'btn btn-danger fa fa-lg fa-times pg-alertify-button'
                  }],
                  // Set options for dialog
                  options: {
                    title: title,
                    //disable both padding and overflow control.
                    padding : !1,
                    overflow: !1,
                    model: 0,
                    resizable: true,
                    maximizable: true,
                    pinnable: false,
                    closableByDimmer: false,
                    modal: false
                  }
                };
              },
              hooks: {
                // triggered when the dialog is closed
                onclose: function() {
                  if (this.view) {
                    this.view.remove({data: true, internal: true, silent: true});
                  }
                }
              },
              prepare: function() {
                var self = this;
                // Disable Backup button until user provides Filename
                this.__internal.buttons[2].element.disabled = true;
                var $container = $("<div class='backup_dialog'></div>");
                var t = pgBrowser.tree,
                  i = t.selected(),
                  d = i && i.length == 1 ? t.itemData(i) : undefined,
                  node = d && pgBrowser.Nodes[d._type];

                if (!d)
                  return;

                var treeInfo = node.getTreeNodeHierarchy.apply(node, [i]);

                var newModel = new BackupObjectModel(
                  {}, {node_info: treeInfo}
                  ),
                  fields = Backform.generateViewSchema(
                    treeInfo, newModel, 'create', node, treeInfo.server, true
                  );

                var view = this.view = new Backform.Dialog({
                  el: $container, model: newModel, schema: fields
                });

                $(this.elements.body.childNodes[0]).addClass(
                  'alertify_tools_dialog_properties obj_properties'
                );

                view.render();

                this.elements.content.appendChild($container.get(0));

                 // Listen to model & if filename is provided then enable Backup button
                this.view.model.on('change', function() {
                    if (!_.isUndefined(this.get('file')) && this.get('file') !== '') {
                      this.errorModel.clear();
                      self.__internal.buttons[2].element.disabled = false;
                    } else {
                      self.__internal.buttons[2].element.disabled = true;
                      this.errorModel.set('file', '{{ _('Please provide filename') }}')
                    }
                });

              },
              // Callback functions when click on the buttons of the Alertify dialogs
              callback: function(e) {
                // Fetch current server id
                  var t = pgBrowser.tree,
                    i = t.selected(),
                    d = i && i.length == 1 ? t.itemData(i) : undefined,
                    node = d && pgBrowser.Nodes[d._type];

                if (e.button.element.name == "dialog_help" || e.button.element.name == "object_help") {
                  e.cancel = true;
                  pgBrowser.showHelp(e.button.element.name, e.button.element.getAttribute('url'),
                    node, i, e.button.element.getAttribute('label'));
                  return;
                }

                if (e.button.text === "Backup") {
                  if (!d)
                    return;

                  var treeInfo = node.getTreeNodeHierarchy.apply(node, [i]);

                  // Set current database into model
                  this.view.model.set('database', treeInfo.database._label);

                  // We will remove once object tree is implemented
                  // If selected node is Schema then add it in model
                  if(d._type == 'schema') {
                    var schemas = [];
                    schemas.push(d._label);
                    this.view.model.set('schemas', schemas);
                  }
                  // If selected node is Table then add it in model along with
                  // its schema
                  if(d._type == 'table') {
                    this.view.model.set(
                      'tables', [[treeInfo.schema._label, d._label]]
                    );
                  }

                  var self = this,
                    baseUrl = "{{ url_for('backup.index') }}" +
                      "create_job/backup_object/" + treeInfo.server._id,
                      args =  this.view.model.toJSON();

                  $.ajax({
                    url: baseUrl,
                    method: 'POST',
                    data:{ 'data': JSON.stringify(args) },
                    success: function(res) {
                      if (res.success) {
                        alertify.notify('{{ _('Backup job created.') }}', 'success', 5);
                        pgBrowser.Events.trigger('pgadmin-bgprocess:created', self);
                      }
                    },
                    error: function(xhr, status, error) {
                      try {
                        var err = $.parseJSON(xhr.responseText);
                        alertify.alert(
                          '{{ _('Backup job failed.') }}',
                          err.errormsg
                        );
                      } catch (e) {}
                    }
                  });
                }
              }
            };
          });
        }
        alertify.backup_objects(title).resizeTo('65%','60%');
      }
    };
    return pgBrowser.Backup;
  });
