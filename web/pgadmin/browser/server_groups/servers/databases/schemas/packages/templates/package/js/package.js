define(
        ['jquery', 'underscore', 'underscore.string', 'pgadmin', 'pgadmin.browser', 'alertify', 'pgadmin.browser.collection'],
function($, _, S, pgAdmin, pgBrowser, alertify) {

  // Extend the browser's collection class for package collection
  if (!pgBrowser.Nodes['coll-package']) {
    var databases = pgBrowser.Nodes['coll-package'] =
      pgBrowser.Collection.extend({
        node: 'package',
        label: '{{ _('Packages') }}',
        type: 'coll-package',
        columns: ['name' ,'owner', 'description']
      });
  };

  // Extend the browser's node class for package node
  if (!pgBrowser.Nodes['package']) {
    pgBrowser.Nodes['package'] = pgBrowser.Node.extend({
      type: 'package',
      dialogHelp: '{{ url_for('help.static', filename='package_dialog.html') }}',
      label: '{{ _('Package') }}',
      collection_type: 'coll-package',
      hasSQL: true,
      hasDepends: true,
      parent_type: ['schema', 'catalog'],
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
            return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_package_on_coll', node: 'coll-package', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('Package...') }}',
          icon: 'wcTabIcon icon-package', data: {action: 'create', check: true},
          enable: 'canCreate'
        },{
          name: 'create_package', node: 'package', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('Package...') }}',
          icon: 'wcTabIcon icon-package', data: {action: 'create', check: true},
          enable: 'canCreate'
        },{
          name: 'create_package', node: 'schema', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('Package...') }}',
          icon: 'wcTabIcon icon-package', data: {action: 'create', check: true},
          enable: 'canCreate'
        }
        ]);

      },
      canDrop: pgBrowser.Nodes['schema'].canChildDrop,
      canDropCascade: pgBrowser.Nodes['schema'].canChildDrop,
      canCreate: function(itemData, item, data) {
          //If check is false then , we will allow create menu
          if (data && data.check == false)
            return true;

          var treeData = this.getTreeNodeHierarchy(item),
                server = treeData['server'];

          if (server && server.server_type === 'pg')
            return false;

          // If it is catalog then don't allow user to create package
          if (treeData['catalog'] != undefined)
            return false;

          // by default we want to allow create menu
          return true;
      },
      // Define the model for package node.
      model: pgBrowser.Node.Model.extend({
        defaults: {
          name: undefined,
          oid: undefined,
          owner: undefined,
          is_sys_object: undefined,
          description: undefined,
          pkgheadsrc: undefined,
          pkgbodysrc: undefined,
          acl: undefined,
          pkgacl: []
        },
        initialize: function(attrs, args) {
          if (_.size(attrs) === 0) {
            var userInfo = pgBrowser.serverInfo[args.node_info.server._id].user;
            var schemaInfo = args.node_info.schema;

            this.set({
              'owner': userInfo.name, 'schema': schemaInfo._label
            }, {silent: true});
          }
          pgAdmin.Browser.Node.Model.prototype.initialize.apply(this, arguments);
        },
        // Define the schema for package node.
        schema: [{
          id: 'name', label: '{{ _('Name') }}', cell: 'string',
          type: 'text', mode: ['properties', 'create', 'edit'],
          disabled: function(m) {
            return !m.isNew();
          }
        },{
          id: 'oid', label:'{{ _('OID') }}', cell: 'string',
          type: 'text', mode: ['properties']
        },{
          id: 'owner', label:'{{ _('Owner') }}', cell: 'string',
          type: 'text', mode: ['properties', 'create', 'edit'],
          disabled: true, editable: false, visible: function(m) {
            return !m.isNew();
          }
        },{
          id: 'schema', label:'{{_('Schema')}}', type: 'text', node: 'schema',
          control: 'node-list-by-name',
          disabled: function(m) { return !m.isNew(); }, filter: function(d) {
            // If schema name start with pg_* then we need to exclude them
            if(d && d.label.match(/^pg_/))
            {
              return false;
            }
            return true;
          }, cache_node: 'database', cache_level: 'database'
        },{
          id: 'is_sys_object', label: '{{ _('System package?') }}',
           cell:'boolean', type: 'switch',mode: ['properties']
        },{
          id: 'description', label:'{{ _('Comment') }}', type: 'multiline',
          mode: ['properties', 'create', 'edit']
        },{
          id: 'pkgheadsrc', label: '{{ _('Header') }}', cell: 'string',
          type: 'text', mode: ['properties', 'create', 'edit'], group: '{{ _('Code') }}',
          control: Backform.SqlFieldControl
        },{
          id: 'pkgbodysrc', label: '{{ _('Body') }}', cell: 'string',
          type: 'text', mode: ['properties', 'create', 'edit'], group: '{{ _('Code') }}',
          control: Backform.SqlFieldControl
        },{
          id: 'acl', label: '{{ _('Privileges') }}', type: 'text',
          group: '{{ _('Security') }}', mode: ['properties',]
        },{
          id: 'pkgacl', label: '{{ _('Privileges') }}', type: 'collection',
          model: pgBrowser.Node.PrivilegeRoleModel.extend({
            privileges: ['X']
          }), uniqueCol : ['grantee', 'grantor'], editable: false,
          group: '{{ _('Security') }}', mode: ['edit', 'create'],
          canAdd: true, canDelete: true, control: 'unique-col-collection',
        }],
        /* validate function is used to validate the input given by
         * the user. In case of error, message will be displayed on
         * the GUI for the respective control.
         */
        validate: function() {
          var msg = undefined;
          // Clear any existing error msg.
          this.errorModel.clear();

          if (_.isUndefined(this.get('name'))
              || String(this.get('name')).replace(/^\s+|\s+$/g, '') == '') {
            msg = '{{ _('Name cannot be empty.') }}';
            this.errorModel.set('name', msg);
            return msg;
          }

          if (_.isUndefined(this.get('pkgheadsrc'))
              || String(this.get('pkgheadsrc')).replace(/^\s+|\s+$/g, '') == '') {
            msg = '{{ _('Header cannot be empty.') }}';
            this.errorModel.set('pkgheadsrc', msg);
            return msg;
          }

          return null;
        }
      })
    });
  }

  return pgBrowser.Nodes['package'];
});
