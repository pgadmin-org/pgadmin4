define(
  ['jquery', 'underscore', 'underscore.string', 'pgadmin',
    'pgadmin.browser', 'codemirror', 'pgadmin.browser.server.privilege', 'pgadmin.node.rule'],

function($, _, S, pgAdmin, pgBrowser, CodeMirror) {

  /**
    Create and add a view collection into nodes
    @param {variable} label - Label for Node
    @param {variable} type - Type of Node
    @param {variable} columns - List of columns to
      display under under properties.
   */
  if (!pgBrowser.Nodes['coll-view']) {
    var views= pgBrowser.Nodes['coll-view'] =
      pgBrowser.Collection.extend({
        node: 'view',
        label: '{{ _("Views") }}',
        type: 'coll-view',
        columns: ["name", "owner"]
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
  if (!pgBrowser.Nodes['view']) {
    pgBrowser.Nodes['view'] = pgBrowser.Node.extend({
      parent_type: ['schema', 'catalog'],
      type: 'view',
      sqlAlterHelp: 'sql-alterview.html',
      sqlCreateHelp: 'sql-createview.html',
      dialogHelp: '{{ url_for('help.static', filename='view_dialog.html') }}',
      label: '{{ _("View") }}',
      hasSQL:  true,
      hasDepends: true,
      hasScriptTypes: ['create', 'select', 'insert'],
      collection_type: 'coll-view',
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
          coll-view, view and schema.
          @property {data} - Allow create view option on schema node or
          system view nodes.
         */
        pgBrowser.add_menus([{
          name: 'create_view_on_coll', node: 'coll-view', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 1, label: '{{ _("View...") }}',
          icon: 'wcTabIcon icon-view', data: {action: 'create', check: true},
          enable: 'canCreate'
        },{
          name: 'create_view', node: 'view', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 1, label: '{{ _("View...") }}',
          icon: 'wcTabIcon icon-view', data: {action: 'create', check: true},
          enable: 'canCreate'
        },{
          name: 'create_view', node: 'schema', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 17, label: '{{ _("View...") }}',
          icon: 'wcTabIcon icon-view', data: {action: 'create', check: false},
          enable: 'canCreate'
        }
        ]);
      },

      /**
        Define model for the view node and specify the
        properties of the model in schema.
       */
      model: pgBrowser.Node.Model.extend({
        initialize: function(attrs, args) {
          if (_.size(attrs) === 0) {
            // Set Selected Schema and, Current User
            var schemaLabel = args.node_info.schema._label || 'public',
                userInfo = pgBrowser.serverInfo[args.node_info.server._id].user;
            this.set({
              'schema': schemaLabel, 'owner': userInfo.name
            }, {silent: true});
          }
          pgBrowser.Node.Model.prototype.initialize.apply(this, arguments);
        },
        schema: [{
          id: 'name', label: '{{ _("Name") }}', cell: 'string',
          type: 'text', disabled: 'notInSchema'
        },{
          id: 'oid', label:'{{ _("OID") }}', cell: 'string',
          type: 'text', disabled: true, mode: ['properties']
        },{
          id: 'owner', label:'{{ _("Owner") }}', cell: 'string', control: 'node-list-by-name',
          node: 'role', disabled: 'notInSchema', select2: { allowClear: false }
        },{
          id: 'schema', label:'{{ _("Schema") }}', cell: 'string', first_empty: false,
          control: 'node-list-by-name', type: 'text', cache_level: 'database',
          node: 'schema', disabled: 'notInSchema', mode: ['create', 'edit'],
          select2: { allowClear: false }, cache_node: 'database',
          cache_level: 'database'
        },{
          id: 'system_view', label:'{{ _("System view?") }}', cell: 'string',
          type: 'switch', disabled: true, mode: ['properties']
        },{
          id: 'acl', label: '{{ _("Privileges") }}',
          mode: ['properties'], type: 'text', group: '{{ _("Security") }}'
        },{
          id: 'comment', label:'{{ _("Comment") }}', cell: 'string',
          type: 'multiline', disabled: 'notInSchema'
        },{
          id: 'security_barrier', label:'{{ _("Security barrier") }}',
          type: 'switch', min_version: '90200', group: 'Definition',
          disabled: 'notInSchema'
        },{
          id: 'check_option', label:'{{ _("Check options") }}',
          control: 'select2', group: 'Definition', type: 'text',
          min_version: '90400', mode:['properties', 'create', 'edit'],
          select2: {
            // Set select2 option width to 100%
            allowClear: false,
          }, disabled: 'notInSchema',
          options:[{
            label: "{{ _('No') }}", value: "no"
          },{
            label: "{{ _('Local') }}", value: "local"
          },{
            label: "{{ _('Cascaded') }}", value: "cascaded"
          }]
        },{
          id: 'definition', label:'{{ _("Definition") }}', cell: 'string',
          type: 'text', mode: ['create', 'edit'], group: 'Definition',
          control: Backform.SqlFieldControl,
          disabled: 'notInSchema'
        }, pgBrowser.SecurityGroupUnderSchema, {
          // Add Privilege Control
          id: 'datacl', label: '{{ _("Privileges") }}', type: 'collection',
          model: pgBrowser.Node.PrivilegeRoleModel.extend({
            privileges: ['a', 'r', 'w', 'd', 'D', 'x', 't']
          }), uniqueCol : ['grantee'], editable: false, group: 'security',
          mode: ['edit', 'create'], canAdd: true, canDelete: true,
          control: 'unique-col-collection', disabled: 'notInSchema'
        },{
          // Add Security Labels Control
          id: 'seclabels', label: '{{ _("Security labels") }}',
          model: pgBrowser.SecLabelModel, editable: false, type: 'collection',
          canEdit: false, group: 'security', canDelete: true,
          mode: ['edit', 'create'], canAdd: true, disabled: 'notInSchema',
          control: 'unique-col-collection', uniqueCol : ['provider']
        }],
        validate: function() {
          // Triggers specific error messages for fields
          var err = {},
            errmsg,
            field_name = this.get('name'),
            field_def = this.get('definition');
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
            err['definition'] = '{{ _("Please enter view definition.") }}';
            errmsg = errmsg || err['definition'];
            this.errorModel.set('definition', errmsg);
            return errmsg;
          }else{
            this.errorModel.unset('definition');
          }
          return null;
        },
        // We will disable everything if we are under catalog node
        notInSchema: function() {
          if(this.node_info && 'catalog' in this.node_info) {
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
        if (data && data.check == false)
          return true;

        var t = pgBrowser.tree, i = item, d = itemData;

        // To iterate over tree to check parent node
        while (i) {

          // If it is schema then allow user to create view
          if (_.indexOf(['schema'], d._type) > -1)
            return true;

          if ('coll-view' == d._type) {

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

      }
  });
  }

  return pgBrowser.Nodes['view'];
});
