define(
  ['jquery', 'underscore', 'underscore.string', 'pgadmin', 'alertify',
    'pgadmin.browser', 'codemirror', 'pgadmin.browser.server.privilege'],

function($, _, S, pgAdmin, alertify, pgBrowser, CodeMirror) {

  /**
    Create and add a view collection into nodes
    @param {variable} label - Label for Node
    @param {variable} type - Type of Node
    @param {variable} columns - List of columns to
      display under under properties.
   */
  if (!pgBrowser.Nodes['coll-mview']) {
    var mviews= pgAdmin.Browser.Nodes['coll-mview'] =
      pgAdmin.Browser.Collection.extend({
        node: 'mview',
        label: '{{ _("Materialized Views") }}',
        type: 'coll-mview',
        columns: ['name', 'owner']
      });
  }

  /**
    Create and Add a View Node into nodes
    @param {variable} parent_type - The list of nodes
    under which this node to display
    @param {variable} type - Type of Node
    @param {variable} hasSQL - To show SQL tab
    @param {variable} canDrop - Adds drop view option
    in the context menu
    @param {variable} canDropCascade - Adds drop Cascade
    view option in the context menu
   */
  if (!pgBrowser.Nodes['mview']) {
    pgAdmin.Browser.Nodes['mview'] = pgAdmin.Browser.Node.extend({
      parent_type: ['schema', 'catalog'],
      type: 'mview',
      sqlAlterHelp: 'sql-altermaterializedview.html',
      sqlCreateHelp: 'sql-creatematerializedview.html',
      label: '{{ _("Materialized View") }}',
      hasSQL:  true,
      hasDepends: true,
      collection_type: 'coll-mview',
      canDrop: pgBrowser.Nodes['schema'].canChildDrop,
      canDropCascade: pgBrowser.Nodes['schema'].canChildDrop,
      Init: function() {

        // Avoid mulitple registration of menus
        if (this.initialized)
          return;

        this.initialized = true;

        /**
          Add "create view" menu option into context and object menu
          for the following nodes:
          coll-mview, view and schema.
          @property {data} - Allow create view option on schema node or
          system view nodes.
         */
        pgBrowser.add_menus([{
          name: 'create_mview_on_coll', node: 'coll-mview',
          module: this, applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 1, label: '{{ _("Materialized View...") }}',
          icon: 'wcTabIcon icon-mview', data: {action: 'create', check: true},
          enable: 'canCreate'
        },{
          name: 'create_mview', node: 'mview', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 1, label: '{{ _("Materialized View...") }}',
          icon: 'wcTabIcon icon-mview', data: {action: 'create', check: true},
          enable: 'canCreate'
        },{
          name: 'create_mview', node: 'schema', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 18, label: '{{ _("Materialized View...") }}',
          icon: 'wcTabIcon icon-mview', data: {action: 'create', check: false},
          enable: 'canCreate'
        },{
          name: 'refresh_mview', node: 'mview', module: this, category: 'Refresh view',
          applies: ['object', 'context'], callback: 'refresh_mview', icon: 'fa fa-refresh',
          priority: 1, label: '{{ _("Refresh data") }}', data: {concurrent: false}
        },{
          name: 'refresh_mview_concurrent', node: 'mview', module: this,
          category: 'Refresh view',
          applies: ['object', 'context'], callback: 'refresh_mview', icon: 'fa fa-refresh',
          priority: 2, label: '{{ _("Refresh concurrently") }}', data: {concurrent: true}
        }
        ]);
      },

      /**
        Define model for the view node and specify the
        properties of the model in schema.
       */
      model: pgAdmin.Browser.Node.Model.extend({
        initialize: function(attrs, args) {
          var isNew = (_.size(attrs) === 0);
          if (isNew) {
            // Set Selected Schema
            var schemaLabel = args.node_info.schema.label;
            this.set({'schema': schemaLabel}, {silent: true});

            // Set Current User
            var userInfo = pgBrowser.serverInfo[args.node_info.server._id].user;
            this.set({'owner': userInfo.name}, {silent: true});
          }
          pgAdmin.Browser.Node.Model.prototype.initialize.apply(this, arguments);
        },
        defaults: {
          spcname: 'pg_default',
          toast_autovacuum_enabled: false,
          autovacuum_enabled: false
        },
        schema: [{
          id: 'name', label: '{{ _("Name") }}', cell: 'string',
          type: 'text', disabled: 'inSchema'
        },
        {
          id: 'oid', label:'{{ _("OID") }}', cell: 'string',
          type: 'text', disabled: true, mode: ['properties']
        },
        {
          id: 'owner', label:'{{ _("Owner") }}', cell: 'string',
          control: 'node-list-by-name', select2: { allowClear: false },
          node: 'role', disabled: 'inSchema'
        },
        {
          id: 'schema', label:'{{ _("Schema") }}', cell: 'string', first_empty: false,
          control: 'node-list-by-name', type: 'text', cache_level: 'database',
          node: 'schema', mode: ['create', 'edit'], disabled: 'inSchema', select2: { allowClear: false }
        },
        {
          id: 'system_view', label:'{{ _("System view?") }}', cell: 'string',
          type: 'switch', disabled: true, mode: ['properties'],
        },
        {
          id: 'acl', label: '{{ _("ACL") }}',
          mode: ['properties'], type: 'text'
        },
        {
          id: 'comment', label:'{{ _("Comment") }}', cell: 'string',
          type: 'multiline'
        },
        {
          id: 'definition', label:'{{ _("") }}', cell: 'string',
          type: 'text', mode: ['create', 'edit'], group: 'Definition',
          control: Backform.SqlFieldControl, extraClasses:['sql_field_width_full']
        },
        {
          id: 'with_data', label: '{{ _("With Data") }}',
          group: '{{ _("Storage") }}', mode: ['edit', 'create'],
          type: 'switch',
        },
        {
          id: 'spcname', label: '{{ _("Tablespace") }}', cell: 'string',
          type: 'text', group: '{{ _("Storage") }}', first_empty: false,
          control: 'node-list-by-name', node: 'tablespace', select2: { allowClear: false },
          filter: function(m) {
            if (m.label == "pg_global") return false;
            else return true;
          }
        },
        {
          id: 'fillfactor', label: '{{ _("Fill Factor") }}',
          group: '{{ _("Storage") }}', mode: ['edit', 'create'],
          type: 'integer'
        },
        {
          type: 'nested', control: 'tab', id: 'materialization',
          label: '{{ _("Auto vacuum") }}', mode: ['edit', 'create'],
          group: '{{ _("Auto vacuum") }}',
          schema: Backform.VacuumSettingsSchema
        },
        // Add Privilege Control
        {
          id: 'datacl', label: '{{ _("Privileges") }}',
          model: pgAdmin.Browser.Node.PrivilegeRoleModel.extend(
            {privileges: ['a', 'r', 'w', 'd', 'D', 'x', 't']}), uniqueCol : ['grantee'],
          editable: false, type: 'collection', group: '{{ _("Security") }}',
          mode: ['edit', 'create'], canAdd: true, canDelete: true,
          control: 'unique-col-collection', priority: 3
        },

        // Add Security Labels Control
        {
          id: 'seclabels', label: '{{ _("Security Labels") }}',
          model: Backform.SecurityModel, editable: false, type: 'collection',
          canEdit: false, group: '{{ _("Security") }}', canDelete: true,
          mode: ['edit', 'create'], canAdd: true,
          control: 'unique-col-collection', uniqueCol : ['provider']
        }
        ],
        validate: function(keys) {

          // Triggers specific error messages for fields
          var err = {},
            errmsg,
            field_name = this.get('name'),
            field_def = this.get('definition');
          if (_.indexOf(keys, 'autovacuum_enabled') != -1 ||
              _.indexOf(keys, 'toast_autovacuum_enabled') != -1 )
              return null;

          if (_.isUndefined(field_name) || _.isNull(field_name) ||
            String(field_name).replace(/^\s+|\s+$/g, '') == '') {
            err['name'] = '{{ _("Please specify name.") }}';
            errmsg = errmsg || err['name'];
            this.errorModel.set('name', errmsg);
            return errmsg;
          }else{
            this.errorModel.unset('name');
          }
          if (_.isUndefined(field_def) || _.isNull(field_def) ||
            String(field_def).replace(/^\s+|\s+$/g, '') == '') {
            err['definition'] = '{{ _("Please enter function definition.") }}';
            errmsg = errmsg || err['definition'];
            this.errorModel.set('definition', errmsg);
            return errmsg;
          }else{
            this.errorModel.unset('definition');
          }
          return null;
        },
        // We will disable everything if we are under catalog node
        inSchema: function() {
          if(this.node_info && 'catalog' in this.node_info)
          {
            return true;
          }
          return false;
        }

      }),

      /**
        Show or hide create view menu option on parent node
        and hide for system view in catalogs.
       */
      canCreate: function(itemData, item, data) {

        // If check is false then, we will allow create menu
        if (data && data.check === false)
          return true;

        var t = pgBrowser.tree, i = item, d = itemData;

        // To iterate over tree to check parent node
        while (i) {

          // If it is schema then allow user to create view
          if (_.indexOf(['schema'], d._type) > -1)
            return true;

          if ('coll-mview' == d._type) {

            // Check if we are not child of view
            prev_i = t.hasParent(i) ? t.parent(i) : null;
            prev_d = prev_i ? t.itemData(prev_i) : null;
            if( prev_d._type == 'catalog') {
              return false;
            } else {
              return true;
            }
          }
          i = t.hasParent(i) ? t.parent(i) : null;
          d = i ? t.itemData(i) : null;
        }

        // by default we do not want to allow create menu
        return true;

      },
      refresh_mview: function(args) {
          var input = args || {};
          obj = this,
          t = pgBrowser.tree,
          i = input.item || t.selected(),
          d = i && i.length == 1 ? t.itemData(i) : undefined;

          if (!d)
            return false;

        // Make ajax call to refresh mview data
        $.ajax({
          url: obj.generate_url(i, 'refresh_data' , d, true),
          type: 'PUT',
          data: {'concurrent': args.concurrent},
          dataType: "json",
          success: function(res) {
            if (res.success == 1) {
              alertify.success('View refreshed successfully');
            }
            else {
              alertify.alert(
                'Error refreshing view',
                  res.data.result
              );
            }
          },
          error: function(e) {
            var errmsg = $.parseJSON(e.responseText);
            alertify.alert('Error refreshing view', errmsg.errormsg);
          }
        });

      }
  });
  }

  return pgBrowser.Nodes['coll-mview'];
});
