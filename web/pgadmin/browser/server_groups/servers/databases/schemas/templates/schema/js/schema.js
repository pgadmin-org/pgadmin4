define(
        ['jquery', 'underscore', 'underscore.string', 'pgadmin',
        'pgadmin.browser', 'backform', 'alertify',
        'pgadmin.browser.collection',
        'pgadmin.browser.server.privilege'],
function($, _, S, pgAdmin, pgBrowser, Backform, alertify) {
   // Extend the browser's collection class for SecurityLabel control
    var SecurityModel = Backform.SecurityModel = pgAdmin.Browser.Node.Model.extend({
    defaults: {
      provider: null,
      security_label: null
    },
    schema: [{
      id: 'provider', label: '{{ _('Provider') }}',
      type: 'text', disabled: false
    },{
      id: 'security_label', label: '{{ _('Security Label') }}',
      type: 'text', disabled: false
    }],
    validate: function() {
      var err = {},
          errmsg = null;

      if (_.isUndefined(this.get('security_label')) ||
        _.isNull(this.get('security_label')) ||
        String(this.get('security_label')).replace(/^\s+|\s+$/g, '') == '') {
            errmsg =  '{{ _('Please specify the value for all the security providers.')}}';
            this.errorModel.set('security_label', errmsg);
            return errmsg;
          } else {
            this.errorModel.unset('security_label');
          }
      return null;
    }
  });

  // Extend the browser's collection class for schema collection
  if (!pgBrowser.Nodes['coll-schema']) {
    var databases = pgAdmin.Browser.Nodes['coll-schema'] =
      pgAdmin.Browser.Collection.extend({
        node: 'schema',
        label: '{{ _('Schemas') }}',
        type: 'coll-schema',
        columns: ['name', 'oid', 'description']
      });
  };
  // Extend the browser's node class for schema node
  if (!pgBrowser.Nodes['schema']) {
    pgAdmin.Browser.Nodes['schema'] = pgAdmin.Browser.Node.extend({
      parent_type: 'database',
      type: 'schema',
      label: '{{ _('Schema') }}',
      hasSQL:  true,
      canDrop: true,
      canDropCascade: true,
      hasDepends: true,
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
            return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_schema_on_coll', node: 'coll-schema', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('Schema...') }}',
          icon: 'wcTabIcon icon-schema', data: {action: 'create'}
        },{
          name: 'create_schema', node: 'schema', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('Schema...') }}',
          icon: 'wcTabIcon icon-schema', data: {action: 'create'}
        },{
          name: 'create_schema', node: 'database', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('Schema...') }}',
          icon: 'wcTabIcon icon-schema', data: {action: 'create'}
        }
        ]);
      },
      model: pgAdmin.Browser.Node.Model.extend({
        defaults: {
          name: undefined,
          namespaceowner: undefined,
          description: undefined,
          is_system_obj: undefined,
        },
        initialize: function(attrs, args) {
          var isNew = (_.size(attrs) === 0);

          if (isNew) {
            var userInfo = pgBrowser.serverInfo[args.node_info.server._id].user;

            this.set({'namespaceowner': userInfo.name}, {silent: true});
          }
          pgAdmin.Browser.Node.Model.prototype.initialize.apply(this, arguments);
        },
        schema: [{
          id: 'name', label: '{{ _('Name') }}', cell: 'string',
          type: 'text'
        },{
          id: 'oid', label:'{{ _('Oid') }}', cell: 'string',
          type: 'text', disabled: true, mode: ['edit', 'properties']
        },{
          id: 'namespaceowner', label:'{{ _('Owner') }}', cell: 'string',
          type: 'text', control: 'node-list-by-name', node: 'role',
          select2: { allowClear: false }
        },{
          id: 'description', label:'{{ _('Comment') }}', cell: 'string',
          type: 'multiline'
        },{
          id: 'is_sys_object', label:'{{ _('System schema?') }}',
          cell: 'switch', type: 'switch', mode: ['properties'], disabled: true,
          options: {
            'onText': 'Yes', 'offText': 'No',
            'onColor': 'success', 'offColor': 'primary',
            'size': 'small'
          }
        },{
          id: 'acl', label: '{{ _('Privileges') }}', type: 'text',
          mode: ['properties'], disabled: true
        },{
          id: 'tblacl', label: '{{ _('Default TABLE Privileges') }}', type: 'text',
          mode: ['properties'], disabled: true
        },{
          id: 'seqacl', label: '{{ _('Default SEQUENCE Privileges') }}', type: 'text',
          mode: ['properties'], disabled: true
        },{
          id: 'funcacl', label: '{{ _('Default FUNCTION Privileges') }}',
          type: 'text', mode: ['properties'], disabled: true
        },{
          id: 'typeacl', label: '{{ _('Default TYPE Privileges') }}', type: 'text',
          mode: ['properties'], disabled: true, min_version: 90200,
          visible: function() {
            return this.version_compatible;
          }
        },{
          id: 'nspacl', label: '{{ _('Privileges') }}',
          model: pgAdmin.Browser.Node.PrivilegeRoleModel.extend(
          {privileges: ['C', 'U']}), uniqueCol : ['grantee', 'grantor'],
          editable: false, type: 'collection', group: '{{ _('Security') }}',
          mode: ['edit', 'create'],
          canAdd: true, canDelete: true, control: 'unique-col-collection',
        },{
          id: 'seclabels', label: '{{ _('Security Labels') }}',
          model: SecurityModel, editable: false, type: 'collection',
          group: '{{ _('Security') }}', mode: ['edit', 'create'],
          min_version: 90200, canAdd: true,
          canEdit: false, canDelete: true, control: 'unique-col-collection'
        },{
          type: 'nested', control: 'tab', group: '{{ _('Default Privileges') }}',
          mode: ['edit'],
          schema:[{
              id: 'deftblacl', model: pgAdmin.Browser.Node.PrivilegeRoleModel.extend(
              {privileges: ['a', 'r', 'w', 'd', 'D', 'x', 't']}),
              label: '{{ _('Default Privileges: Tables') }}',
              editable: false, type: 'collection', group: '{{ _('Tables') }}',
              mode: ['edit', 'create'], control: 'unique-col-collection',
              canAdd: true, canDelete: true, uniqueCol : ['grantee', 'grantor']
            },{
              id: 'defseqacl', model: pgAdmin.Browser.Node.PrivilegeRoleModel.extend(
              {privileges: ['r', 'w', 'U']}),
              label: '{{ _('Default Privileges: Sequences') }}',
              editable: false, type: 'collection', group: '{{ _('Sequences') }}',
              mode: ['edit', 'create'], control: 'unique-col-collection',
              canAdd: true, canDelete: true, uniqueCol : ['grantee', 'grantor']
            },{
              id: 'deffuncacl', model: pgAdmin.Browser.Node.PrivilegeRoleModel.extend(
              {privileges: ['X']}),
              label: '{{ _('Default Privileges: Functions') }}',
              editable: false, type: 'collection', group: '{{ _('Functions') }}',
              mode: ['edit', 'create'], control: 'unique-col-collection',
              canAdd: true, canDelete: true, uniqueCol : ['grantee', 'grantor']
            },{
              id: 'deftypeacl', model: pgAdmin.Browser.Node.PrivilegeRoleModel.extend(
              {privileges: ['U']}),
              label: '{{ _('Default Privileges: Types') }}',
              editable: false, type: 'collection', group: '{{ _('Types') }}',
              mode: ['edit', 'create'], control: 'unique-col-collection',
              canAdd: true, canDelete: true, uniqueCol : ['grantee', 'grantor'],
              min_version: 90200
            }]
         }
        ],
        validate: function() {
          var err = {},
              errmsg = null;
          // Validation of mandatory fields
          this.errorModel.clear();
          if (_.isUndefined(this.get('name')) ||
            _.isNull(this.get('name')) ||
            String(this.get('name')).replace(/^\s+|\s+$/g, '') == '') {
                errmsg = '{{ _('Name can not be empty.')}}';
                this.errorModel.set('name', errmsg);
                return errmsg;
          } else if (_.isUndefined(this.get('namespaceowner')) ||
            _.isNull(this.get('namespaceowner')) ||
            String(this.get('namespaceowner')).replace(/^\s+|\s+$/g, '') == '') {
                errmsg = '{{ _('Owner can not be empty.')}}';
                this.errorModel.set('namespaceowner', errmsg);
                return errmsg;
          }
          return null;
        }
      }),
      // This function will checks whether we can allow user to
      // drop object or not based on location within schema & catalog
      canChildDrop: function(itemData, item) {
        var t = pgBrowser.tree, i = item, d = itemData;
        // To iterate over tree to check parent node
        while (i) {
          // If it is schema then allow user to create collation
          if (_.indexOf(['schema'], d._type) > -1)
            return true;

            //Check if we are not child of catalog
            prev_i = t.hasParent(i) ? t.parent(i) : null;
            prev_d = prev_i ? t.itemData(prev_i) : null;
            if( prev_d._type == 'catalog') {
              return false;
            }
          i = t.hasParent(i) ? t.parent(i) : null;
          d = i ? t.itemData(i) : null;
        }
        // by default we do not want to allow create menu
        return true;
      }
  });

  }

  return pgBrowser.Nodes['schema'];
});
