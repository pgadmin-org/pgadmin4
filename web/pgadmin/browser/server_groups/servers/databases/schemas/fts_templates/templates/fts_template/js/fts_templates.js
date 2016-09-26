define(
        ['jquery', 'underscore', 'underscore.string', 'pgadmin', 'pgadmin.browser', 'alertify', 'pgadmin.browser.collection'],
function($, _, S, pgAdmin, pgBrowser, alertify) {

  // Extend the collection class for fts template
  if (!pgBrowser.Nodes['coll-fts_template']) {
    var fts_templates = pgAdmin.Browser.Nodes['coll-fts_template'] =
      pgAdmin.Browser.Collection.extend({
        node: 'fts_template',
        label: '{{ _('FTS Templates') }}',
        type: 'coll-fts_template',
        columns: ['name', 'description']
      });
  };

  // Extend the node class for fts template
  if (!pgBrowser.Nodes['fts_template']) {
    pgAdmin.Browser.Nodes['fts_template'] = pgAdmin.Browser.Node.extend({
      parent_type: ['schema', 'catalog'],
      type: 'fts_template',
      sqlAlterHelp: 'sql-altertstemplate.html',
      sqlCreateHelp: 'sql-createtstemplate.html',
      dialogHelp: '{{ url_for('help.static', filename='fts_template_dialog.html') }}',
      canDrop: true,
      canDropCascade: true,
      label: '{{ _('FTS Template') }}',
      hasSQL: true,
      hasDepends: true,
      Init: function() {

        // Avoid multiple registration of menus
        if (this.initialized)
          return;

        this.initialized = true;

        // Add context menus for fts template
        pgBrowser.add_menus([{
          name: 'create_fts_template_on_schema', node: 'schema', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('FTS Template...') }}',
          icon: 'wcTabIcon icon-fts_template', data: {action: 'create'},
          enable: 'canCreate'
          },{
          name: 'create_fts_template_on_coll', node: 'coll-fts_template', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('FTS Template...') }}',
          icon: 'wcTabIcon icon-fts_template', data: {action: 'create'},
          enable: 'canCreate'
          },{
          name: 'create_fts_template', node: 'fts_template', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('FTS Template...') }}',
          icon: 'wcTabIcon icon-fts_template', data: {action: 'create'},
          enable: 'canCreate'
          }]);

      },

      // Defining backform model for fts template node
      model: pgAdmin.Browser.Node.Model.extend({
        defaults: {
          name: undefined,      // Fts template name
          description: undefined,   // Comment on template
          schema: undefined,        // Schema name to which template belongs
          tmplinit: undefined,      // Init function for fts template
          tmpllexize: undefined     // Lexize function for fts template
        },
        initialize: function(attrs, args) {
          var isNew = (_.size(attrs) === 0);
          pgAdmin.Browser.Node.Model.prototype.initialize.apply(this, arguments);
          if (isNew) {
            this.set('schema', args.node_info.schema._id);
          }
        },
        // Defining schema for fts template
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
          id: 'tmplinit', label: '{{ _('Init function')}}',
          group: '{{ _('Definition') }}', type: 'text', disabled: function(m) {
            return !m.isNew();
          }, control: 'node-ajax-options', url: 'get_init',
          cache_level: 'database', cache_node: 'schema'
        },{
          id: 'tmpllexize', label: '{{ _('Lexize function')}}', group: '{{ _('Definition') }}',
          type: 'text', disabled: function(m) { return !m.isNew(); },
          control: 'node-ajax-options', url: 'get_lexize', cache_level: 'database',
          cache_node: 'schema'
        }],

        /*
         * Triggers control specific error messages for template name,
         * lexize function and schema, if any one of them is not specified
         * while creating new fts template
         */
        validate: function(keys){
          var name = this.get('name');
          var lexize = this.get('tmpllexize');
          var schema = this.get('schema');

          // Validate fts template name
          if (_.isUndefined(name) || _.isNull(name) || String(name).replace(/^\s+|\s+$/g, '') == '') {
            var msg = '{{ _('Name must be specified.') }}';
            this.errorModel.set('name', msg);
            return msg;
          }

          // Validate lexize function control
          else if (_.isUndefined(lexize) || _.isNull(lexize) || String(lexize).replace(/^\s+|\s+$/g, '') == '') {
            var msg = '{{ _('Lexize function must be selected.') }}';
            this.errorModel.set('tmpllexize', msg);
            return msg;
          }

          // Validate schema for fts template
          else if (_.isUndefined(schema) || _.isNull(schema) || String(schema).replace(/^\s+|\s+$/g, '') == '') {
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
          // If it is schema then allow user to create fts fts_template
          if (_.indexOf(['schema'], d._type) > -1)
            return true;

          if ('coll-fts_template' == d._type) {
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

return pgBrowser.Nodes['coll-fts_template'];
});
