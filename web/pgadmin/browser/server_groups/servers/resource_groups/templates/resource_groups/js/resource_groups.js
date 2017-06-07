define([
  'sources/gettext', 'underscore', 'pgadmin.browser',
  'pgadmin.browser.collection'
], function(gettext, _, pgBrowser) {

  // Extend the browser's collection class for resource group collection
  if (!pgBrowser.Nodes['coll-resource_group']) {
    pgBrowser.Nodes['coll-resource_group'] =
      pgBrowser.Collection.extend({
        node: 'resource_group',
        label: gettext('Resource Groups'),
        type: 'coll-resource_group',
        columns: ['name', 'cpu_rate_limit', 'dirty_rate_limit']
    });
  }

  // Extend the browser's node class for resource group node
  if (!pgBrowser.Nodes['resource_group']) {
    pgBrowser.Nodes['resource_group'] = pgBrowser.Node.extend({
      parent_type: 'server',
      type: 'resource_group',
      dialogHelp: "{{ url_for('help.static', filename='resource_group_dialog.html') }}",
      label: gettext('Resource Group'),
      hasSQL:  true,
      canDrop: true,
      Init: function() {

        // Avoid multiple registration of menus
        if (this.initialized) {
          return;
        }

        this.initialized = true;

        // Creating menu for the resource group node
        pgBrowser.add_menus([{
          name: 'create_resourcegroup_on_server', node: 'server', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Resource Group...'),
          icon: 'wcTabIcon icon-resource_group', data: {action: 'create'},
          /* Function is used to check the server type and version.
           * Resource Group only supported in PPAS 9.4 and above.
           */
          enable: function(node, item) {
            var treeData = this.getTreeNodeHierarchy(item),
                server = treeData['server'];
            return server.connected && node.server_type === 'ppas' &&
                   node.version >= 90400;
          }
        },{
          name: 'create_resource_group_on_coll', node: 'coll-resource_group', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Resource Group...'),
          icon: 'wcTabIcon icon-resource_group', data: {action: 'create'}
        },{
          name: 'create_resource_group', node: 'resource_group', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Resource Group...'),
          icon: 'wcTabIcon icon-resource_group', data: {action: 'create'}
        }
        ]);
      },

      // Defining model for resource group node
      model: pgBrowser.Node.Model.extend({
        defaults: {
          name: undefined,
          cpu_rate_limit: 0.0,
          dirty_rate_limit: 0.0
        },

        // Defining schema for the resource group node
        schema: [{
          id: 'name', label: gettext('Name'), cell: 'string',
          type: 'text',
        },{
          id: 'cpu_rate_limit', label: gettext('CPU rate limit (%%)'), cell: 'string',
          type: 'numeric', min:0, max:16777216
        },{
          id: 'dirty_rate_limit', label: gettext('Dirty rate limit (KB)'), cell: 'string',
          type: 'numeric', min:0, max:16777216
        }],

        /* validate function is used to validate the input given by
         * the user. In case of error, message will be displayed on
         * the GUI for the respective control.
         */
        validate: function(keys) {
          var msg, cpu_rate_limit, dirty_rate_limit, name;

          /* Check whether 'name' is present in 'keys', if it is present
           * it means there is a change in that field from the GUI, so we
           * need to validate it.
           */
          if (_.indexOf(keys, 'name') >= 0) {
            name = this.get('name');
            if (_.isUndefined(name) || _.isNull(name) ||
                String(name).replace(/^\s+|\s+$/g, '') === '') {
              msg = gettext('Name cannot be empty.');
              this.errorModel.set('name', msg);
              return msg;
            }
            this.errorModel.unset('name');
          }

          /* Check whether 'cpu_rate_limit' is present in 'keys', if it is present
           * it means there is a change in that field from the GUI, so we
           * need to validate it.
           */
          if (_.indexOf(keys, 'cpu_rate_limit') >= 0) {
            cpu_rate_limit = this.get('cpu_rate_limit');
            if (_.isUndefined(cpu_rate_limit) || _.isNull(cpu_rate_limit) ||
                String(cpu_rate_limit).replace(/^\s+|\s+$/g, '') === '') {
              msg = gettext('CPU rate limit cannot be empty.');
              this.errorModel.set('cpu_rate_limit', msg);
              return msg;
            }
            this.errorModel.unset('cpu_rate_limit');
          }

          /* Check whether 'dirty_rate_limit' is present in 'keys', if it is present
           * it means there is a change in that field from the GUI, so we
           * need to validate it.
           */
          if (_.indexOf(keys, 'dirty_rate_limit') >= 0) {
            dirty_rate_limit = this.get('dirty_rate_limit');
            if (_.isUndefined(dirty_rate_limit) || _.isNull(dirty_rate_limit) ||
              String(dirty_rate_limit).replace(/^\s+|\s+$/g, '') === '') {
              msg = gettext('Dirty rate limit cannot be empty.');
              this.errorModel.set('dirty_rate_limit', msg);
              return msg;
            }
            this.errorModel.unset('dirty_rate_limit');
          }

          return null;
        }
      })
    });
  }

  return pgBrowser.Nodes['coll-resource_group'];
});
