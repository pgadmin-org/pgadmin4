(function(root, factory) {
  // Set up Backform appropriately for the environment. Start with AMD.
  if (typeof define === 'function' && define.amd) {
    define(['underscore', 'jquery', 'backbone', 'backform', 'backgrid', 'alertify', 'pgadmin.browser.node'],
     function(_, $, Backbone, Backform, Backgrid, Alertify, pgNode) {
      // Export global even in AMD case in case this script is loaded with
      // others that may still expect a global Backform.
      return factory(root, _, $, Backbone, Backform, Backgrid, Alertify, pgNode);
    });

  // Next for Node.js or CommonJS. jQuery may not be needed as a module.
  } else if (typeof exports !== 'undefined') {
    var _ = require('underscore') || root._,
      $ = root.jQuery || root.$ || root.Zepto || root.ender,
      Backbone = require('backbone') || root.Backbone,
      Backform = require('backform') || root.Backform;
      Backgrid = require('backgrid') || root.Backgrid;
      Alertify = require('alertify') || root.Alertify;
      pgAdmin = require('pgadmin.browser.node') || root.pgAdmin.Browser.Node;
    factory(root, _, $, Backbone, Backform, Alertify, pgNode);

  // Finally, as a browser global.
  } else {
    factory(root, root._, (root.jQuery || root.Zepto || root.ender || root.$), root.Backbone, root.Backform, root.Backgrid, root.alertify, root.pgAdmin.Browser.Node);
  }
} (this, function(root, _, $, Backbone, Backform, Backgrid, Alertify, pgNode) {

  /**
   * Each Privilege, supporeted by an database object, will be represented
   * using this Model.
   *
   * Defaults:
   *   privilege_type -> Name of the permission
   *      i.e. CREATE, TEMPORARY, CONNECT, etc.
   *   privilege      -> Has privilege? (true/false)
   *   with_grant     -> Has privilege with grant option (true/false)
   **/
  var PrivilegeModel = pgNode.Model.extend({
    idAttribute: 'privilege_type',
    defaults: {
      privilege_type: undefined,
      privilege: false,
      with_grant: false
    },
    validate: function() {
      return null;
    }
  });

  /**
   * A database object has privileges item list (aclitem[]).
   *
   * This model represents the individual privilege item (aclitem).
   * It has basically three properties:
   *  + grantee    - Role to which that privilege applies to.
   *                Empty value represents to PUBLIC.
   *  + grantor    - Granter who has given this permission.
   *  + privileges - Privileges for that role.
   **/
  var PrivilegeRoleModel = pgNode.PrivilegeRoleModel = pgNode.Model.extend({
    defaults: {
      grantee: undefined,
      grantor: undefined,
      privileges: undefined
    },
    keys: ['grantee', 'grantor'],
    /*
     * Each of the database object needs to extend this model, which should
     * provide the type of privileges (it supports).
     */
    privileges:[],
    schema: [{
      id: 'grantee', label:'Grantee', type:'text', group: null,
      editable: true, cellHeaderClasses: 'width_percent_40',
      cell: 'node-list-by-name', node: 'role',
      disabled : function(column, collection) {
        if (column instanceof Backbone.Collection) {
          // This has been called during generating the header cell
          return false;
        }
        return !(this.node_info && this.node_info.server.user.name == column.get('grantor'));
      },
      transform: function(data) {
        var res =
          Backgrid.Extension.NodeListByNameCell.prototype.defaults.transform.apply(
            this, arguments
            );
        res.unshift({label: 'public', value: 'public'});
        return res;
      }
    },{
      id: 'privileges', label:'Privileges',
      type: 'collection', model: PrivilegeModel, group: null,
      cell: 'privilege', control: 'text', cellHeaderClasses: 'width_percent_40',
      disabled : function(column, collection) {
        if (column instanceof Backbone.Collection) {
          // This has been called during generating the header cell
          return false;
        }
        return !(this.node_info && this.node_info.server.user.name == column.get('grantor') ||
                this.attributes.node_info.server.user.name == column.get('grantor'));
      }
    },{
      id: 'grantor', label: 'Granter', type: 'text', disabled: true,
      cell: 'node-list-by-name', node: 'role'
    }],

    /*
     * Initialize the model, which will transform the privileges string to
     * collection of Privilege Model.
     */
    initialize: function(attrs, opts) {

      pgNode.Model.prototype.initialize.apply(this, arguments);

      if (_.isNull(attrs)) {
        this.set(
            'grantor',
            opts && opts.top && opts.top.node_info && opts.top.node_info.server.user.name,
            {silent: true}
            );
      }

      /*
       * Define the collection of the privilege supported by this model
       */
      var privileges = this.get('privileges') || {};
      if (_.isArray(privileges)) {
        privileges = new (pgNode.Collection)(
            models, {
              model: PrivilegeModel,
              top: this.top || this,
              handler: this,
              silent: true,
              parse: false
            });
        this.set('privileges', privileges, {silent: true});
      }

      var privs = {};
      _.each(this.privileges, function(p) {
        privs[p] = {
          'privilege_type': p, 'privilege': false, 'with_grant': false
        }
      });

      privileges.each(function(m) {
        delete privs[m.get('privilege_type')];
      });

      _.each(privs, function(p) {
        privileges.add(p, {silent: true});
      });

      return this;
    },

    toJSON: function(session) {
      if (session) {
        return pgNode.Model.prototype.toJSON.apply(this, arguments);
      }

      var privileges = [];

      this.attributes['privileges'].each(
        function(p) {
          if (p.get('privilege')) {
            privileges.push(p.toJSON());
          }
        });

      return {
        'grantee': this.get('grantee'),
        'grantor': this.get('grantor'),
        'privileges': privileges
        };
    },

    validate: function() {
      return null;
    }
  });

  /**
     Custom cell editor for editing privileges.
   */
  var PrivilegeCellEditor = Backgrid.Extension.PrivilegeCellEditor =
    Backgrid.CellEditor.extend({
      tagName: "div",

      // All available privileges in the PostgreSQL database server for
      // generating the label for the specific Control
      Labels: {
        "C": "CREATE",
        "T": "TEMPORARY",
        "c": "CONNECT",
        "a": "INSERT",
        "r": "SELECT",
        "w": "UPDATE",
        "d": "DELETE",
        "D": "TRUNCATE",
        "x": "REFERENCES",
        "t": "TRIGGER",
        "U": "USAGE",
        "X": "EXECUTE"
        },

      template: _.template([
        '<tr class="<%= header ? "header" : "" %>">',
        ' <td class="renderable">',
        '  <label>',
        '   <input type="checkbox" name="privilege" privilege="<%- privilege_type %>" target="<%- target %>" <%= privilege ? \'checked\' : "" %>></input>',
        '   <%- privilege_label %>',
        '  </label>',
        ' </td>',
        ' <td class="renderable">',
        '  <label>',
        '   <input type="checkbox" name="with_grant" privilege="<%- privilege_type %>" target="<%- target %>" <%= with_grant ? \'checked\' : "" %> <%= privilege ? "" : \'disabled\'%>></input>',
        '   WITH GRANT OPTION',
        '  </label>',
        ' </td>',
        '</tr>'].join(" "), null, {variable: null}),

    events: {
      'change': 'privilegeChanged',
      'blur': 'lostFocus'
    },

    render: function () {
      this.$el.empty();
      this.$el.attr('tabindex', '1');
      this.$el.attr('target', this.elId);

      var collection = this.model.get(this.column.get("name")),
          tbl = $("<table></table>").appendTo(this.$el),
          self = this,
          privilege = true, with_grant = true;

      // For each privilege generate html template.
      // List down all the Privilege model.
      collection.each(function(m) {
        var d = m.toJSON();

        privilege = (privilege && d.privilege);
        with_grant = (with_grant && privilege && d.with_grant);

        _.extend(
          d, {
            'target': self.cid,
            'header': false,
            'privilege_label': self.Labels[d.privilege_type]
            });
        privilege = (privilege && d.privilege);
        with_grant = (with_grant && privilege && d.with_grant);
        tbl.append(self.template(d));
      });

      if (collection.length > 1) {
        // Preprend the ALL controls on that table
        tbl.prepend(
            self.template({
              'target': self.cid,
              'privilege_label': 'ALL',
              'privilege_type': 'ALL',
              'privilege': privilege,
              'with_grant': with_grant,
              'header': true
            }));
      }
      self.$el.find('input[type=checkbox]').first().focus();
      // Since blur event does not bubble we need to explicitly call parent's blur event.
      $(self.$el.find('input[type=checkbox]')).on('blur',function() {
        self.$el.blur();
      });

      // Make row visible in when entering in edit mode.
      $(self.$el).pgMakeVisible('backform-tab');

      self.delegateEvents();

      return this;
    },

    /*
     * Listen to the checkbox value change and update the model accordingly.
     */
    privilegeChanged: function(ev) {
      if (ev && ev.target) {
        /*
         * We're looking for checkboxes only.
         */
        var $el = $(ev.target),
            privilege_type = $el.attr('privilege'),
            type = $el.attr('name'),
            checked = $el.prop('checked'),
            $tr = $el.closest('tr'),
            $tbl = $tr.closest('table'),
            collection = this.model.get('privileges');

        /*
         * If the checkbox selected/deselected is for 'ALL', we will select all
         * the checkbox for each privilege.
         */
        if (privilege_type == 'ALL') {
          var $elGrant = $tr.find('input[name=with_grant]'),
              $allPrivileges = $tbl.find(
                  'input[name=privilege][privilege!=\'ALL\']'
                  ),
              $allGrants = $tbl.find(
                  'input[name=with_grant][privilege!=\'ALL\']'
                  ),
              allPrivilege, allWithGrant;

          if (type == 'privilege') {
            /*
             * We clicked the privilege checkbox, and not checkbox for with
             * grant options.
             */
            allPrivilege = checked;
            allWithGrant = false;

            if (checked) {
              $allPrivileges.prop('checked', true);
              /*
               * We have clicked the ALL checkbox, we should be able to select
               * the grant options too.
               */
              $allGrants.prop('disabled', false);
              $elGrant.prop('disabled', false);
            } else {
              /*
               * ALL checkbox has been deselected, hence - we need to make
               * sure.
               * 1. Deselect all the privileges checkboxes
               * 2. Deselect and disable all with grant privilege checkboxes.
               * 3. Deselect and disable the checkbox for ALL with grant privilege.
               */
              $allPrivileges.prop('checked', false);
              $elGrant.prop('checked', false),
              $allGrants.prop('checked', false);
              $elGrant.prop('disabled', true);
              $allGrants.prop('disabled', true);
            }
          } else {
            /*
             * We were able to click the ALL with grant privilege checkbox,
             * that means, privilege for Privileges are true.
             *
             * We need to select/deselect all the with grant options
             * checkboxes, based on the current value of the ALL with grant
             * privilege checkbox.
             */
            allPrivilege = true;
            allWithGrant = checked;
            $allGrants.prop('checked', checked);
          }

          /*
           * Set the values for each Privilege Model.
           */
          collection.each(function(m) {
            m.set({'privilege': allPrivilege, 'with_grant': allWithGrant});
          });
        } else {
          /*
           * Particular privilege has been selected/deselected, which can be
           * identified using the privilege="X" attribute.
           */
          var attrs = {},
              $tbl = $tr.closest('table'),
              $allPrivilege = $tbl.find(
                  'input[name=privilege][privilege=\'ALL\']'
                  ),
              $allGrant = $tbl.find(
                  'input[name=with_grant][privilege=\'ALL\']'
                  );

          attrs[type] = checked;

          if (type == 'privilege') {
            var $elGrant = ($el.closest('tr')).find('input[name=with_grant]');
            if (!checked) {
              attrs['with_grant'] = false;

              $elGrant.prop('checked', false).prop('disabled', true);
              $allPrivilege.prop('checked', false);
              $allGrant.prop('disabled', true);
              $allGrant.prop('checked', false);
            } else {
              $elGrant.prop('disabled', false);
            }
          } else if (!checked) {
            $allGrant.prop('checked', false);
          }
          collection.get(privilege_type).set(attrs);

          if (checked) {
            var $allPrivileges = $tbl.find(
                  'input[name=privilege][privilege!=\'ALL\']:checked'
                  );

            if ($allPrivileges.length > 1 &&
                  $allPrivileges.length == collection.models.length) {

              $allPrivilege.prop('checked', true);

              if (type == 'with_grant') {
                var $allGrants = $tbl.find(
                    'input[name=with_grant][privilege!=\'ALL\']:checked'
                    );
                if ($allGrants.length == collection.models.length) {
                  $allGrant.prop('disabled', false);
                  $allGrant.prop('checked', true);
                }
              } else {
                $allGrant.prop('disabled', false);
              }
            }
          }
        }
      }
    },

    lostFocus: function(ev) {
      /*
       * We lost the focus, it's time for us to exit the editor.
       */
      var self = this,
      /*
       * Function to determine whether one dom element is descendant of another
       * dom element.
       */
      isDescendant = function (parent, child) {
         var node = child.parentNode;
         while (node != null) {
             if (node == parent) {
                 return true;
             }
             node = node.parentNode;
         }
         return false;
      }
      /*
       * Between leaving the old element focus and entering the new element focus the
       * active element is the document/body itself so add timeout to get the proper
       * focused active element.
       */
      setTimeout(function() {
        if (self.$el[0] != document.activeElement && !isDescendant(self.$el[0], document.activeElement)){
          var m = self.model;
          m.trigger('backgrid:edited', m, self.column, new Backgrid.Command(ev));
        }},10);
      return;
    }
  });

  /*
   * This will help us transform the privileges value in proper format to be
   * displayed in the cell.
   */
  var PrivilegeCellFormatter = Backgrid.Extension.PrivilegeCellFormatter =
    function () {};
  _.extend(PrivilegeCellFormatter.prototype, {
    notation: {
      "CREATE" : "C",
      "TEMPORARY" : "T",
      "CONNECT" : "c",
      "INSERT" : "a",
      "SELECT" : "r",
      "UPDATE" : "w",
      "DELETE" : "d",
      "TRUNCATE" : "D",
      "REFERENCES" : "x",
      "TRIGGER" : "t",
      "USAGE" : "U",
      "EXECUTE" : "X"
    },
    /**
     * Takes a raw value from a model and returns an optionally formatted
     * string for display.
     */
    fromRaw: function (rawData, model) {
      var res = '',
          self = this;

      if (rawData instanceof Backbone.Collection) {
        rawData.each(function(m) {
          if (m.get('privilege')) {
            res += m.get('privilege_type');
            if (m.get('with_grant')) {
              res += '*';
            }
          }
        });
      }
      return res;
    }
  });

  /*
   *  PrivilegeCell for rendering and taking input for the privileges.
   */
  var PrivilegeCell = Backgrid.Extension.PrivilegeCell = Backgrid.Cell.extend({
    className: "edit-cell",
    formatter: PrivilegeCellFormatter,
    editor: PrivilegeCellEditor
  });

  return PrivilegeRoleModel;
}));
