define(
    [
    'jquery', 'underscore', 'underscore.string', 'pgadmin', 'pgadmin.browser',
    'alertify', 'pgadmin.backform', 'select2', 'pgadmin.browser.collection',
    'pgadmin.browser.node.ui', 'pgadmin.browser.server.variable'
    ],
function($, _, S, pgAdmin, pgBrowser, alertify, Backform) {

  if (!pgBrowser.Nodes['coll-role']) {
    var role = pgAdmin.Browser.Nodes['coll-role'] =
      pgAdmin.Browser.Collection.extend({
        node: 'role',
        type: 'coll-role',
        columns: [
          'rolname', 'rolvaliduntil', 'rolconnlimit', 'rolcanlogin',
          'rolsuper', 'rolcreaterole', 'rolcreatedb', 'rolcatupdate',
          'rolinherit', 'rolreplication'
        ]
      });
  };

  var SecurityModel = pgAdmin.Browser.SecurityModel =
        pgAdmin.Browser.SecurityModel || pgAdmin.Browser.Node.Model.extend({
    defaults: {
      provider: null,
      label: null
    },
    schema: [{
      id: 'provider', label: '{{ _('Provider') }}',
      type: 'text', disabled: false,
      cellHeaderClasses:'width_percent_50'
    },{
      id: 'label', label: '{{ _('Security Label') }}',
      type: 'text', disabled: false,
      cellHeaderClasses:'width_percent_50'
    }],
    validate: function() {
      var err = {},
          errmsg = null,
          data = this.toJSON();

      if (_.isUndefined(data.provider) ||
        _.isNull(data.provider) ||
        String(data.provider).replace(/^\s+|\s+$/g, '') == '') {
        var msg = '{{ _('Please specify the value for all the security providers.') }}';

	this.errorModel.set('provider', msg);
        return msg;
      } else {
	this.errorModel.unset('provider');
      }

      if (_.isUndefined(data.label) ||
        _.isNull(data.label) ||
        String(data.label).replace(/^\s+|\s+$/g, '') == '') {
        var msg = '{{ _('Please specify the value for all the security providers.') }}' ;

	this.errorModel.set('label', msg);
        return msg;
      } else {
	this.errorModel.unset('label');
      }

      return null;
    }
  });

  var switchOptions = {
    'onText': 'Yes', 'offText': 'No',
    'onColor': 'warning', 'offColor': 'primary',
    'size': 'mini'
  };

  var RoleMembersControl = Backform.Control.extend({
    defaults: _.defaults(
                {extraClasses: ['col-xs-12 col-sm-12 col-md-12']},
                Backform.NodeListByNameControl.prototype.defaults
                ),
    initialize: function() {
      Backform.NodeListByNameControl.prototype.initialize.apply(this, arguments);
    },
    formatter: {
      fromRaw: function (rawData, model) {
        var res = _.isObject(rawData) ? rawData : JSON.parse(rawData);

        return _.pluck(res, 'role');
      },
      toRaw: function (formattedData, model) {
        return formattedData;
      }
    },
    template: _.template([
      '<label class="control-label col-xs-12"><%=label%></label>',
      '<div class="pgadmin-controls col-xs-12">',
      '  <select multiple="multiple" style="width:100%;" class="pgadmin-controls <%=extraClasses.join(\' \')%>" name="<%=name%>" value="<%-JSON.stringify(value)%>" <%=disabled ? "disabled" : ""%> <%=required ? "required" : ""%>>',
      '    <% for (var i=0; i < options.length; i++) { %>',
      '      <% var option = options[i]; %>',
      '      <option value=<%-option.value%> data-icon=<%-option.image%> <%=value != null && _.indexOf(value, option.value) != -1 ? "selected" : ""%> <%=option.disabled ? "disabled=\'disabled\'" : ""%>><%-option.label%></option>',
      '    <% } %>',
      '  </select>',
      '</div>',
      '<div class="note <%=Backform.helpMessageClassName%> col-xs-12"></div>',
      ].join("\n")),
    selectionTemplate: _.template([
      '<span>',
      '  <span class="wcTabIcon <%= optimage %>"></span>',
      '  <span><%= opttext %><span>',
      '  <% if (checkbox) { %>',
      '  <input type="checkbox" <%=disabled ? "disabled=\'disabled\'" : ""%>/>',
      '  <% } %>',
      '</span>'
    ].join("\n")),
    events: {"change select": "onChange"},
    getValueFromDOM: function() {
      var res = [];

      this.$el.find("select").find(':selected').each(function() {
        res.push($(this).attr('value'));
      });

      return res;
    },
    render: function() {
      var field = _.defaults(this.field.toJSON(), this.defaults),
          attributes = this.model.toJSON(),
          attrArr = field.name.split('.'),
          name = attrArr.shift(),
          path = attrArr.join('.'),
          rawValue = this.keyPathAccessor(attributes[name], path),
          data = _.extend(field, {
            rawValue: rawValue,
            value: this.formatter.fromRaw(rawValue, this.model),
            attributes: attributes,
            formatter: this.formatter
          }),
          evalF = function(f, d, m) {
            return (_.isFunction(f) ? !!f.apply(d, [m]) : !!f);
          };

      // Evaluate the disabled, visible, and required option
      _.extend(data, {
        disabled: evalF(data.disabled, data, this.model),
        visible:  evalF(data.visible, data, this.model),
        required: evalF(data.required, data, this.model)
      });
      // Evaluation the options
      if (_.isFunction(data.options)) {
        try {
          data.options = data.options.apply(this)
        } catch(e) {
          // Do nothing
          data.options = []
          this.model.trigger('pgadmin-view:transform:error', m, self.field, e);
        }
      }

      // Clean up first
      this.$el.removeClass(Backform.hiddenClassname);

      if (!data.visible)
        this.$el.addClass(Backform.hiddenClassname);

      this.$el.html(this.template(data)).addClass(field.name);
      this.updateInvalid();

      var self = this,
          collection = this.model.get(this.field.get('name')),
          formatState = function(opt) {
            if (!opt.id) {
              return opt.text;
            }

            var optimage = $(opt.element).data('icon');

            if(!optimage){
              return opt.text;
            } else {
              var d = _.extend(
                 {}, data, {
                   'opttext': opt.text,
                   'optimage': optimage,
                   'checkbox': false
                 });
              return $(self.selectionTemplate(d));
            }
          },
          formatSelection = function (opt) {

            if (!opt.id) {
              return opt.text;
            }

            var optimage = $(opt.element).data('icon'),
                grantUpdate = function(ev) {

                  _.each(collection.where({role: opt.id}), function(m) {
                    m.set('admin', $(ev.target).is(":checked"));
                  });

                  return false;
                };

            if(!optimage){
              return opt.text;
            } else {
              var d = _.extend(
                 {}, data, {
                   'opttext': opt.text,
                   'optimage': optimage,
                   'checkbox': true
                 }),
                 j = $(self.selectionTemplate(d));

              // Update the checkbox lazy
              setTimeout(
                function() {
                  _.each(collection.where({role: opt.id}), function(m) {
                    j.find('input').prop('checked', m.get('admin'));
                  });
                }, 200);

              (j.find('input')).on('change', grantUpdate);

              return j;
            }
          };

      this.$el.find('select').select2({
        templateResult: formatState,
        templateSelection: formatSelection,
        multiple: true,
        tags: true,
        allowClear: true,
        placeholder: "Select members",
        width: 'style'
      }).on("change", function(e) {
        $(e.target).find(':selected').each(function() {
        });
      });
      var msg = '{{ _('Select the checkbox for roles to include WITH ADMIN OPTION.') }}';

      this.$el.find('div.note').html("<span>NOTE: " + msg + "</span>");

      return this;
    },
    onChange: function(e) {
      var model = this.model,
          $el = $(e.target),
          attrArr = this.field.get("name").split('.'),
          name = attrArr.shift(),
          path = attrArr.join('.'),
          vals = this.getValueFromDOM(),
          collection = model.get(name),
          removed = [];

      this.stopListening(this.model, "change:" + name, this.render);

      /*
       * Iterate through all the values, and find out how many are already
       * present in the collection.
       */
      collection.each(function(m) {
        var role = m.get('role'),
            idx = _.indexOf(vals, role);

        if (idx > -1) {
          vals.splice(idx, 1);
        } else {
          removed.push(role);
        }
      });

      /*
       * Adding new values
       */
      _.each(vals, function(v) {
        collection.add({role: v});
      });

      /*
       * Removing unwanted!
       */
      _.each(removed, function(v) {
        collection.remove(collection.where({role: v}));
      });

      this.listenTo(this.model, "change:" + name, this.render);
    }
  });

  if (!pgBrowser.Nodes['role']) {
    var role = pgAdmin.Browser.Nodes['role'] = pgAdmin.Browser.Node.extend({
      parent_type: 'server',
      type: 'role',
      sqlAlterHelp: 'sql-alterrole.html',
      sqlCreateHelp: 'sql-createrole.html',
      dialogHelp: '{{ url_for('help.static', filename='role_dialog.html') }}',
      label: '{{ _('Login/Group Role') }}',
      hasSQL: true,
      canDrop: function(node, item) {
        var treeData = this.getTreeNodeHierarchy(item),
            server = treeData['server'];
        /*
        To Drop a role:
          1) If Role we are deleting is superuser then User must be superuser
          2) And for non-superuser roles User must have Create Role permission
        */

        // Role you are trying to drop is Superuser ?
        if(node.is_superuser) {
            return server.connected && server.user.is_superuser;
        }
        // For non super users
        return server.connected && server.user.can_create_role;
      },
      hasDepends: true,
      node_label: function(r) {
        return r.label;
      },
      node_image: function(r) {
        if (r == null || r == undefined)
            return 'icon-role';
        return (r.can_login ? 'icon-role' : 'icon-group');
      },
      title: function(d) {
        if (!d) {
          return this.label;
        }
        if (d.can_login) {
          return '{{ _('Login Role') }}' + ' - ' + d.label;
        }
        return '{{ _('Group Role') }}' + ' - ' + d.label;
      },
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
            return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_role_on_server', node: 'server', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('Login/Group Role...') }}',
          icon: 'wcTabIcon icon-role', data: {action: 'create'},
          enable: 'can_create_role'
        },{
          name: 'create_role_on_roles', node: 'coll-role', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('Login/Group Role...') }}',
          icon: 'wcTabIcon icon-role', data: {action: 'create'},
          enable: 'can_create_role'
        },{
          name: 'create_role', node: 'role', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('Login/Group Role...') }}',
          icon: 'wcTabIcon icon-role', data: {action: 'create'},
          enable: 'can_create_role'
        }]);
      },
      can_create_role: function(node, item) {
        var treeData = this.getTreeNodeHierarchy(item),
            server = treeData['server'];

        return server.connected && server.user.can_create_role;
      },
      model: pgAdmin.Browser.Node.Model.extend({
        idAttribute: 'oid',
        defaults: {
          oid: null,
          rolname: undefined,
          rolcanlogin: false,
          rolpassword: null,
          rolconnlimit: -1,
          rolsuper: false,
          rolcreaterole: false,
          rolcreatedb: false,
          rolinherit: true,
          rolcatupdate: false,
          rolreplication: false,
          rolmembership: [],
          rolvaliduntil: null,
          seclabels: [],
          variables: []
        },
        schema: [{
          id: 'rolname', label: '{{ _('Name') }}', type: 'text',
          disabled: 'readonly'
        },{
          id: 'oid', label:'{{ _('OID') }}', cell: 'string', mode: ['properties'],
          editable: false, type: 'text', visible: true, disabled: true
        },{
          id: 'rolpassword', label: '{{ _('Password') }}', type: 'password',
          group: '{{ _('Definition') }}', mode: ['edit', 'create'],
          control: 'input', deps: ['rolcanlogin'], retype: true,
          cell: 'string', disabled: function(m) {
            if (!m.isNew()) {
              var user = this.node_info.server.user;

              return (!(user.is_superuser || user.can_create_role) &&
                  user.id != m.get('oid'));
            }
            return false;
          }
        },{
          id: 'rolvaliduntil', disabled: 'readonly', type: 'text',
          group: '{{ _('Definition') }}', label: '{{ _('Account expires') }}',
          mode: ['properties', 'edit', 'create'], control: 'datetimepicker',
          deps: ['rolcanlogin'], options: {format: 'YYYY-MM-DD HH:mm:ss Z'}
        },{
          id: 'rolconnlimit',  type: 'int', group: '{{ _('Definition') }}',
          label: '{{ _('Connection limit') }}', cell: 'number',
          mode: ['properties', 'edit', 'create'], disabled: 'readonly'
        },{
          id: 'rolcanlogin', label:'{{ _('Can login?') }}', type: 'switch',
          group: '{{ _('Privileges') }}', options: switchOptions,
          disabled: 'readonly'
        },{
          id: 'rolsuper', label:'{{ _('Superuser') }}', type: 'switch',
          group: '{{ _('Privileges') }}', options: switchOptions,
          control: Backform.SwitchControl.extend({
            onChange: function() {
              Backform.SwitchControl.prototype.onChange.apply(this, arguments);

              this.model.set('rolcatupdate', this.model.get('rolsuper'));
              this.model.set('rolcreaterole', this.model.get('rolsuper'));
              this.model.set('rolcreatedb', this.model.get('rolsuper'));
            }
          }),
          disabled: 'readonly'
        },{
          id: 'rolcreaterole', label:'{{ _('Create roles?') }}',
          group: '{{ _('Privileges') }}', type: 'switch',
          options: switchOptions, disabled: 'readonly'
        },{
          id: 'description', label:'{{ _('Comments') }}', type: 'multiline',
          group: null, mode: ['properties', 'edit', 'create'],
          options: switchOptions, disabled: 'readonly'
        },{
          id: 'rolcreatedb', label:'{{ _('Create databases?') }}',
          group: '{{ _('Privileges') }}', type: 'switch',
          options: switchOptions, disabled: 'readonly'
        },{
          id: 'rolcatupdate', label:'{{ _('Update catalog?') }}',
          type: 'switch', max_version: 90400, options: switchOptions,
          group: '{{ _('Privileges') }}', disabled: function(m) {
            return (m.get('read_only') || (!m.get('rolsuper')));
          }
        },{
          id: 'rolinherit', group: '{{ _('Privileges') }}',
          label:'{{ _('Inherit rights from the parent roles?') }}',
          type: 'switch', options: switchOptions, disabled: 'readonly'
        },{
          id: 'rolreplication', group: '{{ _('Privileges') }}',
          label:'{{ _('Can initiate streaming replication and backups?') }}',
          type: 'switch', min_version: 90100, options: switchOptions,
          disabled: 'readonly'
        },{
          id: 'rolmembership', label: '{{ _('Roles') }}',
          group: '{{ _('Membership') }}', type: 'collection',
          cell: 'string', disabled: 'readonly',
          mode: ['properties', 'edit', 'create'],
          control: RoleMembersControl, model: pgBrowser.Node.Model.extend({
            keys: ['role'],
            defaults: {
              role: undefined,
              admin: false
            },
            validate: function() {
              return null;
            }
          }),
          filter: function(d) {
            return this.model.isNew() || (this.model.get('rolname') != d.label);
          }
        },{
          id: 'variables', label: '{{ _('Parameters') }}', type: 'collection',
          group: '{{ _('Parameters') }}', hasDatabase: true, url: 'variables',
          model: pgBrowser.Node.VariableModel.extend({keys:['name', 'database']}),
          control: 'variable-collection',
          mode: [ 'edit', 'create'], canAdd: true, canDelete: true,
          url: "variables", disabled: 'readonly'
        },{
          id: 'seclabels', label: '{{ _('Security Labels') }}',
          model: SecurityModel, editable: false, type: 'collection',
          group: '{{ _('Security') }}', mode: ['edit', 'create'],
          min_version: 90200, disabled: 'readonly', canAdd: true,
          canEdit: false, canDelete: true, control: 'unique-col-collection'
        }],
        readonly: function(m) {
          if (!m.has('read_only')) {
            var user = this.node_info.server.user;

            m.set('read_only', !(user.is_superuser || user.can_create_role));
          }

          return m.get('read_only');
        },
        validate: function()
        {
          var err = {},
              errmsg,
              seclabels = this.get('seclabels');

          if (_.isUndefined(this.get('rolname')) || String(this.get('rolname')).replace(/^\s+|\s+$/g, '') == '') {
            err['name'] = '{{ _('Name cannot be empty.') }}';
            errmsg = errmsg || err['name'];
          }

          if (seclabels) {
            var secLabelsErr;
            for (var i = 0; i < seclabels.models.length && !secLabelsErr; i++) {
              secLabelsErr = (seclabels.models[i]).validate.apply(seclabels.models[i]);
              if (secLabelsErr) {
                err['seclabels'] = secLabelsErr;
                errmsg = errmsg || secLabelsErr;
              }
            }
          }

          this.errorModel.clear().set(err);

          if (_.size(err)) {
            this.trigger('on-status', {msg: errmsg});
            return errmsg;
          }

          return null;
        }
      })
    }),
    sg = pgBrowser.Nodes['server-group'];
  }

  return pgBrowser.Nodes['role'];
});
