/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define('pgadmin.node.row_security_policy', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore',
  'sources/pgadmin', 'pgadmin.browser',
  'pgadmin.backform', 'pgadmin.alertifyjs',
  'pgadmin.node.schema.dir/schema_child_tree_node',
  'pgadmin.browser.collection',
], function(
  gettext, url_for, $, _, pgAdmin, pgBrowser, Backform, alertify,
  SchemaChildTreeNode
) {

  if (!pgBrowser.Nodes['coll-row_security_policy']) {
    pgAdmin.Browser.Nodes['coll-row_security_policy'] =
      pgAdmin.Browser.Collection.extend({
        node: 'row_security_policy',
        label: gettext('RLS Policies'),
        type: 'coll-row_security_policy',
        columns: ['name', 'description'],
        canDrop: SchemaChildTreeNode.isTreeItemOfChildOfSchema,
        canDropCascade: SchemaChildTreeNode.isTreeItemOfChildOfSchema,
      });
  }

  if (!pgBrowser.Nodes['row_security_policy']) {
    pgAdmin.Browser.Nodes['row_security_policy'] = pgBrowser.Node.extend({
      parent_type: ['table', 'view', 'partition'],
      collection_type: ['coll-table', 'coll-view'],
      type: 'row_security_policy',
      label: gettext('RLS Policy'),
      hasSQL:  true,
      hasDepends: true,
      width: pgBrowser.stdW.sm + 'px',
      sqlAlterHelp: 'sql-alterpolicy.html',
      sqlCreateHelp: 'sql-createpolicy.html',
      dialogHelp: url_for('help.static', {'filename': 'rls_policy_dialog.html'}),
      url_jump_after_node: 'schema',
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_row_security_policy_on_coll', node: 'coll-row_security_policy', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 1, label: gettext('RLS Policy...'),
          icon: 'wcTabIcon icon-row_security_policy', data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_row_security_policy', node: 'row_security_policy', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 1, label: gettext('RLS Policy...'),
          icon: 'wcTabIcon icon-row_security_policy', data: {action: 'create', check: true},
          enable: 'canCreate',
        },
        {
          name: 'create_row_security_policy_on_coll', node: 'table', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 6, label: gettext('RLS Policy...'),
          icon: 'wcTabIcon icon-row_security_policy', data: {action: 'create', check: true},
          enable: 'canCreate',
        },
        ]);
      },
      canDrop: SchemaChildTreeNode.isTreeItemOfChildOfSchema,
      canDropCascade: SchemaChildTreeNode.isTreeItemOfChildOfSchema,
      model: pgAdmin.Browser.Node.Model.extend({
        idAttribute: 'oid',
        defaults: {
          name: undefined,
          policyowner: 'public',
          event: 'ALL',
        },
        schema: [{
          id: 'name', label: gettext('Name'), cell: 'string',
          editable: true, type: 'text', readonly: false, cellHeaderClasses: 'width_percent_50',
        },{
          id: 'oid', label: gettext('OID'), cell: 'string',
          editable: false, type: 'text', mode: ['properties'],
        },
        {
          id: 'event', label: gettext('Event'), control: 'select2', deps:['event'],
          group: gettext('Commands'), type: 'text',readonly: function(m) {
            return !m.isNew();},
          select2: {
            width: '100%',
            allowClear: false,
          },
          options:[
            {label: 'ALL', value: 'ALL'},
            {label: 'SELECT', value: 'SELECT'},
            {label: 'INSERT', value: 'INSERT'},
            {label: 'UPDATE', value: 'UPDATE'},
            {label: 'DELETE', value: 'DELETE'},
          ],
        },
        {
          id: 'using', label: gettext('Using'), deps: ['using', 'event'],
          type: 'text', disabled: 'disableUsing',
          mode: ['create', 'edit', 'properties'],
          control: 'sql-field', visible: true, group: gettext('Commands'),
        },
        {
          id: 'withcheck', label: gettext('With Check'), deps: ['withcheck', 'event'],
          type: 'text', mode: ['create', 'edit', 'properties'],
          control: 'sql-field', visible: true, group: gettext('Commands'),
          disabled: 'disableWithCheck',
        },
        {
          id: 'policyowner', label: gettext('Role'), cell: 'string',
          control: 'node-list-by-name',
          node: 'role', select2: { allowClear: false },
          mode: ['properties', 'edit','create'],
          transform: function() {
            var res =
            Backform.NodeListByNameControl.prototype.defaults.transform.apply(
              this, arguments
            );
            res.unshift({
              label: 'public', value: 'public',
            });
            return res;
          },
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
          return null;
        },
        disableWithCheck: function(m){
          var event = m.get('event');
          if ((event == 'SELECT') || (event == 'DELETE')){
            m.set('withcheck', '');
            return true;
          }
          return false;
        },

        disableUsing: function(m){
          var event = m.get('event');

          if (event == 'INSERT'){
            return true;
          }
          return false;
        },

      }),
      canCreate: function(itemData, item) {

        var treeData = this.getTreeNodeHierarchy(item),
          server = treeData['server'];

        if (server && server.version < 90500)
          return false;

        // by default we want to allow create menu
        return true;
      },
    });
  }

  return pgBrowser.Nodes['row_security_policy'];
});
