define(
        ['jquery', 'underscore', 'underscore.string', 'pgadmin', 'pgadmin.browser', 'alertify', 'pgadmin.browser.collection'],
function($, _, S, pgAdmin, pgBrowser, alertify) {

  if (!pgBrowser.Nodes['coll-collation']) {
    var databases = pgAdmin.Browser.Nodes['coll-collation'] =
      pgAdmin.Browser.Collection.extend({
        node: 'collation',
        label: '{{ _('Collations') }}',
        type: 'coll-collation',
        columns: ['name', 'owner', 'description']
      });
  };

  if (!pgBrowser.Nodes['collation']) {
    pgAdmin.Browser.Nodes['collation'] = pgBrowser.Node.extend({
      type: 'collation',
      sqlAlterHelp: 'sql-altercollation.html',
      sqlCreateHelp: 'sql-createcollation.html',
      dialogHelp: '{{ url_for('help.static', filename='collation_dialog.html') }}',
      label: '{{ _('Collation') }}',
      collection_type: 'coll-collation',
      hasSQL: true,
      hasDepends: true,
      parent_type: ['schema', 'catalog'],
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_collation_on_coll', node: 'coll-collation', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('Collation...') }}',
          icon: 'wcTabIcon icon-collation', data: {action: 'create', check: true},
          enable: 'canCreate'
        },{
          name: 'create_collation', node: 'collation', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('Collation...') }}',
          icon: 'wcTabIcon icon-collation', data: {action: 'create', check: true},
          enable: 'canCreate'
        },{
          name: 'create_collation', node: 'schema', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('Collation...') }}',
          icon: 'wcTabIcon icon-collation', data: {action: 'create', check: false},
          enable: 'canCreate'
        }
        ]);

      },
      canDrop: pgBrowser.Nodes['schema'].canChildDrop,
      canDropCascade: pgBrowser.Nodes['schema'].canChildDrop,
      model: pgAdmin.Browser.Node.Model.extend({
        defaults: {
          name: undefined,
          oid: undefined,
          owner: undefined,
          lc_type: undefined,
          lc_collate: undefined,
          description: undefined
        },

        // Default values!
        initialize: function(attrs, args) {
          var isNew = (_.size(attrs) === 0);

          if (isNew) {
            var userInfo = pgBrowser.serverInfo[args.node_info.server._id].user;
            var schemaInfo = args.node_info.schema;

            this.set({'owner': userInfo.name}, {silent: true});
            this.set({'schema': schemaInfo._label}, {silent: true});
          }
          pgAdmin.Browser.Node.Model.prototype.initialize.apply(this, arguments);
        },

        schema: [{
          id: 'name', label: '{{ _('Name') }}', cell: 'string',
          type: 'text', mode: ['properties', 'create', 'edit'],
          disabled: 'inSchema'
        },{
          id: 'oid', label:'{{ _('OID') }}', cell: 'string',
          type: 'text' , mode: ['properties']
        },{
          id: 'owner', label:'{{ _('Owner') }}', cell: 'string',
          type: 'text', mode: ['properties', 'create', 'edit'],
          disabled: 'inSchema', control: 'node-list-by-name',
          node: 'role'
        },{
          id: 'schema', label:'{{ _('Schema') }}', cell: 'string',
          type: 'text', mode: ['create', 'edit'], node: 'schema',
          disabled: 'inSchema', filter: function(d) {
            // If schema name start with pg_* then we need to exclude them
            if(d && d.label.match(/^pg_/))
            {
              return false;
            }
            return true;
          }, control: 'node-list-by-name',
          cache_node: 'database', cached_level: 'database'
        },{
          id: 'copy_collation', label:'{{ _('Copy collation') }}', cell: 'string',
          control: 'node-ajax-options',
          type: 'text', mode: ['create', 'edit'], group: 'Definition',
          url: 'get_collations', disabled: 'inSchemaWithModelCheck',
          deps: ['locale', 'lc_collate', 'lc_type']
        },{
          id: 'locale', label:'{{ _('Locale') }}', cell: 'string',
          type: 'text', mode: ['create', 'edit'], group: 'Definition',
          disabled: 'inSchemaWithModelCheck',
          deps: ['lc_collate', 'lc_type', 'copy_collation']
        },{
          id: 'lc_collate', label:'{{ _('LC_COLLATE') }}', cell: 'string',
          type: 'text', mode: ['properties', 'create', 'edit'], group: 'Definition',
          deps: ['locale', 'copy_collation'], disabled: 'inSchemaWithModelCheck'
        },{
          id: 'lc_type', label:'{{ _('LC_TYPE') }}', cell: 'string',
          type: 'text', mode: ['properties', 'create', 'edit'], group: 'Definition',
          disabled: 'inSchemaWithModelCheck',
          deps: ['locale', 'copy_collation']
        },{
          id: 'description', label:'{{ _('Comment') }}', cell: 'string',
          type: 'multiline', mode: ['properties', 'create', 'edit'],
          disabled: 'inSchema'
        }
        ],
        validate: function() {
          var err = {},
          msg = undefined,
          changedAttrs = this.changed,
          locale_flag = false,
          lc_type_flag = false,
          lc_coll_flag = false,
          copy_coll_flag = false,
          msg = undefined,
          data = this.toJSON();

          this.errorModel.clear();

          if (_.has(changedAttrs,data.name) && _.isUndefined(this.get('name'))
              || String(this.get('name')).replace(/^\s+|\s+$/g, '') == '') {
            msg = '{{ _('Name cannot be empty.') }}';
            this.errorModel.set('name', msg);
          }
          if (_.has(changedAttrs,data.locale) && (_.isUndefined(this.get('locale'))
              || String(this.get('locale')).replace(/^\s+|\s+$/g, '') == '')) {
            locale_flag = true;
          }
          if (_.has(changedAttrs,data.lc_collate) && (_.isUndefined(this.get('lc_collate'))
              || String(this.get('lc_collate')).replace(/^\s+|\s+$/g, '') == '')) {
            lc_coll_flag = true;
          }
          if (_.has(changedAttrs,data.lc_type) && (_.isUndefined(this.get('lc_type'))
              || String(this.get('lc_type')).replace(/^\s+|\s+$/g, '') == '')) {
            lc_type_flag = true;
          }
          if (_.has(changedAttrs,data.copy_collation) && (_.isUndefined(this.get('copy_collation'))
              || String(this.get('copy_collation')).replace(/^\s+|\s+$/g, '') == '')) {
            copy_coll_flag = true;
          }
          if (locale_flag && (lc_coll_flag || lc_coll_flag) && copy_coll_flag) {
            msg = '{{ _('Incomplete definition, Please provide Locale OR Copy collation OR LC_TYPE/LC_COLLATE!') }}';
            err['locale'] = msg
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
        // We will check if we are under schema node & in 'create' mode
        inSchemaWithModelCheck: function(m) {
          if(this.node_info &&  'schema' in this.node_info)
          {
            // Enable copy_collation only if locale & lc_* is not provided
            if (m.isNew() && this.name == "copy_collation")
            {
              if(m.get('locale'))
                return true;
              if(m.get('lc_collate') || m.get('lc_type'))
                return true
              return false;
            }

            // Enable lc_* only if copy_collation & locale is not provided
            if (m.isNew() && (this.name == 'lc_collate' || this.name == 'lc_type'))
            {
              if(m.get('locale'))
                return true;
              if(m.get('copy_collation'))
                return true
              return false;
            }

            // Enable localy only if lc_* & copy_collation is not provided
            if (m.isNew() && this.name == 'locale')
            {
              if(m.get('lc_collate') || m.get('lc_type'))
                return true;
              if(m.get('copy_collation'))
                return true
              return false;
            }

            // We will disbale control if it's in 'edit' mode
            if (m.isNew()) {
              return false;
            } else {
              return true;
            }

          }
          return true;
        }
      }),
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

            if ('coll-collation' == d._type) {
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
      }
  });

  }

  return pgBrowser.Nodes['collation'];
});
