define(
        ['jquery', 'underscore', 'underscore.string', 'pgadmin',
         'pgadmin.browser', 'alertify', 'pgadmin.browser.collection'],
function($, _, S, pgAdmin, pgBrowser, alertify) {

  // Extend the collection class for fts parser
  if (!pgBrowser.Nodes['coll-fts_parser']) {
    var fts_parsers = pgAdmin.Browser.Nodes['coll-fts_parser'] =
      pgAdmin.Browser.Collection.extend({
        node: 'fts_parser',
        label: '{{ _('FTS Parsers') }}',
        type: 'coll-fts_parser',
        columns: ['name', 'description']
      });
  };

  // Extend the node class for fts parser
  if (!pgBrowser.Nodes['fts_parser']) {
    pgAdmin.Browser.Nodes['fts_parser'] = pgAdmin.Browser.Node.extend({
      parent_type: ['schema', 'catalog'],
      type: 'fts_parser',
      sqlAlterHelp: 'sql-altertsparser.html',
      sqlCreateHelp: 'sql-createtsparser.html',
      dialogHelp: '{{ url_for('help.static', filename='fts_parser_dialog.html') }}',
      canDrop: true,
      canDropCascade: true,
      label: '{{ _('FTS Parser') }}',
      hasSQL: true,
      hasDepends: true,
      Init: function() {

        // Avoid multiple registration of menus
        if (this.initialized)
          return;

        this.initialized = true;

        // Add context menus for fts parser
        pgBrowser.add_menus([{
          name: 'create_fts_parser_on_schema', node: 'schema', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('FTS Parser...') }}',
          icon: 'wcTabIcon icon-fts_parser', data: {action: 'create'},
          enable: 'canCreate'
          },{
          name: 'create_fts_parser_on_coll', node: 'coll-fts_parser',
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('FTS Parser...') }}',
          icon: 'wcTabIcon icon-fts_parser', data: {action: 'create'},
          module: this, enable: 'canCreate'
          },{
          name: 'create_fts_parser', node: 'fts_parser', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('FTS Parser...') }}',
          icon: 'wcTabIcon icon-fts_parser', data: {action: 'create'},
          enable: 'canCreate'
          }]);

      },

      // Defining backform model for fts parser node
      model: pgAdmin.Browser.Node.Model.extend({
        defaults: {
          name: undefined,          // Fts parser name
          description: undefined,   // Comment on parser
          schema: undefined,        // Schema name to which parser belongs
          prsstart: undefined,      // Start function for fts parser
          prstoken: undefined,       // Token function for fts parser
          prsend: undefined,        // End function for fts parser
          prslextype: undefined,    // Lextype function for fts parser
          prsheadline: undefined    // Headline function for fts parse
        },
        initialize: function(attrs, args) {
          var isNew = (_.size(attrs) === 0);
          pgAdmin.Browser.Node.Model.prototype.initialize.apply(
            this, arguments
          );
          if (isNew) {
            this.set('schema', args.node_info.schema._id);
          }
        },
        // Defining schema for fts parser
        schema: [{
          id: 'name', label: '{{ _('Name') }}', cell: 'string',
          type: 'text', cellHeaderClasses: 'width_percent_50'
        },{
          id: 'oid', label:'{{ _('OID') }}', cell: 'string',
          editable: false, type: 'text', disabled: true, mode:['properties']
        },{
          id: 'schema', label: '{{ _('Schema')}}', cell: 'string',
          type: 'text', mode: ['create','edit'], node: 'schema',
          control: 'node-list-by-id', cache_node: 'database',
          cache_level: 'database'
        },{
          id: 'description', label:'{{ _('Comment') }}', cell: 'string',
          type: 'multiline', cellHeaderClasses: 'width_percent_50'
        },{
          id: 'prsstart', label: '{{ _('Start function')}}',
          type: 'text', disabled: function(m) { return !m.isNew(); },
          control: 'node-ajax-options', url: 'start_functions',
          group: '{{ _('Definition') }}', cache_level: 'database',
          cache_node: 'schema'
        },{
          id: 'prstoken', label: '{{ _('Get next token function')}}',
          type: 'text', disabled: function(m) { return !m.isNew(); },
          control: 'node-ajax-options', url: 'token_functions',
          group: '{{ _('Definition') }}', cache_level: 'database',
          cache_node: 'schema'
        },{
          id: 'prsend', label: '{{ _('End function')}}',
          type: 'text', disabled: function(m) { return !m.isNew(); },
          control: 'node-ajax-options', url: 'end_functions',
          group: '{{ _('Definition') }}', cache_level: 'database',
          cache_node: 'schema',
          cache_node: 'schema'
        },{
          id: 'prslextype', label: '{{ _('Lextypes function')}}',
          type: 'text', disabled: function(m) { return !m.isNew(); },
          control: 'node-ajax-options', url: 'lextype_functions',
          group: '{{ _('Definition') }}', cache_level: 'database',
          cache_node: 'schema'
        },{
          id: 'prsheadline', label: '{{ _('Headline function')}}',
          type: 'text', disabled: function(m) { return !m.isNew(); },
          control: 'node-ajax-options', url: 'headline_functions',
          group: '{{ _('Definition') }}', cache_level: 'database',
          cache_node: 'schema'
        }],

        /*
         * Triggers control specific error messages for parser name,
         * start, token, end, lextype functions and schema, if any one of them is not specified
         * while creating new fts parser
         */
        validate: function(keys){
          var name = this.get('name');
          var start = this.get('prsstart');
          var token = this.get('prstoken');
          var end = this.get('prsend');
          var lextype = this.get('prslextype');
          var schema = this.get('schema');

          // Validate fts parser name
          if (_.isUndefined(name) ||
                _.isNull(name) ||
                String(name).replace(/^\s+|\s+$/g, '') == '') {
            var msg = '{{ _('Name must be specified.') }}';
            this.errorModel.set('name', msg);
            return msg;
          }

          // Validate start function control
          else if (_.isUndefined(start) ||
                    _.isNull(start) ||
                    String(start).replace(/^\s+|\s+$/g, '') == '') {
            var msg = '{{ _('Start function must be selected.') }}';
            this.errorModel.set('prsstart', msg);
            return msg;
          }

          // Validate gettoken function control
          else if (_.isUndefined(token) ||
                    _.isNull(token) ||
                    String(token).replace(/^\s+|\s+$/g, '') == '') {
            var msg = '{{ _('Get next token function must be selected.') }}';
            this.errorModel.set('prstoken', msg);
            return msg;
          }

          // Validate end function control
          else if (_.isUndefined(end) ||
                    _.isNull(end) ||
                    String(end).replace(/^\s+|\s+$/g, '') == '') {
            var msg = '{{ _('End function must be selected.') }}';
            this.errorModel.set('prsend', msg);
            return msg;
          }

          // Validate lextype function control
          else if (_.isUndefined(lextype) ||
                    _.isNull(lextype) ||
                    String(lextype).replace(/^\s+|\s+$/g, '') == '') {
            var msg = '{{ _('Lextype function must be selected.') }}';
            this.errorModel.set('prslextype', msg);
            return msg;
          }

          // Validate schema for fts parser
          else if (_.isUndefined(schema) ||
                    _.isNull(schema) ||
                    String(schema).replace(/^\s+|\s+$/g, '') == '') {
            var msg = '{{ _('Schema must be selected.') }}';
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
          // If it is schema then allow user to create fts parser
          if (_.indexOf(['schema'], d._type) > -1)
            return true;

          if ('coll-fts_parser' == d._type) {
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

return pgBrowser.Nodes['coll-fts_parser'];
});
