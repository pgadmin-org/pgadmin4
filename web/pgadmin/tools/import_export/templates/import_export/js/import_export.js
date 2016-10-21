define(
  ['jquery', 'underscore', 'underscore.string', 'alertify', 'pgadmin',
  'pgadmin.browser', 'backbone', 'backgrid', 'backform',
  'pgadmin.backform', 'pgadmin.backgrid', 'pgadmin.browser.node.ui'],
  function($, _, S, Alertify, pgAdmin, pgBrowser, Backbone, Backgrid, Backform) {

  pgAdmin = pgAdmin || window.pgAdmin || {};

  var pgTools = pgAdmin.Tools = pgAdmin.Tools || {};

  // Return back, this has been called more than once
  if (pgAdmin.Tools.import_utility)
    return pgAdmin.Tools.import_utility;

  // Main model for Import/Export functionality
  var ImportExportModel = Backbone.Model.extend({
    defaults: {
      is_import: false, /* false for Export */
      filename: undefined,
      format: 'csv',
      encoding: undefined,
      oid: undefined,
      header: undefined,
      delimiter: ';',
      quote: '\"',
      escape: '\'',
      null_string: undefined,
      columns: null,
      icolumns: [],
      database: undefined,
      schema: undefined,
      table: undefined
    },
    schema: [{
      id: 'is_import', label:'{{ _('Import/Export') }}', cell: 'switch',
      type: 'switch', group: '{{ _('Options')}}',
      options: {
         'onText': '{{ _('Import') }}', 'offText': '{{ _('Export') }}',
         'onColor': 'success', 'offColor': 'primary'
      }
    }, {
      type: 'nested', control: 'fieldset', label: '{{ _('File Info') }}',
      group: '{{ _('Options') }}',
      schema:[{ /* select file control for import */
      id: 'filename', label: '{{ _('Filename')}}', deps: ['is_import'],
      type: 'text', control: Backform.FileControl, group: '{{ _('File Info')}}',
      dialog_type: 'select_file', supp_types: ['csv', 'txt', '*'],
      visible: 'importing'
    }, { /* create file control for export */
        id: 'filename', label: '{{ _('Filename')}}', deps: ['is_import'],
        type: 'text', control: Backform.FileControl, group: '{{ _('File Info')}}',
        dialog_type: 'create_file', supp_types: ['csv', 'txt', '*'],
        visible: 'exporting'
      }, {
        id: 'format', label: '{{ _("Format") }}', cell: 'string',
        control: 'select2', group: '{{ _('File Info')}}',
        options:[
            {'label': 'binary', 'value': 'binary'}, {'label': 'csv', 'value': 'csv'}, {'label': 'text', 'value': 'text'},
          ],
        disabled: 'isDisabled', select2: {allowClear: false, width: "100%" },
      }, {
        id: 'encoding', label: '{{ _("Encoding") }}', cell: 'string',
        control: 'node-ajax-options', node: 'database', url: 'get_encodings', first_empty: true,
        group: '{{ _('File Info')}}'
      }]
    },{
        id: 'columns', label: '{{ _("Columns to import") }}', cell: 'string',
        deps: ['is_import'], type: 'array', first_empty: false,
        control: Backform.NodeListByNameControl.extend({
          // By default, all the import columns should be selected
          initialize: function() {
            Backform.NodeListByNameControl.prototype.initialize.apply(this, arguments);
            var self = this,
                options = self.field.get('options'),
                op_vals = [];

            if (_.isFunction(options)) {
              try {
                var all_cols = options.apply(self);
                for(idx in all_cols) {
                  op_vals.push((all_cols[idx])['value']);
                }
              } catch(e) {
                // Do nothing
                options = [];
              }
            } else {
              for (idx in options) {
                op_vals.push((options[idx])['value']);
              }
            }

            self.model.set('columns',op_vals);
          }
        }),
        transform: function(rows) {
          var self = this,
              node = self.field.get('schema_node'),
              res = [];

          _.each(rows, function(r) {
              var l = (_.isFunction(node['node_label']) ?
                    (node['node_label']).apply(node, [r, self.model, self]) :
                    r.label),
                  image = (_.isFunction(node['node_image']) ?
                    (node['node_image']).apply(
                      node, [r, self.model, self]
                      ) :
                    (node['node_image'] || ('icon-' + node.type)));
              res.push({
                'value': r.label,
                'image': image,
                'label': l
              });
          });

          return res;
        },
        node: 'column', url: 'nodes', group: '{{ _('Columns')}}',
        select2: {
          multiple: true, allowClear: false,
          placeholder: '{{ _('Columns for importing...') }}',
          first_empty: false
        }, visible: 'importing',
        helpMessage:
          '{{ _('An optional list of columns to be copied. If no column list is specified, all columns of the table will be copied.') }}'
      }, {
        id: 'columns', label: '{{ _("Columns to export") }}', cell: 'string',
        deps: ['is_import'], type: 'array',
        control: 'node-list-by-name', first_empty: false,
        node: 'column', url: 'nodes', group: '{{ _('Columns')}}',
        select2: {
          multiple: true, allowClear: true,
          placeholder: '{{ _('Colums for exporting...') }}'
        }, visible: 'exporting',
        transform: function(rows) {
          var self = this,
              node = self.field.get('schema_node'),
              res = [];

          _.each(rows, function(r) {
              var l = (_.isFunction(node['node_label']) ?
                    (node['node_label']).apply(node, [r, self.model, self]) :
                    r.label),
                  image = (_.isFunction(node['node_image']) ?
                    (node['node_image']).apply(
                      node, [r, self.model, self]
                      ) :
                    (node['node_image'] || ('icon-' + node.type)));
              res.push({
                'value': r.label,
                'image': image,
                'label': l
              });
          });

          return res;
        },
        helpMessage:
          '{{ _('An optional list of columns to be copied. If no column list is specified, all columns of the table will be copied.') }}'
      }, {
        id: 'null_string', label: '{{ _("NULL Strings") }}', cell: 'string',
        type: 'text', group: '{{ _('Columns')}}', disabled: 'isDisabled',
        deps: ['format'],
        helpMessage:
          "{{ _("Specifies the string that represents a null value. The default is \\\\N (backslash-N) in text format, and an unquoted empty string in CSV format. You might prefer an empty string even in text format for cases where you don't want to distinguish nulls from empty strings. This option is not allowed when using binary format.") }}"
      }, {
        id: 'icolumns', label: '{{ _("Not null columns") }}', cell: 'string',
        control: 'node-list-by-name', node: 'column',
        group: '{{ _('Columns')}}', deps: ['format', 'is_import'], disabled: 'isDisabled',
        type: 'array', first_empty: false,
        select2: {
          multiple: true, allowClear: true, first_empty: true,
          placeholder: '{{ _('Not null columns...') }}'
        },
        helpMessage:
          '{{ _('Do not match the specified columns values against the null string. In the default case where the null string is empty, this means that empty values will be read as zero-length strings rather than nulls, even when they are not quoted. This option is allowed only in import, and only when using CSV format.') }}'
      }, {
        type: 'nested', control: 'fieldset', label: '{{ _('Miscellaneous') }}',
        group: '{{ _('Options') }}',
        schema:[{
          id: 'oid', label:'{{ _('OID') }}', cell: 'string',
          type: 'switch', group: '{{ _('Miscellaneous') }}'
        },{
          id: 'header', label:'{{ _('Header') }}', cell: 'string',
          type: 'switch', group: '{{ _('Miscellaneous') }}', deps: ['format'], disabled: 'isDisabled'
        },{
          id: 'delimiter', label:'{{ _('Delimiter') }}', cell: 'string', first_empty: true,
          type: 'text', control: 'node-ajax-options', group: '{{ _('Miscellaneous') }}', disabled: 'isDisabled',
          deps: ['format'],
          options:[
            {'label': ';', 'value': ';'},
            {'label': ',', 'value': ','},
            {'label': '|', 'value': '|'},
            {'label': '[tab]', 'value': '[tab]'}
          ],
          select2: {
            tags: true,
            allowClear: false,
            width: "100%",
            placeholder: '{{ _('Select from list...') }}'
          }, helpMessage:
            '{{ _('Specifies the character that separates columns within each row (line) of the file. The default is a tab character in text format, a comma in CSV format. This must be a single one-byte character. This option is not allowed when using binary format.') }}'
        },
        {
          id: 'quote', label:'{{ _('Quote') }}', cell: 'string', first_empty: true, deps: ['format'],
          type: 'text', control: 'node-ajax-options', group: '{{ _('Miscellaneous') }}', disabled: 'isDisabled',
          options:[
            {'label': '\"', 'value': '\"'},
            {'label': '\'', 'value': '\''},
          ],
          select2: {
            tags: true,
            allowClear: false,
            width: "100%",
            placeholder: '{{ _('Select from list...') }}'
          }, helpMessage:
            '{{ _('Specifies the quoting character to be used when a data value is quoted. The default is double-quote. This must be a single one-byte character. This option is allowed only when using CSV format.') }}'
        },
        {
          id: 'escape', label:'{{ _('Escape') }}', cell: 'string', first_empty: true, deps: ['format'],
          type: 'text', control: 'node-ajax-options', group: '{{ _('Miscellaneous') }}', disabled: 'isDisabled',
          options:[
            {'label': '\"', 'value': '\"'},
            {'label': '\'', 'value': '\''},
          ],
          select2: {
            tags: true,
            allowClear: false,
            width: "100%",
            placeholder: '{{ _('Select from list...') }}'
          }, helpMessage:
            '{{ _('Specifies the character that should appear before a data character that matches the QUOTE value. The default is the same as the QUOTE value (so that the quoting character is doubled if it appears in the data). This must be a single one-byte character. This option is allowed only when using CSV format.') }}'
        }]
      }
    ],

    // Enable/Disable the items based on the user file format selection
    isDisabled: function(m) {
      name = this.name;
      switch(name) {
        case 'quote':
        case 'escape':
        case 'header':
          return (m.get('format') != 'csv')
        case 'icolumns':
          return (m.get('format') != 'csv' || !m.get('is_import'));
        case 'null_string':
        case 'delimiter':
          return (m.get('format') == 'binary');
        default:
          return false;
      }
    },
    importing: function(m) {
      return m.get('is_import');
    },
    exporting: function(m) {
      return !(m.importing.apply(this, arguments));
    }
  });

  pgTools.import_utility = {
      init: function() {
        // We do not want to initialize the module multiple times.
        if (this.initialized)
            return;

        this.initialized = true;

        /**
         Enable/disable import menu in tools based on node selected
         Import menu will be enabled only when user select table node.
        */
        menu_enabled = function(itemData, item, data) {
         var t = pgBrowser.tree, i = item, d = itemData;
         var parent_item = t.hasParent(i) ? t.parent(i): null,
             parent_data = parent_item ? t.itemData(parent_item) : null;
           if(!_.isUndefined(d) && !_.isNull(d) && !_.isNull(parent_data))
             return (
               (_.indexOf(['table'], d._type) !== -1 &&
               parent_data._type != 'catalog') ? true: false
             );
           else
             return false;
        };

        // Initialize the context menu to display the import options when user open the context menu for table
        pgBrowser.add_menus([{
          name: 'import', node: 'table', module: this,
          applies: ['tools', 'context'], callback: 'callback_import_export',
          category: 'import', priority: 10, label: '{{ _('Import/Export...') }}',
          icon: 'fa fa-shopping-cart', enable: menu_enabled
        }]);
      },

      /*
        Open the dialog for the import functionality
      */
      callback_import_export: function(args, item) {
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
            Alertify.alert("{{ _("Please select server or child node from tree.") }}");
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
            Alertify.alert('{{ _("Configuration required") }}', msg);
            return;
          }
        } else {
          Alertify.alert(S('{{ _('Failed to load preference %s of module %s') }}').sprintf(preference_name, module).value());
          return;
        }

        var self = this;
        var input = args || {},
            t = pgBrowser.tree,
            i = item || t.selected(),
            d = i && i.length == 1 ? t.itemData(i) : undefined,
            node = d && pgBrowser.Nodes[d._type];

        if (!d)
          return;

        var objName = d.label;
        var treeInfo = node.getTreeNodeHierarchy.apply(node, [i]);

        if (!Alertify.ImportDialog) {
          Alertify.dialog('ImportDialog', function factory() {

            return {
              main: function(title, node, item, data) {
                this.set('title', title);
                this.setting('pg_node', node);
                this.setting('pg_item', item);
                this.setting('pg_item_data', data);
              },

              build: function() {
                Alertify.pgDialogBuild.apply(this)
              },

              setup: function() {
                return {
                  buttons:[{
                    text: "{{ _('OK') }}", key: 27, disable: true,
                    className:
                      "btn btn-primary fa fa-lg fa-save pg-alertify-button"
                  }, {
                    text: "{{ _('Cancel') }}", key: 27,
                    className:
                      "btn btn-danger fa fa-lg fa-times pg-alertify-button"
                  }],
                  options: {modal: true}
                };
              },

              settings: {
                pg_node: null,
                pg_item: null,
                pg_item_data: null
              },

              // Callback functions when click on the buttons of the Alertify dialogs
              callback: function(e) {
                if (e.button.text === "{{ _('OK') }}") {

                  var n = this.settings['pg_node'],
                    i = this.settings['pg_item'],
                    treeInfo = n.getTreeNodeHierarchy.apply(n, [i])

                  this.view.model.set({
                    'database': treeInfo.database._label,
                    'schema': treeInfo.schema._label,
                    'table': treeInfo.table._label
                  });
                  var self = this,
                      baseUrl = "{{ url_for('import_export.index') }}" +
                        "create_job/" + treeInfo.server._id,
                      args =  this.view.model.toJSON();

                  $.ajax({
                    url: baseUrl,
                    method: 'POST',
                    data:{ 'data': JSON.stringify(args) },
                    success: function(res) {
                      if (res.success) {
                        Alertify.notify('{{ _('Import/export job created.') }}', 'success', 5);
                        pgBrowser.Events.trigger('pgadmin-bgprocess:created', self);
                      }
                    },
                    error: function(xhr, status, error) {
                      try {
                        var err = $.parseJSON(xhr.responseText);
                        Alertify.alert(
                          '{{ _('Import/export job failed.') }}',
                          err.errormsg
                        );
                      } catch (e) {}
                    }
                  });
                }
              },

              hooks: {
                onclose: function() {
                  if (this.view) {
                    this.view.remove({data: true, internal: true, silent: true});
                  }
                },

                // triggered when a dialog option gets update.
                onupdate: function(option,oldValue, newValue) {

                  switch(option){
                    case 'resizable':
                      if(newValue){
                        this.elements.content.removeAttribute('style');
                      } else {
                        this.elements.content.style.minHeight = 'inherit';
                      }
                      break;
                  }
                }
              },

              prepare: function() {
                // Main import module container
                var self = this;

                // Disable OK button until user provides valid Filename
                this.__internal.buttons[0].element.disabled = true;

                var $container = $("<div class='import_dlg'></div>"),
                    n = this.settings.pg_node,
                    i = this.settings.pg_item,
                    treeInfo = n.getTreeNodeHierarchy.apply(n, [i]),
                    newModel = new ImportExportModel ({}, {
                      node_info: treeInfo
                    }),
                    fields = Backform.generateViewSchema(
                        treeInfo, newModel, 'create', node, treeInfo.server, true
                    ),
                    view = this.view = new Backform.Dialog({
                      el: $container, model: newModel, schema: fields
                    });

                $(this.elements.body.childNodes[0]).addClass(
                  'alertify_tools_dialog_properties obj_properties'
                );
                view.render();

                this.elements.content.appendChild($container.get(0));

                // Listen to model & if filename is provided then enable OK button
                // For the 'Quote', 'escape' and 'delimiter' only one character is allowed to enter
                this.view.model.on('change', function() {
                    if (!_.isUndefined(this.get('filename')) && this.get('filename') !== '') {
                      this.errorModel.clear();
                      if (!_.isUndefined(this.get('delimiter')) && this.get('delimiter') !== '' &&
                          (this.get('delimiter').length == 1 || this.get('delimiter') == '[tab]')) {
                        this.errorModel.clear();
                        if (!_.isUndefined(this.get('quote')) && this.get('quote') !== '' &&
                            this.get('quote').length == 1) {
                          this.errorModel.clear();
                          if (!_.isUndefined(this.get('escape')) && this.get('escape') !== '' &&
                              this.get('escape').length == 1) {
                            this.errorModel.clear();
                            self.__internal.buttons[0].element.disabled = false;
                          } else {
                            self.__internal.buttons[0].element.disabled = true;
                            this.errorModel.set('escape', '{{ _('Escape should contain only one character') }}')
                          }
                        } else {
                          self.__internal.buttons[0].element.disabled = true;
                          this.errorModel.set('quote', '{{ _('Quote should contain only one character') }}')
                        }
                      } else {
                        self.__internal.buttons[0].element.disabled = true;
                        this.errorModel.set('delimiter', '{{ _('Delimiter should contain only one character') }}')
                      }
                    } else {
                      self.__internal.buttons[0].element.disabled = true;
                      this.errorModel.set('filename', '{{ _('Please provide filename') }}')
                    }
                });

                // Give the dialog initial height & width
                this.elements.dialog.style.minHeight = '80%';
                this.elements.dialog.style.minWidth = '70%';
              }
            };
          });
        }

        // Open the Alertify dialog for the import/export module
        Alertify.ImportDialog(
            S(
              "{{ _("Import/Export data - table '%s'") }}"
            ).sprintf(treeInfo.table.label).value(), node, i, d
         ).set('resizable',true).resizeTo('70%','80%');
      }
    };

    return pgAdmin.Tools.import_utility;
  });
