/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Domain Constraint Module: Collection and Node
define('pgadmin.node.domain_constraints', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore',
  'sources/pgadmin', 'pgadmin.browser',
  'pgadmin.node.schema.dir/schema_child_tree_node', 'pgadmin.browser.collection',
], function(gettext, url_for, $, _, pgAdmin, pgBrowser, schemaChildTreeNode) {

  // Define Domain Constraint Collection Node
  if (!pgBrowser.Nodes['coll-domain_constraints']) {
    pgAdmin.Browser.Nodes['coll-domain_constraints'] =
      pgAdmin.Browser.Collection.extend({
        node: 'domain_constraints',
        label: gettext('Domain Constraints'),
        type: 'coll-domain_constraints',
        columns: ['name', 'description'],
        canDrop: schemaChildTreeNode.isTreeItemOfChildOfSchema,
        canDropCascade: false,
      });
  }

  // Domain Constraint Node
  if (!pgBrowser.Nodes['domain_constraints']) {
    pgAdmin.Browser.Nodes['domain_constraints'] = pgBrowser.Node.extend({
      type: 'domain_constraints',
      sqlAlterHelp: 'sql-alterdomain.html',
      sqlCreateHelp: 'sql-alterdomain.html',
      dialogHelp: url_for('help.static', {'filename': 'domain_constraint_dialog.html'}),
      label: gettext('Domain Constraints'),
      collection_type: 'coll-domain_constraints',
      hasSQL: true,
      hasDepends: true,
      parent_type: ['domain'],
      Init: function() {
        // Avoid mulitple registration of menus
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_domain_on_coll', node: 'coll-domain_constraints', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 5, label: gettext('Domain Constraint...'),
          icon: 'wcTabIcon icon-domain_constraints', data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_domain_constraints', node: 'domain_constraints', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 5, label: gettext('Domain Constraint...'),
          icon: 'wcTabIcon icon-domain_constraints', data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_domain_constraints', node: 'domain', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 5, label: gettext('Domain Constraint...'),
          icon: 'wcTabIcon icon-domain_constraints', data: {action: 'create', check: false},
          enable: 'canCreate',
        },
        ]);

      },
      canDrop: schemaChildTreeNode.isTreeItemOfChildOfSchema,
      model: pgAdmin.Browser.Node.Model.extend({
        idAttribute: 'oid',
        defaults: {
          name: undefined,
          oid: undefined,
          description: undefined,
          consrc: undefined,
          connoinherit: undefined,
          convalidated: true,
        },
        // Domain Constraint Schema
        schema: [{
          id: 'name', label: gettext('Name'), type:'text', cell:'string',
        },{
          id: 'oid', label: gettext('OID'), cell: 'string',
          type: 'text' , mode: ['properties'],
        },{
          id: 'is_sys_obj', label: gettext('System domain constraint?'),
          cell:'boolean', type: 'switch', mode: ['properties'],
        },{
          id: 'description', label: gettext('Comment'), type: 'multiline', cell:
          'string', mode: ['properties', 'create', 'edit'], min_version: 90500,
        },{
          id: 'consrc', label: gettext('Check'), type: 'multiline', cel:
          'string', group: gettext('Definition'), mode: ['properties',
            'create', 'edit'], readonly: function(m) { return !m.isNew(); },
        },{
          id: 'connoinherit', label: gettext('No inherit?'), type:
          'switch', cell: 'boolean', group: gettext('Definition'), mode:
          ['properties', 'create', 'edit'],
          visible: false,
        },{
          id: 'convalidated', label: gettext('Validate?'), type: 'switch', cell:
          'boolean', group: gettext('Definition'), min_version: 90200,
          disabled: function(m) {
            if (!m.isNew() && m.get('convalidated')) {
              return true;
            }
            return false;
          },
          mode: ['properties', 'create', 'edit'],
        }],
        // Client Side Validation
        validate: function() {
          var err = {},
            errmsg;

          if (_.isUndefined(this.get('name')) || String(this.get('name')).replace(/^\s+|\s+$/g, '') == '') {
            err['name'] = gettext('Name cannot be empty.');
            errmsg = err['name'];
          }

          if (_.isUndefined(this.get('consrc')) || String(this.get('consrc')).replace(/^\s+|\s+$/g, '') == '') {
            err['consrc'] = gettext('Check cannot be empty.');
            errmsg = errmsg || err['consrc'];

          }

          this.errorModel.clear().set(err);

          if (_.size(err)) {
            this.trigger('on-status', {msg: errmsg});
            return errmsg;
          }

          return null;

        },
      }),
    });
  }

  return pgBrowser.Nodes['domain'];
});
