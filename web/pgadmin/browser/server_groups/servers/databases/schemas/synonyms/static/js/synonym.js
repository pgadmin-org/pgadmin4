/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define('pgadmin.node.synonym', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore',
  'sources/pgadmin', 'pgadmin.browser', 'pgadmin.alertifyjs',
  'pgadmin.node.schema.dir/child', 'pgadmin.node.schema.dir/schema_child_tree_node',
  'pgadmin.browser.collection',
], function(gettext, url_for, $, _, pgAdmin, pgBrowser, alertify,
  schemaChild, schemaChildTreeNode) {

  if (!pgBrowser.Nodes['coll-synonym']) {
    pgAdmin.Browser.Nodes['coll-synonym'] =
      pgAdmin.Browser.Collection.extend({
        node: 'synonym',
        label: gettext('Synonyms'),
        type: 'coll-synonym',
        columns: ['name', 'owner','is_public_synonym'],
        canDrop: schemaChildTreeNode.isTreeItemOfChildOfSchema,
        canDropCascade: schemaChildTreeNode.isTreeItemOfChildOfSchema,
      });
  }

  if (!pgBrowser.Nodes['synonym']) {
    pgAdmin.Browser.Nodes['synonym'] = schemaChild.SchemaChildNode.extend({
      type: 'synonym',
      dialogHelp: url_for('help.static', {'filename': 'synonym_dialog.html'}),
      label: gettext('Synonym'),
      collection_type: 'coll-synonym',
      hasSQL: true,
      hasDepends: true,
      parent_type: ['schema', 'catalog'],
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_synonym_on_coll', node: 'coll-synonym', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Synonym...'),
          icon: 'wcTabIcon icon-synonym', data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_synonym', node: 'synonym', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Synonym...'),
          icon: 'wcTabIcon icon-synonym', data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_synonym', node: 'schema', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Synonym...'),
          icon: 'wcTabIcon icon-synonym', data: {action: 'create', check: true},
          enable: 'canCreate',
        },
        ]);

      },
      model: pgAdmin.Browser.Node.Model.extend({
        isNew: function() {
          return !this.fetchFromServer;
        },
        idAttribute: 'oid',
        // Default values!
        initialize: function(attrs, args) {
          var isNew = (_.size(attrs) === 0);

          if (isNew) {
            var userInfo = pgBrowser.serverInfo[args.node_info.server._id].user;
            var schemaInfo = args.node_info.schema;
            this.set({
              'owner': userInfo.name,
              'synobjschema': schemaInfo._label,
              'schema': schemaInfo._label,
              'targettype': 'r',
            }, {silent: true});
          } else {
            this.fetchFromServer = true;
          }
          pgAdmin.Browser.Node.Model.prototype.initialize.apply(this, arguments);

        },
        schema: [{
          id: 'name', label: gettext('Name'), cell: 'string',
          type: 'text', mode: ['properties', 'create', 'edit'],
          disabled: 'inSchema', readonly: function(m) { return !m.isNew(); },
        },{
          id: 'oid', label: gettext('OID'), cell: 'string',
          type: 'text', mode: ['properties'],
        },{
          id: 'owner', label: gettext('Owner'), cell: 'string',
          type: 'text', mode: ['properties', 'create', 'edit'],
          readonly: true , control: 'node-list-by-name',
          node: 'role', visible: false,
        },{
          id: 'schema', label: gettext('Schema'), cell: 'string',
          type: 'text', mode: ['properties', 'create', 'edit'],
          readonly: function(m) { return !m.isNew(); }, node: 'schema',
          control: 'node-list-by-name', cache_node: 'database',
          cache_level: 'database',
        },{
          id: 'targettype', label: gettext('Target type'), cell: 'string',
          disabled: 'inSchema', group: gettext('Definition'),
          select2: { width: '50%', allowClear: false },
          options: function() {
            return [
              {label: gettext('Function'), value: 'f'},
              {label: gettext('Package'), value: 'P'},
              {label: gettext('Procedure'), value: 'p'},
              {label: gettext('Public Synonym'), value: 's'},
              {label: gettext('Sequence'), value: 'S'},
              {label: gettext('Table'), value: 'r'},
              {label: gettext('View'), value: 'v'},
            ];
          },
          control: 'select2',
        },{
          id: 'synobjschema', label: gettext('Target schema'), cell: 'string',
          type: 'text', mode: ['properties', 'create', 'edit'],
          group: gettext('Definition'), deps: ['targettype'],
          select2: { allowClear: false }, control: 'node-list-by-name',
          node: 'schema', filter: function(d) {
            // Exclude PPAS catalogs
            var exclude_catalogs = ['pg_catalog', 'sys', 'dbo',
              'pgagent', 'information_schema',
              'dbms_job_procedure'];
            return d && _.indexOf(exclude_catalogs, d.label) == -1;
          },
          disabled: function(m) {
            // If tagetType is synonym then disable it
            if(!m.inSchema.apply(this, [m])) {
              var is_synonym = (m.get('targettype') == 's');
              if(is_synonym) {
                m.set('synobjschema', 'public', {silent: true});
                return true;
              } else {
                return false;
              }
            }
            return true;
          },
        },{
          id: 'synobjname', label: gettext('Target object'), cell: 'string',
          type: 'text', group: gettext('Definition'),
          deps: ['targettype', 'synobjschema'],
          control: 'node-ajax-options',
          options: function(control) {
            var trgTyp = control.model.get('targettype');
            var trgSchema = control.model.get('synobjschema');
            var res = [];
            var node = control.field.get('schema_node'),
              _url = node.generate_url.apply(
                node, [
                  null, 'get_target_objects', control.field.get('node_data'), false,
                  control.field.get('node_info') ]);
            $.ajax({
              type: 'GET',
              timeout: 30000,
              url: _url,
              cache: false,
              async: false,
              data: {'trgTyp' : trgTyp, 'trgSchema' : trgSchema},
            })
            // On success return function list from server
              .done(function(result) {
                res = result.data;
                return res;
              })
            // On failure show error appropriate error message to user
              .fail(function(xhr, status, error) {
                alertify.pgRespErrorNotify(xhr, error);
              });
            return res;
          },
          disabled: function(m) {
            if (this.node_info &&  'catalog' in this.node_info) {
              return true;
            }
            // Check the changed attributes if targettype or synobjschema
            // is changed then reset the target object
            if ('changed' in m && !('name' in m.changed) &&
               ('targettype' in m.changed || 'synobjschema' in m.changed)) {
              m.set('synobjname', undefined);
            }

            return false;
          },
        },{
          id: 'is_sys_obj', label: gettext('System synonym?'),
          cell:'boolean', type: 'switch', mode: ['properties'],
        },
        ],
        validate: function() {
          var msg = undefined;
          this.errorModel.clear();

          if (_.isUndefined(this.get('name'))
              || String(this.get('name')).replace(/^\s+|\s+$/g, '') == '') {
            msg = gettext('Name cannot be empty.');
            this.errorModel.set('name', msg);
          } else if (_.isUndefined(this.get('synobjschema'))
              || String(this.get('synobjschema')).replace(/^\s+|\s+$/g, '') == '') {
            msg = gettext('Target schema cannot be empty.');
            this.errorModel.set('synobjschema', msg);
          } else if (_.isUndefined(this.get('synobjname'))
              || String(this.get('synobjname')).replace(/^\s+|\s+$/g, '') == '') {
            msg = gettext('Target object cannot be empty.');
            this.errorModel.set('synobjname', msg);
          }
          return null;
        },
        // We will disable everything if we are under catalog node
        inSchema: function() {
          if(this.node_info &&  'catalog' in this.node_info)
          {
            return true;
          }
          return false;
        },
      }),
      canCreate: function(itemData, item, data) {
        //If check is false then , we will allow create menu
        if (data && data.check == false)
          return true;

        var treeData = this.getTreeNodeHierarchy(item),
          server = treeData['server'];

        if (server && server.server_type === 'pg')
          return false;

        // If it is catalog then don't allow user to create synonyms
        if (treeData['catalog'] != undefined)
          return false;

        // by default we do not want to allow create menu
        return true;
      },
    });

  }

  return pgBrowser.Nodes['synonym'];
});
