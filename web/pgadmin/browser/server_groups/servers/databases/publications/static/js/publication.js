/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define('pgadmin.node.publication', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore',
  'sources/pgadmin', 'pgadmin.browser', 'pgadmin.backform',
  'pgadmin.browser.collection', 'pgadmin.browser.server.privilege',
], function(gettext, url_for, $, _, pgAdmin, pgBrowser, Backform) {

  // Extend the browser's collection class for publications collection
  if (!pgBrowser.Nodes['coll-publication']) {
    pgBrowser.Nodes['coll-publication'] =
      pgBrowser.Collection.extend({
        node: 'publication',
        label: gettext('Publications'),
        type: 'coll-publication',
        columns: ['name', 'pubowner', 'pubtable', 'all_table'],

      });
  }

  // Extend the browser's node class for publication node
  if (!pgBrowser.Nodes['publication']) {
    pgBrowser.Nodes['publication'] = pgBrowser.Node.extend({
      parent_type: 'database',
      type: 'publication',
      sqlAlterHelp: 'sql-alterpublication.html',
      sqlCreateHelp: 'sql-createpublication.html',
      dialogHelp: url_for('help.static', {'filename': 'publication_dialog.html'}),
      label: gettext('Publication'),
      hasSQL:  true,
      canDrop: true,
      canDropCascade: true,
      hasDepends: true,

      Init: function() {

        // Avoid multiple registration of menus
        if (this.initialized)
          return;

        this.initialized = true;


        // Add context menus for publication
        pgBrowser.add_menus([{
          name: 'create_publication_on_database', node: 'database', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Publication...'),
          icon: 'wcTabIcon icon-publication', data: {action: 'create'},
          enable: pgBrowser.Nodes['database'].canCreate,
        },{
          name: 'create_publication_on_coll', node: 'coll-publication', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Publication...'),
          icon: 'wcTabIcon icon-publication', data: {action: 'create'},
        },{
          name: 'create_publication', node: 'publication', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Publication...'),
          icon: 'wcTabIcon icon-publication', data: {action: 'create'},
        }]);
      },
      // Define the model for publication node
      model: pgBrowser.Node.Model.extend({
        idAttribute: 'oid',
        defaults: {
          name: undefined,
          pubowner: undefined,
          pubtable: undefined,
          all_table: undefined,
          evnt_insert:true,
          evnt_delete:true,
          evnt_update:true,
          evnt_truncate:true,
          only_table: undefined,
          publish_via_partition_root: false,
        },

        // Default values!
        initialize: function(attrs, args) {
          var isNew = (_.size(attrs) === 0);
          if (isNew) {
            var userInfo = pgBrowser.serverInfo[args.node_info.server._id].user;

            this.set({'pubowner': userInfo.name}, {silent: true});
          }
          pgBrowser.Node.Model.prototype.initialize.apply(this, arguments);
        },

        // Define the schema for the publication node
        schema: [{
          id: 'name', label: gettext('Name'), type: 'text',
          mode: ['properties', 'create', 'edit'],
          visible: function() {
            if(!_.isUndefined(this.node_info) && !_.isUndefined(this.node_info.server)
              && !_.isUndefined(this.node_info.server.version) &&
                this.node_info.server.version >= 100000) {
              return true;
            }
            return false;
          },
        },{
          id: 'oid', label: gettext('OID'), cell: 'string', mode: ['properties'],
          type: 'text',
        },{
          id: 'pubowner', label: gettext('Owner'), type: 'text',
          control: Backform.NodeListByNameControl, node: 'role',
          disabled: function(m){
            if(m.isNew())
              return true;
            return false;
          },
          mode: ['edit', 'properties', 'create'], select2: { allowClear: false},
        },{
          id: 'all_table', label: gettext('All tables?'), type: 'switch',
          group: gettext('Definition'), mode: ['edit', 'properties', 'create'], deps: ['name'],
          readonly: function(m) {return !m.isNew();},
        },
        {
          id: 'only_table', label: gettext('Only table?'), type: 'switch',
          group: gettext('Definition'), mode: ['edit', 'create'],
          deps: ['name', 'pubtable', 'all_table'], readonly: 'isTable',
          helpMessage: gettext('If ONLY is specified before the table name, only that table is added to the publication. If ONLY is not specified, the table and all its descendant tables (if any) are added.'),
        },
        {
          id: 'pubtable', label: gettext('Tables'), type: 'array',
          select2: { allowClear: true, multiple: true },
          control: 'node-ajax-options', url:'get_tables',
          group: gettext('Definition'), mode: ['edit', 'create'],
          deps: ['all_table'], disabled: 'isAllTable',
        },
        {
          id: 'pubtable', label: gettext('Tables'), type: 'text', group: gettext('Definition'),
          mode: ['properties'],
        },
        {
          type: 'nested', control: 'fieldset', mode: ['create','edit', 'properties'],
          label: gettext('With'), group: gettext('Definition'), contentClass: 'row',
          schema:[{
            id: 'evnt_insert', label: gettext('INSERT'),
            type: 'switch', mode: ['create','edit', 'properties'],
            group: gettext('With'),
            extraToggleClasses: 'pg-el-sm-6',
            controlLabelClassName: 'control-label pg-el-sm-5 pg-el-12',
            controlsClassName: 'pgadmin-controls pg-el-sm-7 pg-el-12',
          },{
            id: 'evnt_update', label: gettext('UPDATE'),
            type: 'switch', mode: ['create','edit', 'properties'],
            group: gettext('With'),
            extraToggleClasses: 'pg-el-sm-6',
            controlLabelClassName: 'control-label pg-el-sm-5 pg-el-12',
            controlsClassName: 'pgadmin-controls pg-el-sm-7 pg-el-12',
          },{
            id: 'evnt_delete', label: gettext('DELETE'),
            type: 'switch', mode: ['create','edit', 'properties'],
            group: gettext('With'),
            extraToggleClasses: 'pg-el-sm-6',
            controlLabelClassName: 'control-label pg-el-sm-5 pg-el-12',
            controlsClassName: 'pgadmin-controls pg-el-sm-7 pg-el-12',
          },{
            id: 'evnt_truncate', label: gettext('TRUNCATE'),
            type: 'switch', group: gettext('With'),
            extraToggleClasses: 'pg-el-sm-6',
            controlLabelClassName: 'control-label pg-el-sm-5 pg-el-12',
            controlsClassName: 'pgadmin-controls pg-el-sm-7 pg-el-12',
            visible: function(m) {
              if(!_.isUndefined(m.node_info) && !_.isUndefined(m.node_info.server)
              && !_.isUndefined(m.node_info.server.version) &&
                m.node_info.server.version >= 110000)
                return true;
              return false;
            },

          },{
            id: 'publish_via_partition_root', label: gettext('Publish via root?'),
            type: 'switch', group: gettext('With'),
            extraToggleClasses: 'pg-el-sm-6',
            controlLabelClassName: 'control-label pg-el-sm-5 pg-el-12',
            controlsClassName: 'pgadmin-controls pg-el-sm-7 pg-el-12',
            visible: function(m) {
              if(!_.isUndefined(m.node_info) && !_.isUndefined(m.node_info.server)
              && !_.isUndefined(m.node_info.server.version) &&
                m.node_info.server.version >= 130000)
                return true;
              return false;
            },

          }],
        },
        ],

        isAllTable:  function(m) {
          var all_table = m.get('all_table');
          if(all_table){
            setTimeout( function() {
              m.set('pubtable', '');
            }, 10);
            return true;
          }
          return false;
        },
        isTable:  function(m) {
          var all_table = m.get('all_table'),
            table = m.get('pubtable');
          if(all_table){
            setTimeout( function() {
              m.set('only_table', false);
            }, 10);
            return true;
          }

          if (!_.isUndefined(table) && table.length > 0 && m._changing && !_.isEqual(m.origSessAttrs['pubtable'], m.changed['pubtable']) && 'pubtable' in m.changed){
            return false;
          }
          return true;
        },

        /* validate function is used to validate the input given by
         * the user. In case of error, message will be displayed on
         * the GUI for the respective control.
         */

        sessChanged: function() {
          if (this.sessAttrs['pubtable'] == '' && this.origSessAttrs['pubtable'] == '')
            return false;
          return pgBrowser.DataModel.prototype.sessChanged.apply(this);
        },

        validate: function() {
          var name = this.get('name'),
            msg;

          if (_.isUndefined(name) || _.isNull(name) ||
            String(name).replace(/^\s+|\s+$/g, '') == '') {
            msg = gettext('Name cannot be empty.');
            this.errorModel.set('name', msg);
            return msg;
          } else {
            this.errorModel.unset('name');
          }
          return null;
        },
        canCreate: function(itemData, item) {

          var treeData = this.getTreeNodeHierarchy(item),
            server = treeData['server'];

          // If server is less than 10 then do not allow 'create' menu
          if (server && server.version < 100000)
            return false;

          // by default we want to allow create menu
          return true;
        },

      }),
    });
  }
  return pgBrowser.Nodes['coll-publication'];
});
