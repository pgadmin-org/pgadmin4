/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define('pgadmin.node.fts_template', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore',
  'sources/pgadmin', 'pgadmin.browser', 'pgadmin.node.schema.dir/child',
  'pgadmin.node.schema.dir/schema_child_tree_node', 'pgadmin.browser.collection',
], function(gettext, url_for, $, _, pgAdmin, pgBrowser, schemaChild, schemaChildTreeNode) {

  // Extend the collection class for fts template
  if (!pgBrowser.Nodes['coll-fts_template']) {
    pgAdmin.Browser.Nodes['coll-fts_template'] =
      pgAdmin.Browser.Collection.extend({
        node: 'fts_template',
        label: gettext('FTS Templates'),
        type: 'coll-fts_template',
        columns: ['name', 'description'],
        canDrop: schemaChildTreeNode.isTreeItemOfChildOfSchema,
        canDropCascade: schemaChildTreeNode.isTreeItemOfChildOfSchema,
      });
  }

  // Extend the node class for fts template
  if (!pgBrowser.Nodes['fts_template']) {
    pgAdmin.Browser.Nodes['fts_template'] = schemaChild.SchemaChildNode.extend({
      type: 'fts_template',
      sqlAlterHelp: 'sql-altertstemplate.html',
      sqlCreateHelp: 'sql-createtstemplate.html',
      dialogHelp: url_for('help.static', {'filename': 'fts_template_dialog.html'}),
      label: gettext('FTS Template'),
      hasSQL: true,
      hasDepends: true,
      Init: function() {

        // Avoid multiple registration of menus
        if (this.initialized)
          return;

        this.initialized = true;

        // Add context menus for fts template
        pgBrowser.add_menus([{
          name: 'create_fts_template_on_schema', node: 'schema', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('FTS Template...'),
          icon: 'wcTabIcon icon-fts_template', data: {action: 'create'},
          enable: 'canCreate',
        },{
          name: 'create_fts_template_on_coll', node: 'coll-fts_template', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('FTS Template...'),
          icon: 'wcTabIcon icon-fts_template', data: {action: 'create'},
          enable: 'canCreate',
        },{
          name: 'create_fts_template', node: 'fts_template', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('FTS Template...'),
          icon: 'wcTabIcon icon-fts_template', data: {action: 'create'},
          enable: 'canCreate',
        }]);

      },

      // Defining backform model for fts template node
      model: pgAdmin.Browser.Node.Model.extend({
        idAttribute: 'oid',
        defaults: {
          name: undefined,      // Fts template name
          is_sys_obj: undefined,  // Is system object
          description: undefined,   // Comment on template
          schema: undefined,        // Schema name to which template belongs
          tmplinit: undefined,      // Init function for fts template
          tmpllexize: undefined,     // Lexize function for fts template
        },
        initialize: function(attrs, args) {
          var isNew = (_.size(attrs) === 0);
          pgAdmin.Browser.Node.Model.prototype.initialize.apply(this, arguments);
          if (isNew) {
            this.set('schema', args.node_info.schema._id);
          }
        },
        // Defining schema for fts template
        schema: [{
          id: 'name', label: gettext('Name'), cell: 'string',
          type: 'text', cellHeaderClasses: 'width_percent_50',
        },{
          id: 'oid', label: gettext('OID'), cell: 'string',
          editable: false, type: 'text', mode:['properties'],
        },{
          id: 'schema', label: gettext('Schema'), cell: 'string',
          type: 'text', mode: ['create','edit'], node: 'schema',
          control: 'node-list-by-id', cache_node: 'database',
          cache_level: 'database',
        },{
          id: 'is_sys_obj', label: gettext('System FTS template?'),
          cell:'boolean', type: 'switch', mode: ['properties'],
        },{
          id: 'description', label: gettext('Comment'), cell: 'string',
          type: 'multiline', cellHeaderClasses: 'width_percent_50',
        },{
          id: 'tmplinit', label: gettext('Init function'),
          group: gettext('Definition'), type: 'text', readonly: function(m) {
            return !m.isNew();
          }, control: 'node-ajax-options', url: 'get_init',
          cache_level: 'database', cache_node: 'schema',
        },{
          id: 'tmpllexize', label: gettext('Lexize function'), group: gettext('Definition'),
          type: 'text', readonly: function(m) { return !m.isNew(); },
          control: 'node-ajax-options', url: 'get_lexize', cache_level: 'database',
          cache_node: 'schema',
        }],

        /*
         * Triggers control specific error messages for template name,
         * lexize function and schema, if any one of them is not specified
         * while creating new fts template
         */
        validate: function() {
          var name = this.get('name'),
            lexize = this.get('tmpllexize'),
            schema = this.get('schema'),
            msg;

          // Validate fts template name
          if (_.isUndefined(name) || _.isNull(name) || String(name).replace(/^\s+|\s+$/g, '') == '') {
            msg = gettext('Name must be specified.');
            this.errorModel.set('name', msg);
            return msg;
          }

          // Validate lexize function control
          else if (_.isUndefined(lexize) || _.isNull(lexize) || String(lexize).replace(/^\s+|\s+$/g, '') == '') {
            msg = gettext('Lexize function must be selected.');
            this.errorModel.set('tmpllexize', msg);
            return msg;
          }

          // Validate schema for fts template
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

  return pgBrowser.Nodes['fts_template'];
});
