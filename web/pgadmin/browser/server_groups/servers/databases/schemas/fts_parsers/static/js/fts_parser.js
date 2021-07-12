/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import FTSParserSchema from './fts_parser.ui';
import { getNodeAjaxOptions, getNodeListById } from '../../../../../../../static/js/node_ajax';

define('pgadmin.node.fts_parser', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore',
  'sources/pgadmin', 'pgadmin.browser', 'pgadmin.node.schema.dir/child',
  'pgadmin.node.schema.dir/schema_child_tree_node', 'pgadmin.browser.collection',
], function(gettext, url_for, $, _, pgAdmin, pgBrowser, schemaChild, schemaChildTreeNode) {

  // Extend the collection class for fts parser
  if (!pgBrowser.Nodes['coll-fts_parser']) {
    pgAdmin.Browser.Nodes['coll-fts_parser'] =
      pgAdmin.Browser.Collection.extend({
        node: 'fts_parser',
        label: gettext('FTS Parsers'),
        type: 'coll-fts_parser',
        columns: ['name', 'description'],
        canDrop: schemaChildTreeNode.isTreeItemOfChildOfSchema,
        canDropCascade: schemaChildTreeNode.isTreeItemOfChildOfSchema,
      });
  }

  // Extend the node class for fts parser
  if (!pgBrowser.Nodes['fts_parser']) {
    pgAdmin.Browser.Nodes['fts_parser'] = schemaChild.SchemaChildNode.extend({
      type: 'fts_parser',
      sqlAlterHelp: 'sql-altertsparser.html',
      sqlCreateHelp: 'sql-createtsparser.html',
      dialogHelp: url_for('help.static', {'filename': 'fts_parser_dialog.html'}),
      label: gettext('FTS Parser'),
      hasSQL: true,
      hasDepends: true,
      Init: function() {

        // Avoid multiple registration of menus
        if (this.initialized)
          return;

        this.initialized = true;

        // Add context menus for fts parser
        pgBrowser.add_menus([{
          name: 'create_fts_parser_on_schema', node: 'schema', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('FTS Parser...'),
          icon: 'wcTabIcon icon-fts_parser', data: {action: 'create'},
          enable: 'canCreate',
        },{
          name: 'create_fts_parser_on_coll', node: 'coll-fts_parser',
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('FTS Parser...'),
          icon: 'wcTabIcon icon-fts_parser', data: {action: 'create'},
          module: this, enable: 'canCreate',
        },{
          name: 'create_fts_parser', node: 'fts_parser', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('FTS Parser...'),
          icon: 'wcTabIcon icon-fts_parser', data: {action: 'create'},
          enable: 'canCreate',
        }]);

      },

      // Defining backform model for fts parser node
      model: pgAdmin.Browser.Node.Model.extend({
        idAttribute: 'oid',
        defaults: {
          name: undefined,          // Fts parser name
          is_sys_obj: undefined,  // Is system object
          description: undefined,   // Comment on parser
        },
        initialize: function(attrs, args) {
          var isNew = (_.size(attrs) === 0);
          pgAdmin.Browser.Node.Model.prototype.initialize.apply(
            this, arguments
          );
          if (isNew) {
            this.set('schema', args.node_info.schema._id);
          }
        },
        // Defining schema for fts parser
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
         * Triggers control specific error messages for parser name,
         * start, token, end, lextype functions and schema, if any one of them is not specified
         * while creating new fts parser
         */
        validate: function() {
          var name = this.get('name'),
            start = this.get('prsstart'),
            token = this.get('prstoken'),
            end = this.get('prsend'),
            lextype = this.get('prslextype'),
            schema = this.get('schema'),
            msg;

          // Validate fts parser name
          if (_.isUndefined(name) ||
                _.isNull(name) ||
                String(name).replace(/^\s+|\s+$/g, '') == '') {
            msg = gettext('Name must be specified.');
            this.errorModel.set('name', msg);
            return msg;
          }

          // Validate start function control
          else if (_.isUndefined(start) ||
                    _.isNull(start) ||
                    String(start).replace(/^\s+|\s+$/g, '') == '') {
            msg = gettext('Start function must be selected.');
            this.errorModel.set('prsstart', msg);
            return msg;
          }

          // Validate gettoken function control
          else if (_.isUndefined(token) ||
                    _.isNull(token) ||
                    String(token).replace(/^\s+|\s+$/g, '') == '') {
            msg = gettext('Get next token function must be selected.');
            this.errorModel.set('prstoken', msg);
            return msg;
          }

          // Validate end function control
          else if (_.isUndefined(end) ||
                    _.isNull(end) ||
                    String(end).replace(/^\s+|\s+$/g, '') == '') {
            msg = gettext('End function must be selected.');
            this.errorModel.set('prsend', msg);
            return msg;
          }

          // Validate lextype function control
          else if (_.isUndefined(lextype) ||
                    _.isNull(lextype) ||
                    String(lextype).replace(/^\s+|\s+$/g, '') == '') {
            msg = gettext('Lextype function must be selected.');
            this.errorModel.set('prslextype', msg);
            return msg;
          }

          // Validate schema for fts parser
          else if (_.isUndefined(schema) ||
                    _.isNull(schema) ||
                    String(schema).replace(/^\s+|\s+$/g, '') == '') {
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
        let nodeObj = pgAdmin.Browser.Nodes['fts_parser'];
        return new FTSParserSchema(
          {
            prsstartList: () => getNodeAjaxOptions('start_functions', nodeObj, treeNodeInfo, itemNodeData, {
              cacheLevel: 'database',
            }),
            prstokenList: () => getNodeAjaxOptions('token_functions', nodeObj, treeNodeInfo, itemNodeData, {
              cacheLevel: 'database',
            }),
            prsendList: () => getNodeAjaxOptions('end_functions', nodeObj, treeNodeInfo, itemNodeData, {
              cacheLevel: 'database',
            }),
            prslextypeList: () => getNodeAjaxOptions('lextype_functions', nodeObj, treeNodeInfo, itemNodeData, {
              cacheLevel: 'database',
            }),
            prsheadlineList: () => getNodeAjaxOptions('headline_functions', nodeObj, treeNodeInfo, itemNodeData, {
              cacheLevel: 'database',
            }),
            schemaList:() => getNodeListById(pgBrowser.Nodes['schema'], treeNodeInfo, itemNodeData, {
              cacheLevel: 'database'
            })
          },
          {
            schema: treeNodeInfo.schema._id,
          }
        );
      }
    });
  }

  return pgBrowser.Nodes['coll-fts_parser'];
});
