/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define('pgadmin.node.rule', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore',
  'sources/pgadmin', 'pgadmin.browser', 'pgadmin.backform',
  'pgadmin.node.schema.dir/schema_child_tree_node',
], function(gettext, url_for, $, _, pgAdmin, pgBrowser, Backform, SchemaChildTreeNode) {

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
          icon: 'wcTabIcon icon-rule', data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_rule_onView', node: 'view', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 5, label: gettext('Rule...'),
          icon: 'wcTabIcon icon-rule', data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_rule', node: 'rule', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 1, label: gettext('Rule...'),
          icon: 'wcTabIcon icon-rule', data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_rule', node: 'table', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Rule...'),
          icon: 'wcTabIcon icon-rule', data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_rule', node: 'partition', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Rule...'),
          icon: 'wcTabIcon icon-rule', data: {action: 'create', check: true},
          enable: 'canCreate',
        },
        ]);
      },

      /**
        Define model for the rule node and specify the node
        properties of the model in schema.
       */
      model: pgAdmin.Browser.Node.Model.extend({
        idAttribute: 'oid',
        schema: [{
          id: 'name', label: gettext('Name'),
          type: 'text', disabled: function(m) {
            // disable name field it it is system rule
            if (m && m.get('name') == '_RETURN') {
              return true;
            }
            if (m.isNew && m.isNew() || m.node_info && m.node_info.server.version >= 90400) {
              return false;
            }
            return true;
          },
        },
        {
          id: 'oid', label: gettext('OID'),
          type: 'text', mode: ['properties'],
        },
        {
          id: 'schema', label:'',
          type: 'text', visible: false, disabled: function(m) {
            // It is used while generating sql
            m.set('schema', m.node_info.schema.label);
          },
        },
        {
          id: 'view', label:'',
          type: 'text', visible: false, disabled: function(m){

            // It is used while generating sql
            m.set('view', this.node_data.label);
          },
        },
        {
          id: 'event', label: gettext('Event'), control: 'select2',
          group: gettext('Definition'), type: 'text',
          select2: {
            width: '100%',
            allowClear: false,
          },
          options:[
            {label: 'SELECT', value: 'SELECT'},
            {label: 'INSERT', value: 'INSERT'},
            {label: 'UPDATE', value: 'UPDATE'},
            {label: 'DELETE', value: 'DELETE'},
          ],
        },
        {
          id: 'do_instead', label: gettext('Do instead?'), group: gettext('Definition'),
          type: 'switch',
        },
        {
          id: 'condition', label: gettext('Condition'),
          type: 'text', group: gettext('Condition'),
          tabPanelCodeClass: 'sql-code-control',
          control: Backform.SqlCodeControl,
        },
        {
          id: 'statements', label: gettext('Commands'),
          type: 'text', group: gettext('Commands'),
          tabPanelCodeClass: 'sql-code-control',
          control: Backform.SqlCodeControl,
        },
        {
          id: 'system_rule', label: gettext('System rule?'),
          type: 'switch', mode: ['properties'],
        },
        {
          id: 'enabled', label: gettext('Enabled?'),
          type: 'switch', mode: ['properties'],
        },
        {
          id: 'comment', label: gettext('Comment'), cell: 'string', type: 'multiline',
        },
        ],
        validate: function() {

          // Triggers specific error messages for fields
          var err = {},
            errmsg,
            field_name = this.get('name');
          if (_.isUndefined(field_name) || _.isNull(field_name) ||
            String(field_name).replace(/^\s+|\s+$/g, '') === '')
          {
            err['name'] = gettext('Please specify name.');
            errmsg = err['name'];
            this.errorModel.set('name', errmsg);
            return errmsg;
          }
          else
          {
            this.errorModel.unset('name');
          }
          return null;
        },
      }),

      // Show or hide create rule menu option on parent node
      canCreate: function(itemData, item, data) {

        // If check is false then , we will allow create menu
        if (data && data.check === false)
          return true;

        var t = pgBrowser.tree, i = item, d = itemData;

        // To iterate over tree to check parent node
        while (i) {

          // If it is schema then allow user to create rule
          if (_.indexOf(['schema'], d._type) > -1)
            return true;

          if ('coll-rule' == d._type) {

            //Check if we are not child of rule
            var prev_i = t.hasParent(i) ? t.parent(i) : null,
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
            prev_i = t.hasParent(i) ? t.parent(i) : null;
            prev_j = t.hasParent(prev_i) ? t.parent(prev_i) : null;
            var prev_e = prev_j ? t.itemData(prev_j) : null;
            return (!_.isNull(prev_e) && prev_e._type == 'schema');
          }
          i = t.hasParent(i) ? t.parent(i) : null;
          d = i ? t.itemData(i) : null;
        }

        // By default we do not want to allow create menu
        return true;

      },

    });
  }

  return pgBrowser.Nodes['coll-rule'];
});
