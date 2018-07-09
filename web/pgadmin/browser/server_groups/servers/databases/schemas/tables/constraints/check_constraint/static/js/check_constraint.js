// Check Constraint Module: Node
define('pgadmin.node.check_constraint', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore',
  'underscore.string', 'sources/pgadmin', 'pgadmin.browser', 'pgadmin.alertifyjs',
  'pgadmin.node.schema.dir/schema_child_tree_node', 'pgadmin.browser.collection',
], function(gettext, url_for, $, _, S, pgAdmin, pgBrowser, alertify, schemaChildTreeNode) {

  // Check Constraint Node
  if (!pgBrowser.Nodes['check_constraint']) {
    pgAdmin.Browser.Nodes['check_constraint'] = pgBrowser.Node.extend({
      type: 'check_constraint',
      label: gettext('Check'),
      collection_type: 'coll-constraints',
      sqlAlterHelp: 'ddl-alter.html',
      sqlCreateHelp: 'ddl-constraints.html',
      dialogHelp: url_for('help.static', {'filename': 'check_dialog.html'}),
      hasSQL: true,
      hasDepends: true,
      parent_type: ['table','partition'],
      Init: function() {
        // Avoid mulitple registration of menus
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_check_constraint_on_coll', node: 'coll-constraints', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 5, label: gettext('Check...'),
          icon: 'wcTabIcon icon-check_constraint', data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'validate_check_constraint', node: 'check_constraint', module: this,
          applies: ['object', 'context'], callback: 'validate_check_constraint',
          category: 'validate', priority: 4, label: gettext('Validate check constraint'),
          icon: 'fa fa-link', enable : 'is_not_valid', data: {action: 'edit', check: true},
        },
        ]);

      },
      is_not_valid: function(itemData, item, data) {
        if (this.canCreate(itemData, item, data)) {
          return (itemData && !itemData.valid);
        } else {
          return false;
        }
      },
      callbacks: {
        validate_check_constraint: function(args) {
          var input = args || {},
            obj = this,
            t = pgBrowser.tree,
            i = input.item || t.selected(),
            d = i && i.length == 1 ? t.itemData(i) : undefined;

          if (!d) {
            return false;
          }
          var data = d;
          $.ajax({
            url: obj.generate_url(i, 'validate', d, true),
            type:'GET',
          })
          .done(function(res) {
            if (res.success == 1) {
              alertify.success(res.info);
              t.removeIcon(i);
              data.valid = true;
              data.icon = 'icon-check_constraint';
              t.addIcon(i, {icon: data.icon});
              setTimeout(function() {t.deselect(i);}, 10);
              setTimeout(function() {t.select(i);}, 100);
            }
          })
          .fail(function(xhr, status, error) {
            alertify.pgRespErrorNotify(xhr, error);
            t.unload(i);
          });

          return false;
        },
      },
      canDrop: schemaChildTreeNode.isTreeItemOfChildOfSchema,
      model: pgAdmin.Browser.Node.Model.extend({
        idAttribute: 'oid',

        defaults: {
          name: undefined,
          oid: undefined,
          description: undefined,
          consrc: undefined,
          connoinherit: undefined,
          convalidated: true,
        },
        // Check Constraint Schema
        schema: [{
          id: 'name', label: gettext('Name'), type:'text', cell:'string',
          disabled: 'isDisabled',
        },{
          id: 'oid', label: gettext('OID'), cell: 'string',
          type: 'text' , mode: ['properties'],
        },{
          id: 'comment', label: gettext('Comment'), type: 'multiline', cell:
          'string', mode: ['properties', 'create', 'edit'],
          deps:['name'], disabled:function(m) {
            var name = m.get('name');
            if (!(name && name != '')) {
              setTimeout(function(){
                if(m.get('comment') && m.get('comment') !== '')
                  m.set('comment', null);
              },10);
              return true;
            } else {
              return false;
            }
          },
        },{
          id: 'consrc', label: gettext('Check'), type: 'multiline', cell:
          'string', group: gettext('Definition'), mode: ['properties',
            'create', 'edit'], disabled: function(m) {
              return ((_.has(m, 'handler') &&
              !_.isUndefined(m.handler) &&
              !_.isUndefined(m.get('oid'))) || (_.isFunction(m.isNew) && !m.isNew()));
            }, editable: false,
        },{
          id: 'connoinherit', label: gettext('No Inherit?'), type:
          'switch', cell: 'boolean', group: gettext('Definition'), mode:
          ['properties', 'create', 'edit'], min_version: 90200,
          disabled: function(m) {
            // Disabled if table is a partitioned table.
            if ((_.has(m , 'top') && !_.isUndefined(m.top) && m.top.get('is_partitioned')) ||
                (_.has(m, 'node_info') && _.has(m.node_info, 'table') &&
                _.has(m.node_info.table, 'is_partitioned') && m.node_info.table.is_partitioned)
            ){
              setTimeout(function(){
                m.set('connoinherit', false);
              },10);

              return true;
            }

            return ((_.has(m, 'handler') &&
              !_.isUndefined(m.handler) &&
              !_.isUndefined(m.get('oid'))) || (_.isFunction(m.isNew) && !m.isNew()));
          },
        },{
          id: 'convalidated', label: gettext('Don\'t validate?'), type: 'switch', cell:
          'boolean', group: gettext('Definition'), min_version: 90200,
          disabled: function(m) {
            if ((_.isFunction(m.isNew) && !m.isNew()) ||
                  (_.has(m, 'handler') &&
                  !_.isUndefined(m.handler) &&
                  !_.isUndefined(m.get('oid')))) {

              return !m.get('convalidated');
            } else {
              return false;
            }
          },
          mode: ['properties', 'create', 'edit'],
        }],
        // Client Side Validation
        validate: function() {
          var err = {},
            errmsg;

          if (_.isUndefined(this.get('consrc')) || String(this.get('consrc')).replace(/^\s+|\s+$/g, '') == '') {
            err['consrc'] = gettext('Check cannot be empty.');
            errmsg = errmsg || err['consrc'];
          }

          this.errorModel.clear().set(err);

          if (_.size(err)) {
            this.trigger('on-status', {msg: errmsg});
            return errmsg;
          }

          return null;

        },
        isDisabled: function(m){
          if ((_.has(m, 'handler') &&
              !_.isUndefined(m.handler) &&
              !_.isUndefined(m.get('oid'))) ||
            (_.isFunction(m.isNew) && !m.isNew())) {
            var server = (this.node_info || m.top.node_info).server;
            if (server.version < 90200)
            {
              return true;
            }
          }
          return false;
        },
      }),
      // Below function will enable right click menu for creating check constraint.
      canCreate: function(itemData, item, data) {
          // If check is false then , we will allow create menu
        if (data && data.check == false)
          return true;

        var t = pgBrowser.tree, i = item, d = itemData, parents = [];
          // To iterate over tree to check parent node
        while (i) {
            // If it is schema then allow user to c reate table
          if (_.indexOf(['schema'], d._type) > -1)
            return true;
          parents.push(d._type);
          i = t.hasParent(i) ? t.parent(i) : null;
          d = i ? t.itemData(i) : null;
        }
          // If node is under catalog then do not allow 'create' menu
        if (_.indexOf(parents, 'catalog') > -1) {
          return false;
        } else {
          return true;
        }
      },
    });

  }

  return pgBrowser.Nodes['check_constraint'];
});
