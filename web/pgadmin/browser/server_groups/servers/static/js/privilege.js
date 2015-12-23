(function(root, factory) {
  // Set up Backform appropriately for the environment. Start with AMD.
  if (typeof define === 'function' && define.amd) {
    define(['underscore', 'jquery', 'backbone', 'backform', 'backgrid', 'alertify', 'pgadmin.browser.node'],
     function(_, $, Backbone, Backform, Backgrid, Alertify, pgNode) {
      // Export global even in AMD case in case this script is loaded with
      // others that may still expect a global Backform.
      return factory(root, _, $, Backbone, Backform, Alertify, pgNode);
    });

  // Next for Node.js or CommonJS. jQuery may not be needed as a module.
  } else if (typeof exports !== 'undefined') {
    var _ = require('underscore') || root._,
      $ = root.jQuery || root.$ || root.Zepto || root.ender,
      Backbone = require('backbone') || root.Backbone,
      Backform = require('backform') || root.Backform;
      Alertify = require('alertify') || root.Alertify;
      pgAdmin = require('pgadmin.browser.node') || root.pgAdmin.Browser.Node;
    factory(root, _, $, Backbone, Backform, Alertify, pgNode);

  // Finally, as a browser global.
  } else {
    factory(root, root._, (root.jQuery || root.Zepto || root.ender || root.$), root.Backbone, root.Backform, root.pgAdmin.Browser.Node);
  }
} (this, function(root, _, $, Backbone, Backform, Alertify, pgNode) {

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
    /*
     * Each of the database object needs to extend this model, which should
     * provide the type of privileges (it supports).
     */
    privileges:[],

    schema: [{
      id: 'grantee', label:'Grantee', type:'text', group: null, cell: 'string',
      disabled: true, cellHeaderClasses: 'width_percent_40'
    }, {
      id: 'privileges', label:'Privileges',
      type: 'collection', model: PrivilegeModel, group: null,
      disabled: false, cell: 'privilege', control: 'text',
      cellHeaderClasses: 'width_percent_40'
    },{
      id: 'grantor', label: 'Granter', type: 'text', disabled: true
    }],

    /*
     * Initialize the model, which will transform the privileges string to
     * collection of Privilege Model.
     */
    initialize: function(attrs, opts) {

      pgNode.Model.prototype.initialize.apply(this, arguments);

      /*
       * Define the collection of the privilege supported by this model
       */
      var privileges = this.get('privileges') || {};
      if (_.isArray(privileges)) {
        privileges = new (pgNode.Collection)(
            models, {
              model: PrivilegeModel,
              handler: this.handler || this,
              silent: true,
              parse: false
            });
        this.set('privileges', privileges, {silent: true});
      }

      var privs = {};
      _.each(this.privileges, function(p) {
        privs[p] = {
          'privilige_type': p, 'privilege': false, 'with_grant': false
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
        return pgNode.Model.prototype.apply(this, [true, false]);
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
        "T": "TEMP",
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
        '   <%- privilege_type %>',
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

        _.extend(
          d, {
            'target': self.cid,
            'header': false
            });
        privilege = (privilege && d.privilege);
        with_grant = (with_grant && privilege && d.with_grant);
        tbl.append(self.template(d));
      });

      // Preprend the ALL controls on that table
      tbl.prepend(
          self.template({
            'target': self.cid,
            'name': 'ALL',
            'privilege_type': 'ALL',
            'privilege': privilege,
            'with_grant': with_grant,
            'header': true
          }));

      self.$el.find('input[type=checkbox]').first().focus();
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
            collection = this.model.get('privileges');;

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

            if ($allPrivileges.length == collection.models.length) {

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
       * We lost the focuse, it's time for us to exit the editor.
       */
      var m = this.model;
      m.trigger('backgrid:edited', m, this.column, new Backgrid.Command(ev));
    }
  });

  /*
   * This will help us transform the privilieges value in proper format to be
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
            res += self.notation[m.get('privilege_type')];
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
