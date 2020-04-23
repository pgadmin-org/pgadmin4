/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define('pgadmin.node.package', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore',
  'sources/pgadmin', 'pgadmin.browser', 'pgadmin.backform',
  'pgadmin.node.schema.dir/child', 'pgadmin.node.schema.dir/schema_child_tree_node',
  'pgadmin.browser.collection',
], function(gettext, url_for, $, _, pgAdmin, pgBrowser, Backform, schemaChild,
  schemaChildTreeNode) {

  // Extend the browser's collection class for package collection
  if (!pgBrowser.Nodes['coll-package']) {
    pgBrowser.Nodes['coll-package'] =
      pgBrowser.Collection.extend({
        node: 'package',
        label: gettext('Packages'),
        type: 'coll-package',
        columns: ['name' ,'owner', 'description'],
        canDrop: schemaChildTreeNode.isTreeItemOfChildOfSchema,
        canDropCascade: schemaChildTreeNode.isTreeItemOfChildOfSchema,
      });
  }

  // Extend the browser's node class for package node
  if (!pgBrowser.Nodes['package']) {
    pgBrowser.Nodes['package'] = schemaChild.SchemaChildNode.extend({
      type: 'package',
      dialogHelp: url_for('help.static', {'filename': 'package_dialog.html'}),
      label: gettext('Package'),
      collection_type: 'coll-package',
      hasSQL: true,
      hasDepends: true,
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_package_on_coll', node: 'coll-package', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Package...'),
          icon: 'wcTabIcon icon-package', data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_package', node: 'package', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Package...'),
          icon: 'wcTabIcon icon-package', data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_package', node: 'schema', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Package...'),
          icon: 'wcTabIcon icon-package', data: {action: 'create', check: true},
          enable: 'canCreate',
        },
        ]);

      },
      canCreate: function(itemData, item, data) {
        //If check is false then , we will allow create menu
        if (data && data.check == false)
          return true;

        var treeData = this.getTreeNodeHierarchy(item),
          server = treeData['server'];

        if (server && server.server_type === 'pg')
          return false;

        // If it is catalog then don't allow user to create package
        if (treeData['catalog'] != undefined)
          return false;

        // by default we want to allow create menu
        return true;
      },
      // Define the model for package node.
      model: pgBrowser.Node.Model.extend({
        idAttribute: 'oid',
        defaults: {
          name: undefined,
          oid: undefined,
          owner: undefined,
          is_sys_object: undefined,
          description: undefined,
          pkgheadsrc: undefined,
          pkgbodysrc: undefined,
          acl: undefined,
          pkgacl: [],
          warn_text: undefined,
        },
        initialize: function(attrs, args) {
          if (_.size(attrs) === 0) {
            var userInfo = pgBrowser.serverInfo[args.node_info.server._id].user;
            var schemaInfo = args.node_info.schema;

            this.set({
              'owner': userInfo.name, 'schema': schemaInfo._label,
            }, {silent: true});
          }
          pgAdmin.Browser.Node.Model.prototype.initialize.apply(this, arguments);
        },
        // Define the schema for package node.
        schema: [{
          id: 'name', label: gettext('Name'), cell: 'string',
          type: 'text', mode: ['properties', 'create', 'edit'],
          readonly: function(m) {
            return !m.isNew();
          },
        },{
          id: 'oid', label: gettext('OID'), cell: 'string',
          type: 'text', mode: ['properties'],
        },{
          id: 'owner', label: gettext('Owner'), cell: 'string',
          type: 'text', mode: ['properties', 'create', 'edit'],
          readonly: true, editable: false, visible: function(m) {
            return !m.isNew();
          },
        },{
          id: 'schema', label: gettext('Schema'), type: 'text', node: 'schema',
          control: 'node-list-by-name',
          readonly: function(m) { return !m.isNew(); }, filter: function(d) {
            // If schema name start with pg_* then we need to exclude them
            if(d && d.label.match(/^pg_/))
            {
              return false;
            }
            return true;
          }, cache_node: 'database', cache_level: 'database',
        },{
          id: 'is_sys_object', label: gettext('System package?'),
          cell:'boolean', type: 'switch',mode: ['properties'],
        },{
          id: 'description', label: gettext('Comment'), type: 'multiline',
          mode: ['properties', 'create', 'edit'],
        },{
          id: 'pkgheadsrc', label: gettext('Header'), cell: 'string',
          type: 'text', mode: ['properties', 'create', 'edit'], group: gettext('Header'),
          tabPanelCodeClass: 'sql-code-control',
          control: Backform.SqlCodeControl.extend({
            onChange: function() {
              Backform.SqlCodeControl.prototype.onChange.apply(this, arguments);
              if(this.model && this.model.changed) {
                if(this.model.origSessAttrs && (this.model.changed.pkgheadsrc != this.model.origSessAttrs.pkgheadsrc)) {
                  this.model.warn_text = gettext(
                    'Updating the package header definition may remove its existing body.'
                  ) + '<br><br><b>' + gettext('Do you want to continue?') +
                    '</b>';
                }
                else {
                  this.model.warn_text = undefined;
                }
              }
              else {
                this.model.warn_text = undefined;
              }
            },
          }),
        },{
          id: 'pkgbodysrc', label: gettext('Body'), cell: 'string',
          type: 'text', mode: ['properties', 'create', 'edit'], group: gettext('Body'),
          tabPanelCodeClass: 'sql-code-control',
          control:  Backform.SqlCodeControl.extend({
            onChange: function() {
              Backform.SqlCodeControl.prototype.onChange.apply(this, arguments);
              if(this.model && this.model.changed) {
                if (this.model.origSessAttrs && (this.model.changed.pkgbodysrc != this.model.origSessAttrs.pkgbodysrc)) {
                  this.model.warn_text = undefined;
                } else if(this.model.origSessAttrs && !_.isUndefined(this.model.origSessAttrs.pkgheadsrc) &&
                  this.model.sessAttrs && !_.isUndefined(this.model.sessAttrs.pkgheadsrc) &&
                  (this.model.origSessAttrs.pkgheadsrc != this.model.sessAttrs.pkgheadsrc)){
                  this.model.warn_text = gettext(
                    'Updating the package header definition may remove its existing body.'
                  ) + '<br><br><b>' + gettext('Do you want to continue?') +
                    '</b>';
                }
              }
            },
          }),
        },{
          id: 'acl', label: gettext('Privileges'), type: 'text',
          group: gettext('Security'), mode: ['properties'],
        },{
          id: 'pkgacl', label: gettext('Privileges'), type: 'collection',
          model: pgBrowser.Node.PrivilegeRoleModel.extend({
            privileges: ['X'],
          }), uniqueCol : ['grantee', 'grantor'], editable: false,
          group: gettext('Security'), mode: ['edit', 'create'],
          canAdd: true, canDelete: true, control: 'unique-col-collection',
        }],
        /* validate function is used to validate the input given by
         * the user. In case of error, message will be displayed on
         * the GUI for the respective control.
         */
        validate: function() {
          var msg = undefined;
          // Clear any existing error msg.
          this.errorModel.clear();

          if (_.isUndefined(this.get('name'))
              || String(this.get('name')).replace(/^\s+|\s+$/g, '') == '') {
            msg = gettext('Name cannot be empty.');
            this.errorModel.set('name', msg);
            return msg;
          }

          if (_.isUndefined(this.get('pkgheadsrc'))
              || String(this.get('pkgheadsrc')).replace(/^\s+|\s+$/g, '') == '') {
            msg = gettext('Header cannot be empty.');
            this.errorModel.set('pkgheadsrc', msg);
            return msg;
          }

          return null;
        },
      }),
    });
  }

  return pgBrowser.Nodes['package'];
});
