define(
  ['jquery', 'underscore', 'underscore.string', 'pgadmin',
    'pgadmin.browser', 'codemirror'],

function($, _, S, pgAdmin, pgBrowser, CodeMirror) {

  /**
    Create and add a rule collection into nodes
    @param {variable} label - Label for Node
    @param {variable} type - Type of Node
    @param {variable} columns - List of columns to
      display under under properties.
   */
  if (!pgBrowser.Nodes['coll-rule']) {
    var rules = pgAdmin.Browser.Nodes['coll-rule'] =
      pgAdmin.Browser.Collection.extend({
        node: 'rule',
        label: '{{ _("Rules") }}',
        type: 'coll-rule',
        columns: ["name", "owner", "comment"]
      });
  }


  /**
    Create and Add an Rule Node into nodes
    @param {variable} parent_type - The list of nodes
    under which this node to display
    @param {variable} type - Type of Node
    @param {variable} hasSQL - To show SQL tab
    @param {variable} canDrop - Adds drop rule option
    in the context menu
    @param {variable} canDropCascade - Adds drop Cascade
    rule option in the context menu
   */
  if (!pgBrowser.Nodes['rule']) {
    pgAdmin.Browser.Nodes['rule'] = pgAdmin.Browser.Node.extend({
      parent_type: ['table','view'],
      type: 'rule',
      sqlAlterHelp: 'sql-alterrule.html',
      sqlCreateHelp: 'sql-createrule.html',
      dialogHelp: '{{ url_for('help.static', filename='rule_dialog.html') }}',
      label: '{{ _("rule") }}',
      collection_type: 'coll-table',
      hasSQL:  true,
      hasDepends: true,
      canDrop: function(itemData, item, data){
        pgBrowser.Nodes['schema'].canChildDrop.apply(this, [itemData, item, data]);
        if(_.has(itemData, 'label') && itemData.label === '_RETURN')
          return false;
        else {
          return true;
        }
      },
      canDropCascade: function(itemData, item, data){
        pgBrowser.Nodes['schema'].canChildDrop.apply(this, [itemData, item, data]);
        if(_.has(itemData, 'label') && itemData.label === '_RETURN')
          return false;
        else {
          return true;
        }
      },
      Init: function() {

        /* Avoid mulitple registration of menus */
        if (this.initialized)
            return;

        this.initialized = true;

        /**
          Add "create rule" menu option into context and object menu
          for the following nodes:
          coll-rule, rule and view and table.
          @property {data} - Allow create rule option on schema node or
          system rules node.
         */
        pgBrowser.add_menus([{
          name: 'create_rule_on_coll', node: 'coll-rule', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 1, label: '{{ _("Rule...") }}',
          icon: 'wcTabIcon icon-rule', data: {action: 'create', check: true},
          enable: 'canCreate'
        },{
          name: 'create_rule_onView', node: 'view', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 5, label: '{{ _("Rule...") }}',
          icon: 'wcTabIcon icon-rule', data: {action: 'create', check: true},
          enable: 'canCreate'
        },{
          name: 'create_rule', node: 'rule', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 1, label: '{{ _("Rule...") }}',
          icon: 'wcTabIcon icon-rule', data: {action: 'create', check: true},
          enable: 'canCreate'
        },{
          name: 'create_rule', node: 'table', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _("Rule...") }}',
          icon: 'wcTabIcon icon-rule', data: {action: 'create', check: true},
          enable: 'canCreate'
        }
        ]);
      },

      /**
        Define model for the rule node and specify the node
        properties of the model in schema.
       */
      model: pgAdmin.Browser.Node.Model.extend({
        schema: [{
          id: 'name', label: '{{ _("Name") }}',
          type: 'text', disabled: function(m) {
            // disable name field it it is system rule
            if (m && m.get('name') == "_RETURN") {
              return true;
            }
            if (m.isNew()) {
              return false;
            } else if (m.node_info.server.version >= 90400) {
              return false;
            }
            return true;
          }
        },
        {
          id: 'oid', label:'{{ _("OID") }}',
          type: 'text', disabled: true, mode: ['properties']
        },
        {
          id: 'schema', label:'',
          type: 'text', visible: false, disabled: function(m) {
            // It is used while generating sql
            m.set('schema', m.node_info.schema.label);
          }
        },
        {
          id: 'view', label:'',
          type: 'text', visible: false, disabled: function(m){

            // It is used while generating sql
            m.set('view', this.node_data.label);
          }
        },
        {
          id: 'event', label:'{{ _("Event") }}', control: 'select2',
          group: '{{ _("Definition") }}', type: 'text',
          select2: {
            width: '100%',
            allowClear: false
          },
          options:[
            {label: 'Select', value: 'Select'},
            {label: 'Insert', value: 'Insert'},
            {label: 'Update', value: 'Update'},
            {label: 'Delete', value: 'Delete'}
          ]
        },
        {
          id: 'do_instead', label:'{{ _("Do Instead") }}', group: '{{ _("Definition") }}',
          type: 'switch'
        },
        {
          id: 'condition', label:'{{ _("Condition") }}',
          type: 'text', group: '{{ _("Definition") }}',
          control: Backform.SqlFieldControl
        },
        {
          id: 'statements', label:'{{ _("Commands") }}',
          type: 'text', group: '{{ _("Definition") }}',
          control: Backform.SqlFieldControl
        },
        {
          id: 'system_rule', label:'{{ _("System rule?") }}',
          type: 'switch', mode: ['properties']
        },
        {
          id: 'enabled', label:'{{ _("Enabled?") }}',
          type: 'switch', mode: ['properties']
        },
        {
          id: 'comment', label:'{{ _("Comment") }}', cell: 'string', type: 'multiline'
        }
        ],
        validate: function() {

          // Triggers specific error messages for fields
          var err = {},
            errmsg,
            field_name = this.get('name');
          if (_.isUndefined(field_name) || _.isNull(field_name) ||
            String(field_name).replace(/^\s+|\s+$/g, '') === '')
          {
            err['name'] = '{{ _("Please specify name.") }}';
            errmsg = errmsg || err['name'];
            this.errorModel.set('name', errmsg);
            return errmsg;
          }
          else
          {
            this.errorModel.unset('name');
          }
          return null;
        }
      }),

      // Show or hide create rule menu option on parent node
      canCreate: function(itemData, item, data) {

        // If check is false then , we will allow create menu
        if (data && data.check === false)
          return true;

        var t = pgBrowser.tree, i = item, d = itemData;

        // To iterate over tree to check parent node
        while (i) {

          // If it is schema then allow user to create rule
          if (_.indexOf(['schema'], d._type) > -1)
            return true;

          if ('coll-rule' == d._type) {

            //Check if we are not child of rule
            prev_i = t.hasParent(i) ? t.parent(i) : null;
            prev_d = prev_i ? t.itemData(prev_i) : null;
            prev_j = t.hasParent(prev_i) ? t.parent(prev_i) : null;
            prev_e = prev_j ? t.itemData(prev_j) : null;
            prev_k = t.hasParent(prev_j) ? t.parent(prev_j) : null;
            prev_f = prev_k ? t.itemData(prev_k) : null;
            if( prev_f._type == 'catalog') {
              return false;
            } else {
              return true;
            }
          }

          /**
            Check if it is view and its parent node is schema
            then allow to create Rule
           */
          else if('view' == d._type || 'table' == d._type){
            prev_i = t.hasParent(i) ? t.parent(i) : null;
            prev_d = prev_i ? t.itemData(prev_i) : null;
            prev_j = t.hasParent(prev_i) ? t.parent(prev_i) : null;
            prev_e = prev_j ? t.itemData(prev_j) : null;
            if(prev_e._type == 'schema') {
              return true;
            }else{
              return false;
            }
          }
          i = t.hasParent(i) ? t.parent(i) : null;
          d = i ? t.itemData(i) : null;
        }

        // By default we do not want to allow create menu
        return true;

      }

  });
  }

  return pgBrowser.Nodes['coll-rule'];
});
