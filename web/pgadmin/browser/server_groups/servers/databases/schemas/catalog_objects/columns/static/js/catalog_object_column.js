define('pgadmin.node.catalog_object_column', [
  'sources/gettext', 'jquery', 'underscore', 'underscore.string', 'pgadmin',
  'pgadmin.browser', 'alertify', 'pgadmin.browser.collection'
], function(gettext, $, _, S, pgAdmin, pgBrowser, alertify) {

  if (!pgBrowser.Nodes['coll-catalog_object_column']) {
    var databases = pgAdmin.Browser.Nodes['coll-catalog_object_column'] =
      pgAdmin.Browser.Collection.extend({
        node: 'catalog_object_column',
        label: gettext('catalog_object_column'),
        type: 'coll-catalog_object_column',
        columns: ['attname', 'attnum', 'cltype', 'description']
      });
  };

  if (!pgBrowser.Nodes['catalog_object_column']) {
    pgAdmin.Browser.Nodes['catalog_object_column'] =
      pgAdmin.Browser.Node.extend({
      parent_type: 'catalog_object',
      type: 'catalog_object_column',
      label: gettext('catalog_object_column'),
      hasSQL:  false,
      hasScriptTypes: [],
      hasDepends: true,
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
            return;

        this.initialized = true;

      },
      model: pgAdmin.Browser.Node.Model.extend({
        defaults: {
          attname: undefined,
          attowner: undefined,
          atttypid: undefined,
          attnum: undefined,
          cltype: undefined,
          collspcname: undefined,
          attacl: undefined,
          description: undefined
        },
        schema: [{
          id: 'attname', label: gettext('Column'), cell: 'string',
          type: 'text', disabled: true
        },{
          id: 'attowner', label: gettext('Owner'), cell: 'string',
          type: 'text', disabled: true
        },{
          id: 'attnum', label: gettext('Position'), cell: 'string',
          type: 'text', disabled: true
        },{
          id: 'cltype', label: gettext('Data type'), cell: 'string',
          group: gettext('Definition'), type: 'text', disabled: true
        },{
          id: 'collspcname', label: gettext('Collation'), cell: 'string',
          group: gettext('Definition'), type: 'text', disabled: true
        },{
          id: 'attacl', label: gettext('Privileges'), cell: 'string',
          group: gettext('Security'), type: 'text', disabled: true
        },{
          id: 'description', label: gettext('Comment'), cell: 'string',
          type: 'multiline', disabled: true
        }]
      })
    });
  }

  return pgBrowser.Nodes['catalog_object_column'];
});
