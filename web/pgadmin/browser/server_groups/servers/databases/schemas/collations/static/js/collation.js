define('pgadmin.node.collation', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore',
  'underscore.string', 'sources/pgadmin', 'pgadmin.browser',
  'pgadmin.node.schema.dir/child', 'pgadmin.browser.collection',
], function(gettext, url_for, $, _, S, pgAdmin, pgBrowser, schemaChild) {

  if (!pgBrowser.Nodes['coll-collation']) {
    pgAdmin.Browser.Nodes['coll-collation'] =
      pgAdmin.Browser.Collection.extend({
        node: 'collation',
        label: gettext('Collations'),
        type: 'coll-collation',
        columns: ['name', 'owner', 'description'],
      });
  }

  if (!pgBrowser.Nodes['collation']) {
    pgAdmin.Browser.Nodes['collation'] = schemaChild.SchemaChildNode.extend({
      type: 'collation',
      sqlAlterHelp: 'sql-altercollation.html',
      sqlCreateHelp: 'sql-createcollation.html',
      dialogHelp: url_for('help.static', {'filename': 'collation_dialog.html'}),
      label: gettext('Collation'),
      collection_type: 'coll-collation',
      hasSQL: true,
      hasDepends: true,
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_collation_on_coll', node: 'coll-collation', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Collation...'),
          icon: 'wcTabIcon icon-collation', data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_collation', node: 'collation', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Collation...'),
          icon: 'wcTabIcon icon-collation', data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_collation', node: 'schema', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Collation...'),
          icon: 'wcTabIcon icon-collation', data: {action: 'create', check: false},
          enable: 'canCreate',
        },
        ]);

      },
      model: pgAdmin.Browser.Node.Model.extend({
        defaults: {
          name: undefined,
          oid: undefined,
          owner: undefined,
          lc_type: undefined,
          lc_collate: undefined,
          description: undefined,
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
          id: 'name', label: gettext('Name'), cell: 'string',
          type: 'text', mode: ['properties', 'create', 'edit'],
          disabled: 'inSchema',
        },{
          id: 'oid', label: gettext('OID'), cell: 'string',
          type: 'text' , mode: ['properties'],
        },{
          id: 'owner', label: gettext('Owner'), cell: 'string',
          type: 'text', mode: ['properties', 'create', 'edit'],
          disabled: 'inSchema', control: 'node-list-by-name',
          node: 'role',
        },{
          id: 'schema', label: gettext('Schema'), cell: 'string',
          type: 'text', mode: ['create', 'edit'], node: 'schema',
          disabled: 'inSchema', filter: function(d) {
            // If schema name start with pg_* then we need to exclude them
            if(d && d.label.match(/^pg_/))
            {
              return false;
            }
            return true;
          }, control: 'node-list-by-name',
          cache_node: 'database', cached_level: 'database',
        },{
          id: 'copy_collation', label: gettext('Copy collation'), cell: 'string',
          control: 'node-ajax-options',
          type: 'text', mode: ['create', 'edit'], group: gettext('Definition'),
          url: 'get_collations', disabled: 'inSchemaWithModelCheck',
          deps: ['locale', 'lc_collate', 'lc_type'],
        },{
          id: 'locale', label: gettext('Locale'), cell: 'string',
          type: 'text', mode: ['create', 'edit'], group: gettext('Definition'),
          disabled: 'inSchemaWithModelCheck',
          deps: ['lc_collate', 'lc_type', 'copy_collation'],
        },{
          id: 'lc_collate', label: gettext('LC_COLLATE'), cell: 'string',
          type: 'text', mode: ['properties', 'create', 'edit'], group: gettext('Definition'),
          deps: ['locale', 'copy_collation'], disabled: 'inSchemaWithModelCheck',
        },{
          id: 'lc_type', label: gettext('LC_TYPE'), cell: 'string',
          type: 'text', mode: ['properties', 'create', 'edit'], group: gettext('Definition'),
          disabled: 'inSchemaWithModelCheck',
          deps: ['locale', 'copy_collation'],
        },{
          id: 'description', label: gettext('Comment'), cell: 'string',
          type: 'multiline', mode: ['properties', 'create', 'edit'],
          disabled: 'inSchema',
        },
        ],
        validate: function() {
          var err = {},
            msg = undefined,
            changedAttrs = this.changed,
            locale_flag = false,
            lc_type_flag = false,
            lc_coll_flag = false,
            copy_coll_flag = false,
            data = this.toJSON();

          this.errorModel.clear();

          if (_.has(changedAttrs,data.name) && _.isUndefined(this.get('name'))
              || String(this.get('name')).replace(/^\s+|\s+$/g, '') == '') {
            msg = gettext('Name cannot be empty.');
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
          if (locale_flag && (lc_coll_flag || lc_type_flag) && copy_coll_flag) {
            msg = gettext('Definition incomplete. Please provide Locale OR Copy Collation OR LC_TYPE/LC_COLLATE.');
            err['locale'] = msg;
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
            if (m.isNew() && this.name == 'copy_collation')
            {
              if(m.get('locale'))
                return true;
              if(m.get('lc_collate') || m.get('lc_type'))
                return true;
              return false;
            }

            // Enable lc_* only if copy_collation & locale is not provided
            if (m.isNew() && (this.name == 'lc_collate' || this.name == 'lc_type'))
            {
              if(m.get('locale'))
                return true;
              if(m.get('copy_collation'))
                return true;
              return false;
            }

            // Enable localy only if lc_* & copy_collation is not provided
            if (m.isNew() && this.name == 'locale')
            {
              if(m.get('lc_collate') || m.get('lc_type'))
                return true;
              if(m.get('copy_collation'))
                return true;
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
        },
      }),
    });

  }

  return pgBrowser.Nodes['collation'];
});
