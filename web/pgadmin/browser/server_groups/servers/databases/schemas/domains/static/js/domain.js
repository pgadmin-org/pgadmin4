/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Domain Module: Collection and Node.
define('pgadmin.node.domain', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore', 'backbone',
  'sources/pgadmin', 'pgadmin.browser', 'pgadmin.backform', 'pgadmin.backgrid',
  'pgadmin.node.schema.dir/child', 'pgadmin.node.schema.dir/schema_child_tree_node',
  'pgadmin.browser.collection',
], function(
  gettext, url_for, $, _, Backbone, pgAdmin, pgBrowser, Backform, Backgrid,
  schemaChild, schemaChildTreeNode
) {

  // Define Domain Collection Node
  if (!pgBrowser.Nodes['coll-domain']) {
    pgBrowser.Nodes['coll-domain'] =
      pgBrowser.Collection.extend({
        node: 'domain',
        label: gettext('Domains'),
        type: 'coll-domain',
        columns: ['name', 'owner', 'description'],
        canDrop: schemaChildTreeNode.isTreeItemOfChildOfSchema,
        canDropCascade: schemaChildTreeNode.isTreeItemOfChildOfSchema,
      });
  }

  // Constraint Model
  var ConstraintModel = pgBrowser.Node.Model.extend({
    idAttribute: 'conoid',
    initialize: function(attrs) {
      if (_.size(attrs) !== 0) {
        this.convalidated_default = this.get('convalidated');
      }
      pgBrowser.Node.Model.prototype.initialize.apply(this, arguments);
    },
    defaults: {
      conoid: undefined,
      conname: undefined,
      consrc: undefined,
      convalidated: true,
    },
    convalidated_default: true,
    schema: [{
      id: 'conoid', type: 'text', cell: 'string', visible: false,
    },{
      id: 'conname', label: gettext('Name'), type: 'text', cell: 'string',
      cellHeaderClasses: 'width_percent_40',
      editable: function(m) {
        if (_.isUndefined(m.isNew)) { return true; }
        if (!m.isNew()) {
          var server = this.get('node_info').server;
          if (server.version < 90200) { return false;
          }
        }
        return true;
      },
    },{
      id: 'consrc', label: gettext('Check'), type: 'multiline',
      cell: Backgrid.Extension.TextareaCell, group: gettext('Definition'),
      cellHeaderClasses: 'width_percent_60', editable: function(m) {
        return _.isUndefined(m.isNew) ? true : m.isNew();
      },
    },{
      id: 'convalidated', label: gettext('Validate?'), type: 'switch', cell:
      'boolean', group: gettext('Definition'),
      editable: function(m) {
        var server = this.get('node_info').server;
        if (server.version < 90200) { return false;
        }
        if (_.isUndefined(m.isNew)) { return true; }
        if (!m.isNew()) {
          if(m.get('convalidated') && m.convalidated_default) {
            return false;
          }
          return true;
        }
        return true;
      },
    }],
    toJSON: Backbone.Model.prototype.toJSON,
    validate: function() {
      return null;
    },
  });

  // Domain Node
  if (!pgBrowser.Nodes['domain']) {
    pgBrowser.Nodes['domain'] = schemaChild.SchemaChildNode.extend({
      type: 'domain',
      sqlAlterHelp: 'sql-alterdomain.html',
      sqlCreateHelp: 'sql-createdomain.html',
      dialogHelp: url_for('help.static', {'filename': 'domain_dialog.html'}),
      label: gettext('Domain'),
      collection_type: 'coll-domain',
      hasSQL: true,
      hasDepends: true,
      Init: function() {
        // Avoid mulitple registration of menus
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_domain_on_coll', node: 'coll-domain', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Domain...'),
          icon: 'wcTabIcon icon-domain', data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_domain', node: 'domain', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Domain...'),
          icon: 'wcTabIcon icon-domain', data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_domain', node: 'schema', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Domain...'),
          icon: 'wcTabIcon icon-domain', data: {action: 'create', check: false},
          enable: 'canCreate',
        },
        ]);

      },
      // Domain Node Model
      model: pgBrowser.Node.Model.extend({
        idAttribute: 'oid',
        initialize: function(attrs, args) {
          var isNew = (_.size(attrs) === 0);
          if (isNew) {
            // Set Selected Schema
            var schema = args.node_info.schema.label;
            this.set({'basensp': schema}, {silent: true});

            // Set Current User
            var userInfo = pgBrowser.serverInfo[args.node_info.server._id].user;
            this.set({'owner': userInfo.name}, {silent: true});
          }
          pgBrowser.Node.Model.prototype.initialize.apply(this, arguments);
        },
        defaults: {
          name: undefined,
          oid: undefined,
          owner: undefined,
          basensp: undefined,
          description: undefined,
          basetype: undefined,
          typlen: undefined,
          precision: undefined,
          typdefault: undefined,
          typnotnull: undefined,
          sysdomain: undefined,
          collname: undefined,
          constraints: [],
          seclabels: [],
        },
        type_options: undefined,
        // Domain Schema
        schema: [{
          id: 'name', label: gettext('Name'), cell: 'string',
          type: 'text', mode: ['properties', 'create', 'edit'],
        },{
          id: 'oid', label: gettext('OID'), cell: 'string',
          type: 'text' , mode: ['properties'],
        },{
          id: 'owner', label: gettext('Owner'), cell: 'string', control: Backform.NodeListByNameControl,
          node: 'role',  type: 'text', mode: ['edit', 'create', 'properties'],
        },{
          id: 'basensp', label: gettext('Schema'), cell: 'node-list-by-name',
          control: 'node-list-by-name', cache_level: 'database', type: 'text',
          node: 'schema', mode: ['create', 'edit'],
        },{
          id: 'sysdomain', label: gettext('System domain?'), cell: 'boolean',
          type: 'switch', mode: ['properties'],
        },{
          id: 'description', label: gettext('Comment'), cell: 'string',
          type: 'multiline',
        },{
          id: 'basetype', label: gettext('Base type'), cell: 'string',
          control: 'node-ajax-options', type: 'text', url: 'get_types',
          mode:['properties', 'create', 'edit'], group: gettext('Definition'),
          first_empty: true, cache_node: 'type',
          readonly: function(m) {
            return !m.isNew();
          },
          transform: function(d) {
            this.model.type_options =  d;
            return d;
          },
        },{
          id: 'typlen', label: gettext('Length'), cell: 'string',
          type: 'text', group: gettext('Definition'), deps: ['basetype'],
          readonly: function(m) {return !m.isNew();},
          disabled: function(m) {
            // We will store type from selected from combobox
            var of_type = m.get('basetype');
            if(m.type_options) {
              // iterating over all the types
              _.each(m.type_options, function(o) {
                // if type from selected from combobox matches in options
                if ( of_type == o.value ) {
                  // if length is allowed for selected type
                  if(o.length)
                  {
                    // set the values in model
                    m.set('is_tlength', true, {silent: true});
                    m.set('min_val', o.min_val, {silent: true});
                    m.set('max_val', o.max_val, {silent: true});
                  }
                  else
                    m.set('is_tlength', false, {silent: true});
                }
              });

              !m.get('is_tlength') && setTimeout(function() {
                if(m.get('typlen')) {
                  m.set('typlen', null);
                }
              },10);
            }
            return !m.get('is_tlength');
          },
        },{
          id: 'precision', label: gettext('Precision'), cell: 'string',
          type: 'text', group: gettext('Definition'), deps: ['basetype'],
          readonly: function(m) {return !m.isNew();},
          disabled: function(m) {
            // We will store type from selected from combobox
            var of_type = m.get('basetype');
            if(m.type_options) {
              // iterating over all the types
              _.each(m.type_options, function(o) {
                // if type from selected from combobox matches in options
                if ( of_type == o.value ) {
                  // if precession is allowed for selected type
                  if(o.precision)
                  {
                    // set the values in model
                    m.set('is_precision', true, {silent: true});
                    m.set('min_val', o.min_val, {silent: true});
                    m.set('max_val', o.max_val, {silent: true});
                  }
                  else
                    m.set('is_precision', false, {silent: true});
                }
              });

              !m.get('is_precision') && setTimeout(function() {
                if(m.get('precision')) {
                  m.set('precision', null);
                }
              },10);
            }
            return !m.get('is_precision');
          },
        },{
          id: 'typdefault', label: gettext('Default'), cell: 'string',
          type: 'text', group: gettext('Definition'),
          placeholder: gettext('Enter an expression or a value.'),
        },{
          id: 'typnotnull', label: gettext('Not NULL?'), cell: 'boolean',
          type: 'switch', group: gettext('Definition'),
        },{
          id: 'collname', label: gettext('Collation'), cell: 'string',
          control: 'node-ajax-options', type: 'text', url: 'get_collations',
          group: gettext('Definition'), cache_level: 'database',
          cache_node: 'schema', readonly: function(m) {
            return !m.isNew();
          },
        },{
          id: 'constraints', label: gettext('Constraints'), cell: 'string',
          type: 'collection', group: gettext('Constraints'), mode: ['edit', 'create'],
          model: ConstraintModel, canAdd: true, canDelete: true,
          canEdit: false, columns: ['conname','consrc', 'convalidated'],
        },
        pgBrowser.SecurityGroupSchema,
        {
          id: 'seclabels', label: gettext('Security labels'),
          model: pgBrowser.SecLabelModel, type: 'collection',
          group: 'security', mode: ['edit', 'create'],
          min_version: 90100, canAdd: true,
          canEdit: false, canDelete: true,
          control: 'unique-col-collection', uniqueCol : ['provider'],
        }],
        validate: function() { // Client Side Validation
          var err = {},
            errmsg;

          if (_.isUndefined(this.get('name')) || String(this.get('name')).replace(/^\s+|\s+$/g, '') == '') {
            err['name'] = gettext('Name cannot be empty.');
            errmsg = err['name'];
          }

          if (_.isUndefined(this.get('basetype')) || String(this.get('basetype')).replace(/^\s+|\s+$/g, '') == '') {
            err['basetype'] = gettext('Base Type cannot be empty.');
            errmsg = errmsg || err['basetype'];
          }

          this.errorModel.clear().set(err);

          return errmsg;
        },
      }),
    });

  }

  return pgBrowser.Nodes['domain'];
});
