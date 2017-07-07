define('pgadmin.node.constraints', [
  'sources/gettext', 'jquery', 'underscore', 'underscore.string', 'pgadmin',
  'pgadmin.browser', 'pgadmin.browser.collection'{% for c in constraints %}, 'pgadmin.node.{{ c|safe }}'{%endfor%}
], function(gettext, $, _, S, pgAdmin, pgBrowser) {

  if (!pgBrowser.Nodes['coll-constraints']) {
    var databases = pgAdmin.Browser.Nodes['coll-constraints'] =
      pgAdmin.Browser.Collection.extend({
        node: 'constraints',
        label: gettext('Constraints'),
        type: 'coll-constraints',
        getTreeNodeHierarchy: pgBrowser.tableChildTreeNodeHierarchy,
        columns: ['name', 'comment']
      });
  };

  if (!pgBrowser.Nodes['constraints']) {
    pgAdmin.Browser.Nodes['constraints'] = pgBrowser.Node.extend({
      getTreeNodeHierarchy: pgBrowser.tableChildTreeNodeHierarchy,
      type: 'constraints',
      label: gettext('Constraints'),
      collection_type: 'coll-constraints',
      parent_type: ['table','partition'],
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
          id: 'name', label: gettext('Name'), type: 'text',
          mode: ['properties', 'create', 'edit']
        },{
          id: 'oid', label: gettext('Oid'), cell: 'string',
          type: 'text' , mode: ['properties']
        },{
          id: 'comment', label: gettext('Comment'), cell: 'string',
          type: 'multiline', mode: ['properties', 'create', 'edit']
        }]
      })
  });
  }

  return pgBrowser.Nodes['constraints'];
});
