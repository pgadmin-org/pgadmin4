define(
  [
  'jquery', 'underscore', 'underscore.string', 'pgadmin', 'pgadmin.browser',
  'pgadmin.browser.collection'{% for c in constraints %}, 'pgadmin.node.{{ c }}'{%endfor%}
  ],
function($, _, S, pgAdmin, pgBrowser) {

  if (!pgBrowser.Nodes['coll-constraints']) {
    var databases = pgAdmin.Browser.Nodes['coll-constraints'] =
      pgAdmin.Browser.Collection.extend({
        node: 'constraints',
        label: '{{ _('Constraints') }}',
        type: 'coll-constraints',
        columns: ['name', 'comment']
      });
  };

  if (!pgBrowser.Nodes['constraints']) {
    pgAdmin.Browser.Nodes['constraints'] = pgBrowser.Node.extend({
      type: 'constraints',
      label: '{{ _('Constraints') }}',
      collection_type: 'coll-constraints',
      parent_type: ['table'],
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
            return;

        this.initialized = true;

        pgBrowser.add_menus([]);
      },
      model: pgAdmin.Browser.Node.Model.extend({
        defaults: {
          name: undefined,
          oid: undefined,
          comment: undefined
       },
        schema: [{
          id: 'name', label: '{{ _('Name') }}', type: 'text',
          mode: ['properties', 'create', 'edit']
        },{
          id: 'oid', label:'{{ _('Oid') }}', cell: 'string',
          type: 'text' , mode: ['properties']
        },{
          id: 'comment', label:'{{ _('Comment') }}', cell: 'string',
          type: 'multiline', mode: ['properties', 'create', 'edit']
        }]
      })
  });
  }

  return pgBrowser.Nodes['constraints'];
});
