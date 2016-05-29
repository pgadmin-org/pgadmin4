define(
  ['jquery', 'underscore', 'underscore.string', 'pgadmin', 'pgadmin.browser',
    'alertify', 'pgadmin.browser.collection', 'pgadmin.browser.server.privilege'],
  function($, _, S, pgAdmin, pgBrowser, alertify) {

  // Extend the browser's collection class for languages collection
  if (!pgBrowser.Nodes['coll-language']) {
    var languages = pgBrowser.Nodes['coll-language'] =
      pgBrowser.Collection.extend({
        node: 'language',
        label: '{{ _('Languages') }}',
        type: 'coll-language',
        columns: ['name', 'lanowner', 'description']
      });
  };

  // Extend the browser's node class for language node
  if (!pgBrowser.Nodes['language']) {
    pgBrowser.Nodes['language'] = pgBrowser.Node.extend({
      parent_type: 'database',
      type: 'language',
      sqlAlterHelp: 'sql-alterlanguage.html',
      sqlCreateHelp: 'sql-createlanguage.html',
      label: '{{ _('Language') }}',
      hasSQL:  true,
      hasDepends: true,
      Init: function() {

        // Avoid multiple registration of menus
        if (this.initialized)
            return;

        this.initialized = true;
      },

      // Define the model for language node
      model: pgBrowser.Node.Model.extend({
        defaults: {
          name: undefined,
          lanowner: undefined,
          comment: undefined,
          lanacl: [],
          seclabels:[]
        },

        // Define the schema for the language node
        schema: [{
          id: 'name', label: '{{ _('Name') }}', cell: 'string',
          type: 'text',
        },{
          id: 'oid', label:'{{ _('OID') }}', cell: 'string', mode: ['properties'],
          type: 'text', disabled: true
        },{
          id: 'lanowner', label:'{{ _('Owner') }}', type: 'text',
          control: Backform.NodeListByNameControl, node: 'role',
          mode: ['edit', 'properties'], select2: { allowClear: false }
        },{
          id: 'acl', label: '{{ _('Privileges') }}', type: 'text',
          group: '{{ _('Security') }}', mode: ['properties'], disabled: true
        },{
          id: 'description', label:'{{ _('Comment') }}', cell: 'string',
          type: 'multiline'
        },{
          id: 'trusted', label:'{{ _('Trusted?') }}', type: 'switch',
          options: {
            'onText': 'Yes', 'offText': 'No',
            'onColor': 'success', 'offColor': 'primary',
            'size': 'small'
          },
          group: 'Definition', mode: ['edit', 'properties'],
          disabled: function(m) {
            return !(m.isNew());
          }
        },{
          id: 'lanproc', label:'{{ _('Handler Function') }}', type: 'text', control: 'node-ajax-options',
          group: 'Definition', mode: ['edit', 'properties'], url:'get_functions',
          /* This function is used to populate the handler function
           * for the selected language node. It will check if the property
           * type is 'handler' then push the data into the result array.
           */
          transform: function(data) {
            var res = [];
            if (data && _.isArray(data)) {
                _.each(data, function(d) {
                  if (d.prop_type == 'handler') {
                    res.push({label: d.label, value: d.label});
                  }
                })
            }
            return res;
          }, disabled: function(m) {
            return !(m.isNew());
          }
        },{
          id: 'laninl', label:'{{ _('Inline Function') }}', type: 'text', control: 'node-ajax-options',
          group: 'Definition', mode: ['edit', 'properties'], url:'get_functions',
          /* This function is used to populate the inline function
           * for the selected language node. It will check if the property
           * type is 'inline' then push the data into the result array.
           */
          transform: function(data) {
            var res = [];
            if (data && _.isArray(data)) {
                _.each(data, function(d) {
                  if (d.prop_type == 'inline') {
                    res.push({label: d.label, value: d.label});
                  }
                })
            }
            return res;
          }, disabled: function(m) {
            return !(m.isNew());
          }
        },{
          id: 'lanval', label:'{{ _('Validator Function') }}', type: 'text', control: 'node-ajax-options',
          group: 'Definition', mode: ['edit', 'properties'], url:'get_functions',
          /* This function is used to populate the validator function
           * for the selected language node. It will check if the property
           * type is 'validator' then push the data into the result array.
           */
          transform: function(data) {
            var res = [];
            if (data && _.isArray(data)) {
                _.each(data, function(d) {
                  if (d.prop_type == 'validator') {
                    res.push({label: d.label, value: d.label});
                  }
                })
            }
            return res;
          }, disabled: function(m) {
            return !(m.isNew());
          }
        }, pgBrowser.SecurityGroupUnderSchema, {
          id: 'lanacl', label: '{{ _('Privileges') }}', type: 'collection',
          group: 'security', control: 'unique-col-collection', mode: ['edit'],
          model: pgBrowser.Node.PrivilegeRoleModel.extend({
            privileges: ['U']
          }), canAdd: true, canDelete: true, uniqueCol : ['grantee']
         },{
          id: 'seclabels', label: '{{ _('Security Labels') }}', mode: ['edit'],
          model: pgBrowser.SecLabelModel, editable: false,
          type: 'collection', group: 'security', min_version: 90200,
          canAdd: true, canEdit: false, canDelete: true,
          control: 'unique-col-collection'
        }
        ],
        /* validate function is used to validate the input given by
         * the user. In case of error, message will be displayed on
         * the GUI for the respective control.
         */
        validate: function() {
          var name = this.get('name');

          if (_.isUndefined(name) || _.isNull(name) ||
            String(name).replace(/^\s+|\s+$/g, '') == '') {
            var msg = '{{ _('Name cannot be empty.') }}';
            this.errorModel.set('name', msg);
            return msg;
          } else {
            this.errorModel.unset('name');
          }
          return null;
        }
      })
    })
  }
  return pgBrowser.Nodes['coll-language'];
});
