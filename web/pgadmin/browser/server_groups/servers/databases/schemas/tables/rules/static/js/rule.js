/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import RuleSchema from './rule.ui';
import _ from 'lodash';
import getApiInstance from '../../../../../../../../../static/js/api_instance';

define('pgadmin.node.rule', [
  'sources/gettext', 'sources/url_for',
  'sources/pgadmin', 'pgadmin.browser',
  'pgadmin.node.schema.dir/schema_child_tree_node',
], function(gettext, url_for, pgAdmin, pgBrowser, SchemaChildTreeNode) {

  /**
    Create and add a rule collection into nodes
    @param {variable} label - Label for Node
    @param {variable} type - Type of Node
    @param {variable} columns - List of columns to
      display under under properties.
   */
  if (!pgBrowser.Nodes['coll-rule']) {
    pgAdmin.Browser.Nodes['coll-rule'] =
      pgAdmin.Browser.Collection.extend({
        node: 'rule',
        label: gettext('Rules'),
        type: 'coll-rule',
        columns: ['name', 'owner', 'comment'],
        canDrop: SchemaChildTreeNode.isTreeItemOfChildOfSchema,
        canDropCascade: SchemaChildTreeNode.isTreeItemOfChildOfSchema,
      });
  }


  /**
    Create and Add an Rule Node into nodes
    @param {variable} parent_type - The list of nodes
    under which this node to display
    @param {variable} type - Type of Node
    @param {variable} hasSQL - To show SQL tab
    @param {variable} canDrop - Adds drop rule option
    in the context menu
    @param {variable} canDropCascade - Adds drop Cascade
    rule option in the context menu
   */
  if (!pgBrowser.Nodes['rule']) {
    pgAdmin.Browser.Nodes['rule'] = pgBrowser.Node.extend({
      parent_type: ['table','view', 'partition'],
      type: 'rule',
      sqlAlterHelp: 'sql-alterrule.html',
      sqlCreateHelp: 'sql-createrule.html',
      dialogHelp: url_for('help.static', {'filename': 'rule_dialog.html'}),
      label: gettext('rule'),
      collection_type: 'coll-table',
      hasSQL:  true,
      hasDepends: true,
      canDrop: function(itemData, item){
        SchemaChildTreeNode.isTreeItemOfChildOfSchema.apply(this, [itemData, item]);
        return (!_.has(itemData, 'label') || itemData.label !== '_RETURN');
      },
      canDropCascade: function(itemData, item){
        SchemaChildTreeNode.isTreeItemOfChildOfSchema.apply(this, [itemData, item]);
        return (!_.has(itemData, 'label') || itemData.label !== '_RETURN');
      },
      url_jump_after_node: 'schema',
      Init: function() {

        /* Avoid mulitple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

        /**
          Add "create rule" menu option into context and object menu
          for the following nodes:
          coll-rule, rule and view and table.
          @property {data} - Allow create rule option on schema node or
          system rules node.
         */
        pgBrowser.add_menus([{
          name: 'create_rule_on_coll', node: 'coll-rule', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 1, label: gettext('Rule...'),
          data: {action: 'create', check: true}, enable: 'canCreate',
        },{
          name: 'create_rule_onView', node: 'view', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 5, label: gettext('Rule...'),
          data: {action: 'create', check: true}, enable: 'canCreate',
        },{
          name: 'create_rule', node: 'rule', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 1, label: gettext('Rule...'),
          data: {action: 'create', check: true}, enable: 'canCreate',
        },{
          name: 'create_rule', node: 'table', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Rule...'),
          data: {action: 'create', check: true}, enable: 'canCreate',
        },{
          name: 'create_rule', node: 'partition', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Rule...'),
          data: {action: 'create', check: true}, enable: 'canCreate',
        },
        {
          name: 'enable_rule', node: 'rule', module: this,
          applies: ['object', 'context'], callback: 'enable_rule',
          category: 'connect', priority: 3, label: gettext('Enable'),
          enable: 'canCreate_with_rule_enable',
        },{
          name: 'disable_rule', node: 'rule', module: this,
          applies: ['object', 'context'], callback: 'disable_rule',
          category: 'drop', priority: 3, label: gettext('Disable'),
          enable: 'canCreate_with_rule_disable'
        }
        ]);
      },
      callbacks: {
        /* Enable rule */
        enable_rule: function(args) {
          let input = args || {},
            obj = this,
            t = pgBrowser.tree,
            i = input.item || t.selected(),
            d = i  ? t.itemData(i) : undefined;

          if (!d)
            return false;

          let data = d;
          getApiInstance().put(obj.generate_url(i, 'obj' , d, true), {'is_enable_rule' : 'O'})
            .then(()=>{
              pgAdmin.Browser.notifier.success('Rule updated.');
              t.removeIcon(i);
              data.icon = 'icon-rule';
              t.addIcon(i, {icon: data.icon});
              t.updateAndReselectNode(i, data);
            })
            .catch((error)=>{
              pgAdmin.Browser.notifier.pgRespErrorNotify(error);
              t.refresh(i);
            });
        },
        /* Disable rule */
        disable_rule: function(args) {
          let input = args || {},
            obj = this,
            t = pgBrowser.tree,
            i = input.item || t.selected(),
            d = i  ? t.itemData(i) : undefined;

          if (!d)
            return false;

          let data = d;
          getApiInstance().put(obj.generate_url(i, 'obj' , d, true), {'is_enable_rule' : 'D'})
            .then(()=>{
              pgAdmin.Browser.notifier.success('Rule updated');
              t.removeIcon(i);
              data.icon = 'icon-rule-bad';
              t.addIcon(i, {icon: data.icon});
              t.updateAndReselectNode(i, data);
            })
            .catch((error)=>{
              pgAdmin.Browser.notifier.pgRespErrorNotify(error);
              t.refresh(i);
            });
        },
      },
      getSchema: function(treeNodeInfo, itemNodeData) {
        return new RuleSchema(
          {
            nodeInfo: treeNodeInfo,
            nodeData: itemNodeData
          }
        );
      },

      // Show or hide create rule menu option on parent node
      canCreate: function(itemData, item, data) {

        // If check is false then , we will allow create menu
        if (data && data.check === false)
          return true;

        let t = pgBrowser.tree, i = item, d = itemData;

        // To iterate over tree to check parent node
        while (i) {

          // If it is schema then allow user to create rule
          if (_.indexOf(['schema'], d._type) > -1)
            return true;

          if ('coll-rule' == d._type) {

            //Check if we are not child of rule
            let prev_i = t.hasParent(i) ? t.parent(i) : null,
              prev_j = t.hasParent(prev_i) ? t.parent(prev_i) : null,
              prev_k = t.hasParent(prev_j) ? t.parent(prev_j) : null,
              prev_f = prev_k ? t.itemData(prev_k) : null;
            return (_.isNull(prev_f) || prev_f._type != 'catalog');
          }

          /**
            Check if it is view and its parent node is schema
            then allow to create Rule
           */
          else if('view' == d._type || 'table' == d._type){
            let prev_i = t.hasParent(i) ? t.parent(i) : null,
              prev_j = t.hasParent(prev_i) ? t.parent(prev_i) : null,
              prev_e = prev_j ? t.itemData(prev_j) : null;
            return (!_.isNull(prev_e) && prev_e._type == 'schema');
          }
          i = t.hasParent(i) ? t.parent(i) : null;
          d = i ? t.itemData(i) : null;
        }

        // By default we do not want to allow create menu
        return true;

      },

      canCreate_with_rule_enable: function(itemData, item, data) {
        let treeData = pgBrowser.tree.getTreeNodeHierarchy(item);
        if ('view' in treeData) {
          return false;
        }

        return itemData.icon === 'icon-rule-bad' &&
          this.canCreate.apply(this,[itemData, item, data]);
      },
      // Check to whether rule is enable ?
      canCreate_with_rule_disable: function(itemData, item, data) {
        let treeData = pgBrowser.tree.getTreeNodeHierarchy(item);
        if ('view' in treeData) {
          return false;
        }

        return itemData.icon === 'icon-rule' &&
          this.canCreate.apply(itemData, item, data);
      },

    });
  }

  return pgBrowser.Nodes['coll-rule'];
});
