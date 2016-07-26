define([
      'jquery', 'underscore', 'underscore.string', 'alertify',
      'pgadmin.browser', 'backbone', 'backgrid', 'backform', 'pgadmin.browser.node',
      'backgrid.select.all', 'backgrid.filter'
      ],

  // This defines Backup dialog
  function($, _, S, alertify, pgBrowser, Backbone, Backgrid, Backform, pgNode) {

    // if module is already initialized, refer to that.
    if (pgBrowser.UserManagement) {
      return pgBrowser.UserManagement;
    }

    var BASEURL = '{{ url_for('user_management.index')}}',
        USERURL = BASEURL + 'user/',
        ROLEURL = BASEURL + 'role/',
        userFilter = function(collection) {
      return (new Backgrid.Extension.ClientSideFilter({
        collection: collection,
        placeholder: _('Filter by email'),

        // The model fields to search for matches
        fields: ['email'],

        // How long to wait after typing has stopped before searching can start
        wait: 150
      }));
    },
        StringDepCell = Backgrid.StringCell.extend({
      initialize: function() {
        Backgrid.StringCell.prototype.initialize.apply(this, arguments);
        Backgrid.Extension.DependentCell.prototype.initialize.apply(this, arguments);
      },
      dependentChanged: function () {
        this.$el.empty();

        var self = this,
            model = this.model,
            column = this.column,
            editable = this.column.get("editable");

        this.render();

        is_editable = _.isFunction(editable) ? !!editable.apply(column, [model]) : !!editable;
        setTimeout(function() {
          self.$el.removeClass("editor");
          if (is_editable){ self.$el.addClass("editable"); }
          else { self.$el.removeClass("editable"); }
        }, 10);

        this.delegateEvents();
        return this;
      },
      remove: Backgrid.Extension.DependentCell.prototype.remove
    });

    pgBrowser.UserManagement  = {
      init: function() {
        if (this.initialized)
          return;

        this.initialized = true;

        return this;
      }
      {% if is_admin %},

      // Callback to draw User Management Dialog.
      show_users: function(action, item, params) {
        var Roles = [];

        var UserModel = pgAdmin.Browser.Node.Model.extend({
            idAttribute: 'id',
            urlRoot: USERURL,
            defaults: {
              id: undefined,
              email: undefined,
              active: true,
              role: undefined,
              newPassword: undefined,
              confirmPassword: undefined
            },
            schema: [
            {
              id: 'email', label: '{{ _('Email') }}', type: 'text',
              cell:StringDepCell, cellHeaderClasses:'width_percent_30',
              deps: ['id'],
              editable: function(m) {
                if(m instanceof Backbone.Collection) {
                  return false;
                }
                // Disable email edit for existing user.
                if (m.isNew()){
                    return true;
                }
                return false;
              }
            },{
              id: 'role', label: '{{ _('Role') }}',
              type: 'text', control: "Select2", cellHeaderClasses:'width_percent_20',
              cell: 'select2', select2: {allowClear: false, openOnEnter: false},
              options: function (controlOrCell) {
                var options = [];

                if( controlOrCell instanceof Backform.Control){
                  // This is be backform select2 control
                  _.each(Roles, function(role) {
                    options.push({
                      label: role.name,
                      value: role.id.toString()}
                    );
                  });
                } else {
                  // This must be backgrid select2 cell
                  _.each(Roles, function(role) {
                    options.push([role.name, role.id.toString()]);
                  });
                }

                return options;
              },
              editable: function(m) {
                if(m instanceof Backbone.Collection) {
                  return true;
                }
                if (m.get("id") == {{user_id}}){
                    return false;
                } else {
                    return true;
                }
              }
            },{
              id: 'active', label: '{{ _('Active') }}',
              type: 'switch', cell: 'switch', cellHeaderClasses:'width_percent_10',
              options: { 'onText': 'Yes', 'offText': 'No'},
              editable: function(m) {
                if(m instanceof Backbone.Collection) {
                  return true;
                }
                if (m.get("id") == {{user_id}}){
                    return false;
                } else {
                    return true;
                }
              }
            },{
              id: 'newPassword', label: '{{ _('New password') }}',
              type: 'password', disabled: false, control: 'input',
              cell: 'password', cellHeaderClasses:'width_percent_20'
            },{
              id: 'confirmPassword', label: '{{ _('Confirm password') }}',
              type: 'password', disabled: false, control: 'input',
              cell: 'password', cellHeaderClasses:'width_percent_20'
            }],
            validate: function() {
              var err = {},
                  errmsg = null,
                  changedAttrs = this.changed || {},
                  email_filter = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

              if (('email' in changedAttrs || !this.isNew()) && (_.isUndefined(this.get('email')) ||
                    _.isNull(this.get('email')) ||
                    String(this.get('email')).replace(/^\s+|\s+$/g, '') == '')) {
                errmsg =  '{{ _('Email address cannot be empty.')}}';
                this.errorModel.set('email', errmsg);
                return errmsg;
              } else if (!!this.get('email') && !email_filter.test(this.get('email'))) {

                errmsg =  S("{{ _("Invalid email address: %s.")}}").sprintf(
                            this.get('email')
                          ).value();
                this.errorModel.set('email', errmsg);
                return errmsg;
              } else if (!!this.get('email') && this.collection.where({"email":this.get('email')}).length > 1) {

                errmsg =  S("{{ _("The email address %s already exists.")}}").sprintf(
                            this.get('email')
                          ).value();

                this.errorModel.set('email', errmsg);
                return errmsg;
              } else {
                this.errorModel.unset('email');
              }

              if ('role' in changedAttrs && (_.isUndefined(this.get('role')) ||
                    _.isNull(this.get('role')) ||
                    String(this.get('role')).replace(/^\s+|\s+$/g, '') == '')) {

                errmsg =  S("{{ _("Role cannot be empty for user %s.")}}").sprintf(
                            (this.get('email') || '')
                          ).value();

                this.errorModel.set('role', errmsg);
                return errmsg;
              } else {
                this.errorModel.unset('role');
              }

              if(this.isNew()){
                // Password is compulsory for new user.
                if ('newPassword' in changedAttrs && (_.isUndefined(this.get('newPassword')) ||
                      _.isNull(this.get('newPassword')) ||
                      this.get('newPassword') == '')) {

                  errmsg =  S("{{ _("Password cannot be empty for user %s.")}}").sprintf(
                            (this.get('email') || '')
                          ).value();

                  this.errorModel.set('newPassword', errmsg);
                  return errmsg;
                } else if (!_.isUndefined(this.get('newPassword')) &&
                  !_.isNull(this.get('newPassword')) &&
                  this.get('newPassword').length < 6) {

                  errmsg =  S("{{ _("Password must be at least 6 characters for user %s.")}}").sprintf(
                            (this.get('email') || '')
                          ).value();

                  this.errorModel.set('newPassword', errmsg);
                  return errmsg;
                } else {
                  this.errorModel.unset('newPassword');
                }

                if ('confirmPassword' in changedAttrs && (_.isUndefined(this.get('confirmPassword')) ||
                      _.isNull(this.get('confirmPassword')) ||
                      this.get('confirmPassword') == '')) {

                  errmsg =  S("{{ _("Confirm Password cannot be empty for user %s.")}}").sprintf(
                            (this.get('email') || '')
                          ).value();

                  this.errorModel.set('confirmPassword', errmsg);
                  return errmsg;
                } else {
                  this.errorModel.unset('confirmPassword');
                }

                if(!!this.get('newPassword') && !!this.get('confirmPassword') &&
                    this.get('newPassword') != this.get('confirmPassword')) {

                  errmsg =  S("{{ _("Passwords do not match for user %s.")}}").sprintf(
                            (this.get('email') || '')
                          ).value();

                  this.errorModel.set('confirmPassword', errmsg);
                  return errmsg;
                } else {
                  this.errorModel.unset('confirmPassword');
                }

              } else {
                if ((_.isUndefined(this.get('newPassword')) || _.isNull(this.get('newPassword')) ||
                      this.get('newPassword') == '') &&
                      ((_.isUndefined(this.get('confirmPassword')) || _.isNull(this.get('confirmPassword')) ||
                      this.get('confirmPassword') == ''))) {

                   this.errorModel.unset('newPassword');
                   if(this.get('newPassword') == ''){
                    this.set({'newPassword': undefined})
                   }

                   this.errorModel.unset('confirmPassword');
                   if(this.get('confirmPassword') == ''){
                    this.set({'confirmPassword': undefined})
                   }
                } else if (!_.isUndefined(this.get('newPassword')) &&
                    !_.isNull(this.get('newPassword')) &&
                    !this.get('newPassword') == '' &&
                    this.get('newPassword').length < 6) {

                  errmsg =  S("{{ _("Password must be at least 6 characters for user %s.")}}").sprintf(
                            (this.get('email') || '')
                          ).value();

                  this.errorModel.set('newPassword', errmsg);
                  return errmsg;
                } else if (_.isUndefined(this.get('confirmPassword')) ||
                      _.isNull(this.get('confirmPassword')) ||
                      this.get('confirmPassword') == '') {

                  errmsg =  S("{{ _("Confirm Password cannot be empty for user %s.")}}").sprintf(
                            (this.get('email') || '')
                          ).value();

                  this.errorModel.set('confirmPassword', errmsg);
                  return errmsg;
                } else if (!!this.get('newPassword') && !!this.get('confirmPassword') &&
                          this.get('newPassword') != this.get('confirmPassword')) {

                  errmsg =  S("{{ _("Passwords do not match for user %s.")}}").sprintf(
                            (this.get('email') || '')
                          ).value();

                  this.errorModel.set('confirmPassword', errmsg);
                  return errmsg;
                } else {
                  this.errorModel.unset('newPassword');
                  this.errorModel.unset('confirmPassword');
                }
              }
              return null;
            }
          }),
          gridSchema = Backform.generateGridColumnsFromModel(
              null, UserModel, 'edit'),
          deleteUserCell = Backgrid.Extension.DeleteCell.extend({
            deleteRow: function(e) {
              self = this;
              e.preventDefault();

              if (self.model.get("id") == {{user_id}}) {
                alertify.alert(
                  '{{_('Cannot delete user.') }}',
                  '{{_('Cannot delete currently logged in user.') }}',
                  function(){
                    return true;
                  }
                );
                return true;
              }

              // We will check if row is deletable or not
              var canDeleteRow = (!_.isUndefined(this.column.get('canDeleteRow')) &&
                                  _.isFunction(this.column.get('canDeleteRow')) ) ?
                                   Backgrid.callByNeed(this.column.get('canDeleteRow'),
                                    this.column, this.model) : true;
              if (canDeleteRow) {
                if(self.model.isNew()){
                  self.model.destroy();
                } else {
                  alertify.confirm(
                    'Delete user?',
                    'Are you sure you wish to delete this user?',
                    function(evt) {
                      self.model.destroy({
                        wait: true,
                        success: function(res) {
                          alertify.success('{{_('User deleted.') }}');
                        },
                        error: function(m, jqxhr) {
                          alertify.error('{{_('Error during deleting user.') }}');
                        }
                      });
                    },
                    function(evt) {
                      return true;
                    }
                  );
                }
              } else {
                alertify.alert("This user cannot be deleted.",
                  function(){
                    return true;
                  }
                );
              }
            }
          });

          gridSchema.columns.unshift({
            name: "pg-backform-delete", label: "",
            cell: deleteUserCell,
            editable: false, cell_priority: -1,
            canDeleteRow: true
          });

        // Users Management dialog code here
        if(!alertify.UserManagement) {
          alertify.dialog('UserManagement' ,function factory() {
            return {
              main: function(title) {
                this.set('title', title);
              },
              build: function() {
                alertify.pgDialogBuild.apply(this)
              },
              setup:function() {
                return {
                  buttons: [{
                    text: '', key: 27, className: 'btn btn-default pull-left fa fa-lg fa-question',
                    attrs:{name:'dialog_help', type:'button', label: '{{ _('Users') }}',
                    url: '{{ url_for('help.static', filename='pgadmin_user.html') }}'}
                  },{
                    text: '{{ _('Close') }}', key: 27, className: 'btn btn-danger fa fa-lg fa-times pg-alertify-button user_management_pg-alertify-button',
                    attrs:{name:'close', type:'button'}
                  }],
                  // Set options for dialog
                  options: {
                    title: '{{ _('User Management') }}',
                    //disable both padding and overflow control.
                    padding : !1,
                    overflow: !1,
                    modal: false,
                    resizable: true,
                    maximizable: true,
                    pinnable: false,
                    closableByDimmer: false,
                    closable: false
                  }
                };
              },
              hooks: {
                // Triggered when the dialog is closed
                onclose: function() {
                  if (this.view) {
                    // clear our backform model/view
                    this.view.remove({data: true, internal: true, silent: true});
                    this.$content.remove();
                  }
                }
              },
              prepare: function() {
                var self = this,
                  footerTpl = _.template([
                    '<div class="pg-prop-footer">',
                      '<div class="pg-prop-status-bar" style="visibility:hidden">',
                      '</div>',
                    '</div>'].join("\n")),
                  $footer = $(footerTpl()),
                  $statusBar = $footer.find('.pg-prop-status-bar'),
                  UserRow = Backgrid.Row.extend({
                    userInvalidColor: "lightYellow",

                    userValidColor: "#fff",

                    initialize: function() {
                      Backgrid.Row.prototype.initialize.apply(this, arguments);
                      this.listenTo(this.model, 'pgadmin:user:invalid', this.userInvalid);
                      this.listenTo(this.model, 'pgadmin:user:valid', this.userValid);
                    },
                    userInvalid: function() {
                      $(this.el).removeClass("new");
                      this.el.style.backgroundColor = this.userInvalidColor;
                    },
                    userValid: function() {
                      this.el.style.backgroundColor = this.userValidColor;
                    }
                  }),
                  UserCollection = Backbone.Collection.extend({
                    model: UserModel,
                    url: USERURL,
                    initialize: function() {
                      Backbone.Collection.prototype.initialize.apply(this, arguments);
                      var self = this;
                      self.changedUser = null;
                      self.invalidUsers = {};

                      self.on('add', self.onModelAdd);
                      self.on('remove', self.onModelRemove);
                      self.on('pgadmin-session:model:invalid', function(msg, m, c) {
                        self.invalidUsers[m.cid] = msg;
                        m.trigger('pgadmin:user:invalid', m);
                        $statusBar.html(msg).css("visibility", "visible");
                      });
                      self.on('pgadmin-session:model:valid', function(m, c) {
                        delete self.invalidUsers[m.cid];
                        m.trigger('pgadmin:user:valid', m);
                        this.updateErrorMsg();
                        this.saveUser(m);
                      });
                    },
                    onModelAdd: function(m) {
                      // Start tracking changes.
                      m.startNewSession();
                    },
                    onModelRemove: function(m) {
                      delete this.invalidUsers[m.cid];
                      this.updateErrorMsg();
                    },
                    updateErrorMsg: function() {
                      var self = this,
                        msg = null;

                      for (var key in self.invalidUsers) {
                        msg = self.invalidUsers [key];
                        if (msg) {
                          break;
                        }
                      }

                      if(msg){
                        $statusBar.html(msg).css("visibility", "visible");
                      } else {
                        $statusBar.empty().css("visibility", "hidden");
                      }
                    },
                    saveUser: function(m) {
                      d = m.toJSON(true);

                      if(m.isNew() && (!m.get('email') || !m.get('role') ||
                          !m.get('newPassword') || !m.get('confirmPassword') ||
                          m.get('newPassword') != m.get('confirmPassword'))
                      ) {
                      // New user model is valid but partially filled so return without saving.
                        return false;
                      } else if (!m.isNew() && m.get('newPassword') != m.get('confirmPassword')) {
                      // For old user password change is in progress and user model is valid but admin has not added
                      // both the passwords so return without saving.
                        return false;
                      }

                      if (m.sessChanged() && d && !_.isEmpty(d)) {
                        m.stopSession();
                        m.save({}, {
                          attrs: d,
                          wait: true,
                          success: function(res) {
                            // User created/updated on server now start new session for this user.
                            m.set({'newPassword':undefined,
                                   'confirmPassword':undefined});

                            m.startNewSession();
                            alertify.success(S("{{_("User '%s' saved.")|safe }}").sprintf(
                              m.get('email')
                            ).value());
                          },
                          error: function(res, jqxhr) {
                            m.startNewSession();
                            alertify.error(
                              S("{{_("Error saving user: '%s'")|safe }}").sprintf(
                                jqxhr.responseJSON.errormsg
                              ).value()
                            );
                          }
                        });
                      }
                    }
                  }),
                  userCollection = this.userCollection = new UserCollection(),
                  header = [
                    '<div class="subnode-header">',
                    '  <button class="btn-sm btn-default add fa fa-plus" title="<%-add_title%>" <%=canAdd ? "" : "disabled=\'disabled\'"%> ></button>',
                    '  <div class="control-label search_users"></div>',
                    '</div>',].join("\n"),
                  headerTpl = _.template(header),
                  data = {
                    canAdd: true,
                    add_title: '{{ _("Add new user") }}'
                  },
                  $gridBody = $("<div></div>", {
                    class: "user_container"
                  });

                $.ajax({
                  url: ROLEURL,
                  method: 'GET',
                  async: false,
                  success: function(res) {
                    Roles = res
                  },
                  error: function(e) {
                    setTimeout(function() {
                      alertify.alert(
                        '{{ _('Cannot load user roles.') }}'
                      );
                    },100);
                  }
                });

                var view = this.view = new Backgrid.Grid({
                  row: UserRow,
                  columns: gridSchema.columns,
                  collection: userCollection,
                  className: "backgrid table-bordered"
                });

                $gridBody.append(view.render().$el[0]);

                this.$content = $("<div class='user_management object subnode'></div>").append(
                    headerTpl(data)).append($gridBody
                    ).append($footer);

                $(this.elements.body.childNodes[0]).addClass(
                  'alertify_tools_dialog_backgrid_properties');

                this.elements.content.appendChild(this.$content[0]);

                // Render Search Filter
                $('.search_users').append(
                  userFilter(userCollection).render().el);

                userCollection.fetch();

                this.$content.find('button.add').first().click(function(e) {
                  e.preventDefault();
                  var canAddRow = true;

                  if (canAddRow) {
                      // There should be only one empty row.

                      var isEmpty = false,
                        unsavedModel = null;

                      userCollection.each(function(model) {
                        if(!isEmpty) {
                          isEmpty = model.isNew();
                          unsavedModel = model;
                        }
                      });
                      if(isEmpty) {
                        var idx = userCollection.indexOf(unsavedModel),
                          row = view.body.rows[idx].$el;

                        row.addClass("new");
                        $(row).pgMakeVisible('backform-tab');
                        return false;
                      }

                      $(view.body.$el.find($("tr.new"))).removeClass("new")
                      var m = new (UserModel) (null, {
                        handler: userCollection,
                        top: userCollection,
                        collection: userCollection
                      });
                      userCollection.add(m);

                      var idx = userCollection.indexOf(m),
                          newRow = view.body.rows[idx].$el;

                      newRow.addClass("new");
                      $(newRow).pgMakeVisible('backform-tab');
                      return false;
                  }
                });
              },
              callback: function(e) {
                if (e.button.element.name == "dialog_help") {
                  e.cancel = true;
                  pgBrowser.showHelp(e.button.element.name, e.button.element.getAttribute('url'),
                    null, null, e.button.element.getAttribute('label'));
                  return;
                }
                if (e.button.element.name == "close") {
                  var self = this;
                  if (!_.all(this.userCollection.pluck('id')) || !_.isEmpty(this.userCollection.invalidUsers)) {
                    e.cancel = true;
                    alertify.confirm(
                      '{{ _('Discard unsaved changes?') }}',
                      '{{ _('Are you sure you want to close the dialog? Any unsaved changes will be lost.') }}',
                      function(e) {
                        self.close();
                        return true;
                      },
                      function(e) {
                        // Do nothing.
                        return true;
                      }
                    );
                  }
                }
              }
          };
       });
      }
        alertify.UserManagement(true).resizeTo('680px','400px');
     }{% endif %}

    };
    return pgBrowser.UserManagement;
  });
