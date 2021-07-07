/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define('pgadmin.node.role', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore',
  'sources/pgadmin', 'pgadmin.browser', 'alertify',
  'pgadmin.backform', 'axios', 'sources/utils', 'backbone', 'select2',
  'pgadmin.browser.collection', 'pgadmin.browser.node.ui',
  'pgadmin.browser.server.variable',
], function(gettext, url_for, $, _, pgAdmin, pgBrowser, alertify, Backform, axios, utils, Backbone) {

  if (!pgBrowser.Nodes['coll-role']) {
    pgAdmin.Browser.Nodes['coll-role'] =
      pgAdmin.Browser.Collection.extend({
        node: 'role',
        label: gettext('Login/Group Roles'),
        type: 'coll-role',
        columns: [
          'rolname', 'rolvaliduntil', 'rolconnlimit', 'rolcanlogin',
          'rolsuper', 'rolcreaterole', 'rolcreatedb', 'rolcatupdate',
          'rolinherit', 'rolreplication',
        ],
        canDrop: true,
        canDropCascade: false,
      });
  }

  var SecurityModel = pgAdmin.Browser.SecurityModel =
    pgAdmin.Browser.SecurityModel || pgAdmin.Browser.Node.Model.extend({
      defaults: {
        provider: null,
        label: null,
      },
      schema: [{
        id: 'provider', label: gettext('Provider'),
        type: 'text', disabled: false,
        cellHeaderClasses:'width_percent_50',
      },{
        id: 'label', label: gettext('Security label'),
        type: 'text', disabled: false,
      }],
      validate: function() {
        var data = this.toJSON(), msg;

        if (_.isUndefined(data.provider) ||
          _.isNull(data.provider) ||
            String(data.provider).replace(/^\s+|\s+$/g, '') == '') {
          msg = gettext('Please specify the value for all the security providers.');
          this.errorModel.set('provider', msg);
          return msg;
        } else {
          this.errorModel.unset('provider');
        }

        if (_.isUndefined(data.label) ||
          _.isNull(data.label) ||
            String(data.label).replace(/^\s+|\s+$/g, '') == '') {
          msg = gettext('Please specify the value for all the security providers.') ;
          this.errorModel.set('label', msg);
          return msg;
        } else {
          this.errorModel.unset('label');
        }

        return null;
      },
    });

  var RoleMembersControl = Backform.Control.extend({
    defaults: _.defaults(
      {extraClasses: ['col-12 col-sm-12 col-md-12']},
      Backform.NodeListByNameControl.prototype.defaults
    ),
    initialize: function() {
      Backform.NodeListByNameControl.prototype.initialize.apply(this, arguments);
    },
    formatter: {
      fromRaw: function (rawData) {
        var res = _.isObject(rawData) ? rawData : JSON.parse(rawData);

        return _.pluck(res, 'role');
      },
      toRaw: function (formattedData) { return formattedData; },
    },
    template: _.template([
      '<label class="<%=Backform.controlLabelClassName%>"><%=label%></label>',
      '<div class="<%=Backform.controlsClassName%>">',
      '  <select title = <%=label%> multiple="multiple" style="width:100%;" class="pgadmin-controls <%=extraClasses.join(\' \')%>" name="<%=name%>" value="<%-JSON.stringify(value)%>" <%=disabled ? "disabled" : ""%> <%=readonly ? "readonly" : ""%> <%=required ? "required" : ""%>>',
      '    <% for (var i=0; i < options.length; i++) { %>',
      '      <% var option = options[i]; %>',
      '      <option value=<%-option.value%> data-icon=<%-option.image%> <%=value != null && _.indexOf(value, option.value) != -1 ? "selected" : ""%> <%=option.disabled ? "disabled=\'disabled\'" : ""%>><%-option.label%></option>',
      '    <% } %>',
      '  </select>',
      '  <% if (helpMessage && helpMessage.length) { %>',
      '    <span class="<%=Backform.helpMessageClassName%>"><%=helpMessage%></span>',
      '  <% } %>',
      '</div>',
    ].join('\n')),
    selectionTemplate: _.template([
      '<span>',
      '  <span class="wcTabIcon <%= optimage %>"></span>',
      '  <span><%= opttext %><span>',
      '  <% if (checkbox) { %>',
      '  <div class="custom-control custom-checkbox custom-checkbox-no-label d-inline">',
      '    <input tabindex="-1" type="checkbox" class="custom-control-input" id="check_<%= opttext %>" <%=disabled ? "disabled" : ""%> />',
      '    <label class="custom-control-label" for="check_<%= opttext %>">',
      '      <span class="sr-only">WITH ADMIN<span>',
      '    </label>',
      '  </div>',
      '  <% } %>',
      '</span>',
    ].join('\n')),
    events: {'change select': 'onChange'},
    getValueFromDOM: function() {
      var res = [];

      this.$el.find('select').find(':selected').each(function() {
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
          formatter: this.formatter,
        }),
        evalF = function(f, d, m) {
          return (_.isFunction(f) ? !!f.apply(d, [m]) : !!f);
        },
        evalASFunc = function(f, d, m) {
          return (_.isFunction(f) ? f.apply(d, [m]) : f);
        };

      // Evaluate the disabled, visible, and required option
      _.extend(data, {
        disabled: evalF(data.disabled, data, this.model),
        visible:  evalF(data.visible, data, this.model),
        readonly: evalF(data.readonly, data, this.model),
        required: evalF(data.required, data, this.model),
        helpMessage: evalASFunc(data.helpMessage, data, this.model),
      });
      // Evaluation the options
      if (_.isFunction(data.options)) {
        try {
          data.options = data.options.apply(this);
        } catch(e) {
          // Do nothing
          data.options = [];
          this.model.trigger(
            'pgadmin-view:transform:error', this.model, this.field, e
          );
        }
      }

      // Clean up first
      this.$el.removeClass(Backform.hiddenClassName);

      if (!data.visible)
        this.$el.addClass(Backform.hiddenClassName);

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
                'opttext': _.escape(opt.text),
                'optimage': optimage,
                'checkbox': false,
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
                m.set('admin', $(ev.target).is(':checked'));
              });

              return false;
            };

          if(!optimage){
            return opt.text;
          } else {
            var d = _.extend(
                {}, data, {
                  'opttext': _.escape(opt.text),
                  'optimage': optimage,
                  'checkbox': true,
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
        allowClear: data.disabled ? false : true,
        placeholder: data.disabled ? '' : gettext('Select roles'),
        width: 'style',
        disabled: data.readonly ? true : false,
      }).on('change', function(e) {
        $(e.target).find(':selected').each(function() {
        });
      });

      return this;
    },
    onChange: function() {
      var model = this.model,
        attrArr = this.field.get('name').split('.'),
        name = attrArr.shift(),
        vals = this.getValueFromDOM(),
        collection = model.get(name),
        removed = [];

      this.stopListening(this.model, 'change:' + name, this.render);

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

      this.listenTo(this.model, 'change:' + name, this.render);
    },
  });

  if (!pgBrowser.Nodes['role']) {
    pgAdmin.Browser.Nodes['role'] = pgAdmin.Browser.Node.extend({
      parent_type: 'server',
      type: 'role',
      sqlAlterHelp: 'sql-alterrole.html',
      sqlCreateHelp: 'sql-createrole.html',
      dialogHelp: url_for('help.static', {'filename': 'role_dialog.html'}),
      label: gettext('Login/Group Role'),
      hasSQL: true,
      width: '550px',
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
        if (!r)
          return 'icon-role';
        return (r.can_login ? 'icon-role' : 'icon-group');
      },
      title: function(d) {
        if (!d) {
          return this.label;
        }
        if (d.can_login) {
          return gettext('Login Role') + ' - ' + d.label;
        }
        return gettext('Group Role') + ' - ' + d.label;
      },
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_role_on_server', node: 'server', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Login/Group Role...'),
          icon: 'wcTabIcon icon-role', data: {action: 'create'},
          enable: 'can_create_role',
        },{
          name: 'create_role_on_roles', node: 'coll-role', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Login/Group Role...'),
          icon: 'wcTabIcon icon-role', data: {action: 'create'},
          enable: 'can_create_role',
        },{
          name: 'create_role', node: 'role', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Login/Group Role...'),
          icon: 'wcTabIcon icon-role', data: {action: 'create'},
          enable: 'can_create_role',
        }, {
          name: 'reassign_role', node: 'role', module: this,
          applies: ['object', 'context'], callback: 'reassign_role',
          category: 'role', priority: 5,
          label: gettext('Reassign/Drop Owned...'),
          icon: 'wcTabIcon icon-role',
          enable: 'can_reassign_role',
        }]);
      },
      can_create_role: function(node, item) {
        var treeData = this.getTreeNodeHierarchy(item),
          server = treeData['server'];

        return server.connected && server.user.can_create_role;
      },
      can_reassign_role: function(node, item) {
        var treeData = this.getTreeNodeHierarchy(item),
          server = treeData['server'];

        return server.connected && node.can_login;
      },
      reassign_role: function() {

        var tree = pgBrowser.tree,
          _i = tree.selected(),
          _d = _i && _i.length == 1 ? tree.itemData(_i) : undefined,
          obj = this, finalUrl, old_role_name;

        //RoleReassign Model (Objects like role, database)
        var RoleReassignObjectModel = Backbone.Model.extend({
          idAttribute: 'id',
          defaults: {
            role_op: undefined,
            did: undefined,
            new_role_id: undefined,
            new_role_name: undefined,
            old_role_name: undefined,
            drop_with_cascade: false
          },

          // Default values!
          initialize: function() {
            // Set default options according to node type selection by user
            Backbone.Model.prototype.initialize.apply(this, arguments);
          },
          schema: [
            {
              id: 'role_op',
              label: gettext('Operation'),
              cell: 'string',
              type: 'radioModern',
              controlsClassName: 'pgadmin-controls col-12 col-sm-8',
              controlLabelClassName: 'control-label col-sm-4 col-12',
              group: gettext('General'),
              options: [{
                'label': 'Reassign',
                'value': 'reassign',
              },
              {
                'label': 'Drop',
                'value': 'drop',
              },
              ],
              helpMessage: gettext('Change the ownership or\ndrop the database objects owned by a database role'),
            },
            {
              id: 'new_role_name',
              label: gettext('Reassign objects to'),
              controlsClassName: 'pgadmin-controls col-12 col-sm-8',
              controlLabelClassName: 'control-label col-sm-4 col-12',
              url: 'nodes',
              helpMessage: gettext('New owner of the affected objects'),
              transform: function(data, cell) {
                var res = [],
                  control = cell || this,
                  node = control.field.get('schema_node');

                // remove the current role from list
                let current_label = control.field.attributes.node_info.role.label;
                if (data && _.isArray(data)) {

                  let CURRENT_USER = {
                      label: 'CURRENT_USER', value: 'CURRENT_USER',
                      image: 'icon-' + node.type, _id: null,
                    },
                    SESSION_USER = {
                      label: 'SESSION_USER', value: 'SESSION_USER', image: 'icon-' + node.type, _id: null,
                    };
                  CURRENT_USER.value = JSON.stringify(CURRENT_USER);
                  SESSION_USER.value = JSON.stringify(SESSION_USER);

                  res.push(CURRENT_USER, SESSION_USER);

                  if(control.field.attributes.node_data.version >= 140000) {
                    let CURRENT_ROLE = {
                      label: 'CURRENT_ROLE', value: 'CURRENT_ROLE',
                      image: 'icon-' + node.type, _id: null,
                    };
                    CURRENT_ROLE.value = JSON.stringify(CURRENT_ROLE);
                    res.push(CURRENT_ROLE);
                  }

                  _.each(data, function(d) {
                    /*
                      * d contains json data and sets into
                      * select's option control
                      *
                      * We need to stringify data because formatter will
                      * convert Array Object as [Object] string
                      */
                    if (current_label != d.label)
                      res.push({label: d.label, image: d.icon, value: JSON.stringify(d)});
                  });
                }
                return res;
              },
              control: Backform.NodeListByIdControl.extend({
                getValueFromDOM: function() {
                  var data = this.formatter.toRaw(
                    _.unescape(this.$el.find('select').val()), this.model);
                  /*
                   * return null if data is empty to prevent it from
                   * throwing parsing error. Adds check as name can be empty
                   */
                  if (data === '') {
                    return null;
                  }
                  else if (typeof(data) === 'string') {
                    data=JSON.parse(data);
                  }
                  return data.label;
                },
                /*
                 * When name is changed, extract value from its select option and
                 * set attributes values into the model
                 */
                onChange: function() {
                  Backform.NodeAjaxOptionsControl.prototype.onChange.apply(
                    this, arguments
                  );
                  var selectedValue = this.$el.find('select').val();
                  if (selectedValue.trim() != '') {
                    var d = this.formatter.toRaw(selectedValue, this.model);
                    if(typeof(d) === 'string')
                      d=JSON.parse(d);
                    this.model.set({
                      'new_role_id' : d._id,
                      'new_role_name': d.label,
                    });
                  }
                }
              }),
              node: 'role',
              group: gettext('General'),
              select2: {
                allowClear: false,
              },
              disabled: 'isDisabled',
              deps: ['role_op'],
              filter: function(d) {
                // Exclude the currently selected
                let tree = pgBrowser.tree,
                  _i = tree.selected(),
                  _d = _i && _i.length == 1 ? tree.itemData(_i) : undefined;

                if(!_d)
                  return true;

                return d && (d.label != _d.label);
              },
            },
            {
              id: 'drop_with_cascade',
              label: gettext('Cascade?'),
              cell: 'string',
              type: 'switch',
              controlsClassName: 'pgadmin-controls col-12 col-sm-8',
              controlLabelClassName: 'control-label col-sm-4 col-12',
              disabled: 'isDisabled',
              group: gettext('General'),
              options: {
                'onText':  gettext('Yes'),
                'offText':  gettext('No'), 'size': 'mini'
              },
              deps: ['role_op'],
              helpMessage: gettext('Note: CASCADE will automatically drop objects that depend on the affected objects, and in turn all objects that depend on those objects'),
            },
            {
              id: 'did',
              label: gettext('From database'),
              controlsClassName: 'pgadmin-controls col-12 col-sm-8',
              controlLabelClassName: 'control-label col-sm-4 col-12',
              node: 'database',
              group: gettext('General'),
              disabled: 'isDisabled',
              control: Backform.NodeListByIdControl.extend({
                onChange: function() {
                  Backform.NodeListByIdControl.prototype.onChange.apply(
                    this, arguments
                  );
                  let did = this.model.get('did');
                  this.model.set('did', parseInt(did));
                },
              }),
              select2: {
                allowClear: false,
              },
              events: {
                'select2:select': 'onChange'
              },
              first_empty: false,
              helpMessage: gettext('Target database on which the operation will be carried out'),
            },
            {
              id: 'sqltab', label: gettext('SQL'), group: gettext('SQL'),
              type: 'text', disabled: false, control: Backform.SqlTabControl.extend({
                initialize: function() {
                  // Initialize parent class
                  Backform.SqlTabControl.prototype.initialize.apply(this, arguments);
                },
                onTabChange: function(sql_tab_obj) {
                  // Fetch the information only if the SQL tab is visible at the moment.
                  if (this.dialog && sql_tab_obj.shown == this.tabIndex) {
                    var self = this,
                      roleReassignData = self.model.toJSON(),
                      getUrl;
                    // Add existing role
                    roleReassignData.old_role_name = old_role_name;

                    getUrl = obj.generate_url(_i, 'reassign' , _d, true);

                    $.ajax({
                      url: getUrl,
                      type: 'GET',
                      cache: false,
                      data: roleReassignData,
                      dataType: 'json',
                      contentType: 'application/json',
                    }).done(function(res) {
                      self.sqlCtrl.setValue(res.data);
                    });
                  }
                },
              }),
            }
          ],
          validate: function() {
            return null;
          },
          isDisabled: function(m) {

            let self_local = this;
            switch(this.name) {
            case 'new_role_name':
              return (m.get('role_op') != 'reassign');
            case 'drop_with_cascade':
              return (m.get('role_op') != 'drop');
            case 'did':
              setTimeout(function() {
                if(_.isUndefined(m.get('did'))) {
                  let db = self_local.options[0];
                  m.set('did', db.value);
                }
              }, 10);
              return false;
            default:
              return false;
            }
          },
        });

        if (!_d)
          return;

        if (!alertify.roleReassignDialog) {
          alertify.dialog('roleReassignDialog', function factory() {
            return {
              main: function(title) {
                this.set('title', title);
              },
              setup: function() {
                return {
                  buttons:[{
                    text: '', key: 112,
                    className: 'btn btn-primary-icon pull-left fa fa-question pg-alertify-icon-button',
                    attrs:{name:'dialog_help', type:'button', label: gettext('Users'),
                      url: url_for('help.static', {'filename': 'role_reassign_dialog.html'})},
                  },{
                    text: gettext('Cancel'),
                    key: 27,
                    className: 'btn btn-secondary fa fa-lg fa-times pg-alertify-button',
                  }, {
                    text: gettext('OK'),
                    key: 13,
                    className: 'btn btn-primary fa fa-lg fa-save pg-alertify-button',
                  }],
                  focus: {
                    element: 0,
                  },
                  options: {
                    //disable both padding and overflow control.
                    padding : !1,
                    overflow: !1,
                    modal: false,
                    resizable: true,
                    maximizable: true,
                    pinnable: false,
                    closableByDimmer: false,
                  },
                };
              },
              build: function() {
                alertify.pgDialogBuild.apply(this);
              },
              hooks:{
                onclose: function() {
                  if (this.view) {
                    // clear our backform model/view
                    this.view.remove({data: true, internal: true, silent: true});
                  }
                },
              },
              prepare:function() {

                var self = this,
                  $container = $('<div class=\'role_reassign_own\'></div>');
                //Disable Okay button
                self.__internal.buttons[2].element.disabled = true;
                // Find current/selected node
                var tree = pgBrowser.tree,
                  _i = tree.selected(),
                  _d = _i && _i.length == 1 ? tree.itemData(_i) : undefined,
                  node = _d && pgBrowser.Nodes[_d._type];

                finalUrl = obj.generate_url(_i, 'reassign' , _d, true);
                old_role_name = _d.label;

                if (!_d)
                  return;
                // Create treeInfo
                var treeInfo = node.getTreeNodeHierarchy.apply(node, [_i]);
                // Instance of backbone model
                var newModel = new RoleReassignObjectModel({}, {node_info: treeInfo}),
                  fields = Backform.generateViewSchema(
                    treeInfo, newModel, 'create', node,
                    treeInfo.server, true
                  );

                var view = self.view = new Backform.Dialog({
                  el: $container, model: newModel, schema: fields,
                });
                // Add our class to alertify
                $(self.elements.body.childNodes[0]).addClass(
                  'alertify_tools_dialog_properties obj_properties'
                );

                // Render dialog
                view.render();
                self.elements.content.append($container.get(0));

                const statusBar = $(
                  '<div class=\'pg-prop-status-bar pg-prop-status-bar-absolute pg-el-xs-12 d-none\'>' +
                  '  <div class="error-in-footer"> ' +
                  '    <div class="d-flex px-2 py-1"> ' +
                  '      <div class="pr-2"> ' +
                  '        <i class="fa fa-exclamation-triangle text-danger" aria-hidden="true"></i> ' +
                  '      </div> ' +
                  '      <div class="alert-text" role="alert"></div> ' +
                  '       <div class="ml-auto close-error-bar"> ' +
                  '          <a aria-label="' + gettext('Close error bar') + '" class="close-error fa fa-times text-danger"></a> ' +
                  '        </div> ' +
                  '    </div> ' +
                  '  </div> ' +
                  '</div>').appendTo($container);

                // Listen to model & if filename is provided then enable Backup button
                this.view.model.on('change', function() {

                  const ctx = this;

                  const showError = function(errorField, errormsg) {
                    ctx.errorModel.set(errorField, errormsg);
                    statusBar.removeClass('d-none');
                    statusBar.find('.alert-text').html(errormsg);
                    self.elements.dialog.querySelector('.close-error').addEventListener('click', ()=>{
                      statusBar.addClass('d-none');
                      ctx.errorModel.set(errorField, errormsg);
                    });
                  };
                  statusBar.addClass('d-none');

                  if ((this.get('role_op') == 'reassign')
                    && !_.isUndefined(this.get('new_role_name')
                    && this.get('new_role_name') !== '')
                  ) {
                    this.errorModel.clear();
                    self.__internal.buttons[2].element.disabled = false;
                  } else if(this.get('role_op') == 'drop') {
                    this.errorModel.clear();
                    this.set({'new_role_name': undefined, silent: true});
                    this.set({'new_role_id': undefined, silent: true});
                    self.__internal.buttons[2].element.disabled = false;
                  } else if(_.isUndefined(this.get('new_role_name'))) {
                    let errmsg = gettext('Please provide a new role name');
                    this.errorModel.set('new_role_name', errmsg);
                    showError('new_role_name', errmsg);
                    self.__internal.buttons[2].element.disabled = true;
                  }
                  else {
                    self.__internal.buttons[2].element.disabled = true;
                  }
                });

                // set default role operation as reassign
                this.view.model.set({'role_op': 'reassign'});
              },
              // Callback functions when click on the buttons of the alertify dialogs
              callback: function(e) {
                if (e.button.element.name == 'dialog_help') {
                  e.cancel = true;
                  pgBrowser.showHelp(e.button.element.name, e.button.element.getAttribute('url'),
                    null, null);
                  return;
                }
                if (e.button.text === gettext('OK')) {

                  let roleReassignData = this.view.model.toJSON(),
                    roleOp = roleReassignData.role_op,
                    confirmBoxTitle = utils.titleize(roleOp);

                  alertify.confirm(
                    gettext('%s Objects', confirmBoxTitle),
                    gettext('Are you sure you wish to %s all the objects owned by the selected role?', roleOp),
                    function() {
                      axios.post(
                        finalUrl,
                        roleReassignData
                      ).then(function (response) {
                        if(response.data)
                          alertify.success(response.data.info);
                      }).catch(function (error) {
                        try {
                          const err = error.response.data;
                          alertify.alert(
                            gettext('Role reassign/drop failed.'),
                            err.errormsg
                          );
                        } catch (e) {
                          console.warn(e.stack || e);
                        }
                      });
                    },
                    function() { return true; }
                  ).set('labels', {
                    ok: gettext('Yes'),
                    cancel: gettext('No'),
                  });
                }
              },
            };
          });
        }

        alertify.roleReassignDialog(
          gettext('Reassign/Drop Owned - \'%s\'', _d.label)
        ).resizeTo(pgAdmin.Browser.stdW.md, pgAdmin.Browser.stdH.lg);
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
          rolmembers: [],
          rolvaliduntil: null,
          seclabels: [],
          variables: [],
        },
        schema: [{
          id: 'rolname', label: gettext('Name'), type: 'text',
          readonly: 'readonly',
        },{
          id: 'oid', label: gettext('OID'), cell: 'string', mode: ['properties'],
          editable: false, type: 'text', visible: true,
        },{
          id: 'rolpassword', label: gettext('Password'), type: 'password',
          group: gettext('Definition'), mode: ['edit', 'create'],
          control: 'input', deps: ['rolcanlogin'], retype: true,
          cell: 'string', disabled: function(m) {
            if (!m.isNew()) {
              var user = this.node_info.server.user;

              return (!(user.is_superuser || user.can_create_role) &&
                user.id != m.get('oid'));
            }
            return false;
          },
        },{
          id: 'rolvaliduntil', readonly: 'readonly', type: 'text',
          group: gettext('Definition'), label: gettext('Account expires'),
          mode: ['properties', 'edit', 'create'], control: 'datetimepicker',
          deps: ['rolcanlogin'],
          placeholder: gettext('No Expiry'),
          helpMessage: gettext('Please note that if you leave this field blank, then password will never expire.'),
          setMinDate: false,
        },{
          id: 'rolconnlimit',  type: 'int', group: gettext('Definition'),
          label: gettext('Connection limit'), cell: 'integer', min : -1,
          mode: ['properties', 'edit', 'create'], readonly: 'readonly',
        },{
          id: 'rolcanlogin', label: gettext('Can login?'),
          type: 'switch',
          controlLabelClassName: 'control-label pg-el-sm-4 pg-el-12',
          controlsClassName: 'pgadmin-controls pg-el-sm-8 pg-el-12',
          group: gettext('Privileges'),
          readonly: 'readonly',
        },{
          id: 'rolsuper', label: gettext('Superuser?'),
          type: 'switch',
          controlLabelClassName: 'control-label pg-el-sm-4 pg-el-12',
          controlsClassName: 'pgadmin-controls pg-el-sm-8 pg-el-12',
          group: gettext('Privileges'),
          control: Backform.SwitchControl.extend({
            onChange: function() {
              Backform.SwitchControl.prototype.onChange.apply(this, arguments);

              this.model.set('rolcatupdate', this.model.get('rolsuper'));
              this.model.set('rolcreaterole', this.model.get('rolsuper'));
              this.model.set('rolcreatedb', this.model.get('rolsuper'));
            },
          }),
          readonly: 'readonly',
        },{
          id: 'rolcreaterole', label: gettext('Create roles?'),
          group: gettext('Privileges'),
          type: 'switch',
          controlLabelClassName: 'control-label pg-el-sm-4 pg-el-12',
          controlsClassName: 'pgadmin-controls pg-el-sm-8 pg-el-12',
          readonly: 'readonly',
        },{
          id: 'is_sys_obj', label: gettext('System role?'),
          cell:'boolean', type: 'switch', mode: ['properties'],
        },{
          id: 'description', label: gettext('Comments'), type: 'multiline',
          group: null, mode: ['properties', 'edit', 'create'],
          readonly: 'readonly',
        },{
          id: 'rolcreatedb', label: gettext('Create databases?'),
          group: gettext('Privileges'),
          type: 'switch',
          controlLabelClassName: 'control-label pg-el-sm-4 pg-el-12',
          controlsClassName: 'pgadmin-controls pg-el-sm-8 pg-el-12',
          readonly: 'readonly',
        },{
          id: 'rolcatupdate', label: gettext('Update catalog?'),
          type: 'switch',
          controlLabelClassName: 'control-label pg-el-sm-4 pg-el-12',
          controlsClassName: 'pgadmin-controls pg-el-sm-8 pg-el-12',
          max_version: 90400,
          group: gettext('Privileges'), readonly: function(m) {
            return m.get('read_only');
          },
          disabled: function(m) {
            return !m.get('rolsuper');
          },
        },{
          id: 'rolinherit', group: gettext('Privileges'),
          label: gettext('Inherit rights from the parent roles?'),
          type: 'switch',
          controlLabelClassName: 'control-label pg-el-sm-4 pg-el-12',
          controlsClassName: 'pgadmin-controls pg-el-sm-8 pg-el-12',
          readonly: 'readonly',
        },{
          id: 'rolreplication', group: gettext('Privileges'),
          label: gettext('Can initiate streaming replication and backups?'),
          type: 'switch',
          controlLabelClassName: 'control-label pg-el-sm-4 pg-el-12',
          controlsClassName: 'pgadmin-controls pg-el-sm-8 pg-el-12',
          min_version: 90100,
          readonly: 'readonly',
        },
        {
          id: 'rolmembership', label: gettext('Member of'),
          group: gettext('Membership'), type: 'collection',
          cell: 'string', mode: ['properties', 'edit', 'create'],
          readonly: 'readonly',
          control: RoleMembersControl, model: pgBrowser.Node.Model.extend({
            keys: ['role'],
            idAttribute: 'role',
            defaults: {
              role: undefined,
              admin: false,
            },
            validate: function() {
              return null;
            },
          }),
          filter: function(d) {
            return this.model.isNew() || (this.model.get('rolname') != d.label);
          },
          helpMessage: function(m) {
            if (m.has('read_only') && m.get('read_only') == false) {
              return gettext('Select the checkbox for roles to include WITH ADMIN OPTION.');
            } else {
              return gettext('Roles shown with a check mark have the WITH ADMIN OPTION set.');
            }
          },
        },
        {
          id: 'rolmembers', label: gettext('Members'), type: 'collection', group: gettext('Membership'),
          mode: ['properties', 'edit', 'create'], cell: 'string',
          readonly: 'readonly',
          control: RoleMembersControl, model: pgBrowser.Node.Model.extend({
            keys: ['role'],
            idAttribute: 'role',
            defaults: {
              role: undefined,
              admin: false,
            },
            validate: function() {
              return null;
            },
          }),
          filter: function(d) {
            return this.model.isNew() || (this.model.get('rolname') != d.label);
          },
          helpMessage: function(m) {
            if (m.has('read_only') && m.get('read_only') == false) {
              return gettext('Select the checkbox for roles to include WITH ADMIN OPTION.');
            } else {
              return gettext('Roles shown with a check mark have the WITH ADMIN OPTION set.');
            }
          },
        },
        {
          id: 'variables', label: '', type: 'collection',
          group: gettext('Parameters'), hasDatabase: true, url: 'variables',
          model: pgBrowser.Node.VariableModel.extend({keys:['name', 'database']}),
          control: 'variable-collection',
          mode: [ 'edit', 'create'], canAdd: true, canDelete: true,
          readonly: 'readonly',
        },{
          id: 'seclabels', label: gettext('Security labels'),
          model: SecurityModel, editable: false, type: 'collection',
          group: gettext('Security'), mode: ['edit', 'create'],
          min_version: 90200, readonly: 'readonly', canAdd: true,
          canEdit: false, canDelete: true, control: 'unique-col-collection',
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
            err['name'] = gettext('Name cannot be empty.');
            errmsg = err['name'];
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
        },
      }),
    });
  }

  return pgBrowser.Nodes['role'];
});
