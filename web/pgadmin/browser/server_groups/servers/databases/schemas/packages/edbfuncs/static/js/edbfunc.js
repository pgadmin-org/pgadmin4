/* Create and Register Function Collection and Node. */
define('pgadmin.node.edbfunc', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore',
  'underscore.string', 'pgadmin', 'pgadmin.browser', 'alertify',
  'pgadmin.browser.collection', 'pgadmin.browser.server.privilege'
], function(gettext, url_for, $, _, S, pgAdmin, pgBrowser, alertify) {

  if (!pgBrowser.Nodes['coll-edbfunc']) {
    pgBrowser.Nodes['coll-edbfunc'] =
      pgBrowser.Collection.extend({
        node: 'edbfunc',
        label: gettext('Functions'),
        type: 'coll-edbfunc',
        columns: ['name', 'funcowner', 'description']
      });
  };

  if (!pgBrowser.Nodes['edbfunc']) {
    pgBrowser.Nodes['edbfunc'] = pgBrowser.Node.extend({
      type: 'edbfunc',
      dialogHelp: url_for('help.static', {'filename': 'edbfunc_dialog.html'}),
      label: gettext('Function'),
      collection_type: 'coll-edbfunc',
      hasDepends: true,
      canEdit: false,
      hasSQL: true,
      hasScriptTypes: [],
      parent_type: ['package'],
      Init: function(args) {
        /* Avoid multiple registration of menus */
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
          funcowner: undefined,
          pronargs: undefined, /* Argument Count */
          proargs: undefined, /* Arguments */
          proargtypenames: undefined, /* Argument Signature */
          prorettypename: undefined, /* Return Type */
          lanname: 'sql', /* Language Name in which function is being written */
          prosrc: undefined,
          proacl: undefined,
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
          id: 'funcowner', label: gettext('Owner'), cell: 'string',
          type: 'text', disabled: true
        },{
          id: 'pronargs', label: gettext('Argument count'), cell: 'string',
          type: 'text', group: gettext('Definition'), mode: ['properties']
        },{
          id: 'proargs', label: gettext('Arguments'), cell: 'string',
          type: 'text', group: gettext('Definition'), mode: ['properties'],
          disabled: true
        },{
          id: 'proargtypenames', label: gettext('Signature arguments'), cell:
          'string', type: 'text', group: gettext('Definition'), mode: ['properties'],
          disabled: true
        },{
          id: 'prorettypename', label: gettext('Return type'), cell: 'string',
          type: 'text', group: gettext('Definition'), disabled: true,
          mode: ['properties'], visible: 'isVisible'
        },{
          id: 'visibility', label: gettext('Visibility'), cell: 'string',
          type: 'text', mode: ['properties'],
          disabled: true
        },{
          id: 'lanname', label: gettext('Language'), cell: 'string',
          type: 'text', group: gettext('Definition'), disabled: true
        },{
          id: 'prosrc', label: gettext('Code'), cell: 'string',
          type: 'text', mode: ['properties'],
          group: gettext('Definition'),
          control: Backform.SqlFieldControl,
          extraClasses:['custom_height_css_class'],
          visible: function(m) {
            if (m.get('lanname') == 'c') {
              return false;
            }
            return true;
          }, disabled: true
        }],
        validate: function()
        {
          return null;
        },
        isVisible: function(m){
          if (this.name == 'sysproc') { return false; }
          return true;
        }
      })
  });

  }

  return pgBrowser.Nodes['edbfunc'];
});
