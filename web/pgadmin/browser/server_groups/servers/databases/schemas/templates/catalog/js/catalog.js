 define(
        ['jquery', 'underscore', 'underscore.string', 'pgadmin',
        'pgadmin.browser', 'backform', 'alertify', 'pgadmin.browser.collection'],
function($, _, S, pgAdmin, pgBrowser, Backform, alertify) {
   // Extend the browser's collection class for SecurityLabel control
    var SecurityModel = Backform.SecurityModel = pgAdmin.Browser.Node.Model.extend({
    defaults: {
      provider: null,
      security_label: null
    },
    schema: [{
      id: 'provider', label: '{{ _('Provider') }}',
      type: 'text', disabled: false
    },{
      id: 'security_label', label: '{{ _('Security Label') }}',
      type: 'text', disabled: false
    }],
    validate: function() {
      var err = {},
          errmsg = null;

      if (_.isUndefined(this.get('security_label')) ||
        _.isNull(this.get('security_label')) ||
        String(this.get('security_label')).replace(/^\s+|\s+$/g, '') == '') {
            errmsg =  '{{ _('Please specify the value for all the security providers.')}}';
            this.errorModel.set('security_label', errmsg);
            return errmsg;
          } else {
            this.errorModel.unset('security_label');
          }
      return null;
    }
  });

  // Extend the browser's collection class for catalog collection
  if (!pgBrowser.Nodes['coll-catalog']) {
    var databases = pgAdmin.Browser.Nodes['coll-catalog'] =
      pgAdmin.Browser.Collection.extend({
        node: 'catalog',
        label: '{{ _('Catalogs') }}',
        type: 'coll-catalog',
        columns: ['name', 'oid', 'description']
      });
  };
  // Extend the browser's node class for catalog node
  if (!pgBrowser.Nodes['catalog']) {
    pgAdmin.Browser.Nodes['catalog'] = pgAdmin.Browser.Node.extend({
      parent_type: 'database',
      type: 'catalog',
      label: '{{ _('Catalog') }}',
      hasSQL:  true,
      hasDepends: true,
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
            return;

        this.initialized = true;

      },
      model: pgAdmin.Browser.Node.Model.extend({
        defaults: {
          name: undefined,
          namespaceowner: undefined,
          nspacl: undefined,
          description: undefined,
          securitylabel: []
        },
        initialize: function(attrs, args) {
          var isNew = (_.size(attrs) === 0);

          if (isNew) {
            var userInfo = pgBrowser.serverInfo[args.node_info.server._id].user;

            this.set({'namespaceowner': userInfo.name}, {silent: true});
          }
          pgAdmin.Browser.Node.Model.prototype.initialize.apply(this, arguments);
        },
        schema: [{
          id: 'name', label: '{{ _('Name') }}', cell: 'string',
          type: 'text', disabled: true
        },{
          id: 'oid', label:'{{ _('Oid') }}', cell: 'string',
          type: 'text', disabled: true
        },{
          id: 'namespaceowner', label:'{{ _('Owner') }}', cell: 'string',
          type: 'text', disabled: true
        },{
          id: 'acl', label: '{{ _('Privileges') }}', type: 'text',
          mode: ['properties'], disabled: true
        },{
          id: 'description', label:'{{ _('Comment') }}', cell: 'string',
          type: 'multiline'
       },{
          id: 'seclabels', label: '{{ _('Security Labels') }}',
          model: SecurityModel, editable: false, type: 'collection',
          group: '{{ _('Security') }}', mode: ['edit', 'create'],
          min_version: 90200, canAdd: true,
          canEdit: false, canDelete: true, control: 'unique-col-collection'
         }
        ],
        validate: function() {
          return null;
        }
      })
  });

  }

  return pgBrowser.Nodes['catalog'];
});
