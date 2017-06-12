/* Create and Register Function Collection and Node. */
define('pgadmin.node.edbvar', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore',
  'underscore.string', 'pgadmin', 'pgadmin.browser', 'alertify',
  'pgadmin.browser.collection', 'pgadmin.browser.server.privilege'
], function(gettext, url_for, $, _, S, pgAdmin, pgBrowser, alertify) {

  if (!pgBrowser.Nodes['coll-edbvar']) {
    pgBrowser.Nodes['coll-edbvar'] =
      pgBrowser.Collection.extend({
        node: 'edbvar',
        label: gettext('Variables'),
        type: 'coll-edbvar',
        columns: ['name', 'funcowner', 'description']
      });
  };

  if (!pgBrowser.Nodes['edbvar']) {
    pgBrowser.Nodes['edbvar'] = pgBrowser.Node.extend({
      type: 'edbvar',
      dialogHelp: url_for('help.static', {'filename': 'edbvar_dialog.html'}),
      label: gettext('Function'),
      collection_type: 'coll-edbvar',
      canEdit: false,
      hasSQL: true,
      hasScriptTypes: [],
      parent_type: ['package'],
      Init: function(args) {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
            return;

        this.initialized = true;

      },
      canDrop: false,
      canDropCascade: false,
      model: pgBrowser.Node.Model.extend({
        defaults: {
          name: undefined,
          oid: undefined,
          datatype: undefined,
          visibility: 'Unknown'
        },
        schema: [{
          id: 'name', label: gettext('Name'), cell: 'string',
          type: 'text', mode: ['properties'],
          disabled: true
        },{
          id: 'oid', label: gettext('OID'), cell: 'string',
          type: 'text' , mode: ['properties']
        },{
          id: 'datatype', label: gettext('Data type'), cell: 'string',
          type: 'text', disabled: true
        },{
          id: 'visibility', label: gettext('Visibility'), cell: 'string',
          type: 'text', mode: ['properties'],
          disabled: true
        }],
        validate: function()
        {
          return null;
        }
      })
  });

  }

  return pgBrowser.Nodes['edbvar'];
});
