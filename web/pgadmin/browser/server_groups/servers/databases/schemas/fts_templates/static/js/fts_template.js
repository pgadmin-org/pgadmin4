/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import FTSTemplateSchema from './fts_template.ui';
import { getNodeAjaxOptions, getNodeListById } from '../../../../../../../static/js/node_ajax';

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
          id: 'description', label: gettext('Comment'), cell: 'string',
          type: 'multiline', cellHeaderClasses: 'width_percent_50',
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
      getSchema: (treeNodeInfo, itemNodeData) => {
        let nodeObj = pgAdmin.Browser.Nodes['fts_template'];
        return new FTSTemplateSchema(
          {
            initFunctionList:()=>getNodeAjaxOptions('get_init', nodeObj, treeNodeInfo, itemNodeData, {
              cacheLevel: 'database'
            }),
            lexisFunctionList:()=>getNodeAjaxOptions('get_lexize', nodeObj, treeNodeInfo, itemNodeData, {
              cacheLevel: 'database'
            }),
            schemaList:()=>getNodeListById(pgBrowser.Nodes['schema'], treeNodeInfo, itemNodeData),
          },
          {
            schema: treeNodeInfo.schema._id,
          }
        );
      }
    });
  }

  return pgBrowser.Nodes['fts_template'];
});
