/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define('pgadmin.node.compound_trigger', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore',
  'sources/pgadmin', 'pgadmin.browser',
  'pgadmin.backform', 'pgadmin.alertifyjs',
  'pgadmin.node.schema.dir/schema_child_tree_node',
  'pgadmin.browser.collection',
], function(
  gettext, url_for, $, _, pgAdmin, pgBrowser, Backform, alertify,
  SchemaChildTreeNode
) {

  if (!pgBrowser.Nodes['coll-compound_trigger']) {
    pgAdmin.Browser.Nodes['coll-compound_trigger'] =
      pgAdmin.Browser.Collection.extend({
        node: 'compound_trigger',
        label: gettext('Compound Triggers'),
        type: 'coll-compound_trigger',
        columns: ['name', 'description'],
        canDrop: SchemaChildTreeNode.isTreeItemOfChildOfSchema,
        canDropCascade: SchemaChildTreeNode.isTreeItemOfChildOfSchema,
      });
  }

  if (!pgBrowser.Nodes['compound_trigger']) {
    pgAdmin.Browser.Nodes['compound_trigger'] = pgBrowser.Node.extend({
      parent_type: ['table', 'view', 'partition'],
      collection_type: ['coll-table', 'coll-view'],
      type: 'compound_trigger',
      label: gettext('Compound Trigger'),
      hasSQL:  true,
      hasDepends: true,
      width: pgBrowser.stdW.sm + 'px',
      sqlAlterHelp: 'sql-altertcompoundtrigger.html',
      sqlCreateHelp: 'sql-createcompoundtrigger.html',
      dialogHelp: url_for('help.static', {'filename': 'compound_trigger_dialog.html'}),
      url_jump_after_node: 'schema',
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_compound_trigger_on_coll', node: 'coll-compound_trigger', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Compound Trigger...'),
          icon: 'wcTabIcon icon-compound_trigger', data: {action: 'create', check: true,
            data_disabled: gettext('This option is only available on EPAS servers.')},
          enable: 'canCreate',
        },{
          name: 'create_compound_trigger', node: 'compound_trigger', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Compound Trigger...'),
          icon: 'wcTabIcon icon-compound_trigger', data: {action: 'create', check: true,
            data_disabled: gettext('This option is only available on EPAS servers.')},
          enable: 'canCreate',
        },{
          name: 'create_compound_trigger_onTable', node: 'table', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Compound Trigger...'),
          icon: 'wcTabIcon icon-compound_trigger', data: {action: 'create', check: true,
            data_disabled: gettext('This option is only available on EPAS servers.')},
          enable: 'canCreate',
        },{
          name: 'create_compound_trigger_onPartition', node: 'partition', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Compound Trigger...'),
          icon: 'wcTabIcon icon-compound_trigger', data: {action: 'create', check: true,
            data_disabled: gettext('This option is only available on EPAS servers.')},
          enable: 'canCreate',
        },{
          name: 'enable_compound_trigger', node: 'compound_trigger', module: this,
          applies: ['object', 'context'], callback: 'enable_compound_trigger',
          category: 'connect', priority: 3, label: gettext('Enable compound trigger'),
          icon: 'fa fa-check', enable : 'canCreate_with_compound_trigger_enable',
        },{
          name: 'disable_compound_trigger', node: 'compound_trigger', module: this,
          applies: ['object', 'context'], callback: 'disable_compound_trigger',
          category: 'drop', priority: 3, label: gettext('Disable compound trigger'),
          icon: 'fa fa-times', enable : 'canCreate_with_compound_trigger_disable',
        },{
          name: 'create_compound_trigger_onView', node: 'view', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Compound Trigger...'),
          icon: 'wcTabIcon icon-compound_trigger', data: {action: 'create', check: true,
            data_disabled: gettext('This option is only available on EPAS servers.')},
          enable: 'canCreate',
        },
        ]);
      },
      callbacks: {
        /* Enable compound trigger */
        enable_compound_trigger: function(args) {
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
                data.icon = 'icon-compound_trigger';
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
        /* Disable compound trigger */
        disable_compound_trigger: function(args) {
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
                data.icon = 'icon-compound_trigger-bad';
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
              alertify.pgRespErrorNotify(xhr, error, gettext('Disable compound trigger failed'));
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
        },
        schema: [{
          id: 'name', label: gettext('Name'), cell: 'string',
          type: 'text', disabled: 'inSchema',
        },{
          id: 'oid', label: gettext('OID'), cell: 'string',
          type: 'int', mode: ['properties'],
        },{
          id: 'is_enable_trigger', label: gettext('Trigger enabled?'),
          mode: ['edit', 'properties'],
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
          type: 'nested', control: 'fieldset', mode: ['create','edit', 'properties'],
          label: gettext('FOR Events'), group: gettext('Events'), contentClass: 'row',
          schema:[{
            id: 'evnt_insert', label: gettext('INSERT'),
            type: 'switch', mode: ['create','edit', 'properties'],
            group: gettext('FOR Events'),
            extraToggleClasses: 'pg-el-sm-6',
            controlLabelClassName: 'control-label pg-el-sm-5 pg-el-12',
            controlsClassName: 'pgadmin-controls pg-el-sm-7 pg-el-12',
            disabled: function(m) {
              var evn_insert = m.get('evnt_insert');
              if (!_.isUndefined(evn_insert) && m.node_info['server']['server_type'] == 'ppas')
                return false;
              return m.inSchema.apply(this, [m]);
            },
            readonly: 'inEditMode',
          },{
            id: 'evnt_update', label: gettext('UPDATE'),
            type: 'switch', mode: ['create','edit', 'properties'],
            group: gettext('FOR Events'),
            extraToggleClasses: 'pg-el-sm-6',
            controlLabelClassName: 'control-label pg-el-sm-5 pg-el-12',
            controlsClassName: 'pgadmin-controls pg-el-sm-7 pg-el-12',
            disabled: function(m) {
              var evn_update = m.get('evnt_update');
              if (!_.isUndefined(evn_update) && m.node_info['server']['server_type'] == 'ppas')
                return false;
              return m.inSchema.apply(this, [m]);
            },
            readonly: 'inEditMode',
          },{
            id: 'evnt_delete', label: gettext('DELETE'),
            type: 'switch', mode: ['create','edit', 'properties'],
            group: gettext('FOR Events'),
            extraToggleClasses: 'pg-el-sm-6',
            controlLabelClassName: 'control-label pg-el-sm-5 pg-el-12',
            controlsClassName: 'pgadmin-controls pg-el-sm-7 pg-el-12',
            disabled: function(m) {
              var evn_delete = m.get('evnt_delete');
              if (!_.isUndefined(evn_delete) && m.node_info['server']['server_type'] == 'ppas')
                return false;
              return m.inSchema.apply(this, [m]);
            },
            readonly: 'inEditMode',
          },{
            id: 'evnt_truncate', label: gettext('TRUNCATE'),
            type: 'switch', mode: ['create','edit', 'properties'],
            group: gettext('FOR Events'),
            extraToggleClasses: 'pg-el-sm-6',
            controlLabelClassName: 'control-label pg-el-sm-5 pg-el-12',
            controlsClassName: 'pgadmin-controls pg-el-sm-7 pg-el-12',
            disabled: function(m) {
              var evn_truncate = m.get('evnt_truncate');
              // Views cannot have TRUNCATE triggers.
              if ('view' in m.node_info)
                return true;

              if (!_.isUndefined(evn_truncate) && m.node_info['server']['server_type'] == 'ppas')
                return false;
              return m.inSchema.apply(this, [m]);
            },
          }],
          readonly: 'inEditMode',
        },{
          id: 'whenclause', label: gettext('When'),
          type: 'text', disabled: 'inSchema', readonly: 'inEditMode',
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
            // Enable column only if update event is set true
            var isUpdate = m.get('evnt_update');
            if(!_.isUndefined(isUpdate) && isUpdate) {
              return false;
            }
            return true;
          },
          readonly: 'inEditMode',
        },{
          id: 'prosrc', label: gettext('Code'), group: gettext('Code'),
          type: 'text', mode: ['create', 'edit'],
          tabPanelCodeClass: 'sql-code-control',
          control: Backform.SqlCodeControl,
          disabled: function(m) {
            if(m.isNew()) {
              var code = m.getCodeTemplate();
              setTimeout(function() {
                m.set('prosrc', code);
              }, 10);
            }
            return false;
          },
        },{
          id: 'is_sys_trigger', label: gettext('System trigger?'), cell: 'string',
          type: 'switch', disabled: 'inSchema', mode: ['properties'],
          readonly: 'inEditMode',
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

          if(!this.get('evnt_truncate') && !this.get('evnt_delete') &&
            !this.get('evnt_update') && !this.get('evnt_insert')) {
            msg = gettext('Specify at least one event.');
            this.errorModel.set('evnt_truncate', ' ');
            this.errorModel.set('evnt_delete', ' ');
            this.errorModel.set('evnt_update', ' ');
            this.errorModel.set('evnt_insert', msg);
            return msg;
          }

          if(_.isUndefined(this.get('prosrc'))
            || String(this.get('prosrc')).replace(/^\s+|\s+$/g, '') == '') {
            msg = gettext('Code cannot be empty.');
            this.errorModel.set('prosrc', msg);
            return msg;
          }

          return null;
        },
        // This function returns the code template for compound trigger
        getCodeTemplate: function () {
          return gettext('-- Enter any global declarations below:\n\n' +
                  '-- BEFORE STATEMENT block. Delete if not required.\n' +
                  'BEFORE STATEMENT IS\n' +
                  '    -- Enter any local declarations here\n' +
                  'BEGIN\n' +
                  '    -- Enter any required code here\n' +
                  'END;\n\n' +
                  '-- AFTER STATEMENT block. Delete if not required.\n' +
                  'AFTER STATEMENT IS\n' +
                  '    -- Enter any local declarations here\n' +
                  'BEGIN\n' +
                  '    -- Enter any required code here\n' +
                  'END;\n\n' +
                  '-- BEFORE EACH ROW block. Delete if not required.\n' +
                  'BEFORE EACH ROW IS\n' +
                  '    -- Enter any local declarations here\n' +
                  'BEGIN\n' +
                  '    -- Enter any required code here\n' +
                  'END;\n\n' +
                  '-- AFTER EACH ROW block. Delete if not required.\n' +
                  'AFTER EACH ROW IS\n' +
                  '    -- Enter any local declarations here\n' +
                  'BEGIN\n' +
                  '    -- Enter any required code here\n' +
                  'END;\n\n' +
                  '-- INSTEAD OF EACH ROW block. Delete if not required.\n' +
                  'INSTEAD OF EACH ROW IS\n' +
                  '    -- Enter any local declarations here\n' +
                  'BEGIN\n' +
                  '    -- Enter any required code here\n' +
                  'END;');
        },
        // We will check if we are under schema node & in 'create' mode
        inSchema: function() {
          if(this.node_info &&  'catalog' in this.node_info) {
            return true;
          }
          return false;
        },
        inEditMode: function(m) {
          return !m.isNew();
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
              return !(!_.isUndefined(m.get('attnum')) && m.get('attnum') >= 1 );
            }
          }
          return true;
        },
      }),
      canCreate: function(itemData, item, data) {
        //If check is false then , we will allow create menu
        if (data && data.check == false)
          return true;

        var treeData = this.getTreeNodeHierarchy(item),
          server = treeData['server'];

        if (server && (server.server_type === 'pg' || server.version < 120000))
          return false;

        // If it is catalog then don't allow user to create package
        if (treeData['catalog'] != undefined)
          return false;

        // by default we want to allow create menu
        return true;
      },
      // Check to whether trigger is disable ?
      canCreate_with_compound_trigger_enable: function(itemData, item, data) {
        var treeData = this.getTreeNodeHierarchy(item);
        if ('view' in treeData) {
          return false;
        }

        return itemData.icon === 'icon-compound_trigger-bad' &&
          this.canCreate.apply(this, [itemData, item, data]);
      },
      // Check to whether trigger is enable ?
      canCreate_with_compound_trigger_disable: function(itemData, item, data) {
        var treeData = this.getTreeNodeHierarchy(item);
        if ('view' in treeData) {
          return false;
        }

        return itemData.icon === 'icon-compound_trigger' &&
          this.canCreate.apply(this, [itemData, item, data]);
      },
    });
  }

  return pgBrowser.Nodes['compound_trigger'];
});
