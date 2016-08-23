define(
    ['jquery', 'underscore', 'pgadmin', 'backbone', 'pgadmin.browser', 'pgadmin.browser.node'],
function($, _, pgAdmin, Backbone) {

  if (!pgAdmin.Browser.Nodes['server-group']) {
    pgAdmin.Browser.Nodes['server-group'] = pgAdmin.Browser.Node.extend({
      parent_type: null,
      type: 'server-group',
      dialogHelp: '{{ url_for('help.static', filename='server_group_dialog.html') }}',
      label: '{{ _('Server Group') }}',
      width: '350px',
      height: '250px',
      is_collection: true,
      Init: function() {
        /* Avoid multiple registration of menus */
        if (this.initialized)
            return;

        this.initialized = true;

        pgAdmin.Browser.add_menus([{
          name: 'create_server_group', node: 'server-group', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 1, label: '{{ _('Server Group...') }}',
          data: {'action': 'create'}, icon: 'wcTabIcon icon-server-group'
        }]);
      },
      model: pgAdmin.Browser.Node.Model.extend({
        defaults: {
          id: undefined,
          name: null
        },
        schema: [
          {
            id: 'id', label: 'ID', type: 'int', group: null,
            mode: ['properties']
          },{
            id: 'name', label:'Name', type: 'text', group: null,
            mode: ['properties', 'edit', 'create']
          }
        ],
        validate: function(attrs, options) {
          if (!this.isNew() && 'id' in this.changed) {
            return '{{ _('The ID cannot be changed.') }}';
          }
          if (String(this.name).replace(/^\s+|\s+$/g, '') == '') {
            return '{{ _('Name cannot be empty.') }}';
          }
          return null;
        }
      }),
      canDrop: function(itemData, item, data) {
        if(itemData.can_delete) {
          return true;
        }
        return false;
      },
      canDelete: function(i) {
        var s = pgAdmin.Browser.tree.siblings(i, true);

        /* This is the only server group - we can't remove it*/
        if (!s || s.length == 0) {
          return false;
        }
        return true;
      }
    });
  }

  return pgAdmin.Browser.Nodes['server-group'];
});
