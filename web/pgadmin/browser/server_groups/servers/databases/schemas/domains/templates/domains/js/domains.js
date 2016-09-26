// Domain Module: Collection and Node.
define(
        ['jquery', 'underscore', 'underscore.string', 'pgadmin',
         'pgadmin.browser', 'alertify', 'pgadmin.browser.collection'],
function($, _, S, pgAdmin, pgBrowser, alertify) {

  // Define Domain Collection Node
  if (!pgBrowser.Nodes['coll-domain']) {
    var domains = pgBrowser.Nodes['coll-domain'] =
      pgBrowser.Collection.extend({
        node: 'domain',
        label: '{{ _('Domains') }}',
        type: 'coll-domain',
        columns: ['name', 'owner', 'description']
      });
  };

  // Constraint Model
  var ConstraintModel = pgBrowser.Node.Model.extend({
    idAttribute: 'conoid',
    initialize: function(attrs, args) {
      if (_.size(attrs) === 0) {
        var userInfo = pgBrowser.serverInfo[
              args.node_info.server._id
            ].user,
            schemaInfo = args.node_info.schema;
        this.set({
          'owner': userInfo.name, 'schema': schemaInfo._label
        }, {silent: true});
      } else {
        this.convalidated_default = this.get('convalidated')
      }
      pgBrowser.Node.Model.prototype.initialize.apply(this, arguments);
    },
    defaults: {
      conoid: undefined,
      conname: undefined,
      consrc: undefined,
      convalidated: true
    },
    convalidated_default: true,
    schema: [{
      id: 'conoid', type: 'text', cell: 'string', visible: false
    },{
      id: 'conname', label: '{{ _('Name') }}', type: 'text', cell: 'string',
      cellHeaderClasses: 'width_percent_40',
      editable: function(m) {
        if (_.isUndefined(m.isNew)) { return true; }
        if (!m.isNew()) {
          var server = this.get('node_info').server;
          if (server.version < 90200) { return false;
          }
        }
        return true;
      }
    },{
      id: 'consrc', label: '{{ _('Check') }}', type: 'multiline',
      cell: Backgrid.Extension.TextareaCell, group: '{{ _('Definition') }}',
      cellHeaderClasses: 'width_percent_60', editable: function(m) {
        return _.isUndefined(m.isNew) ? true : m.isNew();
      }
    },{
      id: 'convalidated', label: '{{ _('Validate?') }}', type: 'switch', cell:
      'boolean', group: '{{ _('Definition') }}',
      editable: function(m) {
        var server = this.get('node_info').server;
        if (server.version < 90200) { return false;
        }
        if (_.isUndefined(m.isNew)) { return true; }
        if (!m.isNew()) {
          if(m.get('convalidated') && m.convalidated_default) {
            return false;
          }
          return true;
        }
        return true;
      }
    }],
    toJSON: Backbone.Model.prototype.toJSON,
    validate: function() {
      return null;
    }
  });

  // Domain Node
  if (!pgBrowser.Nodes['domain']) {
    pgBrowser.Nodes['domain'] = pgBrowser.Node.extend({
      type: 'domain',
      sqlAlterHelp: 'sql-alterdomain.html',
      sqlCreateHelp: 'sql-createdomain.html',
      dialogHelp: '{{ url_for('help.static', filename='domain_dialog.html') }}',
      label: '{{ _('Domain') }}',
      collection_type: 'coll-domain',
      hasSQL: true,
      hasDepends: true,
      parent_type: ['schema', 'catalog'],
      Init: function() {
        // Avoid mulitple registration of menus
        if (this.initialized)
            return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_domain_on_coll', node: 'coll-domain', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('Domain...') }}',
          icon: 'wcTabIcon icon-domain', data: {action: 'create', check: true},
          enable: 'canCreate'
        },{
          name: 'create_domain', node: 'domain', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('Domain...') }}',
          icon: 'wcTabIcon icon-domain', data: {action: 'create', check: true},
          enable: 'canCreate'
        },{
          name: 'create_domain', node: 'schema', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('Domain...') }}',
          icon: 'wcTabIcon icon-domain', data: {action: 'create', check: false},
          enable: 'canCreate'
        }
        ]);

      },
      canDrop: pgBrowser.Nodes['schema'].canChildDrop,
      canDropCascade: pgBrowser.Nodes['schema'].canChildDrop,
      // Domain Node Model
      model: pgBrowser.Node.Model.extend({
        initialize: function(attrs, args) {
          var isNew = (_.size(attrs) === 0);
          if (isNew) {
            // Set Selected Schema
            schema = args.node_info.schema.label
            this.set({'basensp': schema}, {silent: true});

            // Set Current User
            var userInfo = pgBrowser.serverInfo[args.node_info.server._id].user;
            this.set({'owner': userInfo.name}, {silent: true});
          }
          pgBrowser.Node.Model.prototype.initialize.apply(this, arguments);
        },
        defaults: {
          name: undefined,
          oid: undefined,
          owner: undefined,
          basensp: undefined,
          description: undefined,
          basetype: undefined,
          typlen: undefined,
          precision: undefined,
          typdefault: undefined,
          typnotnull: undefined,
          sysdomain: undefined,
          collname: undefined,
          constraints: [],
          seclabels: []
        },
        type_options: undefined,
        // Domain Schema
        schema: [{
          id: 'name', label: '{{ _('Name') }}', cell: 'string',
          type: 'text', mode: ['properties', 'create', 'edit']
        },{
          id: 'oid', label:'{{ _('OID') }}', cell: 'string',
          type: 'text' , mode: ['properties']
        },{
          id: 'owner', label:'{{ _('Owner') }}', cell: 'string', control: Backform.NodeListByNameControl,
          node: 'role',  type: 'text', mode: ['edit', 'create', 'properties']
        },{
          id: 'basensp', label:'{{ _('Schema') }}', cell: 'node-list-by-name',
           control: 'node-list-by-name', cache_level: 'database', type: 'text',
           node: 'schema', mode: ['create', 'edit']
        },{
          id: 'sysdomain', label:'{{ _('System domain?') }}', cell: 'boolean',
          type: 'switch', mode: ['properties'],
          options: {
            'onText': 'Yes', 'offText': 'No',
            'onColor': 'success', 'offColor': 'primary',
            'size': 'small'
          }
        },{
          id: 'description', label:'{{ _('Comment') }}', cell: 'string',
          type: 'multiline'
        },{
          id: 'basetype', label:'{{ _('Base type') }}', cell: 'string',
          control: 'node-ajax-options', type: 'text', url: 'get_types',
          mode:['properties', 'create', 'edit'], group: '{{ _('Definition') }}',
          cache_level: 'database', cache_node: 'schema', disabled: function(m) {
            return !m.isNew();
          }, first_empty: true, transform: function(d) {
            this.model.type_options =  d;
            return d;
          }
        },{
          id: 'typlen', label:'{{ _('Length') }}', cell: 'string',
          type: 'text', group: '{{ _('Definition') }}', deps: ['basetype'],
          disabled: function(m) {
            // We will store type from selected from combobox
            if (!m.isNew()) {
              return true;
            }
            var of_type = m.get('basetype');
            if(m.type_options) {
              // iterating over all the types
              _.each(m.type_options, function(o) {
                // if type from selected from combobox matches in options
                if ( of_type == o.value ) {
                    // if length is allowed for selected type
                    if(o.length)
                    {
                      // set the values in model
                      m.set('is_tlength', true, {silent: true});
                      m.set('min_val', o.min_val, {silent: true});
                      m.set('max_val', o.max_val, {silent: true});
                    }
                }
              });
            }
            return !m.get('is_tlength');
          }
        },{
          id: 'precision', label:'{{ _('Precision') }}', cell: 'string',
          type: 'text', group: '{{ _('Definition') }}', deps: ['basetype'],
          disabled: function(m) {
            // We will store type from selected from combobox
            if (!m.isNew()) {
              return true;
            }
            var of_type = m.get('basetype');
            if(m.type_options) {
              // iterating over all the types
              _.each(m.type_options, function(o) {
                // if type from selected from combobox matches in options
                if ( of_type == o.value ) {
                    // if precession is allowed for selected type
                    if(o.precision)
                    {
                      // set the values in model
                      m.set('is_precision', true, {silent: true});
                      m.set('min_val', o.min_val, {silent: true});
                      m.set('max_val', o.max_val, {silent: true});
                    }
                }
              });
            }
            return !m.get('is_precision');
          }
        },{
          id: 'typdefault', label:'{{ _('Default') }}', cell: 'string',
          type: 'text', group: '{{ _('Definition') }}',
          placeholder: "Enter an expression or a value."
        },{
          id: 'typnotnull', label:'{{ _('Not Null?') }}', cell: 'boolean',
          type: 'switch', group: '{{ _('Definition') }}',
          options: {
            'onText': 'Yes', 'offText': 'No',
            'onColor': 'success', 'offColor': 'primary',
            'size': 'small'
          }
        },{
          id: 'collname', label:'{{ _('Collation') }}', cell: 'string',
          control: 'node-ajax-options', type: 'text', url: 'get_collations',
          group: '{{ _('Definition') }}', cache_level: 'database',
          cache_node: 'schema', disabled: function(m) {
            return !m.isNew();
          }
        },{
          id: 'constraints', label:'{{ _('Constraints') }}', cell: 'string',
          type: 'collection', group: '{{ _('Constraints') }}', mode: ['edit', 'create'],
          model: ConstraintModel, canAdd: true, canDelete: true,
          canEdit: false, columns: ['conname','consrc', 'convalidated']
        },
        pgBrowser.SecurityGroupUnderSchema,
        {
          id: 'seclabels', label: '{{ _('Security Labels') }}',
          model: pgBrowser.SecLabelModel, type: 'collection',
          group: 'security', mode: ['edit', 'create'],
          min_version: 90100, canAdd: true,
          canEdit: false, canDelete: true,
          control: 'unique-col-collection', uniqueCol : ['provider']
        }],
        validate: function() { // Client Side Validation
          var err = {},
              errmsg,
              seclabels = this.get('seclabels');

          if (_.isUndefined(this.get('name')) || String(this.get('name')).replace(/^\s+|\s+$/g, '') == '') {
            err['name'] = '{{ _('Name cannot be empty.') }}';
            errmsg = errmsg || err['name'];
          }

          if (_.isUndefined(this.get('basetype')) || String(this.get('basetype')).replace(/^\s+|\s+$/g, '') == '') {
            err['basetype'] = '{{ _('Base Type cannot be empty.') }}';
            errmsg = errmsg || err['basetype'];
          }

          this.errorModel.clear().set(err);

          return null;
        }
      }),
      canCreate: function(itemData, item, data) {
        //If check is false then , we will allow create menu
        if (data && data.check == false)
          return true;

        var t = pgBrowser.tree, i = item, d = itemData;
        // To iterate over tree to check parent node
        while (i) {
          // If it is schema then allow user to create domain
          if (_.indexOf(['schema'], d._type) > -1)
            return true;

          if ('coll-domain' == d._type) {
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
        // by default we do not want to allow create menu
        return true;
      },
      isDisabled: function(m){
          if (!m.isNew()) {
            var server = this.node_info.server;
            if (server.version < 90200)
            {
              return false;
            }
          }
          return true;
        }
  });

  }

  return pgBrowser.Nodes['domain'];
});
