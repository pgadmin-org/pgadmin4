/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define([
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore', 'pgadmin.alertifyjs',
  'sources/pgadmin', 'pgadmin.browser', 'backbone', 'backgrid', 'backform',
  'sources/utils',
  'sources/nodes/supported_database_node',
  'pgadmin.backform', 'pgadmin.backgrid', 'pgadmin.browser.node.ui',
], function(
  gettext, url_for, $, _, Alertify, pgAdmin, pgBrowser, Backbone, Backgrid,
  Backform, commonUtils, supportedNodes
) {

  pgAdmin = pgAdmin || window.pgAdmin || {};

  var pgTools = pgAdmin.Tools = pgAdmin.Tools || {};

  // Return back, this has been called more than once
  if (pgAdmin.Tools.import_utility)
    return pgAdmin.Tools.import_utility;

  // Main model for Import/Export functionality
  var ImportExportModel = Backbone.Model.extend({
    defaults: {
      is_import: false,
      /* false for Export */
      filename: undefined,
      format: 'csv',
      encoding: undefined,
      oid: undefined,
      header: undefined,
      delimiter: '',
      quote: '\"',
      escape: '\'',
      null_string: undefined,
      columns: null,
      icolumns: [],
      database: undefined,
      schema: undefined,
      table: undefined,
    },
    schema: [{
      id: 'is_import',
      label: gettext('Import/Export'),
      cell: 'switch',
      type: 'switch',
      group: gettext('Options'),
      options: {
        'onText': gettext('Import'),
        'offText': gettext('Export'),
        width: '65',
      },
    }, {
      type: 'nested',
      control: 'fieldset',
      label: gettext('File Info'),
      group: gettext('Options'),
      schema: [{ /* select file control for import */
        id: 'filename',
        label: gettext('Filename'),
        deps: ['is_import'],
        type: 'text',
        control: Backform.FileControl,
        group: gettext('File Info'),
        dialog_type: 'select_file',
        supp_types: ['csv', 'txt', '*'],
        visible: 'importing',
      }, { /* create file control for export */
        id: 'filename',
        label: gettext('Filename'),
        deps: ['is_import'],
        type: 'text',
        control: Backform.FileControl,
        group: gettext('File Info'),
        dialog_type: 'create_file',
        supp_types: ['csv', 'txt', '*'],
        visible: 'exporting',
      }, {
        id: 'format',
        label: gettext('Format'),
        cell: 'string',
        control: 'select2',
        group: gettext('File Info'),
        options: [{
          'label': 'binary',
          'value': 'binary',
        }, {
          'label': 'csv',
          'value': 'csv',
        }, {
          'label': 'text',
          'value': 'text',
        } ],
        disabled: 'isDisabled',
        select2: {
          allowClear: false,
          width: '100%',
        },
      }, {
        id: 'encoding',
        label: gettext('Encoding'),
        cell: 'string',
        control: 'node-ajax-options',
        node: 'database',
        url: 'get_encodings',
        first_empty: true,
        group: gettext('File Info'),
      }],
    }, {
      id: 'columns',
      label: gettext('Columns to import'),
      cell: 'string',
      deps: ['is_import'],
      type: 'array',
      first_empty: false,
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
              for (var idx in all_cols) {
                op_vals.push((all_cols[idx])['value']);
              }
            } catch (e) {
              // Do nothing
              console.warn(e.stack || e);
            }
          } else {
            for (idx in options) {
              op_vals.push((options[idx])['value']);
            }
          }

          self.model.set('columns', op_vals);
        },
      }),
      transform: function(rows) {
        var self = this,
          node = self.field.get('schema_node'),
          res = [];

        _.each(rows, function(r) {
          // System columns with id less than 0 should not be added.
          if ('_id' in r && r._id > 0) {
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
              'label': l,
            });
          }
        });

        return res;
      },
      node: 'column',
      url: 'nodes',
      group: gettext('Columns'),
      select2: {
        multiple: true,
        allowClear: false,
        placeholder: gettext('Columns for importing...'),
        first_empty: false,
        preserveSelectionOrder: true,
      },
      visible: 'importing',
      helpMessage: gettext('An optional list of columns to be copied. If no column list is specified, all columns of the table will be copied.'),
    }, {
      id: 'columns',
      label: gettext('Columns to export'),
      cell: 'string',
      deps: ['is_import'],
      type: 'array',
      control: 'node-list-by-name',
      first_empty: false,
      node: 'column',
      url: 'nodes',
      group: gettext('Columns'),
      select2: {
        multiple: true,
        allowClear: true,
        first_empty: false,
        placeholder: gettext('Columns for exporting...'),
        preserveSelectionOrder: true,
      },
      visible: 'exporting',
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
            'label': l,
          });
        });

        return res;
      },
      helpMessage: gettext('An optional list of columns to be copied. If no column list is specified, all columns of the table will be copied.'),
    }, {
      id: 'null_string',
      label: gettext('NULL Strings'),
      cell: 'string',
      type: 'text',
      group: gettext('Columns'),
      disabled: 'isDisabled',
      deps: ['format'],
      helpMessage: gettext('Specifies the string that represents a null value. The default is \\N (backslash-N) in text format, and an unquoted empty string in CSV format. You might prefer an empty string even in text format for cases where you don\'t want to distinguish nulls from empty strings. This option is not allowed when using binary format.'),
    }, {
      id: 'icolumns',
      label: gettext('Not null columns'),
      cell: 'string',
      control: 'node-list-by-name',
      node: 'column',
      group: gettext('Columns'),
      deps: ['format', 'is_import'],
      disabled: 'isDisabled',
      type: 'array',
      first_empty: false,
      select2: {
        multiple: true,
        allowClear: true,
        first_empty: false,
        placeholder: gettext('Not null columns...'),
      },
      helpMessage: gettext('Do not match the specified column values against the null string. In the default case where the null string is empty, this means that empty values will be read as zero-length strings rather than nulls, even when they are not quoted. This option is allowed only in import, and only when using CSV format.'),
    }, {
      type: 'nested',
      control: 'fieldset',
      label: gettext('Miscellaneous'),
      group: gettext('Options'),
      schema: [{
        id: 'oid',
        label: gettext('OID'),
        cell: 'string',
        type: 'switch',
        group: gettext('Miscellaneous'),
      }, {
        id: 'header',
        label: gettext('Header'),
        cell: 'string',
        type: 'switch',
        group: gettext('Miscellaneous'),
        deps: ['format'],
        disabled: 'isDisabled',
      }, {
        id: 'delimiter',
        label: gettext('Delimiter'),
        cell: 'string',
        first_empty: true,
        type: 'text',
        control: 'node-ajax-options',
        group: gettext('Miscellaneous'),
        disabled: 'isDisabled',
        deps: ['format'],
        options: [{
          'label': ';',
          'value': ';',
        },
        {
          'label': ',',
          'value': ',',
        },
        {
          'label': '|',
          'value': '|',
        },
        {
          'label': '[tab]',
          'value': '[tab]',
        },
        ],
        select2: {
          tags: true,
          allowClear: false,
          width: '100%',
          placeholder: gettext('Select from list...'),
        },
        helpMessage: gettext('Specifies the character that separates columns within each row (line) of the file. The default is a tab character in text format, a comma in CSV format. This must be a single one-byte character. This option is not allowed when using binary format.'),
      },
      {
        id: 'quote',
        label: gettext('Quote'),
        cell: 'string',
        first_empty: true,
        deps: ['format'],
        type: 'text',
        control: 'node-ajax-options',
        group: gettext('Miscellaneous'),
        disabled: 'isDisabled',
        options: [{
          'label': '\"',
          'value': '\"',
        },
        {
          'label': '\'',
          'value': '\'',
        },
        ],
        select2: {
          tags: true,
          allowClear: false,
          width: '100%',
          placeholder: gettext('Select from list...'),
        },
        helpMessage: gettext('Specifies the quoting character to be used when a data value is quoted. The default is double-quote. This must be a single one-byte character. This option is allowed only when using CSV format.'),
      },
      {
        id: 'escape',
        label: gettext('Escape'),
        cell: 'string',
        first_empty: true,
        deps: ['format'],
        type: 'text',
        control: 'node-ajax-options',
        group: gettext('Miscellaneous'),
        disabled: 'isDisabled',
        options: [{
          'label': '\"',
          'value': '\"',
        },
        {
          'label': '\'',
          'value': '\'',
        },
        ],
        select2: {
          tags: true,
          allowClear: false,
          width: '100%',
          placeholder: gettext('Select from list...'),
        },
        helpMessage: gettext('Specifies the character that should appear before a data character that matches the QUOTE value. The default is the same as the QUOTE value (so that the quoting character is doubled if it appears in the data). This must be a single one-byte character. This option is allowed only when using CSV format.'),
      },
      ],
    } ],

    // Enable/Disable the items based on the user file format selection
    isDisabled: function(m) {
      switch (this.name) {
      case 'quote':
      case 'escape':
      case 'header':
        return (m.get('format') != 'csv');
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
    },
  });

  pgTools.import_utility = {
    init: function() {
      // We do not want to initialize the module multiple times.
      if (this.initialized)
        return;

      this.initialized = true;

      // Initialize the context menu to display the import options when user open the context menu for table
      pgBrowser.add_menus([{
        name: 'import',
        node: 'table',
        module: this,
        applies: ['tools', 'context'],
        callback: 'callback_import_export',
        category: 'import',
        priority: 10,
        label: gettext('Import/Export...'),
        icon: 'fa fa-shopping-cart',
        enable: supportedNodes.enabled.bind(
          null, pgBrowser.treeMenu, ['table']
        ),
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

      var t = pgBrowser.tree;
      i = item || t.selected();
      var d = i && i.length == 1 ? t.itemData(i) : undefined,
        node = d && pgBrowser.Nodes[d._type];

      if (!d)
        return;

      var treeInfo = node.getTreeNodeHierarchy.apply(node, [i]);

      if (!Alertify.ImportDialog) {
        Alertify.dialog('ImportDialog', function factory() {

          return {
            main: function(title, pg_node, pg_item, data) {
              this.set('title', title);
              this.setting('pg_node', pg_node);
              this.setting('pg_item', pg_item);
              this.setting('pg_item_data', data);
            },

            build: function() {
              Alertify.pgDialogBuild.apply(this);
            },

            setup: function() {
              return {
                buttons: [{
                  text: gettext('Cancel'),
                  key: 27,
                  'data-btn-name': 'cancel',
                  className: 'btn btn-secondary fa fa-lg fa-times pg-alertify-button',
                }, {
                  text: gettext('OK'),
                  key: 13,
                  disable: true,
                  'data-btn-name': 'ok',
                  className: 'btn btn-primary fa fa-lg fa-check pg-alertify-button',
                }],
                options: {
                  modal: true,
                  padding: !1,
                  overflow: !1,
                },
              };
            },

            settings: {
              pg_node: null,
              pg_item: null,
              pg_item_data: null,
            },

            // Callback functions when click on the buttons of the Alertify dialogs
            callback: function(e) {
              if (e.button['data-btn-name'] === 'ok') {

                var n = this.settings['pg_node'],
                  itemArr = this.settings['pg_item'],
                  treeData = n.getTreeNodeHierarchy.apply(n, [itemArr]);

                this.view.model.set({
                  'database': treeData.database._label,
                  'schema': treeData.schema._label,
                  'table': treeData.table._label,
                });
                var self = this;

                $.ajax({
                  url: url_for(
                    'import_export.create_job', {
                      'sid': treeData.server._id,
                    }
                  ),
                  method: 'POST',
                  data: {
                    'data': JSON.stringify(this.view.model.toJSON()),
                  },
                })
                  .done(function(res) {
                    if (res.success) {
                      Alertify.success(gettext('Import/Export job created.'), 5);
                      pgBrowser.Events.trigger('pgadmin-bgprocess:created', self);
                    } else {
                      Alertify.alert(
                        gettext('Import/Export job creation failed.'),
                        res.errormsg
                      );
                    }
                  })
                  .fail(function(xhr) {
                    try {
                      var err = JSON.parse(xhr.responseText);
                      Alertify.alert(
                        gettext('Import/Export job failed.'),
                        err.errormsg
                      );
                    } catch (error) {
                      console.warn(error.stack || error);
                    }
                  });
              }
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

              // triggered when a dialog option gets update.
              onupdate: function(option, oldValue, newValue) {
                if(option === 'resizable') {
                  if (newValue) {
                    this.elements.content.removeAttribute('style');
                  } else {
                    this.elements.content.style.minHeight = 'inherit';
                  }
                }
              },

              onshow: function() {
                var container = $(this.elements.body).find('.tab-content:first > .tab-pane.active:first');
                commonUtils.findAndSetFocus(container);
              },
            },

            prepare: function() {
              // Main import module container
              var self = this;

              // Disable OK button until user provides valid Filename
              this.__internal.buttons[1].element.disabled = true;

              var $container = $('<div class=\'import_dlg\'></div>'),
                n = this.settings.pg_node,
                itemArr = this.settings.pg_item,
                treeData = n.getTreeNodeHierarchy.apply(n, [itemArr]),
                newModel = new ImportExportModel({}, {
                  node_info: treeData,
                }),
                fields = Backform.generateViewSchema(
                  treeData, newModel, 'create', node, treeData.server, true
                ),
                view = this.view = new Backform.Dialog({
                  el: $container,
                  model: newModel,
                  schema: fields,
                });

              $(this.elements.body.childNodes[0]).addClass(
                'alertify_tools_dialog_properties obj_properties'
              );
              view.render();

              const statusBar = $(
                '<div class=\'pg-prop-status-bar pg-prop-status-bar-absolute pg-el-xs-12 d-none\'>' +
              '  <div class="error-in-footer"> ' +
              '    <div class="d-flex px-2 py-1"> ' +
              '      <div class="pr-2"> ' +
              '        <i class="fa fa-exclamation-triangle text-danger" aria-hidden="true"></i> ' +
              '      </div> ' +
              '      <div class="alert-text" role="alert"></div> ' +
              '       <div class="ml-auto close-error-bar"> ' +
              '          <a aria-label="' + gettext('Close error bar') + '" class="close-error fa fa-times text-danger"></a> ' +
              '        </div> ' +
              '    </div> ' +
              '  </div> ' +
              '</div>').appendTo($container);
              this.elements.content.appendChild($container.get(0));

              // Listen to model & if filename is provided then enable OK button
              // For the 'Quote', 'escape' and 'delimiter' only one character is allowed to enter
              this.view.model.on('change', function() {
                const ctx = this;
                var errmsg;
                const showError = function(errorField, errormsg) {
                  ctx.errorModel.set(errorField, errormsg);
                  statusBar.removeClass('d-none');
                  statusBar.find('.alert-text').html(errormsg);
                  self.elements.dialog.querySelector('.close-error').addEventListener('click', ()=>{
                    statusBar.addClass('d-none');
                    ctx.errorModel.set(errorField, errormsg);
                  });
                };
                if (!_.isUndefined(this.get('filename')) && this.get('filename') !== '') {
                  this.errorModel.clear();
                  statusBar.addClass('d-none');
                  if (!_.isUndefined(this.get('delimiter')) && !_.isNull(this.get('delimiter'))) {
                    this.errorModel.clear();
                    statusBar.addClass('d-none');
                    if (!_.isUndefined(this.get('quote')) && this.get('quote') !== '' &&
                      this.get('quote').length == 1) {
                      this.errorModel.clear();
                      statusBar.addClass('d-none');
                      if (!_.isUndefined(this.get('escape')) && this.get('escape') !== '' &&
                        this.get('escape').length == 1) {
                        this.errorModel.clear();
                        statusBar.addClass('d-none');
                        self.__internal.buttons[1].element.disabled = false;
                      } else {
                        self.__internal.buttons[1].element.disabled = true;
                        errmsg = gettext('Escape should contain only one character');
                        showError('escape', errmsg);
                      }
                    } else {
                      self.__internal.buttons[1].element.disabled = true;
                      errmsg = gettext('Quote should contain only one character');
                      showError('quote', errmsg);
                    }
                  } else {
                    self.__internal.buttons[1].element.disabled = true;
                    errmsg = gettext('Delimiter should contain only one character');
                    showError('delimiter', errmsg);
                  }
                } else {
                  self.__internal.buttons[1].element.disabled = true;
                  errmsg = gettext('Please provide filename');
                  showError('filename', errmsg);
                }
              });

              view.$el.attr('tabindex', -1);
              setTimeout(function() {
                pgBrowser.keyboardNavigation.getDialogTabNavigator($(self.elements.dialog));
              }, 200);
            },
          };
        });
      }

      const baseUrl = url_for('import_export.utility_exists', {
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

          // Open the Alertify dialog for the import/export module
          Alertify.ImportDialog(
            gettext('Import/Export data - table \'%s\'', treeInfo.table.label),
            node, i, d
          ).set('resizable', true).resizeTo(pgAdmin.Browser.stdW.md,pgAdmin.Browser.stdH.lg);
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

  return pgAdmin.Tools.import_utility;
});
