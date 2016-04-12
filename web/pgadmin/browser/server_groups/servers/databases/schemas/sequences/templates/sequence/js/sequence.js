define(
        ['jquery', 'underscore', 'underscore.string', 'pgadmin', 'pgadmin.browser', 'alertify', 'pgadmin.browser.collection'],
function($, _, S, pgAdmin, pgBrowser, alertify) {

  // Extend the browser's node model class to create a security model
  var SecurityModel = pgAdmin.Browser.Node.Model.extend({
    defaults: {
      provider: undefined,
      securitylabel: undefined
    },
    // Define the schema for the Security Label
    schema: [{
      id: 'provider', label: '{{ _('Provider') }}',
      type: 'text', editable: true,
      cellHeaderClasses:'width_percent_50'
    },{
      id: 'security_label', label: '{{ _('Security Label') }}',
      type: 'text', editable: true,
      cellHeaderClasses:'width_percent_50'
    }],
    /* validate function is used to validate the input given by
     * the user. In case of error, message will be displayed on
     * the GUI for the respective control.
     */
    validate: function() {
      var err = {},
          errmsg = null,
          data = this.toJSON();

      if (_.isUndefined(data.label) ||
        _.isNull(data.label) ||
        String(data.label).replace(/^\s+|\s+$/g, '') == '') {
        return _("Please specify the value for all the security providers.");
      }
      return null;
    }
  });

  // Extend the browser's collection class for sequence collection
  if (!pgBrowser.Nodes['coll-sequence']) {
    var databases = pgAdmin.Browser.Nodes['coll-sequence'] =
      pgAdmin.Browser.Collection.extend({
        node: 'sequence',
        label: '{{ _('Sequences') }}',
        type: 'coll-sequence',
        columns: ['name', 'seqowner', 'comment']
      });
  };

  // Extend the browser's node class for sequence node
  if (!pgBrowser.Nodes['sequence']) {
    pgAdmin.Browser.Nodes['sequence'] = pgBrowser.Node.extend({
      type: 'sequence',
      sqlAlterHelp: 'sql-altersequence.html',
      sqlCreateHelp: 'sql-createsequence.html',
      label: '{{ _('Sequence') }}',
      collection_type: 'coll-sequence',
      hasSQL: true,
      hasDepends: true,
      parent_type: ['schema'],
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
            return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_sequence_on_coll', node: 'coll-sequence', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('Sequence...') }}',
          icon: 'wcTabIcon icon-sequence', data: {action: 'create', check: true},
          enable: 'canCreate'
        },{
          name: 'create_sequence', node: 'sequence', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('Sequence...') }}',
          icon: 'wcTabIcon icon-sequence', data: {action: 'create', check: true},
          enable: 'canCreate'
        },{
          name: 'create_sequence', node: 'schema', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('Sequence...') }}',
          icon: 'wcTabIcon icon-sequence', data: {action: 'create', check: false},
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

            if ('coll-sequence' == d._type) {
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
      // Define the model for sequence node.
      model: pgAdmin.Browser.Node.Model.extend({
        defaults: {
          name: undefined,
          oid: undefined,
          seqowner: undefined,
          schema: undefined,
          comment: undefined,
          increment: undefined,
          start: undefined,
          current_value: undefined,
          minimum: undefined,
          maximum: undefined,
          cache: undefined,
          cycled: undefined,
          relacl: [],
          securities: []
        },
        
        // Default values!
        initialize: function(attrs, args) {
          var isNew = (_.size(attrs) === 0);

          if (isNew) {
            var userInfo = pgBrowser.serverInfo[args.node_info.server._id].user;
            var schemaInfo = args.node_info.schema;

            this.set({'seqowner': userInfo.name}, {silent: true});
            this.set({'schema': schemaInfo.label}, {silent: true});
          }
          pgAdmin.Browser.Node.Model.prototype.initialize.apply(this, arguments);
        },
        
        // Define the schema for sequence node.
        schema: [{
          id: 'name', label: '{{ _('Name') }}', cell: 'string',
          type: 'text', mode: ['properties', 'create', 'edit']
        },{
          id: 'oid', label:'{{ _('OID') }}', cell: 'string',
          type: 'text', mode: ['properties']
        },{
          id: 'seqowner', label:'{{ _('Owner') }}', cell: 'string',
          type: 'text', mode: ['properties', 'create', 'edit'], node: 'role',
          control: Backform.NodeListByNameControl
        },{
          id: 'schema', label:'{{ _('Schema') }}', cell: 'string',
          control: 'node-list-by-name', node: 'schema',
          type: 'text', mode: ['create', 'edit'], filter: function(d) {
            // If schema name start with pg_* then we need to exclude them
            if(d && d.label.match(/^pg_/))
            {
              return false;
            }
            return true;
            }
        },{
          id: 'comment', label:'{{ _('Comment') }}', type: 'multiline',
          mode: ['properties', 'create', 'edit']
        },{
          id: 'increment', label: '{{ _('Increment') }}', type: 'int',
          mode: ['properties', 'create', 'edit'], group: '{{ _('Definition') }}'
        },{
          id: 'start', label: '{{ _('Start') }}', type: 'int',
          mode: ['create'], group: '{{ _('Definition') }}'
        },{
          id: 'current_value', label: '{{ _('Current value') }}', type: 'int',
          mode: ['properties', 'edit'], group: '{{ _('Definition') }}'
        },{
          id: 'minimum', label: '{{ _('Minimum') }}', type: 'int',
          mode: ['properties', 'create', 'edit'], group: '{{ _('Definition') }}'
        },{
          id: 'maximum', label: '{{ _('Maximum') }}', type: 'int',
          mode: ['properties', 'create', 'edit'], group: '{{ _('Definition') }}'
        },{
          id: 'cache', label: '{{ _('Cache') }}', type: 'int',
          mode: ['properties', 'create', 'edit'], group: '{{ _('Definition') }}'
        },{
          id: 'cycled', label: '{{ _('Cycled') }}', type: 'switch',
          mode: ['properties', 'create', 'edit'], group: '{{ _('Definition') }}',
          options: {
            'onText': 'Yes', 'offText': 'No',
            'onColor': 'success', 'offColor': 'primary',
            'size': 'small'
          }
        },{
          id: 'acl', label: '{{ _('Privileges') }}', type: 'text',
          group: '{{ _('Security') }}', mode: ['properties'], disabled: true
        },{
          id: 'relacl', label: '{{ _('Privileges') }}', model: pgAdmin.Browser.Node.PrivilegeRoleModel.extend(
            {privileges: ['r', 'w', 'U']}), uniqueCol : ['grantee', 'grantor'],
          editable: false, type: 'collection', group: '{{ _('Security') }}', mode: ['edit', 'create'],
          canAdd: true, canDelete: true, control: 'unique-col-collection',
        },{
          id: 'securities', label: '{{ _('Securitiy Labels') }}', model: SecurityModel,
          editable: false, type: 'collection', canEdit: false,
          group: '{{ _('Security') }}', canDelete: true,
          mode: ['edit', 'create'], canAdd: true,
          control: 'unique-col-collection', uniqueCol : ['provider'],
          min_version: 90200
        }],
        /* validate function is used to validate the input given by
         * the user. In case of error, message will be displayed on
         * the GUI for the respective control.
         */
        validate: function() {
          var msg = undefined;
          // Clear any existing error msg.
          this.errorModel.unset('name');
          this.errorModel.unset('seqowner');
          this.errorModel.unset('schema');

          if (_.isUndefined(this.get('name'))
              || String(this.get('name')).replace(/^\s+|\s+$/g, '') == '') {
            msg = '{{ _('Sequence name can not be empty!') }}';
            this.errorModel.set('name', msg);
            return msg;
          }

          if (_.isUndefined(this.get('seqowner'))
              || String(this.get('seqowner')).replace(/^\s+|\s+$/g, '') == '') {
            msg = '{{ _('Sequence owner can not be empty!') }}';
            this.errorModel.set('seqowner', msg);
            return msg;
          }

          if (_.isUndefined(this.get('schema'))
              || String(this.get('schema')).replace(/^\s+|\s+$/g, '') == '') {
            msg = '{{ _('Sequence schema can not be empty!') }}';
            this.errorModel.set('schema', msg);
            return msg;
          }
          return null;
        }
      })
    });
  }

  return pgBrowser.Nodes['sequence'];
});
