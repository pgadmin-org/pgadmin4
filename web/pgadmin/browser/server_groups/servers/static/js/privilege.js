/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define(['sources/gettext', 'underscore', 'jquery', 'backbone', 'backform',
  'backgrid', 'alertify', 'pgadmin.browser.node', 'sources/utils', 'pgadmin.browser.node.ui',
], function(gettext, _, $, Backbone, Backform, Backgrid, Alertify, pgNode, commonUtils) {
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
      with_grant: false,
    },
    validate: function() {
      return null;
    },
  });

  /**
   * A database object has privileges item list (aclitem[]).
   *
   * This model represents the individual privilege item (aclitem).
   * It has basically three properties:
   *  + grantee    - Role to which that privilege applies to.
   *                Empty value represents to PUBLIC.
   *  + grantor    - Grantor who has given this permission.
   *  + privileges - Privileges for that role.
   **/
  var PrivilegeRoleModel = pgNode.PrivilegeRoleModel = pgNode.Model.extend({
    idAttribute: 'grantee',
    defaults: {
      grantee: undefined,
      grantor: undefined,
      privileges: undefined,
    },
    keys: ['grantee', 'grantor'],
    /*
     * Each of the database object needs to extend this model, which should
     * provide the type of privileges (it supports).
     */
    privileges:[],
    schema: [{
      id: 'grantee', label: gettext('Grantee'), type:'text', group: null,
      editable: true, cellHeaderClasses: 'width_percent_40',
      node: 'role', options_cached: false,
      disabled : function(m) {
        if (!(m instanceof Backbone.Model)) {
          // This has been called during generating the header cell
          return false;
        }
        return !(
          m.top && m.top.node_info &&
            m.top.node_info.server.user.name == m.get('grantor')
        );
      },
      transform: function() {
        var res =
          Backgrid.Extension.NodeListByNameCell.prototype.defaults.transform.apply(
            this, arguments
          );
        res.unshift({label: 'PUBLIC', value: 'PUBLIC'});
        return res;
      },
      cell: Backgrid.Extension.NodeListByNameCell.extend({
        initialize: function(opts) {
          var self = this,
            override_opts = true;

          // We would like to override the original options, because - we
          // should omit the existing role/user from the privilege cell.
          // Because - the column is shared among all the cell, we can only
          // override only once.
          if (opts && opts.column &&
            opts.column instanceof Backbone.Model &&
              opts.column.get('options_cached')) {
            override_opts = false;
          }
          Backgrid.Extension.NodeListByNameCell.prototype.initialize.apply(
            self, arguments
          );

          // Let's override the options
          if (override_opts) {
            opts = self.column.get('options');
            self.column.set(
              'options', self.omit_selected_roles.bind(self, opts)
            );
          }

          var rerender = function (m) {
            var _self = this;
            if ('grantee' in m.changed && this.model.cid != m.cid) {
              setTimeout(
                function() {
                  _self.render();
                }, 50
              );
            }
          }.bind(this);

          // We would like to rerender all the cells of this type for this
          // collection, because - we need to omit the newly selected roles
          // form the list. Also, the render will be automatically called for
          // the model represented by this cell, we will not do that again.
          this.listenTo(self.model.collection, 'change', rerender, this);
          this.listenTo(self.model.collection, 'remove', rerender, this);
        },
        // Remove all the selected roles (though- not mine).
        omit_selected_roles: function(opts, cell) {
          var res = opts(cell),
            selected = {},
            model = cell.model,
            cid = model.cid,
            // We need to check node_info values in parent when object is nested.
            // eg: column level privileges in table dialog
            // In this case node_info will not be avilable to column node as
            // it is not loaded yet
            node_info = (_.has(model.top, 'node_info')
              && !_.isUndefined(model.top.node_info)) ?
              model.top.node_info :
              model.handler.top.node_info,
            curr_user = node_info.server.user.name;

          model.collection.each(function(m) {
            var grantee = m.get('grantee');

            if (m.cid != cid && !_.isUndefined(grantee) &&
              curr_user == m.get('grantor')) {
              selected[grantee] = m.cid;
            }
          });

          res = _.filter(res, function(o) {
            return !(o.value in selected);
          });

          return res;
        },
      }),
    },{
      id: 'privileges', label: gettext('Privileges'),
      type: 'collection', model: PrivilegeModel, group: null,
      cell: 'privilege', control: 'text', cellHeaderClasses: 'width_percent_40',
      disabled : function(column) {
        if (column instanceof Backbone.Collection) {
          // This has been called during generating the header cell
          return false;
        }
        return !(
          this.node_info &&
            this.node_info.server.user.name == column.get('grantor') ||
            this.attributes.node_info.server.user.name == column.get('grantor')
        );
      },
    },{
      id: 'grantor', label: gettext('Grantor'), type: 'text', readonly: true,
      cell: 'node-list-by-name', node: 'role',
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
      var self = this,
        models = self.get('privileges'),
        privileges = this.get('privileges') || {};

      if (_.isArray(privileges)) {
        privileges = new (pgNode.Collection)(
          models, {
            model: PrivilegeModel,
            top: this.top || this,
            handler: this,
            silent: true,
            parse: false,
          });
        this.set('privileges', privileges, {silent: true});
      }

      var privs = {};
      _.each(self.privileges, function(p) {
        privs[p] = {
          'privilege_type': p, 'privilege': false, 'with_grant': false,
        };
      });

      privileges.each(function(m) {
        delete privs[m.get('privilege_type')];
      });

      _.each(privs, function(p) {
        privileges.add(p, {silent: true});
      });

      self.on('change:grantee', self.granteeChanged);
      privileges.on('change', function() {
        self.trigger('change:privileges', self);
      });

      return self;
    },

    granteeChanged: function() {
      var privileges = this.get('privileges'),
        grantee = this.get('grantee');

      // Reset all with grant options if grantee is public.
      if (grantee == 'PUBLIC') {
        privileges.each(function(m) {
          m.set('with_grant', false, {silent: true});
        });
      }
    },

    toJSON: function() {

      var privileges = [];

      if (this.attributes &&
        !this.attributes['privileges']) {
        return null;
      }

      this.attributes['privileges'].each(
        function(p) {
          if (p.get('privilege')) {
            privileges.push(p.toJSON());
          }
        });

      return {
        'grantee': this.get('grantee'),
        'grantor': this.get('grantor'),
        'privileges': privileges,
      };
    },

    validate: function() {
      var  errmsg = null,
        msg;

      if (_.isUndefined(this.get('grantee'))) {
        msg = gettext('A grantee must be selected.');
        this.errorModel.set('grantee', msg);
        errmsg = msg;
      } else {
        this.errorModel.unset('grantee');
      }

      if (this.attributes &&
        this.attributes['privileges']) {
        var anyPrivSelected = false;
        this.attributes['privileges'].each(
          function(p) {
            if (p.get('privilege')) {
              anyPrivSelected = true;
            }
          });

        if (!anyPrivSelected) {
          msg = gettext('At least one privilege should be selected.');
          this.errorModel.set('privileges', msg);
          errmsg = errmsg || msg;
        } else {
          this.errorModel.unset('privileges');
        }
      }

      return errmsg;
    },
  });

  /**
   Custom cell editor for editing privileges.
   */
  var PrivilegeCellEditor = Backgrid.Extension.PrivilegeCellEditor =
    Backgrid.CellEditor.extend({
      tagName: 'div',

      // All available privileges in the PostgreSQL database server for
      // generating the label for the specific Control
      Labels: {
        'C': 'CREATE',
        'T': 'TEMPORARY',
        'c': 'CONNECT',
        'a': 'INSERT',
        'r': 'SELECT',
        'w': 'UPDATE',
        'd': 'DELETE',
        'D': 'TRUNCATE',
        'x': 'REFERENCES',
        't': 'TRIGGER',
        'U': 'USAGE',
        'X': 'EXECUTE',
      },

      template: _.template([
        '<tr class="<%= header ? "header" : "" %>">',
        ' <td class="renderable">',
        '  <div class="custom-control custom-checkbox privilege-checkbox">',
        '    <input tabindex="0" type="checkbox" class="custom-control-input" id="<%= checkbox_id %>" name="privilege" privilege="<%- privilege_type %>" target="<%- target %>" <%= privilege ? \'checked\' : "" %>/>',
        '    <label class="custom-control-label" for="<%= checkbox_id %>">',
        '      <%- privilege_label %>',
        '    </label>',
        '  </div>',
        ' </td>',
        ' <td class="renderable">',
        '  <div class="custom-control custom-checkbox privilege-checkbox">',
        '    <input tabindex="0" type="checkbox" class="custom-control-input" id="wgo_<%= checkbox_id %>" name="with_grant" privilege="<%- privilege_type %>" target="<%- target %>" <%= with_grant ? \'checked\' : "" %> <%= enable_with_grant ? "" : \'disabled\'%>/>',
        '    <label class="custom-control-label" for="wgo_<%= checkbox_id %>">',
        '      WITH GRANT OPTION',
        '    </label>',
        '  </div>',
        ' </td>',
        '</tr>'].join(' '), null, {variable: null}),

      events: {
        'change': 'privilegeChanged',
        'blur': 'lostFocus',
        'keydown': 'lostFocus',
      },

      render: function () {
        this.$el.empty();
        this.$el.attr('tabindex', '1');
        this.$el.attr('target', this.elId);

        var collection = this.model.get(this.column.get('name')),
          tbl = $('<table aria-label='+this.column.get('label')+'></table>').appendTo(this.$el),
          self = this,
          privilege = true, with_grant = true;

        // For each privilege generate html template.
        // List down all the Privilege model.
        var checkbox_id = _.uniqueId();
        collection.each(function(m) {
          var d = m.toJSON();

          privilege = (privilege && d.privilege);
          with_grant = (with_grant && privilege && d.with_grant);

          _.extend(
            d, {
              'target': self.cid,
              'header': false,
              'privilege_label': self.Labels[d.privilege_type],
              'with_grant': (self.model.get('grantee') != 'PUBLIC' && d.with_grant),
              'enable_with_grant': (self.model.get('grantee') != 'PUBLIC' && d.privilege),
              'checkbox_id': d.privilege_type + '' + checkbox_id,
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
              'with_grant': (self.model.get('grantee') != 'PUBLIC' && with_grant),
              'enable_with_grant': (self.model.get('grantee') != 'PUBLIC' && privilege),
              'header': true,
              'checkbox_id': 'all' + '' + checkbox_id,
            }));
        }
        self.$el.find('input[type=checkbox]').first().trigger('focus');
        // Since blur event does not bubble we need to explicitly call parent's blur event.
        $(self.$el.find('input[type=checkbox]')).on('blur',function() {
          self.$el.trigger('blur');
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
            collection = this.model.get('privileges'),
            grantee = this.model.get('grantee'), $allGrants,
            $allPrivileges, $elGrant;

          this.undelegateEvents();
          /*
           * If the checkbox selected/deselected is for 'ALL', we will select all
           * the checkbox for each privilege.
           */
          if (privilege_type == 'ALL') {
            var allPrivilege, allWithGrant;

            $elGrant = $tr.find('input[name=with_grant]');
            $allPrivileges = $tbl.find(
              'input[name=privilege][privilege!=\'ALL\']'
            );
            $allGrants = $tbl.find(
              'input[name=with_grant][privilege!=\'ALL\']'
            );

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
                if (grantee == 'PUBLIC') {
                  $allGrants.prop('disabled', true);
                  $elGrant.prop('disabled', true);
                } else {
                  $allGrants.prop('disabled', false);
                  $elGrant.prop('disabled', false);
                }

              } else {
                /*
                 * ALL checkbox has been deselected, hence - we need to make
                 * sure.
                 * 1. Deselect all the privileges checkboxes
                 * 2. Deselect and disable all with grant privilege checkboxes.
                 * 3. Deselect and disable the checkbox for ALL with grant privilege.
                 */
                $allPrivileges.prop('checked', false);
                $elGrant.prop('checked', false);
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
              m.set(
                {'privilege': allPrivilege, 'with_grant': allWithGrant},
                {silent: true}
              );
            });
          } else {
            /*
             * Particular privilege has been selected/deselected, which can be
             * identified using the privilege="X" attribute.
             */
            var attrs = {};

            $tbl = $tr.closest('table');
            $allPrivileges = $tbl.find(
              'input[name=privilege][privilege=\'ALL\']'
            );
            $allGrants = $tbl.find(
              'input[name=with_grant][privilege=\'ALL\']'
            );

            attrs[type] = checked;

            if (type == 'privilege') {
              $elGrant = ($el.closest('tr')).find('input[name=with_grant]');
              if (!checked) {
                attrs['with_grant'] = false;

                $elGrant.prop('checked', false).prop('disabled', true);
                $allPrivileges.prop('checked', false);
                $allGrants.prop('disabled', true);
                $allGrants.prop('checked', false);
              } else if (grantee != 'PUBLIC') {
                $elGrant.prop('disabled', false);
              }
            } else if (!checked) {
              $allGrants.prop('checked', false);
            }
            collection.get(privilege_type).set(attrs, {silent: true});

            if (checked) {
              $allPrivileges = $tbl.find(
                'input[name=privilege][privilege!=\'ALL\']:checked'
              );

              if ($allPrivileges.length > 1 &&
                $allPrivileges.length == collection.models.length) {

                $allPrivileges.prop('checked', true);

                if (type == 'with_grant') {
                  $allGrants = $tbl.find(
                    'input[name=with_grant][privilege!=\'ALL\']:checked'
                  );
                  if ($allGrants.length == collection.models.length) {
                    $allGrants.prop('disabled', false);
                    $allGrants.prop('checked', true);
                  }
                } else if (grantee != 'PUBLIC') {
                  $allGrants.prop('disabled', false);
                }
              }
            }
          }
          this.model.trigger('change', this.model);

          var anySelected = false,
            msg = null;

          collection.each(function(m) {
            anySelected = anySelected || m.get('privilege');
          });

          if (anySelected) {
            this.model.errorModel.unset('privileges');
            if (this.model.errorModel.has('grantee')) {
              msg = this.model.errorModel.get('grantee');
            }
          } else {
            this.model.errorModel.set(
              'privileges', gettext('At least one privilege should be selected.')
            );
            msg = gettext('At least one privilege should be selected.');
          }
          if (msg) {
            this.model.collection.trigger(
              'pgadmin-session:model:invalid', msg, this.model
            );
          } else {
            this.model.collection.trigger(
              'pgadmin-session:model:valid', this.model
            );
          }
        }
        this.delegateEvents();
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
          },
          model = this.model,
          column = this.column,
          command = new Backgrid.Command(ev),
          coll = this.model.get(this.column.get('name'));

        if (ev.key == 'Tab'){
          commonUtils.handleKeyNavigation(event);
        }

        if (command.moveUp() || command.moveDown() || command.save() || command.cancel() ||
          (command.moveLeft() && ev.target.name === 'privilege' && $(ev.target).attr('privilege') === 'ALL')) {
          // undo
          ev.stopPropagation();
          model.trigger('backgrid:edited', model, column, command);
          return;
        } else if (command.moveRight()) {
          // If we are at the last privilege then we should move to next cell
          if (coll.last().get('privilege_type') === $(ev.target).attr('privilege')) {
            if ((ev.target.name === 'privilege' && !ev.target.checked ) ||
              $(ev.target).attr('name') === 'with_grant') {
              ev.stopPropagation();
              model.trigger('backgrid:edited', model, column, command);
              return;
            }
          }
        }

        /*
         * Between leaving the old element focus and entering the new element focus the
         * active element is the document/body itself so add timeout to get the proper
         * focused active element.
         */
        setTimeout(function() {
          /*
           * Do not close the control if user clicks outside dialog window,
           * only close the row if user clicks on add button or on another row,
           * if user clicks somewhere else then we will get tagName as 'BODY'
           * or 'WINDOW'
           */
          var is_active_element = document.activeElement.tagName == 'DIV' ||
            document.activeElement.tagName == 'BUTTON';

          if (is_active_element && self.$el[0] != document.activeElement &&
            !isDescendant(self.$el[0], document.activeElement)) {
            var m = self.model;
            m.trigger('backgrid:edited', m, self.column, new Backgrid.Command(ev));
          }},10);
      },
    });

  /*
   * This will help us transform the privileges value in proper format to be
   * displayed in the cell.
   */
  var PrivilegeCellFormatter = Backgrid.Extension.PrivilegeCellFormatter =
    function () {};
  _.extend(PrivilegeCellFormatter.prototype, {
    notation: {
      'CREATE' : 'C',
      'TEMPORARY' : 'T',
      'CONNECT' : 'c',
      'INSERT' : 'a',
      'SELECT' : 'r',
      'UPDATE' : 'w',
      'DELETE' : 'd',
      'TRUNCATE' : 'D',
      'REFERENCES' : 'x',
      'TRIGGER' : 't',
      'USAGE' : 'U',
      'EXECUTE' : 'X',
    },
    /**
     * Takes a raw value from a model and returns an optionally formatted
     * string for display.
     */
    fromRaw: function (rawData) {
      var res = '';

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
    },
  });

  /*
   *  PrivilegeCell for rendering and taking input for the privileges.
   */
  Backgrid.Extension.PrivilegeCell = Backgrid.Cell.extend({
    className: 'edit-cell',
    formatter: PrivilegeCellFormatter,
    editor: PrivilegeCellEditor,

    initialize: function () {
      var self = this;
      Backgrid.Cell.prototype.initialize.apply(this, arguments);

      self.model.on('change:grantee', function() {
        if (!self.$el.hasClass('editor')) {
          /*
           * Add time out before render; As we might want to wait till model
           * is updated by PrivilegeRoleModel:granteeChanged.
           */
          setTimeout(function() {
            self.render();
          },10);
        }
      });
    },

    events: {
      'click': 'enterEditMode',
      'keydown': 'saveOrCancel',
    },

    saveOrCancel: function (e) {
      var model = this.model;
      var column = this.column;
      var command = new Backgrid.Command(e);

      if (command.moveUp() || command.moveDown() || command.moveLeft() || command.moveRight() ||
        command.save()) {
        e.preventDefault();
        e.stopPropagation();
        model.trigger('backgrid:edited', model, column, command);
      }
      // esc
      else if (command.cancel()) {
      // undo
        e.stopPropagation();
        model.trigger('backgrid:edited', model, column, command);
      }
    },
  });

  return PrivilegeRoleModel;

});
