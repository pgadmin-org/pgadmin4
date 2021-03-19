/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

/* Create and Register Function Collection and Node. */
define('pgadmin.node.trigger_function', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore',
  'sources/pgadmin', 'pgadmin.browser', 'pgadmin.backform',
  'pgadmin.node.schema.dir/child', 'pgadmin.node.schema.dir/schema_child_tree_node',
  'pgadmin.browser.collection', 'pgadmin.browser.server.privilege',
], function(
  gettext, url_for, $, _, pgAdmin, pgBrowser, Backform, schemaChild, schemaChildTreeNode
) {

  if (!pgBrowser.Nodes['coll-trigger_function']) {
    pgBrowser.Nodes['coll-trigger_function'] =
      pgBrowser.Collection.extend({
        node: 'trigger_function',
        label: gettext('Trigger functions'),
        type: 'coll-trigger_function',
        columns: ['name', 'funcowner', 'description'],
        hasStatistics: true,
        canDrop: schemaChildTreeNode.isTreeItemOfChildOfSchema,
        canDropCascade: schemaChildTreeNode.isTreeItemOfChildOfSchema,
      });
  }

  if (!pgBrowser.Nodes['trigger_function']) {
    pgBrowser.Nodes['trigger_function'] = schemaChild.SchemaChildNode.extend({
      type: 'trigger_function',
      sqlAlterHelp: 'plpgsql-trigger.html',
      sqlCreateHelp: 'plpgsql-trigger.html',
      dialogHelp: url_for('help.static', {'filename': 'trigger_function_dialog.html'}),
      label: gettext('Trigger function'),
      collection_type: 'coll-trigger_function',
      canEdit: function(itemData, item) {
        let node = pgBrowser.treeMenu.findNodeByDomElement(item);

        if (!node || node.parentNode.getData()._type === 'trigger')
          return false;

        return true;
      },
      hasSQL: true,
      showMenu: function(itemData, item) {
        return this.canEdit(itemData, item);
      },
      hasDepends: true,
      hasStatistics: true,
      url_jump_after_node: 'schema',
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_trigger_function_on_coll', node: 'coll-trigger_function', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Trigger function...'),
          icon: 'wcTabIcon icon-trigger_function', data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_trigger_function', node: 'trigger_function', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Trigger function...'),
          icon: 'wcTabIcon icon-trigger_function', data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_trigger_function', node: 'schema', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Trigger function...'),
          icon: 'wcTabIcon icon-trigger_function', data: {action: 'create', check: false},
          enable: 'canCreate',
        },
        ]);
      },
      model: pgBrowser.Node.Model.extend({
        idAttribute: 'oid',
        initialize: function(attrs, args) {
          var isNew = (_.size(attrs) === 0);
          if (isNew) {
            // Set Selected Schema
            var schema_id = args.node_info.schema._id;
            this.set({'pronamespace': schema_id}, {silent: true});

            // Set Current User
            var userInfo = pgBrowser.serverInfo[args.node_info.server._id].user;
            this.set({'funcowner': userInfo.name}, {silent: true});
          }
          pgBrowser.Node.Model.prototype.initialize.apply(this, arguments);
        },
        defaults: {
          name: undefined,
          oid: undefined,
          xmin: undefined,
          funcowner: undefined,
          pronamespace: undefined,
          description: undefined,
          pronargs: undefined, /* Argument Count */
          proargs: undefined, /* Arguments */
          proargtypenames: undefined, /* Argument Signature */
          prorettypename: 'trigger', /* Return Type */
          lanname: 'plpgsql', /* Language Name in which function is being written */
          provolatile: undefined, /* Volatility */
          proretset: undefined, /* Return Set */
          proisstrict: undefined,
          prosecdef: undefined, /* Security of definer */
          proiswindow: undefined, /* Window Function ? */
          procost: undefined, /* Estimated execution Cost */
          prorows: undefined, /* Estimated number of rows */
          proleakproof: undefined,
          args: [],
          prosrc: undefined,
          prosrc_c: undefined,
          probin: '$libdir/',
          options: [],
          variables: [],
          proacl: undefined,
          seclabels: [],
          acl: [],
          sysfunc: undefined,
          sysproc: undefined,
        },
        schema: [{
          id: 'name', label: gettext('Name'), cell: 'string',
          type: 'text', mode: ['properties', 'create', 'edit'],
          disabled: 'isDisabled', readonly: 'isReadonly',
        },{
          id: 'oid', label: gettext('OID'), cell: 'string',
          type: 'text' , mode: ['properties'],
        },{
          id: 'funcowner', label: gettext('Owner'), cell: 'string',
          control: Backform.NodeListByNameControl, node: 'role',  type:
          'text', disabled: 'isDisabled', readonly: 'isReadonly',
        },{
          id: 'pronamespace', label: gettext('Schema'), cell: 'string',
          control: 'node-list-by-id', type: 'text', cache_level: 'database',
          node: 'schema', disabled: 'isDisabled',  readonly: 'isReadonly',
          mode: ['create', 'edit'],
        },{
          id: 'sysfunc', label: gettext('System trigger function?'),
          cell:'boolean', type: 'switch',
          mode: ['properties'], visible: 'isVisible',
        },{
          id: 'sysproc', label: gettext('System procedure?'),
          cell:'boolean', type: 'switch',
          mode: ['properties'], visible: 'isVisible',
        },{
          id: 'description', label: gettext('Comment'), cell: 'string',
          type: 'multiline', disabled: 'isDisabled', readonly: 'isReadonly',
        },{
          id: 'pronargs', label: gettext('Argument count'), cell: 'string',
          type: 'text', group: gettext('Definition'), mode: ['properties'],
        },{
          id: 'proargs', label: gettext('Arguments'), cell: 'string',
          type: 'text', group: gettext('Definition'), mode: ['properties', 'edit'],
          disabled: 'isDisabled', readonly: 'isReadonly',
        },{
          id: 'proargtypenames', label: gettext('Signature arguments'), cell:
          'string', type: 'text', group: gettext('Definition'), mode: ['properties'],
          disabled: 'isDisabled', readonly: 'isReadonly',
        },{
          id: 'prorettypename', label: gettext('Return type'), cell: 'string',
          control: 'select2', type: 'text', group: gettext('Definition'),
          disabled: 'isDisabled', readonly: 'isReadonly', first_empty: true,
          select2: { width: '100%', allowClear: false },
          mode: ['create'], visible: 'isVisible', options: [
            {label: gettext('trigger'), value: 'trigger'},
            {label: gettext('event_trigger'), value: 'event_trigger'},
          ],
        },{
          id: 'prorettypename', label: gettext('Return type'), cell: 'string',
          type: 'text', group: gettext('Definition'),
          mode: ['properties', 'edit'], disabled: 'isDisabled', readonly: 'isReadonly',
          visible: 'isVisible',
        },  {
          id: 'lanname', label: gettext('Language'), cell: 'string',
          control: 'node-ajax-options', type: 'text', group: gettext('Definition'),
          url: 'get_languages', disabled: 'isDisabled', readonly: 'isReadonly',
          transform: function(d) {
            return _.reject(d, function(o) {
              return o.label == 'sql' || o.label == 'edbspl';
            });
          }, select2: { allowClear: false },
        },{
          id: 'prosrc', label: gettext('Code'), cell: 'string',
          type: 'text', mode: ['properties', 'create', 'edit'],
          group: gettext('Code'), deps: ['lanname'],
          tabPanelCodeClass: 'sql-code-control',
          control: Backform.SqlCodeControl,
          visible: function(m) {
            if (m.get('lanname') == 'c') {
              return false;
            }
            return true;
          }, disabled: 'isDisabled', readonly: 'isReadonly',
        },{
          id: 'probin', label: gettext('Object file'), cell: 'string',
          type: 'text', group: gettext('Definition'), deps: ['lanname'], visible:
          function(m) {
            if (m.get('lanname') == 'c') { return true; }
            return false;
          }, disabled: 'isDisabled', readonly: 'isReadonly',
        },{
          id: 'prosrc_c', label: gettext('Link symbol'), cell: 'string',
          type: 'text', group: gettext('Definition'),  deps: ['lanname'], visible:
          function(m) {
            if (m.get('lanname') == 'c') { return true; }
            return false;
          }, disabled: 'isDisabled', readonly: 'isReadonly',
        },{
          id: 'provolatile', label: gettext('Volatility'), cell: 'string',
          control: 'node-ajax-options', type: 'text', group: gettext('Options'),
          options:[
            {'label': 'VOLATILE', 'value': 'v'},
            {'label': 'STABLE', 'value': 's'},
            {'label': 'IMMUTABLE', 'value': 'i'},
          ], disabled: 'isDisabled', readonly: 'isReadonly', select2: { allowClear: false },
        },{
          id: 'proretset', label: gettext('Returns a set?'), type: 'switch',
          group: gettext('Options'), disabled: 'isDisabled', readonly: 'isReadonly',
          visible: 'isVisible',
        },{
          id: 'proisstrict', label: gettext('Strict?'), type: 'switch',
          disabled: 'isDisabled', readonly: 'isReadonly', group: gettext('Options'),
        },{
          id: 'prosecdef', label: gettext('Security of definer?'),
          group: gettext('Options'), cell:'boolean', type: 'switch',
          disabled: 'isDisabled', readonly: 'isReadonly',
        },{
          id: 'proiswindow', label: gettext('Window?'),
          group: gettext('Options'), cell:'boolean', type: 'switch',
          disabled: 'isDisabled', readonly: 'isReadonly', visible: 'isVisible',
        },{
          id: 'procost', label: gettext('Estimated cost'), type: 'text',
          group: gettext('Options'), disabled: 'isDisabled', readonly: 'isReadonly',
        },{
          id: 'prorows', label: gettext('Estimated rows'), type: 'text',
          group: gettext('Options'),
          disabled: 'isDisabled', readonly: 'isReadonly',
          deps: ['proretset'], visible: 'isVisible',
        },{
          id: 'proleakproof', label: gettext('Leak proof?'),
          group: gettext('Options'), cell:'boolean', type: 'switch', min_version: 90200,
          disabled: 'isDisabled', readonly: 'isReadonly',
        }, pgBrowser.SecurityGroupSchema, {
          id: 'proacl', label: gettext('Privileges'), mode: ['properties'],
          group: gettext('Security'), type: 'text',
        },{
          id: 'variables', label: '', type: 'collection',
          group: gettext('Parameters'), control: 'variable-collection',
          model: pgBrowser.Node.VariableModel,
          mode: ['edit', 'create'], canAdd: 'canVarAdd', canEdit: false,
          canDelete: true, disabled: 'isDisabled', readonly: 'isReadonly',
        },{
          id: 'acl', label: gettext('Privileges'), editable: false,
          type: 'collection', group: 'security', mode: ['edit', 'create'],
          model: pgBrowser.Node.PrivilegeRoleModel.extend({
            privileges: ['X'],
          }), uniqueCol : ['grantee', 'grantor'], disabled: 'isDisabled', readonly: 'isReadonly',
          canAdd: true, canDelete: true, control: 'unique-col-collection',
        },{
          id: 'seclabels', label: gettext('Security labels'), canEdit: true,
          model: pgBrowser.SecLabelModel, type: 'collection',
          min_version: 90100, group: 'security', mode: ['edit', 'create'],
          canDelete: true, control: 'unique-col-collection', canAdd: true,
          uniqueCol : ['provider'], disabled: 'isDisabled', readonly: 'isReadonly',
        }],
        validate: function(keys)
        {
          var err = {},
            errmsg,
            seclabels = this.get('seclabels');

          // Nothing to validate
          if(keys && keys.length == 0) {
            this.errorModel.clear();
            return null;
          }

          if (_.isUndefined(this.get('name')) || String(this.get('name')).replace(/^\s+|\s+$/g, '') == '') {
            err['name'] = gettext('Name cannot be empty.');
            errmsg = err['name'];
          }

          if (_.isUndefined(this.get('funcowner')) || String(this.get('funcowner')).replace(/^\s+|\s+$/g, '') == '') {
            err['funcowner'] = gettext('Owner cannot be empty.');
            errmsg = errmsg || err['funcowner'];
          }

          if (_.isUndefined(this.get('pronamespace')) || String(this.get('pronamespace')).replace(/^\s+|\s+$/g, '') == '') {
            err['pronamespace'] = gettext('Schema cannot be empty.');
            errmsg = errmsg || err['pronamespace'];
          }

          if (_.isUndefined(this.get('prorettypename')) || String(this.get('prorettypename')).replace(/^\s+|\s+$/g, '') == '') {
            err['prorettypename'] = gettext('Return type cannot be empty.');
            errmsg = errmsg || err['prorettypename'];
          }

          if (_.isUndefined(this.get('lanname')) || String(this.get('lanname')).replace(/^\s+|\s+$/g, '') == '') {
            err['lanname'] = gettext('Language cannot be empty.');
            errmsg = errmsg || err['lanname'];
          }

          if (String(this.get('lanname')) == 'c') {
            if (_.isUndefined(this.get('probin')) || String(this.get('probin'))
              .replace(/^\s+|\s+$/g, '') == '') {
              err['probin'] = gettext('Object File cannot be empty.');
              errmsg = errmsg || err['probin'];
            }

            if (_.isUndefined(this.get('prosrc_c')) || String(this.get('prosrc_c')).replace(/^\s+|\s+$/g, '') == '') {
              err['prosrc_c'] = gettext('Link Symbol cannot be empty.');
              errmsg = errmsg || err['prosrc_c'];
            }
          }
          else {
            if (_.isUndefined(this.get('prosrc')) || String(this.get('prosrc')).replace(/^\s+|\s+$/g, '') == '') {
              err['prosrc'] = gettext('Code cannot be empty.');
              errmsg = errmsg || err['prosrc'];
            }
          }

          if (seclabels) {
            var secLabelsErr;
            for (var i = 0; i < seclabels.models.length && !secLabelsErr; i++) {
              secLabelsErr = (seclabels.models[i]).validate.apply(seclabels.models[i]);
              if (secLabelsErr) {
                err['seclabels'] = secLabelsErr;
                errmsg = errmsg || secLabelsErr;
              }
            }
          }

          this.errorModel.clear().set(err);

          if (_.size(err)) {
            this.trigger('on-status', {msg: errmsg});
            return errmsg;
          }

          return null;
        },
        isVisible: function() {
          if (this.name == 'sysproc') { return false; }
          return true;
        },
        isReadonly: function(m) {
          switch(this.name){
          case 'proargs':
          case 'proargtypenames':
          case 'prorettypename':
          case 'proretset':
          case 'proiswindow':
            return !m.isNew();
          default:
            return false;
          }
        },
        isDisabled: function(m) {
          if(this.node_info &&  'catalog' in this.node_info) {
            return true;
          }
          if (this.name === 'prorows'){
            if(m.get('proretset') == true) {
              return false;
            }
            return true;
          } else {
            return false;
          }
        },
        canVarAdd: function() {
          return !(this.node_info &&  'catalog' in this.node_info);
        },
      }),
    });

  }

  return pgBrowser.Nodes['trigger_function'];
});
