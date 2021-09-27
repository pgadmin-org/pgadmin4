/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import TriggerFunctionSchema from './trigger_function.ui';
import { getNodeListByName, getNodeListById, getNodeAjaxOptions } from '../../../../../../../static/js/node_ajax';
import { getNodeVariableSchema } from '../../../../../static/js/variable.ui';
import { getNodePrivilegeRoleSchema } from '../../../../../static/js/privilege.ui';

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
        let node = pgBrowser.tree.findNodeByDomElement(item);

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
      getSchema: function(treeNodeInfo, itemNodeData) {
        return new TriggerFunctionSchema(
          (privileges)=>getNodePrivilegeRoleSchema('', treeNodeInfo, itemNodeData, privileges),
          ()=>getNodeVariableSchema(this, treeNodeInfo, itemNodeData, false, false),
          {
            role: ()=>getNodeListByName('role', treeNodeInfo, itemNodeData),
            schema: ()=>getNodeListById(pgBrowser.Nodes['schema'], treeNodeInfo, itemNodeData, {
              cacheLevel: 'database'
            }),
            language: ()=>getNodeAjaxOptions('get_languages', this, treeNodeInfo, itemNodeData, {noCache: true}, (res) => {
              return _.reject(res, function(o) {
                return o.label == 'sql' || o.label == 'edbspl';
              });
            }),
            nodeInfo: treeNodeInfo
          },
          {
            funcowner: pgBrowser.serverInfo[treeNodeInfo.server._id].user.name,
            pronamespace: treeNodeInfo.schema ? treeNodeInfo.schema._id : null
          }
        );
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
          funcowner: undefined,
          description: undefined,
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
          id: 'description', label: gettext('Comment'), cell: 'string',
          type: 'multiline', disabled: 'isDisabled', readonly: 'isReadonly',
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
