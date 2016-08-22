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
        columns: ['name', ,'owner', 'description']
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
      parent_type: ['schema'],
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
          icon: 'wcTabIcon icon-package', data: {action: 'create', check: false},
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

          var t = pgBrowser.tree, i = item, d = itemData;
          // To iterate over tree to check parent node
          while (i) {
            // If it is schema then allow user to create collation
            if (_.indexOf(['schema'], d._type) > -1)
              return true;

            if ('coll-package' == d._type) {
              //Check if we are not child of catalog
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
