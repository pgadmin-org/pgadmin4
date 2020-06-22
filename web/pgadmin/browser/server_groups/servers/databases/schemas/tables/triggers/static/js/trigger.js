/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define('pgadmin.node.trigger', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore',
  'sources/pgadmin', 'pgadmin.browser',
  'pgadmin.backform', 'pgadmin.alertifyjs',
  'pgadmin.node.schema.dir/schema_child_tree_node',
  'pgadmin.browser.collection',
], function(
  gettext, url_for, $, _, pgAdmin, pgBrowser, Backform, alertify,
  SchemaChildTreeNode
) {

  if (!pgBrowser.Nodes['coll-trigger']) {
    pgAdmin.Browser.Nodes['coll-trigger'] =
      pgAdmin.Browser.Collection.extend({
        node: 'trigger',
        label: gettext('Triggers'),
        type: 'coll-trigger',
        columns: ['name', 'description'],
        canDrop: SchemaChildTreeNode.isTreeItemOfChildOfSchema,
        canDropCascade: SchemaChildTreeNode.isTreeItemOfChildOfSchema,
      });
  }

  if (!pgBrowser.Nodes['trigger']) {
    pgAdmin.Browser.Nodes['trigger'] = pgBrowser.Node.extend({
      parent_type: ['table', 'view', 'partition'],
      collection_type: ['coll-table', 'coll-view'],
      type: 'trigger',
      label: gettext('Trigger'),
      hasSQL:  true,
      hasDepends: true,
      width: pgBrowser.stdW.sm + 'px',
      sqlAlterHelp: 'sql-altertrigger.html',
      sqlCreateHelp: 'sql-createtrigger.html',
      dialogHelp: url_for('help.static', {'filename': 'trigger_dialog.html'}),
      url_jump_after_node: 'schema',
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_trigger_on_coll', node: 'coll-trigger', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Trigger...'),
          icon: 'wcTabIcon icon-trigger', data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_trigger', node: 'trigger', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Trigger...'),
          icon: 'wcTabIcon icon-trigger', data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_trigger_onTable', node: 'table', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Trigger...'),
          icon: 'wcTabIcon icon-trigger', data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_trigger_onPartition', node: 'partition', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Trigger...'),
          icon: 'wcTabIcon icon-trigger', data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'enable_trigger', node: 'trigger', module: this,
          applies: ['object', 'context'], callback: 'enable_trigger',
          category: 'connect', priority: 3, label: gettext('Enable trigger'),
          icon: 'fa fa-check', enable : 'canCreate_with_trigger_enable',
        },{
          name: 'disable_trigger', node: 'trigger', module: this,
          applies: ['object', 'context'], callback: 'disable_trigger',
          category: 'drop', priority: 3, label: gettext('Disable trigger'),
          icon: 'fa fa-times', enable : 'canCreate_with_trigger_disable',
        },{
          name: 'create_trigger_onView', node: 'view', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Trigger...'),
          icon: 'wcTabIcon icon-trigger', data: {action: 'create', check: true},
          enable: 'canCreate',
        },
        ]);
      },
      callbacks: {
        /* Enable trigger */
        enable_trigger: function(args) {
          var input = args || {},
            obj = this,
            t = pgBrowser.tree,
            i = input.item || t.selected(),
            d = i && i.length == 1 ? t.itemData(i) : undefined;

          if (!d)
            return false;

          var data = d;
          $.ajax({
            url: obj.generate_url(i, 'enable' , d, true),
            type:'PUT',
            data: {'is_enable_trigger' : 'O'},
            dataType: 'json',
          })
            .done(function(res) {
              if (res.success == 1) {
                alertify.success(res.info);
                t.removeIcon(i);
                data.icon = 'icon-trigger';
                t.addIcon(i, {icon: data.icon});
                t.unload(i);
                t.setInode(false);
                t.deselect(i);
                // Fetch updated data from server
                setTimeout(function() {
                  t.select(i);
                }, 10);
              }
            })
            .fail(function(xhr, status, error) {
              alertify.pgRespErrorNotify(xhr, error);
              t.unload(i);
            });
        },
        /* Disable trigger */
        disable_trigger: function(args) {
          var input = args || {},
            obj = this,
            t = pgBrowser.tree,
            i = input.item || t.selected(),
            d = i && i.length == 1 ? t.itemData(i) : undefined;

          if (!d)
            return false;

          var data = d;
          $.ajax({
            url: obj.generate_url(i, 'enable' , d, true),
            type:'PUT',
            data: {'is_enable_trigger' : 'D'},
            dataType: 'json',
          })
            .done(function(res) {
              if (res.success == 1) {
                alertify.success(res.info);
                t.removeIcon(i);
                data.icon = 'icon-trigger-bad';
                t.addIcon(i, {icon: data.icon});
                t.unload(i);
                t.setInode(false);
                t.deselect(i);
                // Fetch updated data from server
                setTimeout(function() {
                  t.select(i);
                }, 10);
              }
            })
            .fail(function(xhr, status, error) {
              alertify.pgRespErrorNotify(xhr, error, gettext('Disable trigger failed'));
              t.unload(i);
            });
        },
      },
      canDrop: SchemaChildTreeNode.isTreeItemOfChildOfSchema,
      canDropCascade: SchemaChildTreeNode.isTreeItemOfChildOfSchema,
      model: pgAdmin.Browser.Node.Model.extend({
        idAttribute: 'oid',
        defaults: {
          name: undefined,
          is_row_trigger: true,
          fires: 'BEFORE',
        },
        schema: [{
          id: 'name', label: gettext('Name'), cell: 'string',
          type: 'text', disabled: 'inSchema',
        },{
          id: 'oid', label: gettext('OID'), cell: 'string',
          type: 'int', mode: ['properties'],
        },{
          id: 'is_enable_trigger', label: gettext('Trigger enabled?'),
          mode: ['edit', 'properties'], group: gettext('Definition'),
          disabled: function() {
            if(this.node_info && ('catalog' in this.node_info || 'view' in this.node_info)) {
              return true;
            }
            return false;
          },
          options: [
            {label: gettext('Enable'), value: 'O'},
            {label: gettext('Enable Replica'), value: 'R'},
            {label: gettext('Enable Always'), value: 'A'},
            {label: gettext('Disable'), value: 'D'},
          ],
          control: 'select2', select2: { allowClear: false, width: '100%' },
        },{
          id: 'is_row_trigger', label: gettext('Row trigger?'),
          type: 'switch', group: gettext('Definition'),
          mode: ['create','edit', 'properties'],
          deps: ['is_constraint_trigger'],
          disabled: function(m) {
            // Disabled if table is a partitioned table.
            if (_.has(m, 'node_info') && _.has(m.node_info, 'table') &&
              _.has(m.node_info.table, 'is_partitioned') &&
               m.node_info.table.is_partitioned && m.node_info.server.version < 110000
            )
            {
              setTimeout(function(){
                m.set('is_row_trigger', false);
              },10);

              return true;
            }

            // If constraint trigger is set to True then row trigger will
            // automatically set to True and becomes disable
            var is_constraint_trigger = m.get('is_constraint_trigger');
            if(!m.inSchemaWithModelCheck.apply(this, [m])) {
              if(!_.isUndefined(is_constraint_trigger) &&
                is_constraint_trigger === true) {
                // change it's model value
                setTimeout(function() { m.set('is_row_trigger', true); }, 10);
                return true;
              } else {
                return false;
              }
            } else {
              // Check if it is row trigger then enabled it.
              var is_row_trigger = m.get('is_row_trigger');
              if (!_.isUndefined(is_row_trigger) && m.node_info['server']['server_type'] == 'ppas') {
                return false;
              }
              // Disable it
              return true;
            }
          },
        },{
          id: 'is_constraint_trigger', label: gettext('Constraint trigger?'),
          type: 'switch',
          mode: ['create','edit', 'properties'],
          group: gettext('Definition'),
          deps: ['tfunction'],
          disabled: function(m) {
            // Disabled if table is a partitioned table.
            var tfunction = m.get('tfunction');
            if ((_.has(m, 'node_info') && _.has(m.node_info, 'table') &&
              _.has(m.node_info.table, 'is_partitioned') &&
                m.node_info.table.is_partitioned) ||
                _.indexOf(Object.keys(m.node_info), 'view') != -1 ||
                (m.node_info.server.server_type === 'ppas' &&
                !_.isUndefined(tfunction) &&
                 tfunction === 'Inline EDB-SPL')) {
              setTimeout(function(){
                m.set('is_constraint_trigger', false);
              },10);

              return true;
            }

            return m.inSchemaWithModelCheck.apply(this, [m]);
          },
        },{
          id: 'tgdeferrable', label: gettext('Deferrable?'),
          type: 'switch', group: gettext('Definition'),
          mode: ['create','edit', 'properties'],
          deps: ['is_constraint_trigger'],
          disabled: function(m) {
            // If constraint trigger is set to True then only enable it
            var is_constraint_trigger = m.get('is_constraint_trigger');
            if(!m.inSchemaWithModelCheck.apply(this, [m])) {
              if(!_.isUndefined(is_constraint_trigger) &&
                is_constraint_trigger === true) {
                return false;
              } else {
                // If value is already set then reset it to false
                if(m.get('tgdeferrable')) {
                  setTimeout(function() { m.set('tgdeferrable', false); }, 10);
                }
                return true;
              }
            } else {
              // Disable it
              return true;
            }
          },
        },{
          id: 'tginitdeferred', label: gettext('Deferred?'),
          type: 'switch', group: gettext('Definition'),
          mode: ['create','edit', 'properties'],
          deps: ['tgdeferrable', 'is_constraint_trigger'],
          disabled: function(m) {
            // If Deferrable is set to True then only enable it
            var tgdeferrable = m.get('tgdeferrable');
            if(!m.inSchemaWithModelCheck.apply(this, [m])) {
              if(!_.isUndefined(tgdeferrable) &&
                tgdeferrable) {
                return false;
              } else {
                // If value is already set then reset it to false
                if(m.get('tginitdeferred')) {
                  setTimeout(function() { m.set('tginitdeferred', false); }, 10);
                }
                // If constraint trigger is set then do not disable
                return m.get('is_constraint_trigger') ? false : true;
              }
            } else {
              // Disable it
              return true;
            }
          },
        },{
          id: 'tfunction', label: gettext('Trigger function'),
          type: 'text', disabled: 'inSchemaWithModelCheck',
          mode: ['create','edit', 'properties'], group: gettext('Definition'),
          control: 'node-ajax-options', url: 'get_triggerfunctions', url_jump_after_node: 'schema',
          cache_node: 'trigger_function',
        },{
          id: 'tgargs', label: gettext('Arguments'), cell: 'string',
          group: gettext('Definition'),
          type: 'text',mode: ['create','edit', 'properties'], deps: ['tfunction'],
          disabled: function(m) {
            // We will disable it when EDB PPAS and trigger function is
            // set to Inline EDB-SPL
            var tfunction = m.get('tfunction'),
              server_type = m.node_info['server']['server_type'];
            if(!m.inSchemaWithModelCheck.apply(this, [m])) {
              if(server_type === 'ppas' &&
                !_.isUndefined(tfunction) &&
                  tfunction === 'Inline EDB-SPL') {
                // Disable and clear its value
                m.set('tgargs', undefined);
                return true;
              } else {
                return false;
              }
            } else {
              // Disable it
              return true;
            }
          },
        },{
          id: 'fires', label: gettext('Fires'), deps: ['is_constraint_trigger'],
          mode: ['create','edit', 'properties'], group: gettext('Events'),
          options: function(control) {
            var table_options = [
                {label: 'BEFORE', value: 'BEFORE'},
                {label: 'AFTER', value: 'AFTER'}],
              view_options = [
                {label: 'BEFORE', value: 'BEFORE'},
                {label: 'AFTER', value: 'AFTER'},
                {label: 'INSTEAD OF', value: 'INSTEAD OF'}];
            // If we are under table then show table specific options
            if(_.indexOf(Object.keys(control.model.node_info), 'table') != -1) {
              return table_options;
            } else {
              return view_options;
            }
          },
          control: 'select2', select2: { allowClear: false, width: '100%' },
          disabled: function(m) {
            // If contraint trigger is set to True then only enable it
            var is_constraint_trigger = m.get('is_constraint_trigger');
            if(!m.inSchemaWithModelCheck.apply(this, [m])) {
              if(!_.isUndefined(is_constraint_trigger) &&
                is_constraint_trigger === true) {
                setTimeout(function() { m.set('fires', 'AFTER'); }, 10);
                return true;
              } else {
                return false;
              }
            } else {
              // Check if it is row trigger then enabled it.
              var fires_ = m.get('fires');
              if (!_.isUndefined(fires_) && m.node_info['server']['server_type'] == 'ppas') {
                return false;
              }
              // Disable it
              return true;
            }
          },
        },{
          type: 'nested', control: 'fieldset', mode: ['create','edit', 'properties'],
          label: gettext('Events'), group: gettext('Events'), contentClass: 'row',
          schema:[{
            id: 'evnt_insert', label: gettext('INSERT'),
            type: 'switch', mode: ['create','edit', 'properties'],
            group: gettext('Events'),
            extraToggleClasses: 'pg-el-sm-6',
            controlLabelClassName: 'control-label pg-el-sm-5 pg-el-12',
            controlsClassName: 'pgadmin-controls pg-el-sm-7 pg-el-12',
            disabled: function(m) {
              var evn_insert = m.get('evnt_insert');
              if (!_.isUndefined(evn_insert) && m.node_info['server']['server_type'] == 'ppas')
                return false;
              return m.inSchemaWithModelCheck.apply(this, [m]);
            },
          },{
            id: 'evnt_update', label: gettext('UPDATE'),
            type: 'switch', mode: ['create','edit', 'properties'],
            group: gettext('Events'),
            extraToggleClasses: 'pg-el-sm-6',
            controlLabelClassName: 'control-label pg-el-sm-5 pg-el-12',
            controlsClassName: 'pgadmin-controls pg-el-sm-7 pg-el-12',
            disabled: function(m) {
              var evn_update = m.get('evnt_update');
              if (!_.isUndefined(evn_update) && m.node_info['server']['server_type'] == 'ppas')
                return false;
              return m.inSchemaWithModelCheck.apply(this, [m]);
            },
          },{
            id: 'evnt_delete', label: gettext('DELETE'),
            type: 'switch', mode: ['create','edit', 'properties'],
            group: gettext('Events'),
            extraToggleClasses: 'pg-el-sm-6',
            controlLabelClassName: 'control-label pg-el-sm-5 pg-el-12',
            controlsClassName: 'pgadmin-controls pg-el-sm-7 pg-el-12',
            disabled: function(m) {
              var evn_delete = m.get('evnt_delete');
              if (!_.isUndefined(evn_delete) && m.node_info['server']['server_type'] == 'ppas')
                return false;
              return m.inSchemaWithModelCheck.apply(this, [m]);
            },
          },{
            id: 'evnt_truncate', label: gettext('TRUNCATE'),
            type: 'switch', group: gettext('Events'),
            extraToggleClasses: 'pg-el-sm-6',
            controlLabelClassName: 'control-label pg-el-sm-5 pg-el-12',
            controlsClassName: 'pgadmin-controls pg-el-sm-7 pg-el-12',
            disabled: function(m) {
              var is_constraint_trigger = m.get('is_constraint_trigger'),
                is_row_trigger = m.get('is_row_trigger'),
                server_type = m.node_info['server']['server_type'];
              if(!m.inSchemaWithModelCheck.apply(this, [m])) {
                // We will enabale truncate only for EDB PPAS
                // and both triggers row & constarint are set to false
                return (server_type !== 'ppas' ||
                _.isUndefined(is_constraint_trigger) ||
                  _.isUndefined(is_row_trigger) ||
                  is_constraint_trigger !== false ||
                  is_row_trigger !== false);
              } else {
                // Disable it
                return true;
              }
            },
          }],
        },{
          id: 'whenclause', label: gettext('When'),
          type: 'text', disabled: 'inSchemaWithModelCheck',
          mode: ['create', 'edit', 'properties'],
          control: 'sql-field', visible: true, group: gettext('Events'),
        },{
          id: 'columns', label: gettext('Columns'), url: 'nodes',
          control: 'node-list-by-name', cache_node: 'column', type: 'array',
          select2: {'multiple': true},
          deps: ['evnt_update'], node: 'column', group: gettext('Events'),
          disabled: function(m) {
            if(this.node_info &&  'catalog' in this.node_info) {
              return true;
            }
            //Disable in edit mode
            if (!m.isNew()) {
              return true;
            }
            // Enable column only if update event is set true
            var isUpdate = m.get('evnt_update');
            if(!_.isUndefined(isUpdate) && isUpdate) {
              return false;
            }
            return true;
          },
        },{
          id: 'tgoldtable', label: gettext('Old table'),
          type: 'text', group: gettext('Transition'),
          cell: 'string', mode: ['create', 'edit', 'properties'],
          deps: ['fires', 'is_constraint_trigger', 'evnt_insert', 'evnt_update', 'evnt_delete', 'columns'],
          disabled: 'disableTransition',
        },{
          id: 'tgnewtable', label: gettext('New table'),
          type: 'text', group: gettext('Transition'),
          cell: 'string', mode: ['create', 'edit', 'properties'],
          deps: ['fires', 'is_constraint_trigger', 'evnt_insert', 'evnt_update', 'evnt_delete', 'columns'],
          disabled: 'disableTransition',
        },{
          id: 'prosrc', label: gettext('Code'), group: gettext('Code'),
          type: 'text', mode: ['create', 'edit'], deps: ['tfunction'],
          tabPanelCodeClass: 'sql-code-control',
          control: Backform.SqlCodeControl,
          visible: true,
          disabled: function(m) {
            // We will enable it only when EDB PPAS and trigger function is
            // set to Inline EDB-SPL
            var tfunction = m.get('tfunction'),
              server_type = m.node_info['server']['server_type'];

            return (server_type !== 'ppas' ||
            _.isUndefined(tfunction) ||
              tfunction !== 'Inline EDB-SPL');
          },
        },{
          id: 'is_sys_trigger', label: gettext('System trigger?'), cell: 'string',
          type: 'switch', disabled: 'inSchemaWithModelCheck', mode: ['properties'],
        },{
          id: 'description', label: gettext('Comment'), cell: 'string',
          type: 'multiline', mode: ['properties', 'create', 'edit'],
          disabled: 'inSchema',
        }],
        validate: function(keys) {
          var msg;
          this.errorModel.clear();

          // If nothing to validate
          if (keys && keys.length == 0) {
            return null;
          }

          if(_.isUndefined(this.get('name'))
            || String(this.get('name')).replace(/^\s+|\s+$/g, '') == '') {
            msg = gettext('Name cannot be empty.');
            this.errorModel.set('name', msg);
            return msg;
          }
          if(_.isUndefined(this.get('tfunction'))
            || String(this.get('tfunction')).replace(/^\s+|\s+$/g, '') == '') {
            msg = gettext('Trigger function cannot be empty.');
            this.errorModel.set('tfunction', msg);
            return msg;
          }

          if(!this.get('evnt_truncate') && !this.get('evnt_delete') &&
            !this.get('evnt_update') && !this.get('evnt_insert')) {
            msg = gettext('Specify at least one event.');
            this.errorModel.set('evnt_truncate', ' ');
            this.errorModel.set('evnt_delete', ' ');
            this.errorModel.set('evnt_update', ' ');
            this.errorModel.set('evnt_insert', msg);
            return msg;
          }

          if(!_.isUndefined(this.get('tfunction')) &&
            this.get('tfunction') === 'Inline EDB-SPL' &&
              (_.isUndefined(this.get('prosrc'))
                || String(this.get('prosrc')).replace(/^\s+|\s+$/g, '') == ''))
          {
            msg = gettext('Trigger code cannot be empty.');
            this.errorModel.set('prosrc', msg);
            return msg;
          }
          return null;
        },
        // We will check if we are under schema node & in 'create' mode
        inSchema: function() {
          if(this.node_info &&  'catalog' in this.node_info) {
            return true;
          }
          return false;
        },
        // We will check if we are under schema node & in 'create' mode
        inSchemaWithModelCheck: function(m) {
          if(this.node_info &&  'schema' in this.node_info) {
            // We will disable control if it's in 'edit' mode
            return !m.isNew();
          }
          return true;
        },
        // Checks weather to enable/disable control
        inSchemaWithColumnCheck: function(m) {
          if(this.node_info &&  'schema' in this.node_info) {
            // We will disable control if it's system columns
            // ie: it's position is less then 1
            if (m.isNew()) {
              return false;
            } else {
              // if we are in edit mode
              return (_.isUndefined(m.get('attnum')) || m.get('attnum') < 1 );
            }
          }
          return true;
        },
        // Disable/Enable Transition tables
        disableTransition: function(m) {
          var flag = false,
            evnt = null,
            name = this.name,
            evnt_count = 0;

          // Disable transition tables for view trigger and PG version < 100000
          if(_.indexOf(Object.keys(m.node_info), 'table') == -1 ||
            m.node_info.server.version < 100000) return true;

          if (name == 'tgoldtable') evnt = 'evnt_delete';
          else if (name == 'tgnewtable') evnt = 'evnt_insert';

          if(m.get('evnt_insert')) evnt_count++;
          if(m.get('evnt_update')) evnt_count++;
          if(m.get('evnt_delete')) evnt_count++;


          // Disable transition tables if
          //  - It is a constraint trigger
          //  - Fires other than AFTER
          //  - More than one events enabled
          //  - Update event with the column list

          // Disable Old transition table if both UPDATE and DELETE events are disabled
          // Disable New transition table if both UPDATE and INSERT events are disabled
          if(!m.get('is_constraint_trigger') && m.get('fires') == 'AFTER' &&
            (m.get('evnt_update') || m.get(evnt)) && evnt_count == 1) {
            flag = (m.get('evnt_update') && (_.size(m.get('columns')) >= 1 && m.get('columns')[0] != ''));
          }

          flag && setTimeout(function() {
            if(m.get(name)) {
              m.set(name, null);
            }
          },10);

          return flag;
        },
      }),
      canCreate: SchemaChildTreeNode.isTreeItemOfChildOfSchema,
      // Check to whether trigger is disable ?
      canCreate_with_trigger_enable: function(itemData, item, data) {
        var treeData = this.getTreeNodeHierarchy(item);
        if ('view' in treeData) {
          return false;
        }

        return itemData.icon === 'icon-trigger-bad' &&
          this.canCreate.apply(this, [itemData, item, data]);
      },
      // Check to whether trigger is enable ?
      canCreate_with_trigger_disable: function(itemData, item, data) {
        var treeData = this.getTreeNodeHierarchy(item);
        if ('view' in treeData) {
          return false;
        }

        return itemData.icon === 'icon-trigger' &&
          this.canCreate.apply(this, [itemData, item, data]);
      },
    });
  }

  return pgBrowser.Nodes['trigger'];
});
