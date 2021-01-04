/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define('pgadmin.node.sequence', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore',
  'sources/pgadmin', 'pgadmin.browser', 'pgadmin.backform',
  'pgadmin.node.schema.dir/child', 'pgadmin.node.schema.dir/schema_child_tree_node',
  'pgadmin.browser.collection',
], function(
  gettext, url_for, $, _, pgAdmin, pgBrowser, Backform, schemaChild,
  schemaChildTreeNode
) {

  // Extend the browser's collection class for sequence collection
  if (!pgBrowser.Nodes['coll-sequence']) {
    pgBrowser.Nodes['coll-sequence'] =
      pgBrowser.Collection.extend({
        node: 'sequence',
        label: gettext('Sequences'),
        type: 'coll-sequence',
        columns: ['name', 'seqowner', 'comment'],
        hasStatistics: true,
        canDrop: schemaChildTreeNode.isTreeItemOfChildOfSchema,
        canDropCascade: schemaChildTreeNode.isTreeItemOfChildOfSchema,
      });
  }

  // Extend the browser's node class for sequence node
  if (!pgBrowser.Nodes['sequence']) {
    pgBrowser.Nodes['sequence'] = schemaChild.SchemaChildNode.extend({
      type: 'sequence',
      sqlAlterHelp: 'sql-altersequence.html',
      sqlCreateHelp: 'sql-createsequence.html',
      dialogHelp: url_for('help.static', {'filename': 'sequence_dialog.html'}),
      label: gettext('Sequence'),
      collection_type: 'coll-sequence',
      hasSQL: true,
      hasDepends: true,
      hasStatistics: true,
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_sequence_on_coll', node: 'coll-sequence', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Sequence...'),
          icon: 'wcTabIcon icon-sequence', data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_sequence', node: 'sequence', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Sequence...'),
          icon: 'wcTabIcon icon-sequence', data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_sequence', node: 'schema', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Sequence...'),
          icon: 'wcTabIcon icon-sequence', data: {action: 'create', check: false},
          enable: 'canCreate',
        },
        ]);

      },
      // Define the model for sequence node.
      model: pgBrowser.Node.Model.extend({
        idAttribute: 'oid',
        defaults: {
          name: undefined,
          oid: undefined,
          seqowner: undefined,
          schema: undefined,
          is_sys_obj: undefined,
          comment: undefined,
          increment: undefined,
          start: undefined,
          current_value: undefined,
          minimum: undefined,
          maximum: undefined,
          cache: undefined,
          cycled: undefined,
          relacl: [],
          securities: [],
        },

        // Default values!
        initialize: function(attrs, args) {
          var isNew = (_.size(attrs) === 0);

          if (isNew) {
            var userInfo = pgBrowser.serverInfo[args.node_info.server._id].user;
            var schemaInfo = args.node_info.schema;

            this.set({'seqowner': userInfo.name}, {silent: true});
            this.set({'schema': schemaInfo._label}, {silent: true});
          }
          pgBrowser.Node.Model.prototype.initialize.apply(this, arguments);
        },

        // Define the schema for sequence node.
        schema: [{
          id: 'name', label: gettext('Name'), cell: 'string',
          type: 'text', mode: ['properties', 'create', 'edit'],
        },{
          id: 'oid', label: gettext('OID'), cell: 'string',
          type: 'text', mode: ['properties'],
        },{
          id: 'seqowner', label: gettext('Owner'), cell: 'string',
          type: 'text', mode: ['properties', 'create', 'edit'], node: 'role',
          control: Backform.NodeListByNameControl,
        },{
          id: 'schema', label: gettext('Schema'), cell: 'string',
          control: 'node-list-by-name', node: 'schema',
          type: 'text', mode: ['create', 'edit'], filter: function(d) {
            // If schema name start with pg_* then we need to exclude them
            if(d && d.label.match(/^pg_/))
            {
              return false;
            }
            return true;
          }, cache_node: 'database', cache_level: 'database',
        },{
          id: 'is_sys_obj', label: gettext('System sequence?'),
          cell:'boolean', type: 'switch', mode: ['properties'],
        },{
          id: 'comment', label: gettext('Comment'), type: 'multiline',
          mode: ['properties', 'create', 'edit'],
        },{
          id: 'current_value', label: gettext('Current value'), type: 'int',
          mode: ['properties', 'edit'], group: gettext('Definition'),
        },{
          id: 'increment', label: gettext('Increment'), type: 'int',
          mode: ['properties', 'create', 'edit'], group: gettext('Definition'),
        },{
          id: 'start', label: gettext('Start'), type: 'int',
          mode: ['properties', 'create', 'edit'], group: gettext('Definition'),
        },{
          id: 'minimum', label: gettext('Minimum'), type: 'int',
          mode: ['properties', 'create', 'edit'], group: gettext('Definition'),
        },{
          id: 'maximum', label: gettext('Maximum'), type: 'int',
          mode: ['properties', 'create', 'edit'], group: gettext('Definition'),
        },{
          id: 'cache', label: gettext('Cache'), type: 'int',
          mode: ['properties', 'create', 'edit'], group: gettext('Definition'),
          min: 1,
        },{
          id: 'cycled', label: gettext('Cycled'), type: 'switch',
          mode: ['properties', 'create', 'edit'], group: gettext('Definition'),
        }, pgBrowser.SecurityGroupSchema,{
          id: 'acl', label: gettext('Privileges'), type: 'text',
          group: gettext('Security'), mode: ['properties'],
        },{
          id: 'relacl', label: gettext('Privileges'), group: 'security',
          model: pgBrowser.Node.PrivilegeRoleModel.extend({
            privileges: ['r', 'w', 'U'],
          }), uniqueCol : ['grantee', 'grantor'], mode: ['edit', 'create'],
          editable: false, type: 'collection', canAdd: true, canDelete: true,
          control: 'unique-col-collection',
        },{
          id: 'securities', label: gettext('Security labels'), canAdd: true,
          model: pgBrowser.SecLabelModel, editable: false,
          type: 'collection', canEdit: false, group: 'security',
          mode: ['edit', 'create'], canDelete: true,
          control: 'unique-col-collection',
          min_version: 90200, uniqueCol : ['provider'],
        }],
        /* validate function is used to validate the input given by
         * the user. In case of error, message will be displayed on
         * the GUI for the respective control.
         */
        validate: function() {
          var msg = undefined,
            minimum = this.get('minimum'),
            maximum = this.get('maximum'),
            start = this.get('start');

          if (_.isUndefined(this.get('name'))
              || String(this.get('name')).replace(/^\s+|\s+$/g, '') == '') {
            msg = gettext('Name cannot be empty.');
            this.errorModel.set('name', msg);
            return msg;
          } else {
            this.errorModel.unset('name');
          }

          if (_.isUndefined(this.get('seqowner'))
              || String(this.get('seqowner')).replace(/^\s+|\s+$/g, '') == '') {
            msg = gettext('Owner cannot be empty.');
            this.errorModel.set('seqowner', msg);
            return msg;
          } else {
            this.errorModel.unset('seqowner');
          }

          if (_.isUndefined(this.get('schema'))
              || String(this.get('schema')).replace(/^\s+|\s+$/g, '') == '') {
            msg = gettext('Schema cannot be empty.');
            this.errorModel.set('schema', msg);
            return msg;
          } else {
            this.errorModel.unset('schema');
          }

          if (!this.isNew()) {
            if (_.isUndefined(this.get('current_value'))
              || String(this.get('current_value')).replace(/^\s+|\s+$/g, '') == '') {
              msg = gettext('Current value cannot be empty.');
              this.errorModel.set('current_value', msg);
              return msg;
            } else {
              this.errorModel.unset('current_value');
            }

            if (_.isUndefined(this.get('increment'))
              || String(this.get('increment')).replace(/^\s+|\s+$/g, '') == '') {
              msg = gettext('Increment value cannot be empty.');
              this.errorModel.set('increment', msg);
              return msg;
            } else {
              this.errorModel.unset('increment');
            }

            if (_.isUndefined(this.get('minimum'))
              || String(this.get('minimum')).replace(/^\s+|\s+$/g, '') == '') {
              msg = gettext('Minimum value cannot be empty.');
              this.errorModel.set('minimum', msg);
              return msg;
            } else {
              this.errorModel.unset('minimum');
            }

            if (_.isUndefined(this.get('maximum'))
              || String(this.get('maximum')).replace(/^\s+|\s+$/g, '') == '') {
              msg = gettext('Maximum value cannot be empty.');
              this.errorModel.set('maximum', msg);
              return msg;
            } else {
              this.errorModel.unset('maximum');
            }

            if (_.isUndefined(this.get('cache'))
              || String(this.get('cache')).replace(/^\s+|\s+$/g, '') == '') {
              msg = gettext('Cache value cannot be empty.');
              this.errorModel.set('cache', msg);
              return msg;
            } else {
              this.errorModel.unset('cache');
            }
          }
          var min_lt = gettext('Minimum value must be less than maximum value.'),
            start_lt = gettext('Start value cannot be less than minimum value.'),
            start_gt = gettext('Start value cannot be greater than maximum value.');

          if (_.isEmpty(minimum) || _.isEmpty(maximum))
            return null;

          if ((minimum == 0 && maximum == 0) ||
              (parseInt(minimum, 10) >= parseInt(maximum, 10))) {
            this.errorModel.set('minimum', min_lt);
            return min_lt;
          } else {
            this.errorModel.unset('minimum');
          }

          if (start && minimum && parseInt(start) < parseInt(minimum)) {
            this.errorModel.set('start', start_lt);
            return start_lt;
          } else {
            this.errorModel.unset('start');
          }

          if (start && maximum && parseInt(start) > parseInt(maximum)) {
            this.errorModel.set('start', start_gt);
            return start_gt;
          } else {
            this.errorModel.unset('start');
          }
          return null;
        },
      }),
    });
  }

  return pgBrowser.Nodes['sequence'];
});
