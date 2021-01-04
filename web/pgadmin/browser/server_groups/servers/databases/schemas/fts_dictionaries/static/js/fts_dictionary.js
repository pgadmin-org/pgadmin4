/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define('pgadmin.node.fts_dictionary', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore',
  'sources/pgadmin', 'pgadmin.browser', 'pgadmin.backform',
  'pgadmin.node.schema.dir/child', 'pgadmin.node.schema.dir/schema_child_tree_node',
  'pgadmin.browser.collection',
], function(
  gettext, url_for, $, _, pgAdmin, pgBrowser, Backform, schemaChild,
  schemaChildTreeNode
) {

  // Extend the browser's node model class to create a option/value pair
  var OptionLabelModel = pgAdmin.Browser.Node.Model.extend({
    idAttribute: 'option',
    defaults: {
      option: undefined,
      value: undefined,
    },
    // Define the schema for the Options
    schema: [
      {
        id: 'option', label: gettext('Option'), type:'text', group: null,
        cellHeaderClasses: 'width_percent_50', editable: true,
      },{
        id: 'value', label: gettext('Value'), type: 'text', group:null,
        cellHeaderClasses: 'width_percent_50', editable: true,
      },
    ],
    validate: function() {
      // Clear any existing errors.
      this.errorModel.clear();

      var msg;

      if (_.isUndefined(this.get('option')) ||
                String(this.get('option')).replace(/^\s+|\s+$/g, '') == '') {
        msg = gettext('Option cannot be empty.');
        this.errorModel.set('option',msg);
        return msg;
      }
      if (_.isUndefined(this.get('value')) ||
                String(this.get('value')).replace(/^\s+|\s+$/g, '') == '') {
        msg = gettext('Value cannot be empty.');
        this.errorModel.set('value',msg);
        return msg;
      }
      return msg;
    },
  });

  // Extend the collection class for FTS Dictionary
  if (!pgBrowser.Nodes['coll-fts_dictionary']) {
    pgAdmin.Browser.Nodes['coll-fts_dictionary'] =
      pgAdmin.Browser.Collection.extend({
        node: 'fts_dictionary',
        label: gettext('FTS Dictionaries'),
        type: 'coll-fts_dictionary',
        columns: ['name', 'description'],
        canDrop: schemaChildTreeNode.isTreeItemOfChildOfSchema,
        canDropCascade: schemaChildTreeNode.isTreeItemOfChildOfSchema,
      });
  }

  // Extend the node class for FTS Dictionary
  if (!pgBrowser.Nodes['fts_dictionary']) {
    pgAdmin.Browser.Nodes['fts_dictionary'] = schemaChild.SchemaChildNode.extend({
      type: 'fts_dictionary',
      sqlAlterHelp: 'sql-altertsdictionary.html',
      sqlCreateHelp: 'sql-createtsdictionary.html',
      dialogHelp: url_for('help.static', {'filename': 'fts_dictionary_dialog.html'}),
      label: gettext('FTS Dictionary'),
      hasSQL: true,
      hasDepends: true,
      Init: function() {

        // Avoid multiple registration of menus
        if (this.initialized)
          return;

        this.initialized = true;

        // Add context menus for FTS Dictionary
        pgBrowser.add_menus([{
          name: 'create_fts_dictionary_on_schema', node: 'schema', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('FTS Dictionary...'),
          icon: 'wcTabIcon icon-fts_dictionary', data: {action: 'create'},
          enable: 'canCreate',
        },{
          name: 'create_fts_dictionary_on_coll', node: 'coll-fts_dictionary',
          module: this, applies: ['object', 'context'],  priority: 4,
          callback: 'show_obj_properties', category: 'create',
          label: gettext('FTS Dictionary...'), data: {action: 'create'},
          icon: 'wcTabIcon icon-fts_dictionary', enable: 'canCreate',
        },{
          name: 'create_fts_dictionary', node: 'fts_dictionary', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('FTS Dictionary...'),
          icon: 'wcTabIcon icon-fts_dictionary', data: {action: 'create'},
          enable: 'canCreate',
        }]);
      },

      // Defining backform model for FTS Dictionary node
      model: pgAdmin.Browser.Node.Model.extend({
        idAttribute: 'oid',
        defaults: {
          name: undefined,        // FTS Dictionary name
          owner: undefined,       // FTS Dictionary owner
          is_sys_obj: undefined,  // Is system object
          description: undefined, // Comment on FTS Dictionary
          schema: undefined,      // Schema name FTS dictionary belongs to
          template: undefined,    // Template list for FTS dictionary node
          options: undefined,      // option/value pair list for FTS Dictionary
        },
        initialize: function(attrs, args) {
          var isNew = (_.size(attrs) === 0);
          pgAdmin.Browser.Node.Model.prototype.initialize.apply(this, arguments);

          if (isNew) {
            var user = pgBrowser.serverInfo[args.node_info.server._id].user;
            this.set({
              'owner': user.name,
              'schema': args.node_info.schema._id,
            }, {silent: true});
          }
        },
        // Defining schema for fts dictionary
        schema: [{
          id: 'name', label: gettext('Name'), cell: 'string',
          type: 'text', cellHeaderClasses: 'width_percent_50',
        },{
          id: 'oid', label: gettext('OID'), cell: 'string',
          editable: false, type: 'text', mode:['properties'],
        },{
          id: 'owner', label: gettext('Owner'), cell: 'string',
          type: 'text', mode: ['properties', 'edit','create'], node: 'role',
          control: Backform.NodeListByNameControl,
        },{
          id: 'schema', label: gettext('Schema'), cell: 'string',
          type: 'text', mode: ['create','edit'], node: 'schema',
          cache_node: 'database', control: 'node-list-by-id',
        },{
          id: 'is_sys_obj', label: gettext('System FTS dictionary?'),
          cell:'boolean', type: 'switch', mode: ['properties'],
        },{
          id: 'description', label: gettext('Comment'), cell: 'string',
          type: 'multiline', cellHeaderClasses: 'width_percent_50',
        },{
          id: 'template', label: gettext('Template'),type: 'text',
          readonly: function(m) { return !m.isNew(); }, url: 'fetch_templates',
          group: gettext('Definition'), control: 'node-ajax-options',
          cache_node: 'fts_template',
        },{
          id: 'options', label: gettext('Option'), type: 'collection',
          group: gettext('Options'), control: 'unique-col-collection',
          model: OptionLabelModel, columns: ['option', 'value'],
          uniqueCol : ['option'], mode: ['edit', 'create'],
          canAdd: true, canEdit: false,canDelete: true,
        }],

        /*
         * Triggers control specific error messages for dictionary name,
         * template and schema, if any one of them is not specified
         * while creating new fts dictionary
         */
        validate: function() {
          var name = this.get('name'),
            template = this.get('template'),
            schema = this.get('schema'),
            msg;

          // Validate FTS Dictionary name
          if (_.isUndefined(name) || _.isNull(name) || String(name).replace(/^\s+|\s+$/g, '') == '') {
            msg = gettext('Name must be specified.');
            this.errorModel.set('name', msg);
            return msg;
          }

          // Validate template name
          else if (_.isUndefined(template) || _.isNull(template) || String(template).replace(/^\s+|\s+$/g, '') == '') {
            msg = gettext('Template must be selected.');
            this.errorModel.set('template', msg);
            return msg;
          }

          // Validate schema
          else if (_.isUndefined(schema) || _.isNull(schema) || String(schema).replace(/^\s+|\s+$/g, '') == '') {
            msg = gettext('Schema must be selected.');
            this.errorModel.set('schema', msg);
            return msg;
          }
          else this.errorModel.clear();

          this.trigger('on-status-clear');
          return null;
        },
      }),
    });
  }

  return pgBrowser.Nodes['fts_dictionary'];
});
