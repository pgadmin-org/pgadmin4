define('pgadmin.node.mview', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore',
  'sources/pgadmin', 'pgadmin.alertifyjs', 'pgadmin.browser',
  'pgadmin.backform', 'pgadmin.node.schema.dir/child',
  'pgadmin.browser.server.privilege',
], function(
  gettext, url_for, $, _, pgAdmin, Alertify, pgBrowser, Backform,
  schemaChild
) {

  /**
    Create and add a view collection into nodes
    @param {variable} label - Label for Node
    @param {variable} type - Type of Node
    @param {variable} columns - List of columns to
      display under under properties.
   */
  if (!pgBrowser.Nodes['coll-mview']) {
    pgBrowser.Nodes['coll-mview'] =
      pgBrowser.Collection.extend({
        node: 'mview',
        label: gettext('Materialized Views'),
        type: 'coll-mview',
        columns: ['name', 'owner'],
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
    pgBrowser.Nodes['mview'] = schemaChild.SchemaChildNode.extend({
      type: 'mview',
      sqlAlterHelp: 'sql-altermaterializedview.html',
      sqlCreateHelp: 'sql-creatematerializedview.html',
      dialogHelp: url_for('help.static', {'filename': 'materialized_view_dialog.html'}),
      label: gettext('Materialized View'),
      hasSQL: true,
      hasDepends: true,
      hasScriptTypes: ['create', 'select'],
      collection_type: 'coll-mview',
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
        pgAdmin.Browser.add_menu_category(
          'refresh_mview', gettext('Refresh View'), 18, 'fa fa-recycle');
        pgBrowser.add_menus([{
          name: 'create_mview_on_coll', node: 'coll-mview', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 1, icon: 'wcTabIcon icon-mview',
          data: {action: 'create', check: true}, enable: 'canCreate',
          label: gettext('Materialized View...'),
        },{
          name: 'create_mview', node: 'mview', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 1, icon: 'wcTabIcon icon-mview',
          data: {action: 'create', check: true}, enable: 'canCreate',
          label: gettext('Materialized View...'),
        },{
          name: 'create_mview', node: 'schema', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 18, icon: 'wcTabIcon icon-mview',
          data: {action: 'create', check: false}, enable: 'canCreate',
          label: gettext('Materialized View...'),
        },{
          name: 'refresh_mview_data', node: 'mview', module: this,
          priority: 1, callback: 'refresh_mview', category: 'refresh_mview',
          applies: ['object', 'context'], label: gettext('With data'),
          data: {concurrent: false, with_data: true}, icon: 'fa fa-recycle',
        },{
          name: 'refresh_mview_nodata', node: 'mview',
          callback: 'refresh_mview', priority: 2, module: this,
          category: 'refresh_mview', applies: ['object', 'context'],
          label: gettext('With no data'), data: {
            concurrent: false, with_data: false,
          }, icon: 'fa fa-refresh',
        },{
          name: 'refresh_mview_concurrent', node: 'mview', module: this,
          category: 'refresh_mview', enable: 'is_version_supported',
          data: {concurrent: true, with_data: true}, priority: 3,
          applies: ['object', 'context'], callback: 'refresh_mview',
          label: gettext('With data (concurrently)'), icon: 'fa fa-recycle',
        },{
          name: 'refresh_mview_concurrent_nodata', node: 'mview', module: this,
          category: 'refresh_mview', enable: 'is_version_supported',
          data: {concurrent: true, with_data: false}, priority: 4,
          applies: ['object', 'context'], callback: 'refresh_mview',
          label: gettext('With no data (concurrently)'),
          icon: 'fa fa-refresh',
        }]);
      },

      /**
        Define model for the view node and specify the
        properties of the model in schema.
       */
      model: pgBrowser.Node.Model.extend({
        initialize: function(attrs, args) {
          if (_.size(attrs) === 0) {
            // Set Selected Schema and Current User
            var userInfo = pgBrowser.serverInfo[args.node_info.server._id].user;
            this.set({
              'schema': 'public', 'owner': userInfo.name,
            }, {silent: true});
          }
          pgBrowser.Node.Model.prototype.initialize.apply(this, arguments);
        },
        defaults: {
          spcname: undefined,
          toast_autovacuum_enabled: false,
          autovacuum_enabled: false,
        },
        schema: [{
          id: 'name', label: gettext('Name'), cell: 'string',
          type: 'text', disabled: 'inSchema',
        },{
          id: 'oid', label: gettext('OID'), cell: 'string',
          type: 'text', disabled: true, mode: ['properties'],
        },{
          id: 'owner', label: gettext('Owner'), cell: 'string',
          control: 'node-list-by-name', select2: { allowClear: false },
          node: 'role', disabled: 'inSchema',
        },{
          id: 'schema', label: gettext('Schema'), cell: 'string', first_empty: false,
          control: 'node-list-by-name', type: 'text', cache_level: 'database',
          node: 'schema', mode: ['create', 'edit'], cache_node: 'database',
          disabled: 'inSchema', select2: { allowClear: false },
        },{
          id: 'system_view', label: gettext('System view?'), cell: 'string',
          type: 'switch', disabled: true, mode: ['properties'],
        }, pgBrowser.SecurityGroupSchema, {
          id: 'acl', label: gettext('Privileges'),
          mode: ['properties'], type: 'text', group: gettext('Security'),
        },{
          id: 'comment', label: gettext('Comment'), cell: 'string',
          type: 'multiline',
        },{
          id: 'definition', label:'', cell: 'string',
          type: 'text', mode: ['create', 'edit'], group: gettext('Definition'),
          control: Backform.SqlFieldControl, extraClasses:['sql_field_width_full'],
        },{
          id: 'with_data', label: gettext('With Data'),
          group: gettext('Storage'), mode: ['edit', 'create'],
          type: 'switch',
        },{
          id: 'spcname', label: gettext('Tablespace'), cell: 'string',
          type: 'text', group: gettext('Storage'), first_empty: false,
          control: 'node-list-by-name', node: 'tablespace', select2: { allowClear: false },
          filter: function(m) {
            if (m.label == 'pg_global') return false;
            else return true;
          },
        },{
          id: 'fillfactor', label: gettext('Fill Factor'),
          group: gettext('Storage'), mode: ['edit', 'create'],
          type: 'int',
        },{
          type: 'nested', control: 'tab', id: 'materialization',
          label: gettext('Parameter'), mode: ['edit', 'create'],
          group: gettext('Parameter'),
          schema: Backform.VacuumSettingsSchema,
        },{
          // Add Privilege Control
          id: 'datacl', label: gettext('Privileges'), type: 'collection',
          model: pgBrowser.Node.PrivilegeRoleModel.extend({
            privileges: ['a', 'r', 'w', 'd', 'D', 'x', 't'],
          }), uniqueCol : ['grantee'], editable: false,
          group: 'security', canAdd: true, canDelete: true,
          mode: ['edit', 'create'], control: 'unique-col-collection',
        },{
        // Add Security Labels Control
          id: 'seclabels', label: gettext('Security Labels'),
          model: pgBrowser.SecLabelModel, editable: false, type: 'collection',
          canEdit: false, group: 'security', canDelete: true,
          mode: ['edit', 'create'], canAdd: true,
          control: 'unique-col-collection', uniqueCol : ['provider'],
        }],
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
            err['name'] = gettext('Please specify name.');
            errmsg = errmsg || err['name'];
            this.errorModel.set('name', errmsg);
            return errmsg;
          }else{
            this.errorModel.unset('name');
          }
          if (_.isUndefined(field_def) || _.isNull(field_def) ||
            String(field_def).replace(/^\s+|\s+$/g, '') == '') {
            err['definition'] = gettext('Please enter view definition.');
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
        },

      }),

      refresh_mview: function(args) {
        var input = args || {},
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
          data: {'concurrent': args.concurrent, 'with_data': args.with_data},
          dataType: 'json',
        })
        .done(function(res) {
          if (res.success == 1) {
            Alertify.success(gettext('View refreshed successfully'));
          }
          else {
            Alertify.alert(
              gettext('Error refreshing view'),
                res.data.result
            );
          }
        })
        .fail(function(xhr, status, error) {
          Alertify.pgRespErrorNotify(xhr, error, gettext('Error refreshing view'));
        });

      },
      is_version_supported: function(data, item) {
        var t = pgAdmin.Browser.tree,
          i = item || t.selected(),
          d = data || (i && i.length == 1 ? t.itemData(i): undefined),
          node = this || (d && pgAdmin.Browser.Nodes[d._type]),
          info = node.getTreeNodeHierarchy.apply(node, [i]),
          version = info.server.version;

        // disable refresh concurrently if server version is 9.3
        return (version >= 90400);
      },
    });
  }

  return pgBrowser.Nodes['mview'];
});
