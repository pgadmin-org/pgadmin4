define(
    [
    'jquery', 'underscore', 'underscore.string', 'pgadmin',
    'pgadmin.browser', 'alertify', 'pgadmin.browser.collection',
    'pgadmin.node.column', 'pgadmin.node.constraints'
    ],
function($, _, S, pgAdmin, pgBrowser, alertify) {

  if (!pgBrowser.Nodes['coll-table']) {
    var databases = pgBrowser.Nodes['coll-table'] =
      pgBrowser.Collection.extend({
        node: 'table',
        label: '{{ _('Tables') }}',
        type: 'coll-table',
        columns: ['name', 'relowner', 'description'],
        hasStatistics: true
      });
  };

  if (!pgBrowser.Nodes['table']) {
    pgBrowser.Nodes['table'] = pgBrowser.Node.extend({
      type: 'table',
      label: '{{ _('Table') }}',
      collection_type: 'coll-table',
      hasSQL: true,
      hasDepends: true,
      hasStatistics: true,
      sqlAlterHelp: 'sql-altertable.html',
      sqlCreateHelp: 'sql-createtable.html',
      dialogHelp: '{{ url_for('help.static', filename='table_dialog.html') }}',
      parent_type: ['schema', 'catalog'],
      hasScriptTypes: ['create', 'select', 'insert', 'update', 'delete'],
      height: '95%',
      width: '85%',
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
            return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_table_on_coll', node: 'coll-table', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 1, label: '{{ _('Table...') }}',
          icon: 'wcTabIcon icon-table', data: {action: 'create', check: true},
          enable: 'canCreate'
        },{
          name: 'create_table', node: 'table', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 1, label: '{{ _('Table...') }}',
          icon: 'wcTabIcon icon-table', data: {action: 'create', check: true},
          enable: 'canCreate'
        },{
          name: 'create_table__on_schema', node: 'schema', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('Table...') }}',
          icon: 'wcTabIcon icon-table', data: {action: 'create', check: false},
          enable: 'canCreate'
        },{
          name: 'truncate_table', node: 'table', module: this,
          applies: ['object', 'context'], callback: 'truncate_table',
          category: 'Truncate', priority: 3, label: '{{ _('Truncate') }}',
          icon: 'fa fa-eraser', enable : 'canCreate'
        },{
          name: 'truncate_table_cascade', node: 'table', module: this,
          applies: ['object', 'context'], callback: 'truncate_table_cascade',
          category: 'Truncate', priority: 3, label: '{{ _('Truncate Cascade') }}',
          icon: 'fa fa-eraser', enable : 'canCreate'
        },{
          // To enable/disable all triggers for the table
          name: 'enable_all_triggers', node: 'table', module: this,
          applies: ['object', 'context'], callback: 'enable_triggers_on_table',
          category: 'Trigger(s)', priority: 4, label: '{{ _('Enable All') }}',
          icon: 'fa fa-check', enable : 'canCreate_with_trigger_enable'
        },{
          name: 'disable_all_triggers', node: 'table', module: this,
          applies: ['object', 'context'], callback: 'disable_triggers_on_table',
          category: 'Trigger(s)', priority: 4, label: '{{ _('Disable All') }}',
          icon: 'fa fa-times', enable : 'canCreate_with_trigger_disable'
        },{
          name: 'reset_table_stats', node: 'table', module: this,
          applies: ['object', 'context'], callback: 'reset_table_stats',
          category: 'Reset', priority: 4, label: '{{ _('Reset Statistics') }}',
          icon: 'fa fa-bar-chart', enable : 'canCreate'
        }
        ]);
      },
      canDrop: pgBrowser.Nodes['schema'].canChildDrop,
      canDropCascade: pgBrowser.Nodes['schema'].canChildDrop,
      callbacks: {
        /* Enable trigger(s) on table */
        enable_triggers_on_table: function(args) {
            var params = {'enable': true };
            this.callbacks.set_triggers.apply(this, [args, params]);
        },
        /* Disable trigger(s) on table */
        disable_triggers_on_table: function(args) {
            var params = {'enable': false };
            this.callbacks.set_triggers.apply(this, [args, params]);
        },
        set_triggers: function(args, params) {
          // This function will send request to enable or
          // disable triggers on table level
          var input = args || {};
          obj = this,
          t = pgBrowser.tree,
          i = input.item || t.selected(),
          d = i && i.length == 1 ? t.itemData(i) : undefined;
          if (!d)
            return false;

          $.ajax({
            url: obj.generate_url(i, 'set_trigger' , d, true),
            type:'PUT',
            data: params,
            dataType: "json",
            success: function(res) {
              if (res.success == 1) {
                alertify.success("{{ _('" + res.info + "') }}");
                t.unload(i);
                t.setInode(i);
                t.deselect(i);
                setTimeout(function() {
                  t.select(i);
                }, 10);
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
        /* Truncate table */
        truncate_table: function(args) {
            var params = {'cascade': false };
            this.callbacks.truncate.apply(this, [args, params]);
        },
        /* Truncate table with cascade */
        truncate_table_cascade: function(args) {
            var params = {'cascade': true };
            this.callbacks.truncate.apply(this, [args, params]);
        },
        truncate: function(args, params) {
          var input = args || {};
          obj = this,
          t = pgBrowser.tree,
          i = input.item || t.selected(),
          d = i && i.length == 1 ? t.itemData(i) : undefined;

          if (!d)
            return false;

          alertify.confirm(
            S('{{ _('Are you sure you want to truncate table %s?') }}').sprintf(d.label).value(),
            function (e) {
            if (e) {
              var data = d;
              $.ajax({
                url: obj.generate_url(i, 'truncate' , d, true),
                type:'PUT',
                data: params,
                dataType: "json",
                success: function(res) {
                  if (res.success == 1) {
                    alertify.success("{{ _('" + res.info + "') }}");
                    t.removeIcon(i);
                    data.icon = 'icon-table';
                    t.addIcon(i, {icon: data.icon});
                    t.unload(i);
                    t.setInode(i);
                    t.deselect(i);
                    // Fetch updated data from server
                    setTimeout(function() {
                      t.select(i);
                    }, 10);
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
            }
         });
       },
       reset_table_stats: function(args) {
          var input = args || {};
          obj = this,
          t = pgBrowser.tree,
          i = input.item || t.selected(),
          d = i && i.length == 1 ? t.itemData(i) : undefined;

          if (!d)
            return false;

          alertify.confirm(
            S('{{ _('Are you sure you want to reset table statistics for %s?') }}').sprintf(d.label).value(),
            function (e) {
            if (e) {
              var data = d;
              $.ajax({
                url: obj.generate_url(i, 'reset' , d, true),
                type:'DELETE',
                success: function(res) {
                  if (res.success == 1) {
                    alertify.success("{{ _('" + res.info + "') }}");
                    t.removeIcon(i);
                    data.icon = 'icon-table';
                    t.addIcon(i, {icon: data.icon});
                    t.unload(i);
                    t.setInode(i);
                    t.deselect(i);
                    // Fetch updated data from server
                    setTimeout(function() {
                      t.select(i);
                    }, 10);
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
            }
         });
       }
      },
      model: pgBrowser.Node.Model.extend({
        defaults: {
          name: undefined,
          oid: undefined,
          spcoid: undefined,
          spcname: 'pg_default',
          relowner: undefined,
          relacl: undefined,
          relhasoids: undefined,
          relhassubclass: undefined,
          reltuples: undefined,
          description: undefined,
          conname: undefined,
          conkey: undefined,
          isrepl: undefined,
          triggercount: undefined,
          relpersistence: undefined,
          fillfactor: undefined,
          reloftype: undefined,
          typname: undefined,
          labels: undefined,
          providers: undefined,
          is_sys_table: undefined,
          coll_inherits: [],
          hastoasttable: true,
          toast_autovacuum_enabled: false,
          autovacuum_enabled: false,
          primary_key: []
        },
        // Default values!
        initialize: function(attrs, args) {
          var self = this;

          if (_.size(attrs) === 0) {
            var userInfo = pgBrowser.serverInfo[args.node_info.server._id].user,
                schemaInfo = args.node_info.schema;

            this.set({
              'relowner': userInfo.name, 'schema': schemaInfo._label
            }, {silent: true});
          }
          pgBrowser.Node.Model.prototype.initialize.apply(this, arguments);

        },
        schema: [{
          id: 'name', label: '{{ _('Name') }}', type: 'text',
          mode: ['properties', 'create', 'edit'], disabled: 'inSchema'
        },{
          id: 'oid', label:'{{ _('OID') }}', type: 'text', mode: ['properties']
        },{
          id: 'relowner', label:'{{ _('Owner') }}', type: 'text', node: 'role',
          mode: ['properties', 'create', 'edit'], select2: {allowClear: false},
          disabled: 'inSchema', control: 'node-list-by-name'
        },{
          id: 'schema', label:'{{_('Schema')}}', type: 'text', node: 'schema',
          control: 'node-list-by-name', mode: ['create', 'edit'],
          disabled: 'inSchema', filter: function(d) {
            // If schema name start with pg_* then we need to exclude them
            if(d && d.label.match(/^pg_/))
            {
              return false;
            }
            return true;
          }, cache_node: 'database', cache_level: 'database'
        },{
          id: 'spcname', label:'{{ _('Tablespace') }}', node: 'tablespace',
          type: 'text', control: 'node-list-by-name', disabled: 'inSchema',
          mode: ['properties', 'create', 'edit'], select2:{allowClear:false},
          filter: function(d) {
            // If tablespace name is not "pg_global" then we need to exclude them
            return (!(d && d.label.match(/pg_global/)))
          }
        },{
          id: 'description', label:'{{ _('Comment') }}', type: 'multiline',
          mode: ['properties', 'create', 'edit'], disabled: 'inSchema'
        },{
          id: 'coll_inherits', label: '{{ _('Inherited from table(s)') }}',
          url: 'get_inherits', type: 'array', group: '{{ _('Columns') }}',
          disabled: 'checkInheritance', deps: ['typname'],
          mode: ['create', 'edit'],
          select2: { multiple: true, allowClear: true,
          placeholder: '{{ _('Select to inherit from...') }}'},
          transform: function(data, cell) {
            var control = cell || this,
              m = control.model;
              m.inherited_tables_list = data;
              return data;
          },
          control: Backform.MultiSelectAjaxControl.extend({
            // When changes we need to add/clear columns collection
            onChange: function() {
              Backform.MultiSelectAjaxControl.prototype.onChange.apply(this, arguments);
              var self = this,
              // current table list and previous table list
              cTbl_list = self.model.get('coll_inherits') || [],
              pTbl_list = self.model.previous('coll_inherits') || [];

              if (!_.isUndefined(cTbl_list)) {
                var tbl_name = undefined,
                  tid = undefined;

                // Add columns logic
                // If new table is added in list
                if(cTbl_list.length > 1 && cTbl_list.length > pTbl_list.length) {
                  // Find newly added table from current list
                  tbl_name = _.difference(cTbl_list, pTbl_list);
                  tid = this.get_table_oid(tbl_name[0]);
                  this.add_columns(tid);
                } else if (cTbl_list.length == 1) {
                  // First table added
                  tid = this.get_table_oid(cTbl_list[0]);
                  this.add_columns(tid);
                }

                // Remove columns logic
                if(cTbl_list.length > 0 && cTbl_list.length < pTbl_list.length) {
                  // Find deleted table from previous list
                  tbl_name = _.difference(pTbl_list, cTbl_list);
                  this.remove_columns(tbl_name[0]);
                } else if (pTbl_list.length === 1 && cTbl_list.length < 1) {
                  // We got last table from list
                  tbl_name = pTbl_list[0];
                  this.remove_columns(tbl_name);
                }

              }
            },
            add_columns: function(tid) {
              // Create copy of old model if anything goes wrong at-least we have backup
              // Then send AJAX request to fetch table specific columns
              var self = this,
                url = 'get_columns',
                m = self.model.top || self.model,
                data = undefined,
                old_columns = _.clone(m.get('columns')),
                column_collection = m.get('columns');

              var arg = {'tid': tid}
              data = self.model.fetch_columns_ajax.apply(self, [arg]);

              // Update existing column collection
              column_collection.set(data, { merge:false,remove:false });
            },
            remove_columns: function(tblname) {
              // Remove all the column models for deleted table
              var tid = this.get_table_oid(tblname),
                column_collection = this.model.get('columns');
              column_collection.remove(column_collection.where({'inheritedid': tid }));
            },
            get_table_oid: function(tblname) {
              // Here we will fetch the table oid from table name
              var tbl_oid = undefined;
              // iterate over list to find table oid
              _.each(this.model.inherited_tables_list, function(obj) {
                  if(obj.label === tblname) {
                    tbl_oid = obj.tid;
                  }
              });
              return tbl_oid;
            }
          })
        },{
          id: 'coll_inherits', label: '{{ _('Inherited from table(s)') }}',
          type: 'text', group: '{{ _('Advanced') }}', mode: ['properties']
        },{
          id: 'inherited_tables_cnt', label:'{{ _('Inherited tables count') }}',
          type: 'text', mode: ['properties'], group: '{{ _('Advanced') }}',
          disabled: 'inSchema'
        },{
          // Tab control for columns
          id: 'columns', label:'{{ _('Columns') }}', type: 'collection',
          group: '{{ _('Columns') }}',
          model: pgBrowser.Nodes['column'].model,
          subnode: pgBrowser.Nodes['column'].model,
          mode: ['create', 'edit'],
          disabled: 'inSchema', deps: ['typname'],
          canAdd: 'check_grid_add_condition',
          canEdit: true, canDelete: true,
          // For each row edit/delete button enable/disable
          canEditRow: 'check_grid_row_edit_delete',
          canDeleteRow: 'check_grid_row_edit_delete',
          uniqueCol : ['name'],
          columns : ['name' , 'cltype', 'attlen', 'attprecision', 'attnotnull', 'is_primary_key'],
          control: Backform.UniqueColCollectionControl.extend({
            initialize: function() {
              Backform.UniqueColCollectionControl.prototype.initialize.apply(this, arguments);
              var self = this,
                  collection = self.model.get(self.field.get('name'));

              collection.on("change:is_primary_key", function(m) {
                var primary_key_coll = self.model.get('primary_key'),
                    column_name = m.get('name'),
                    primary_key;

                if(m.get('is_primary_key')) {
                // Add column to primary key.
                  if (primary_key_coll.length < 1) {
                    primary_key = new (primary_key_coll.model)({}, {
                      top: self.model,
                      collection: primary_key_coll,
                      handler: primary_key_coll
                    });
                    primary_key_coll.add(primary_key);
                  } else {
                    primary_key = primary_key_coll.first();
                  }
                  // Do not alter existing primary key columns.
                  if (_.isUndefined(primary_key.get('oid'))) {
                    var primary_key_column_coll = primary_key.get('columns'),
                      primary_key_column_exist = primary_key_column_coll.where({column:column_name});

                    if (primary_key_column_exist.length == 0) {
                      var primary_key_column = new (primary_key_column_coll.model)(
                          {column: column_name}, { silent: true,
                          top: self.model,
                          collection: primary_key_coll,
                          handler: primary_key_coll
                        });

                      primary_key_column_coll.add(primary_key_column);
                    }

                    primary_key_column_coll.trigger('pgadmin:multicolumn:updated', primary_key_column_coll);
                  }

                } else {
                // remove column from primary key.
                  if (primary_key_coll.length > 0) {
                    var primary_key = primary_key_coll.first();
                    // Do not alter existing primary key columns.
                    if (!_.isUndefined(primary_key.get('oid'))) {
                      return;
                    }

                    var  primary_key_column_coll = primary_key.get('columns'),
                        removedCols = primary_key_column_coll.where({column:column_name});
                    if (removedCols.length > 0) {
                      primary_key_column_coll.remove(removedCols);
                      _.each(removedCols, function(m) {
                        m.destroy();
                      })
                      if (primary_key_column_coll.length == 0) {
                        setTimeout(function () {
                          // There will be only on primary key so remove the first one.
                          primary_key_coll.remove(primary_key_coll.first());
                          /* Ideally above line of code should be "primary_key_coll.reset()".
                           * But our custom DataCollection (extended from Backbone collection in datamodel.js)
                           * does not respond to reset event, it only supports add, remove, change events.
                           * And hence no custom event listeners/validators get called for reset event.
                           */
                        }, 10);
                      }
                    }
                    primary_key_column_coll.trigger('pgadmin:multicolumn:updated', primary_key_column_coll);
                  }
                }
              })
            },
            remove: function() {
              var collection = this.model.get(this.field.get('name'));
              if (collection) {
                collection.off("change:is_primary_key");
              }

              Backform.UniqueColCollectionControl.prototype.remove.apply(this, arguments);
            }
          }),
          allowMultipleEmptyRow: false
        },{
          // Here we will create tab control for constraints
          type: 'nested', control: 'tab', group: '{{ _('Constraints') }}',
          mode: ['edit', 'create'],
          schema: [{
              id: 'primary_key', label: '{{ _('Primary key') }}',
              model: pgBrowser.Nodes['primary_key'].model,
              subnode: pgBrowser.Nodes['primary_key'].model,
              editable: false, type: 'collection',
              group: '{{ _('Primary Key') }}', mode: ['edit', 'create'],
              canEdit: true, canDelete: true,
              control: 'unique-col-collection',
              columns : ['name', 'columns'],
              canAdd: true,
              canAddRow: function(m) {
               // User can only add one primary key
               var columns = m.get('columns');

               return (m.get('primary_key') &&
                        m.get('primary_key').length < 1 &&
                        _.some(columns.pluck('name')));
              }
            },{
              id: 'foreign_key', label: '{{ _('Foreign key') }}',
              model: pgBrowser.Nodes['foreign_key'].model,
              subnode: pgBrowser.Nodes['foreign_key'].model,
              editable: false, type: 'collection',
              group: '{{ _('Foreign Key') }}', mode: ['edit', 'create'],
              canEdit: true, canDelete: true,
              control: 'unique-col-collection',
              canAdd: true,
              columns : ['name', 'columns'],
              canAddRow: function(m) {
               // User can only add if there is at least one column with name.
               var columns = m.get('columns');
               return _.some(columns.pluck('name'));
              }
            },{
              id: 'check_constraint', label: '{{ _('Check constraint') }}',
              model: pgBrowser.Nodes['check_constraints'].model,
              subnode: pgBrowser.Nodes['check_constraints'].model,
              editable: false, type: 'collection',
              group: '{{ _('Check') }}', mode: ['edit', 'create'],
              canEdit: true, canDelete: true,
              control: 'unique-col-collection',
              canAdd: true,
              columns : ['name', 'consrc']
            },{
              id: 'unique_constraint', label: '{{ _('Unique Constraint') }}',
              model: pgBrowser.Nodes['unique_constraint'].model,
              subnode: pgBrowser.Nodes['unique_constraint'].model,
              editable: false, type: 'collection',
              group: '{{ _('Unique') }}', mode: ['edit', 'create'],
              canEdit: true, canDelete: true,
              control: 'unique-col-collection',
              columns : ['name', 'columns'],
              canAdd: true,
              canAddRow: function(m) {
               // User can only add if there is at least one column with name.
               var columns = m.get('columns');
               return _.some(columns.pluck('name'));
              }
            },{
              id: 'exclude_constraint', label: '{{ _('Exclude constraint') }}',
              model: pgBrowser.Nodes['exclusion_constraint'].model,
              subnode: pgBrowser.Nodes['exclusion_constraint'].model,
              editable: false, type: 'collection',
              group: '{{ _('Exclude') }}', mode: ['edit', 'create'],
              canEdit: true, canDelete: true,
              control: 'unique-col-collection',
              columns : ['name', 'columns', 'constraint'],
              canAdd: true,
              canAddRow: function(m) {
               // User can only add if there is at least one column with name.
               var columns = m.get('columns');
               return _.some(columns.pluck('name'));
              }
          }]
        },{
          id: 'typname', label:'{{ _('Of type') }}', type: 'text',
          control: 'node-ajax-options', mode: ['properties', 'create', 'edit'],
          disabled: 'checkOfType', url: 'get_oftype', group: '{{ _('Advanced') }}',
          deps: ['coll_inherits'], transform: function(data, cell) {
            var control = cell || this,
              m = control.model;
              m.of_types_tables = data;
              return data;
          },
          control: Backform.NodeAjaxOptionsControl.extend({
              // When of_types changes we need to clear columns collection
              onChange: function() {
                Backform.NodeAjaxOptionsControl.prototype.onChange.apply(this, arguments);
                var self = this,
                  tbl_oid = undefined,
                  tbl_name = self.model.get('typname'),
                  data = undefined,
                  arg = undefined,
                  column_collection = self.model.get('columns');

                if (!_.isUndefined(tbl_name) &&
                    tbl_name !== '' && column_collection.length !== 0) {
                  var msg = '{{ _('Changing of type table will clear columns collection') }}';
                  alertify.confirm(msg, function (e) {
                    if (e) {
                      // User clicks Ok, lets clear columns collection
                      column_collection.reset();
                    } else {
                      return this;
                    }
                  });
                } else if (!_.isUndefined(tbl_name) && tbl_name === '') {
                  column_collection.reset();
                }

                // Run Ajax now to fetch columns
                if (!_.isUndefined(tbl_name) && tbl_name !== '') {
                  arg = { 'tname': tbl_name }
                  data = self.model.fetch_columns_ajax.apply(self, [arg]);
                  // Add into column collection
                  column_collection.set(data, { merge:false,remove:false });
                }
              }
            })
        },{
          id: 'fillfactor', label:'{{ _('Fill factor') }}', type: 'int',
          mode: ['create', 'edit'], min: 10, max: 100,
          disabled: 'inSchema',group: '{{ _('Advanced') }}'
        },{
          id: 'relhasoids', label:'{{ _('Has OIDs?') }}', cell: 'switch',
          type: 'switch', mode: ['properties', 'create', 'edit'],
          disabled: 'inSchema', group: '{{ _('Advanced') }}'
        },{
          id: 'relpersistence', label:'{{ _('Unlogged?') }}', cell: 'switch',
          type: 'switch', mode: ['properties', 'create', 'edit'],
          disabled: 'inSchemaWithModelCheck',
          group: '{{ _('Advanced') }}'
        },{
          id: 'conname', label:'{{ _('Primary key') }}', cell: 'string',
          type: 'text', mode: ['properties'], group: '{{ _('Advanced') }}',
          disabled: 'inSchema'
        },{
          id: 'reltuples', label:'{{ _('Rows (estimated)') }}', cell: 'string',
          type: 'text', mode: ['properties'], group: '{{ _('Advanced') }}',
          disabled: 'inSchema'
        },{
          id: 'rows_cnt', label:'{{ _('Rows (counted)') }}', cell: 'string',
          type: 'text', mode: ['properties'], group: '{{ _('Advanced') }}',
          disabled: 'inSchema'
        },{
          id: 'relhassubclass', label:'{{ _('Inherits tables?') }}', cell: 'switch',
          type: 'switch', mode: ['properties'], group: '{{ _('Advanced') }}',
          disabled: 'inSchema'
        },{
          id: 'is_sys_table', label:'{{ _('System table?') }}', cell: 'switch',
          type: 'switch', mode: ['properties'],
          disabled: 'inSchema'
        },{
          type: 'nested', control: 'fieldset', label: '{{ _('Like') }}',
          group: '{{ _('Advanced') }}',
          schema:[{
            id: 'like_relation', label:'{{ _('Relation') }}',
            type: 'text', mode: ['create', 'edit'], deps: ['typname'],
            control: 'node-ajax-options', url: 'get_relations',
            disabled: 'isLikeDisable', group: '{{ _('Like') }}'
          },{
            id: 'like_default_value', label:'{{ _('With default values?') }}',
            type: 'switch', mode: ['create', 'edit'], deps: ['typname'],
            disabled: 'isLikeDisable', group: '{{ _('Like') }}'
          },{
            id: 'like_constraints', label:'{{ _('With constraints?') }}',
            type: 'switch', mode: ['create', 'edit'], deps: ['typname'],
            disabled: 'isLikeDisable', group: '{{ _('Like') }}'
          },{
            id: 'like_indexes', label:'{{ _('With indexes?') }}',
            type: 'switch', mode: ['create', 'edit'], deps: ['typname'],
            disabled: 'isLikeDisable', group: '{{ _('Like') }}'
          },{
            id: 'like_storage', label:'{{ _('With storage?') }}',
            type: 'switch', mode: ['create', 'edit'], deps: ['typname'],
            disabled: 'isLikeDisable', group: '{{ _('Like') }}'
          },{
            id: 'like_comments', label:'{{ _('With comments?') }}',
            type: 'switch', mode: ['create', 'edit'], deps: ['typname'],
            disabled: 'isLikeDisable', group: '{{ _('Like') }}'
          }]
        },{
          // Here - we will create tab control for storage parameters
          // (auto vacuum).
          type: 'nested', control: 'tab', group: '{{ _('Parameter') }}',
          mode: ['edit', 'create'],
          schema: Backform.VacuumSettingsSchema
        },{
          id: 'relacl_str', label:'{{ _('Privileges') }}', disabled: 'inSchema',
          type: 'text', mode: ['properties'], group: '{{ _('Security') }}'
        }, pgBrowser.SecurityGroupUnderSchema,{
          id: 'relacl', label: '{{ _('Privileges') }}', type: 'collection',
          group: 'security', control: 'unique-col-collection',
          model: pgBrowser.Node.PrivilegeRoleModel.extend({
          privileges: ['a','r','w','d','D','x','t']}),
          mode: ['edit', 'create'], canAdd: true, canDelete: true,
          uniqueCol : ['grantee']
        },{
          id: 'seclabels', label: '{{ _('Security labels') }}', canEdit: false,
          model: pgBrowser.SecLabelModel, editable: false, canAdd: true,
          type: 'collection', min_version: 90100, mode: ['edit', 'create'],
          group: 'security', canDelete: true, control: 'unique-col-collection'
        },{
          id: 'vacuum_settings_str', label: '{{ _('Storage settings') }}',
          type: 'multiline', group: '{{ _('Advanced') }}', mode: ['properties']
        }],
        validate: function(keys) {
          var err = {},
              changedAttrs = this.changed,
              msg = undefined,
              name = this.get('name'),
              schema = this.get('schema'),
              relowner = this.get('relowner');

          this.errorModel.clear();

          // If nothing to validate or VacuumSetting keys then
          // return from here
          if ( keys && (keys.length == 0
                        || _.indexOf(keys, 'autovacuum_enabled') != -1
                        || _.indexOf(keys, 'toast_autovacuum_enabled') != -1) ) {
            return null;
          }

          if (_.isUndefined(name) || _.isNull(name) ||
            String(name).replace(/^\s+|\s+$/g, '') == '') {
            msg = '{{ _('Table name can not be empty.') }}';
            this.errorModel.set('name', msg);
            return msg;
          } else if (_.isUndefined(schema) || _.isNull(schema) ||
            String(schema).replace(/^\s+|\s+$/g, '') == '') {
            msg = '{{ _('Table schema can not be empty.') }}';
            this.errorModel.set('schema', msg);
            return msg;
          } else if (_.isUndefined(relowner) || _.isNull(relowner) ||
            String(relowner).replace(/^\s+|\s+$/g, '') == '') {
            msg = '{{ _('Table owner can not be empty.') }}';
            this.errorModel.set('relowner', msg);
            return msg;
          }
          return null;
        },
        // We will disable everything if we are under catalog node
        inSchema: function() {
          if(this.node_info &&  'catalog' in this.node_info)
          {
            return true;
          }
          return false;
        },
        isInheritedTable: function(m) {
          if(!m.inSchema.apply(this, [m])) {
            if(
              (!_.isUndefined(m.get('coll_inherits')) && m.get('coll_inherits').length != 0)
                ||
                  (!_.isUndefined(m.get('typname')) && String(m.get('typname')).replace(/^\s+|\s+$/g, '') !== '')
            ) {
              // Either of_types or coll_inherits has value
              return false;
            } else {
              return true;
            }
          }
          return false;
        },
        // Oftype is defined?
        checkInheritance: function(m) {
         // coll_inherits || typname
          if(!m.inSchema.apply(this, [m]) &&
              ( _.isUndefined(m.get('typname')) ||
                _.isNull(m.get('typname')) ||
                String(m.get('typname')).replace(/^\s+|\s+$/g, '') == '')) {
            return false;
          }
          return true;
        },
        // We will disable Like if ofType is defined
        isLikeDisable: function(m) {
          if(!m.inSchemaWithModelCheck.apply(this, [m]) &&
              ( _.isUndefined(m.get('typname')) ||
                _.isNull(m.get('typname')) ||
                String(m.get('typname')).replace(/^\s+|\s+$/g, '') == '')) {
            return false;
          }
          return true;
        },
        // Check for column grid when to Add
        check_grid_add_condition: function(m) {
          var enable_flag = true;
          if(!m.inSchema.apply(this, [m])) {
            // if of_type then disable add in grid
            if (!_.isUndefined(m.get('typname')) &&
                !_.isNull(m.get('typname')) &&
                m.get('typname') !== '') {
                    enable_flag = false;
                }
          }
          return enable_flag;
        },
        // Check for column grid when to edit/delete (for each row)
        check_grid_row_edit_delete: function(m) {
          var flag = true;
          if(!_.isUndefined(m.get('inheritedfrom')) &&
               !_.isNull(m.get('inheritedfrom')) &&
               String(m.get('inheritedfrom')).replace(/^\s+|\s+$/g, '') !== '') {
            flag = false;
          }
          return flag;
        },
        // We will disable it if Inheritance is defined
        checkOfType: function(m) {
        //coll_inherits || typname
          if(!m.inSchemaWithModelCheck.apply(this, [m]) &&
              (_.isUndefined(m.get('coll_inherits')) ||
               _.isNull(m.get('coll_inherits')) ||
               String(m.get('coll_inherits')).replace(/^\s+|\s+$/g, '') == '')) {
            return false;
          }
          return true;
        },
        // We will check if we are under schema node & in 'create' mode
        inSchemaWithModelCheck: function(m) {
          if(this.node_info &&  'schema' in this.node_info)
          {
            // We will disbale control if it's in 'edit' mode
            if (m.isNew()) {
              return false;
            } else {
              return true;
            }
          }
          return true;
        },
        isTableAutoVacuumEnable: function(m) {
          // We need to check additional condition to toggle enable/disable
          // for table auto-vacuum
          if(!m.inSchema.apply(this, [m]) &&
              m.get('autovacuum_enabled') === true) {
            return false;
          }
          return true;
        },
        isToastTableAutoVacuumEnable: function(m) {
          // We need to check additional condition to toggle enable/disable
          // for toast table auto-vacuum
          if(!m.inSchemaWithModelCheck.apply(this, [m]) &&
              m.get('toast_autovacuum_enabled') == true) {
            return false;
          }
          return true;
        },
        fetch_columns_ajax: function(arg) {
          var self = this,
              url = 'get_columns',
              m = self.model.top || self.model,
              old_columns = _.clone(m.get('columns'))
              data = undefined,
              node = this.field.get('schema_node'),
              node_info = this.field.get('node_info'),
              full_url = node.generate_url.apply(
                node, [
                  null, url, this.field.get('node_data'),
                  this.field.get('url_with_id') || false, node_info
                ]
              ),
              cache_level = this.field.get('cache_level') || node.type,
              cache_node = this.field.get('cache_node');

          cache_node = (cache_node && pgBrowser.Nodes['cache_node']) || node;

          m.trigger('pgadmin:view:fetching', m, self.field);
          // Fetching Columns data for the selected table.
          $.ajax({
            async: false,
            url: full_url,
            data: arg,
            success: function(res) {
              data = cache_node.cache(url, node_info, cache_level, res.data);
            },
            error: function() {
              m.trigger('pgadmin:view:fetch:error', m, self.field);
            }
          });
          m.trigger('pgadmin:view:fetched', m, self.field);
          data = (data && data.data) || [];
          return data;
        }
      }),
      canCreate: function(itemData, item, data) {
          //If check is false then , we will allow create menu
          if (data && data.check == false)
            return true;

          var t = pgBrowser.tree, i = item, d = itemData;
          // To iterate over tree to check parent node
          while (i) {
            // If it is schema then allow user to create table
            if (_.indexOf(['schema'], d._type) > -1)
              return true;

            if ('coll-table' == d._type) {
              //Check if we are not child of catalog
              prev_i = t.hasParent(i) ? t.parent(i) : null;
              prev_d = prev_i ? t.itemData(prev_i) : null;
              if( prev_d._type == 'catalog') {
                return false;
              } else {
                return true;
              }
            }
            i = t.hasParent(i) ? t.parent(i) : null;
            d = i ? t.itemData(i) : null;
          }
          // by default we do not want to allow create menu
          return true;
      },
      // Check to whether table has disable trigger(s)
      canCreate_with_trigger_enable: function(itemData, item, data) {
        if(this.canCreate.apply(this, [itemData, item, data])) {
          // We are here means we can create menu, now let's check condition
          if(itemData.tigger_count > 0) {
            return true;
          } else {
            return false;
          }
        }
      },
      // Check to whether table has enable trigger(s)
      canCreate_with_trigger_disable: function(itemData, item, data) {
        if(this.canCreate.apply(this, [itemData, item, data])) {
          // We are here means we can create menu, now let's check condition
          if(itemData.tigger_count > 0 && itemData.has_enable_triggers > 0) {
            return true;
          } else {
            return false;
          }
        }
      }
    });
  }

  return pgBrowser.Nodes['table'];
});
