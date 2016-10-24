define(
        ['jquery', 'underscore', 'underscore.string', 'pgadmin', 'pgadmin.browser', 'alertify', 'pgadmin.browser.collection'],
function($, _, S, pgAdmin, pgBrowser, alertify) {

  // Extend the browser's collection class for sequence collection
  if (!pgBrowser.Nodes['coll-sequence']) {
    var databases = pgBrowser.Nodes['coll-sequence'] =
      pgBrowser.Collection.extend({
        node: 'sequence',
        label: '{{ _('Sequences') }}',
        type: 'coll-sequence',
        columns: ['name', 'seqowner', 'comment'],
        hasStatistics: true
      });
  };

  // Extend the browser's node class for sequence node
  if (!pgBrowser.Nodes['sequence']) {
    pgBrowser.Nodes['sequence'] = pgBrowser.Node.extend({
      type: 'sequence',
      sqlAlterHelp: 'sql-altersequence.html',
      sqlCreateHelp: 'sql-createsequence.html',
      dialogHelp: '{{ url_for('help.static', filename='sequence_dialog.html') }}',
      label: '{{ _('Sequence') }}',
      collection_type: 'coll-sequence',
      hasSQL: true,
      hasDepends: true,
      hasStatistics: true,
      parent_type: ['schema', 'catalog'],
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
      model: pgBrowser.Node.Model.extend({
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
            this.set({'schema': schemaInfo._label}, {silent: true});
          }
          pgBrowser.Node.Model.prototype.initialize.apply(this, arguments);
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
          }, cache_node: 'database', cache_level: 'database'
        },{
          id: 'comment', label:'{{ _('Comment') }}', type: 'multiline',
          mode: ['properties', 'create', 'edit']
        },{
          id: 'current_value', label: '{{ _('Current value') }}', type: 'int',
          mode: ['properties', 'edit'], group: '{{ _('Definition') }}'
        },{
          id: 'increment', label: '{{ _('Increment') }}', type: 'int',
          mode: ['properties', 'create', 'edit'], group: '{{ _('Definition') }}',
          min: 1
        },{
          id: 'start', label: '{{ _('Start') }}', type: 'int',
          mode: ['properties', 'create'], group: '{{ _('Definition') }}'
        },{
          id: 'minimum', label: '{{ _('Minimum') }}', type: 'int',
          mode: ['properties', 'create', 'edit'], group: '{{ _('Definition') }}'
        },{
          id: 'maximum', label: '{{ _('Maximum') }}', type: 'int',
          mode: ['properties', 'create', 'edit'], group: '{{ _('Definition') }}'
        },{
          id: 'cache', label: '{{ _('Cache') }}', type: 'int',
          mode: ['properties', 'create', 'edit'], group: '{{ _('Definition') }}',
          min: 1
        },{
          id: 'cycled', label: '{{ _('Cycled') }}', type: 'switch',
          mode: ['properties', 'create', 'edit'], group: '{{ _('Definition') }}',
          options: {
            'onText': 'Yes', 'offText': 'No',
            'onColor': 'success', 'offColor': 'primary',
            'size': 'small'
          }
        }, pgBrowser.SecurityGroupUnderSchema,{
          id: 'acl', label: '{{ _('Privileges') }}', type: 'text',
          group: '{{ _("Security") }}', mode: ['properties'], disabled: true
        },{
          id: 'relacl', label: '{{ _('Privileges') }}', group: 'security',
          model: pgBrowser.Node.PrivilegeRoleModel.extend({
            privileges: ['r', 'w', 'U']
          }), uniqueCol : ['grantee', 'grantor'], mode: ['edit', 'create'],
          editable: false, type: 'collection', canAdd: true, canDelete: true,
          control: 'unique-col-collection',
        },{
          id: 'securities', label: '{{ _('Securitiy Labels') }}', canAdd: true,
          model: pgBrowser.SecLabelModel, editable: false,
          type: 'collection', canEdit: false, group: 'security',
          mode: ['edit', 'create'], canDelete: true,
          control: 'unique-col-collection',
          min_version: 90200, uniqueCol : ['provider']
        }],
        /* validate function is used to validate the input given by
         * the user. In case of error, message will be displayed on
         * the GUI for the respective control.
         */
        validate: function() {
          var msg = undefined,
              minimum = this.get('minimum'),
              maximum = this.get('maximum');
              start = this.get('start');
          // Clear any existing error msg.
          this.errorModel.clear();

          if (_.isUndefined(this.get('name'))
              || String(this.get('name')).replace(/^\s+|\s+$/g, '') == '') {
            msg = '{{ _('Name cannot be empty.') }}';
            this.errorModel.set('name', msg);
            return msg;
          }

          if (_.isUndefined(this.get('seqowner'))
              || String(this.get('seqowner')).replace(/^\s+|\s+$/g, '') == '') {
            msg = '{{ _('Owner can not be empty.') }}';
            this.errorModel.set('seqowner', msg);
            return msg;
          }

          if (_.isUndefined(this.get('schema'))
              || String(this.get('schema')).replace(/^\s+|\s+$/g, '') == '') {
            msg = '{{ _('Schema cannot be empty.') }}';
            this.errorModel.set('schema', msg);
            return msg;
          }

          var min_lt = '{{ _('Minimum value must be less than maximum value.') }}',
              start_lt = '{{ _('Start value cannot be less than minimum value.') }}',
              start_gt = '{{ _('Start value cannot be greater than maximum value.') }}';
          if ((minimum == 0 && maximum == 0) ||
              (parseInt(minimum, 10) >= parseInt(maximum, 10))) {
            msg = min_lt
            this.errorModel.set('minimum', msg);
            return msg;
          }
          else if (start < minimum) {
            msg = start_lt
            this.errorModel.set('start', msg);
            return msg;
          }
          else if (start > maximum) {
            msg = start_gt
            this.errorModel.set('start', msg);
            return msg;
          }
          return null;
        }
      })
    });
  }

  return pgBrowser.Nodes['sequence'];
});
