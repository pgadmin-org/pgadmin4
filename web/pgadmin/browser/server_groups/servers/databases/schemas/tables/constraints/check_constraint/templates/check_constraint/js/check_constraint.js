// Check Constraint Module: Node
define(
  [
   'jquery', 'underscore', 'underscore.string', 'pgadmin', 'pgadmin.browser',
   'alertify', 'pgadmin.browser.collection'
  ],
function($, _, S, pgAdmin, pgBrowser, Alertify) {

  // Check Constraint Node
  if (!pgBrowser.Nodes['check_constraints']) {
    pgAdmin.Browser.Nodes['check_constraints'] = pgBrowser.Node.extend({
      type: 'check_constraints',
      label: '{{ _('Check') }}',
      collection_type: 'coll-constraints',
      sqlAlterHelp: 'ddl-alter.html',
      sqlCreateHelp: 'ddl-constraints.html',
      dialogHelp: '{{ url_for('help.static', filename='check_dialog.html') }}',
      hasSQL: true,
      hasDepends: true,
      parent_type: ['table'],
      Init: function() {
        // Avoid mulitple registration of menus
        if (this.initialized)
            return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_check_constraints_on_coll', node: 'coll-constraints', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 5, label: '{{ _('Check...') }}',
          icon: 'wcTabIcon icon-check_constraints', data: {action: 'create', check: true},
          enable: 'canCreate'
        },{
          name: 'validate_check_constraint', node: 'check_constraints', module: this,
          applies: ['object', 'context'], callback: 'validate_check_constraint',
          category: 'validate', priority: 4, label: '{{ _('Validate check constraint') }}',
          icon: 'fa fa-link', enable : 'is_not_valid', data: {action: 'edit', check: true}
        }
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
          var input = args || {};
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
            success: function(res) {
              if (res.success == 1) {
                Alertify.success("{{ _('" + res.info + "') }}");
                t.removeIcon(i);
                data.valid = true;
                data.icon = 'icon-check_constraints';
                t.addIcon(i, {icon: data.icon});
                setTimeout(function() {t.deselect(i);}, 10);
                setTimeout(function() {t.select(i);}, 100);
              }
            },
            error: function(xhr, status, error) {
              try {
                var err = $.parseJSON(xhr.responseText);
                if (err.success == 0) {
                  msg = S('{{ _(' + err.errormsg + ')}}').value();
                  Alertify.error("{{ _('" + err.errormsg + "') }}");
                }
              } catch (e) {}
              t.unload(i);
            }
            });

          return false;
        }
      },
      canDrop: pgBrowser.Nodes['schema'].canChildDrop,
      model: pgAdmin.Browser.Node.Model.extend({
        idAttribute: 'oid',

        defaults: {
          name: undefined,
          oid: undefined,
          description: undefined,
          consrc: undefined,
          connoinherit: undefined,
          convalidated: true
        },
        // Check Constraint Schema
        schema: [{
          id: 'name', label: '{{ _('Name') }}', type:'text', cell:'string',
          disabled: 'isDisabled'
        },{
          id: 'oid', label:'{{ _('OID') }}', cell: 'string',
          type: 'text' , mode: ['properties']
        },{
          id: 'comment', label: '{{ _('Comment') }}', type: 'multiline', cell:
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
          }
        },{
          id: 'consrc', label: '{{ _('Check') }}', type: 'multiline', cell:
          'string', group: '{{ _('Definition') }}', mode: ['properties',
          'create', 'edit'], disabled: function(m) {
            return ((_.has(m, 'handler') &&
              !_.isUndefined(m.handler) &&
              !_.isUndefined(m.get('oid'))) || (_.isFunction(m.isNew) && !m.isNew()));
          }, editable: false
        },{
          id: 'connoinherit', label: '{{ _('No Inherit?') }}', type:
          'switch', cell: 'boolean', group: '{{ _('Definition') }}', mode:
          ['properties', 'create', 'edit'], min_version: 90200,
          disabled: function(m) {
            return ((_.has(m, 'handler') &&
              !_.isUndefined(m.handler) &&
              !_.isUndefined(m.get('oid'))) || (_.isFunction(m.isNew) && !m.isNew()));
          }
        },{
          id: 'convalidated', label: "{{ _("Don't validate?") }}", type: 'switch', cell:
          'boolean', group: '{{ _('Definition') }}', min_version: 90200,
          disabled: function(m) {
            if ((_.isFunction(m.isNew) && !m.isNew()) ||
                  (_.has(m, 'handler') &&
                  !_.isUndefined(m.handler) &&
                  !_.isUndefined(m.get('oid')))) {

              return !m.get("convalidated");
            } else {
              return false;
            }
          },
          mode: ['properties', 'create', 'edit']
        }],
        // Client Side Validation
        validate: function() {
          var err = {},
              errmsg;

          if (_.isUndefined(this.get('consrc')) || String(this.get('consrc')).replace(/^\s+|\s+$/g, '') == '') {
            err['consrc'] = '{{ _('Check can not be empty!') }}';
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
        }
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
      }
  });

  }

  return pgBrowser.Nodes['check_constraints'];
});
