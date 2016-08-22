/* Create and Register Procedure Collection and Node. */
define(
        ['jquery', 'underscore', 'underscore.string',
         'pgadmin', 'pgadmin.browser', 'alertify',
         'pgadmin.node.edbfunc', 'pgadmin.browser.collection',
         'pgadmin.browser.server.privilege'],
function($, _, S, pgAdmin, pgBrowser, alertify, EdbFunction) {

  if (!pgBrowser.Nodes['coll-edbproc']) {
    pgAdmin.Browser.Nodes['coll-edbproc'] =
      pgAdmin.Browser.Collection.extend({
        node: 'edbproc',
        label: '{{ _('Procedures') }}',
        type: 'coll-edbproc',
        columns: ['name', 'funcowner', 'description'],
        hasStatistics: true
      });
  };

  // Inherit Functions Node
  if (!pgBrowser.Nodes['edbproc']) {
    pgAdmin.Browser.Nodes['edbproc'] = pgBrowser.Node.extend({
      type: 'edbproc',
      dialogHelp: '{{ url_for('help.static', filename='edbproc_dialog.html') }}',
      label: '{{ _('Procedure') }}',
      collection_type: 'coll-edbproc',
      hasDepends: true,
      canEdit: false,
      hasSQL: true,
      hasScriptTypes: [],
      parent_type: ['package'],
      Init: function() {
        /* Avoid multiple registration of menus */
        if (this.proc_initialized)
            return;

        this.proc_initialized = true;

      },
      canDrop: false,
      canDropCascade: false,
      model: EdbFunction.model.extend({
        defaults: _.extend({},
          EdbFunction.model.prototype.defaults,
          {
            lanname: 'edbspl'
          }
        ),
        isVisible: function(m){
          if (this.name == 'sysfunc') { return false; }
          else if (this.name == 'sysproc') { return true; }
          return false;
        },
        validate: function()
        {
          return null;
        }
      }
      )
  });

  }

  return pgBrowser.Nodes['edbproc'];
});
