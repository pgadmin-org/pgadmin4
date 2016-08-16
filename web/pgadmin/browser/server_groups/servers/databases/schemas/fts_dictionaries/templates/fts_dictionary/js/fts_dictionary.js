define(
        ['jquery', 'underscore', 'underscore.string', 'pgadmin',
         'pgadmin.browser', 'alertify', 'pgadmin.browser.collection'],
function($, _, S, pgAdmin, pgBrowser, alertify) {

  // Extend the browser's node model class to create a option/value pair
  var OptionLabelModel = pgAdmin.Browser.Node.Model.extend({
        defaults: {
          options: undefined,
          value: undefined
        },
        // Define the schema for the Options
        schema: [
          {
            id: 'option', label:'Option', type:'text', group: null,
            cellHeaderClasses:'width_percent_50', editable: true
          },{
            id: 'value', label:'Value', type: 'text', group:null,
            cellHeaderClasses:'width_percent_50', editable: true
            },
        ],
        validate: function() {
            // Clear any existing errors.
            this.errorModel.clear()

            if (_.isUndefined(this.get('option')) ||
                String(this.get('option')).replace(/^\s+|\s+$/g, '') == '') {
                var msg = '{{ _('Option can not be empty!') }}';
                this.errorModel.set('option',msg);
                return msg;
            }
            if (_.isUndefined(this.get('value')) ||
                String(this.get('value')).replace(/^\s+|\s+$/g, '') == '') {
                var msg = '{{ _('Value can not be empty!') }}';
                this.errorModel.set('value',msg);
                return msg;
            }
            return null;
        }
    });

  // Extend the collection class for FTS Dictionary
  if (!pgBrowser.Nodes['coll-fts_dictionary']) {
    var fts_dictionaries = pgAdmin.Browser.Nodes['coll-fts_dictionary'] =
      pgAdmin.Browser.Collection.extend({
        node: 'fts_dictionary',
        label: '{{ _('FTS Dictionaries') }}',
        type: 'coll-fts_dictionary',
        columns: ['name', 'description']
      });
  };

  // Extend the node class for FTS Dictionary
  if (!pgBrowser.Nodes['fts_dictionary']) {
    pgAdmin.Browser.Nodes['fts_dictionary'] = pgAdmin.Browser.Node.extend({
      parent_type: ['schema', 'catalog'],
      type: 'fts_dictionary',
      sqlAlterHelp: 'sql-altertsdictionary.html',
      sqlCreateHelp: 'sql-createtsdictionary.html',
      dialogHelp: '{{ url_for('help.static', filename='fts_dictionary_dialog.html') }}',
      canDrop: true,
      canDropCascade: true,
      label: '{{ _('FTS dictionary') }}',
      hasSQL: true,
      hasDepends: true,
      Init: function() {

        // Avoid multiple registration of menus
        if (this.initialized)
          return;

        this.initialized = true;

        // Add context menus for FTS Dictionary
        pgBrowser.add_menus([{
          name: 'create_fts_dictionary_on_schema', node: 'schema', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{_('FTS Dictionary...')}}',
          icon: 'wcTabIcon icon-fts_dictionary', data: {action: 'create'},
          enable: 'canCreate'
          },{
          name: 'create_fts_dictionary_on_coll', node: 'coll-fts_dictionary',
          module: this, applies: ['object', 'context'],  priority: 4,
          callback: 'show_obj_properties', category: 'create',
          label: '{{ _('FTS Dictionary...') }}', data: {action: 'create'},
          icon: 'wcTabIcon icon-fts_dictionary', enable: 'canCreate'
          },{
          name: 'create_fts_dictionary', node: 'fts_dictionary', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{_('FTS Dictionary...')}}',
          icon: 'wcTabIcon icon-fts_dictionary', data: {action: 'create'},
          enable: 'canCreate'
          }]);
      },

      // Defining backform model for FTS Dictionary node
      model: pgAdmin.Browser.Node.Model.extend({
        defaults: {
          name: undefined,        // FTS Dictionary name
          owner: undefined,       // FTS Dictionary owner
          description: undefined, // Comment on FTS Dictionary
          schema: undefined,      // Schema name FTS dictionary belongs to
          template: undefined,    // Template list for FTS dictionary node
          options: undefined      // option/value pair list for FTS Dictionary
        },
        initialize: function(attrs, args) {
          var isNew = (_.size(attrs) === 0);
          pgAdmin.Browser.Node.Model.prototype.initialize.apply(this, arguments);

          if (isNew) {
            var user = pgBrowser.serverInfo[args.node_info.server._id].user;
            this.set({
              'owner': user.name,
              'schema': args.node_info.schema._id
            }, {silent: true});
          }
        },
        // Defining schema for fts dictionary
        schema: [{
          id: 'name', label: '{{ _('Name') }}', cell: 'string',
          type: 'text', cellHeaderClasses: 'width_percent_50'
        },{
          id: 'oid', label:'{{ _('OID') }}', cell: 'string',
          editable: false, type: 'text', disabled: true, mode:['properties']
        },{
          id: 'owner', label:'{{ _('Owner') }}', cell: 'string',
          type: 'text', mode: ['properties', 'edit','create'], node: 'role',
          control: Backform.NodeListByNameControl
        },{
          id: 'schema', label: '{{ _('Schema')}}', cell: 'string',
          type: 'text', mode: ['create','edit'], node: 'schema',
          cache_node: 'database', control: 'node-list-by-id'
        },{
          id: 'description', label:'{{ _('Comment') }}', cell: 'string',
          type: 'multiline', cellHeaderClasses: 'width_percent_50'
        },{
          id: 'template', label: '{{ _('Template')}}',type: 'text',
          disabled: function(m) { return !m.isNew(); }, url: 'fetch_templates',
          group: '{{ _('Definition') }}', control: 'node-ajax-options',
          cache_node: 'database'
        },{
          id: 'options', label: '{{ _('Option') }}', type: 'collection',
          group: '{{ _('Options') }}', control: 'unique-col-collection',
          model: OptionLabelModel, columns: ['option', 'value'],
          uniqueCol : ['option'], mode: ['edit', 'create'],
          canAdd: true, canEdit: false,canDelete: true
         }],

        /*
         * Triggers control specific error messages for dictionary name,
         * template and schema, if any one of them is not specified
         * while creating new fts dictionary
         */
        validate: function(keys){
          var name = this.get('name');
          var template = this.get('template');;
          var schema = this.get('schema');

          // Validate FTS Dictionary name
          if (_.isUndefined(name) || _.isNull(name) || String(name).replace(/^\s+|\s+$/g, '') == '') {
            var msg = '{{ _('Name must be specified!') }}';
            this.errorModel.set('name', msg);
            return msg;
          }

          // Validate template name
          else if (_.isUndefined(template) || _.isNull(template) || String(template).replace(/^\s+|\s+$/g, '') == '') {
            var msg = '{{ _('Template must be selected!') }}';
            this.errorModel.set('template', msg);
            return msg;
          }

          // Validate schema
          else if (_.isUndefined(schema) || _.isNull(schema) || String(schema).replace(/^\s+|\s+$/g, '') == '') {
            var msg = '{{ _('Schema must be selected!') }}';
            this.errorModel.set('schema', msg);
            return msg;
          }
          else this.errorModel.clear();

          this.trigger('on-status-clear');
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
          // If it is schema then allow user to create fts dictionary
          if (_.indexOf(['schema'], d._type) > -1)
            return true;

          if ('coll-fts_dictionary' == d._type) {
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

return pgBrowser.Nodes['coll-fts_dictionary'];
});
