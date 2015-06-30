define(
    ['jquery', 'underscore', 'pgadmin', 'backbone', 'pgadmin.browser', 'pgadmin.browser.node'],
function($, _, pgAdmin, Backbone) {

  if (!pgAdmin.Browser.Nodes['server-group']) {
    pgAdmin.Browser.Nodes['server-group'] = pgAdmin.Browser.Node.extend({
      parent_type: null,
      type: 'server-group',
      label: '{{ _('Server Group') }}',
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
            return;

        this.initialized = true;

        pgAdmin.Browser.add_menus([{
          name: 'create_server_group', node: 'server-group', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 1, label: '{{ _('Server Group...') }}',
          data: {'action': 'create'}, icon: 'wcTabIcon icon-server-group'
        },{
          name: 'edit_server_group', node: 'server-group', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          priority: 3, label: '{{ _('Edit...') }}', data: {'action': 'edit'},
          icon: 'fa fa-pencil-square-o'
        }, {
          name: 'drop_server_group', node: 'server-group', module: this,
          applies: ['object', 'context'], callback: 'delete_obj',
          priority: 2, label: '{{ _('Drop Server Group...') }}',
          icon: 'fa fa-trash'
        }]);
      },
      model: pgAdmin.Browser.Node.Model.extend({
        defaults: {
          id: undefined,
          name: undefined
        },
        schema: [
          {id: 'id', label: 'ID', type: 'int', group: null, mode: ['properties']},
          {id: 'name', label:'Name', type: 'text', group: null, mode: ['properties', 'edit', 'create']}
        ],
        validate: function(attrs, options) {
          if (!this.isNew() && 'id' in this.changed) {
            return '{{ _('Id can not be changed!') }}';
          }
          if (String(this.name).replace(/^\s+|\s+$/g, '') == '') {
            return '{{ _('Name can be empty!') }}';
          }
          return null;
        }
      }),
      canDelete: function(i) {
        var s = pgAdmin.Browser.tree.siblings(i, true);

        /* This is the only server group - we can't remove it*/
        if (!s || s.length == 0) {
          return false;
        }
        return true;
      },
      callbacks: {
        // Add a server group
        create_server_group: function() {
          var tree = pgAdmin.Browser.tree;
          var alert = alertify.prompt(
            '{{ _('Add a server group') }}',
            '{{ _('Enter a name for the new server group') }}',
            function(evt, value) {
              $.post("{{ url_for('browser.index') }}server-group/obj/", { name: value })
                .done(function(data) {
                  if (data.success == 0) {
                    report_error(data.errormsg, data.info);
                  } else {
                    var item = {
                      id: data.data.id,
                      label: data.data.name,
                      inode: true,
                      open: false,
                      icon: 'icon-server-group'
                    }
                    tree.append(null, {
                      itemData: item
                    });
                  }
                })
            },
            function() {}
          );
          alert.show();
        },
        // Delete a server group
        drop_server_group: function (item) {
          var tree = pgAdmin.Browser.tree;
          alertify.confirm(
            '{{ _('Delete server group?') }}',
            '{{ _('Are you sure you wish to delete the server group "{0}"?') }}'.replace('{0}', tree.getLabel(item)),
            function() {
              var d = tree.itemData(item);
              $.ajax({
                url:"{{ url_for('browser.index') }}" + d._type + "/obj/" + d.refid,
                type:'DELETE',
                success: function(data) {
                  if (data.success == 0) {
                    report_error(data.errormsg, data.info);
                  } else {
                    var next = tree.next(item);
                    var prev = tree.prev(item);
                    tree.remove(item);
                    if (next.length) {
                      tree.select(next);
                    } else if (prev.length) {
                      tree.select(prev);
                    }
                  }
                }
              });
            },
            function() {}
          ).show();
        },
        // Rename a server group
        rename_server_group: function (item) {
          var tree = pgAdmin.Browser.tree;
          alertify.prompt(
            '{{ _('Rename server group') }}',
            '{{ _('Enter a new name for the server group') }}',
            tree.getLabel(item),
            function(evt, value) {
              var d = tree.itemData(item);
              $.ajax({
                url:"{{ url_for('browser.index') }}" + d._type + "/obj/" + d.refid,
                type:'PUT',
                params: { name: value },
                success: function(data) {
                  if (data.success == 0) {
                    report_error(data.errormsg, data.info);
                  } else {
                    tree.setLabel(item, { label: value });
                  }
                }
              })
            },
            null
          ).show();
        }
      }
    });
  }

  return pgAdmin.Browser.Nodes['server-group'];
});
