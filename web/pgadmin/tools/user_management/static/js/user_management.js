/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define([
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore', 'pgadmin.alertifyjs',
  'pgadmin.browser', 'backbone', 'backgrid', 'backform', 'pgadmin.browser.node', 'pgadmin.backform',
  'pgadmin.user_management.current_user', 'sources/utils',
  'backgrid.select.all', 'backgrid.filter',
], function(
  gettext, url_for, $, _, alertify, pgBrowser, Backbone, Backgrid, Backform,
  pgNode, pgBackform, userInfo, commonUtils,
) {

  // if module is already initialized, refer to that.
  if (pgBrowser.UserManagement) {
    return pgBrowser.UserManagement;
  }

  var USERURL = url_for('user_management.users'),
    ROLEURL = url_for('user_management.roles'),
    SOURCEURL = url_for('user_management.auth_sources'),
    DEFAULT_AUTH_SOURCE = 'internal',
    AUTH_ONLY_INTERNAL = (userInfo['auth_sources'].length  == 1 && userInfo['auth_sources'].includes(DEFAULT_AUTH_SOURCE)) ? true : false,
    userFilter = function(collection) {
      return (new Backgrid.Extension.ClientSideFilter({
        collection: collection,
        placeholder: gettext('Filter by email'),
        // How long to wait after typing has stopped before searching can start
        wait: 150,
      }));
    };

  // Integer Cell for Columns Length and Precision
  var PasswordDepCell = Backgrid.Extension.PasswordDepCell =
    Backgrid.Extension.PasswordCell.extend({
      initialize: function() {
        Backgrid.Extension.PasswordCell.prototype.initialize.apply(this, arguments);
        Backgrid.Extension.DependentCell.prototype.initialize.apply(this, arguments);
      },
      dependentChanged: function () {
        this.$el.empty();
        this.render();
        var model = this.model,
          column = this.column,
          editable = this.column.get('editable'),
          is_editable = _.isFunction(editable) ? !!editable.apply(column, [model]) : !!editable;

        if (is_editable){ this.$el.addClass('editable'); }
        else { this.$el.removeClass('editable'); }

        this.delegateEvents();
        return this;
      },
      render: function() {
        Backgrid.NumberCell.prototype.render.apply(this, arguments);

        var model = this.model,
          column = this.column,
          editable = this.column.get('editable'),
          is_editable = _.isFunction(editable) ? !!editable.apply(column, [model]) : !!editable;

        if (is_editable){ this.$el.addClass('editable'); }
        else { this.$el.removeClass('editable'); }
        return this;
      },
      remove: Backgrid.Extension.DependentCell.prototype.remove,
    });

  pgBrowser.UserManagement = {
    init: function() {
      if (this.initialized)
        return;

      this.initialized = true;

      return this;
    },

    // Callback to draw change password Dialog.
    change_password: function(url) {
      var title = gettext('Change Password');

      if (!alertify.ChangePassword) {
        alertify.dialog('ChangePassword', function factory() {
          return {
            main: function(alertTitle, alertUrl) {
              this.set({
                'title': alertTitle,
                'url': alertUrl,
              });
            },
            build: function() {
              alertify.pgDialogBuild.apply(this);
            },
            settings: {
              url: undefined,
            },
            setup: function() {
              return {
                buttons: [{
                  text: '',
                  key: 112,
                  className: 'btn btn-primary-icon pull-left fa fa-question pg-alertify-icon-button',
                  attrs: {
                    name: 'dialog_help',
                    type: 'button',
                    label: gettext('Change Password'),
                    url: url_for(
                      'help.static', {
                        'filename': 'change_user_password.html',
                      }),
                  },
                }, {
                  text: gettext('Close'),
                  key: 27,
                  className: 'btn btn-secondary fa fa-lg fa-times pg-alertify-button',
                  attrs: {
                    name: 'close',
                    type: 'button',
                  },
                }],
                // Set options for dialog
                options: {
                  //disable both padding and overflow control.
                  padding: !1,
                  overflow: !1,
                  modal: false,
                  resizable: true,
                  maximizable: true,
                  pinnable: false,
                  closableByDimmer: false,
                  closable: false,
                },
              };
            },
            hooks: {
              // Triggered when the dialog is closed
              onclose: function() {
                // Clear the view
                return setTimeout((function() {
                  return alertify.ChangePassword().destroy();
                }), 500);
              },
            },
            prepare: function() {
              // create the iframe element
              var iframe = document.createElement('iframe');
              iframe.frameBorder = 'no';
              iframe.width = '100%';
              iframe.height = '100%';
              iframe.src = this.setting('url');
              // add it to the dialog
              this.elements.content.appendChild(iframe);
            },
            callback: function(e) {
              if (e.button.element.name == 'dialog_help') {
                e.cancel = true;
                pgBrowser.showHelp(e.button.element.name, e.button.element.getAttribute('url'),
                  null, null);
                return;
              }
            },
          };
        });
      }

      alertify.ChangePassword(title, url).resizeTo(pgBrowser.stdW.lg, pgBrowser.stdH.md);
    },

    isPgaLoginRequired(xhr) {
      /* If responseJSON is undefined then it could be object of
       * axios(Promise HTTP) response, so we should check accordingly.
       */
      if (xhr.responseJSON === undefined && xhr.data !== undefined) {
        return xhr.status === 401 && xhr.data &&
                  xhr.data.info &&
                  xhr.data.info === 'PGADMIN_LOGIN_REQUIRED';
      }

      return xhr.status === 401 && xhr.responseJSON &&
                xhr.responseJSON.info &&
                xhr.responseJSON.info === 'PGADMIN_LOGIN_REQUIRED';
    },

    // Callback to draw pgAdmin4 login dialog.
    pgaLogin: function(url) {
      var title = gettext('pgAdmin 4 login');
      url = url || url_for('security.login');
      if(!alertify.PgaLogin) {
        alertify.dialog('PgaLogin' ,function factory() {
          return {
            main: function(alertTitle, alertUrl) {
              this.set({
                'title': alertTitle,
                'url': alertUrl,
              });
            },
            build: function() {
              alertify.pgDialogBuild.apply(this);
            },
            settings:{
              url: undefined,
            },
            setup:function() {
              return {
                buttons: [{
                  text: gettext('Close'), key: 27,
                  className: 'btn btn-secondary fa fa-lg fa-times pg-alertify-button',
                  attrs:{name:'close', type:'button'},
                }],
                // Set options for dialog
                options: {
                  //disable both padding and overflow control.
                  padding : !1,
                  overflow: !1,
                  modal: true,
                  resizable: true,
                  maximizable: true,
                  pinnable: false,
                  closableByDimmer: false,
                  closable: false,
                },
              };
            },
            hooks: {
              // Triggered when the dialog is closed
              onclose: function() {
                // Clear the view
                return setTimeout((function() {
                  return alertify.PgaLogin().destroy();
                }));
              },
            },
            prepare: function() {
              // create the iframe element
              var self = this,
                iframe = document.createElement('iframe'),
                frameUrl = this.setting('url');

              iframe.onload = function() {
                var doc = this.contentDocument || this.contentWindow.document;
                if (doc.location.href.indexOf(frameUrl) == -1) {
                  // login successful.

                  this.contentWindow.stop();
                  this.onload = null;

                  // close the dialog.
                  self.close();
                  pgBrowser.Events.trigger('pgadmin:user:logged-in');
                }
              };

              iframe.frameBorder = 'no';
              iframe.width = '100%';
              iframe.height = '100%';
              iframe.src = frameUrl;
              // add it to the dialog
              self.elements.content.appendChild(iframe);
            },
          };
        });
      }

      alertify.PgaLogin(title, url).resizeTo(pgBrowser.stdW.md, pgBrowser.stdH.md);
    },

    // Callback to draw User Management Dialog.
    show_users: function() {
      if (!userInfo['is_admin']) return;
      var Roles = [],
        Sources = [];

      var UserModel = pgBrowser.Node.Model.extend({
          idAttribute: 'id',
          urlRoot: USERURL,
          defaults: {
            id: undefined,
            username: undefined,
            email: undefined,
            active: true,
            role: '2',
            newPassword: undefined,
            confirmPassword: undefined,
            auth_source: DEFAULT_AUTH_SOURCE,
            authOnlyInternal: AUTH_ONLY_INTERNAL,
          },
          schema: [{
            id: 'auth_source',
            label: gettext('Authentication source'),
            type: 'text',
            control: 'Select2',
            url: url_for('user_management.auth_sources'),
            cellHeaderClasses: 'width_percent_30',
            visible: function(m) {
              if (m.get('authOnlyInternal')) return false;
              return true;
            },
            disabled: false,
            cell: 'Select2',
            select2: {
              allowClear: false,
              openOnEnter: false,
              first_empty: false,
            },
            options: function() {
              return Sources;
            },
            editable: function(m) {
              if (m instanceof Backbone.Collection) {
                return true;
              }
              return (m.isNew() && !m.get('authOnlyInternal'));
            },
          }, {
            id: 'username',
            label: gettext('Username'),
            type: 'text',
            cell: Backgrid.Extension.StringDepCell,
            cellHeaderClasses: 'width_percent_30',
            deps: ['auth_source'],
            editable: function(m) {
              if (m.get('authOnlyInternal') || m.get('auth_source') == DEFAULT_AUTH_SOURCE) {
                if (m.isNew() && m.get('username') != undefined && m.get('username') != '') {
                  setTimeout( function() {
                    m.set('username', undefined);
                  }, 10);
                }
                return false;
              }
              return true;
            },
            disabled: false,
          }, {
            id: 'email',
            label: gettext('Email'),
            type: 'text',
            cell: Backgrid.Extension.StringDepCell,
            cellHeaderClasses: 'width_percent_30',
            deps: ['id'],
            editable: function(m) {
              if (!m.get('authOnlyInternal')) return true;

              if (m instanceof Backbone.Collection) {
                return false;
              }
              // Disable email edit for existing user.
              if (m.isNew()) {
                return true;
              }
              return false;
            },
          }, {
            id: 'role',
            label: gettext('Role'),
            type: 'text',
            control: 'Select2',
            cellHeaderClasses: 'width_percent_20',
            cell: 'select2',
            select2: {
              allowClear: false,
              openOnEnter: false,
              first_empty: false,
            },
            options: function(controlOrCell) {
              var options = [];

              if (controlOrCell instanceof Backform.Control) {
                // This is be backform select2 control
                _.each(Roles, function(role) {
                  options.push({
                    label: role.name,
                    value: role.id.toString(),
                  });
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
              if (m instanceof Backbone.Collection) {
                return true;
              }
              return (m.get('id') != userInfo['id']);
            },
          }, {
            id: 'active',
            label: gettext('Active'),
            type: 'switch',
            cell: 'switch',
            cellHeaderClasses: 'width_percent_10',
            sortable: false,
            editable: function(m) {
              if (m instanceof Backbone.Collection) {
                return true;
              }
              return (m.get('id') != userInfo['id']);
            },
          }, {
            id: 'newPassword',
            label: gettext('New password'),
            type: 'password',
            disabled: false,
            control: 'input',
            cell: PasswordDepCell,
            cellHeaderClasses: 'width_percent_20',
            deps: ['auth_source'],
            sortable: false,
            editable: function(m) {
              return (m.get('auth_source') == DEFAULT_AUTH_SOURCE);
            },
          }, {
            id: 'confirmPassword',
            label: gettext('Confirm password'),
            type: 'password',
            disabled: false,
            control: 'input',
            cell: PasswordDepCell,
            cellHeaderClasses: 'width_percent_20',
            deps: ['auth_source'],
            sortable: false,
            editable: function(m) {
              return (m.get('auth_source') == DEFAULT_AUTH_SOURCE);
            },
          }],
          validate: function() {
            var errmsg = null,
              changedAttrs = this.changed || {},
              email_filter = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

            if (this.get('auth_source') == DEFAULT_AUTH_SOURCE && ('email' in changedAttrs || !this.isNew()) && (_.isUndefined(this.get('email')) ||
                _.isNull(this.get('email')) ||
                String(this.get('email')).replace(/^\s+|\s+$/g, '') == '')) {
              errmsg = gettext('Email address cannot be empty.');
              this.errorModel.set('email', errmsg);
              return errmsg;
            } else if (!!this.get('email') && !email_filter.test(this.get('email'))) {

              errmsg = gettext('Invalid email address: %s.',
                this.get('email')
              );
              this.errorModel.set('email', errmsg);
              return errmsg;
            } else if (!!this.get('email') && this.collection.nonFilter.where({
              'email': this.get('email'), 'auth_source': DEFAULT_AUTH_SOURCE,
            }).length > 1) {
              errmsg = gettext('The email address %s already exists.',
                this.get('email')
              );

              this.errorModel.set('email', errmsg);
              return errmsg;
            } else {
              this.errorModel.unset('email');
            }

            if ('role' in changedAttrs && (_.isUndefined(this.get('role')) ||
                _.isNull(this.get('role')) ||
                String(this.get('role')).replace(/^\s+|\s+$/g, '') == '')) {

              errmsg = gettext('Role cannot be empty for user %s.',
                (this.get('email') || '')
              );

              this.errorModel.set('role', errmsg);
              return errmsg;
            } else {
              this.errorModel.unset('role');
            }

            if (this.get('auth_source') == DEFAULT_AUTH_SOURCE) {
              if (this.isNew()) {
                // Password is compulsory for new user.
                if ('newPassword' in changedAttrs && (_.isUndefined(this.get('newPassword')) ||
                    _.isNull(this.get('newPassword')) ||
                    this.get('newPassword') == '')) {

                  errmsg = gettext('Password cannot be empty for user %s.',
                    (this.get('email') || '')
                  );

                  this.errorModel.set('newPassword', errmsg);
                  return errmsg;
                } else if (!_.isUndefined(this.get('newPassword')) &&
                  !_.isNull(this.get('newPassword')) &&
                  this.get('newPassword').length < 6) {

                  errmsg = gettext('Password must be at least 6 characters for user %s.',
                    (this.get('email') || '')
                  );

                  this.errorModel.set('newPassword', errmsg);
                  return errmsg;
                } else {
                  this.errorModel.unset('newPassword');
                }

                if ('confirmPassword' in changedAttrs && (_.isUndefined(this.get('confirmPassword')) ||
                    _.isNull(this.get('confirmPassword')) ||
                    this.get('confirmPassword') == '')) {

                  errmsg = gettext('Confirm Password cannot be empty for user %s.',
                    (this.get('email') || '')
                  );

                  this.errorModel.set('confirmPassword', errmsg);
                  return errmsg;
                } else {
                  this.errorModel.unset('confirmPassword');
                }

                if (!!this.get('newPassword') && !!this.get('confirmPassword') &&
                  this.get('newPassword') != this.get('confirmPassword')) {

                  errmsg = gettext('Passwords do not match for user %s.',
                    (this.get('email') || '')
                  );

                  this.errorModel.set('confirmPassword', errmsg);
                  return errmsg;
                } else {
                  this.errorModel.unset('confirmPassword');
                }

              } else {
                if ((_.isUndefined(this.get('newPassword')) || _.isNull(this.get('newPassword')) ||
                    this.get('newPassword') == '') &&
                  (_.isUndefined(this.get('confirmPassword')) || _.isNull(this.get('confirmPassword')) ||
                    this.get('confirmPassword') == '')) {

                  this.errorModel.unset('newPassword');
                  if (this.get('newPassword') == '') {
                    this.set({
                      'newPassword': undefined,
                    });
                  }

                  this.errorModel.unset('confirmPassword');
                  if (this.get('confirmPassword') == '') {
                    this.set({
                      'confirmPassword': undefined,
                    });
                  }
                } else if (!_.isUndefined(this.get('newPassword')) &&
                  !_.isNull(this.get('newPassword')) &&
                  !this.get('newPassword') == '' &&
                  this.get('newPassword').length < 6) {

                  errmsg = gettext('Password must be at least 6 characters for user %s.',
                    (this.get('email') || '')
                  );

                  this.errorModel.set('newPassword', errmsg);
                  return errmsg;
                } else if (_.isUndefined(this.get('confirmPassword')) ||
                  _.isNull(this.get('confirmPassword')) ||
                  this.get('confirmPassword') == '') {

                  errmsg = gettext('Confirm Password cannot be empty for user %s.',
                    (this.get('email') || '')
                  );

                  this.errorModel.set('confirmPassword', errmsg);
                  return errmsg;
                } else if (!!this.get('newPassword') && !!this.get('confirmPassword') &&
                  this.get('newPassword') != this.get('confirmPassword')) {

                  errmsg = gettext('Passwords do not match for user %s.',
                    (this.get('email') || '')
                  );

                  this.errorModel.set('confirmPassword', errmsg);
                  return errmsg;
                } else {
                  this.errorModel.unset('newPassword');
                  this.errorModel.unset('confirmPassword');
                }
              }
            } else {
              if (!!this.get('username') && this.collection.nonFilter.where({
                'username': this.get('username'), 'auth_source': 'ldap',
              }).length > 1) {
                errmsg = gettext('The username %s already exists.',
                  this.get('username')
                );

                this.errorModel.set('username', errmsg);
                return errmsg;
              }
            }
            return null;
          },
        }),
        gridSchema = Backform.generateGridColumnsFromModel(
          null, UserModel, 'edit'),
        deleteUserCell = Backgrid.Extension.DeleteCell.extend({
          deleteRow: function(e) {
            var self = this;
            e.preventDefault();

            if (self.model.get('id') == userInfo['id']) {
              alertify.alert(
                gettext('Cannot delete user.'),
                gettext('Cannot delete currently logged in user.'),
                function() {
                  return true;
                }
              );
              return true;
            }

            // We will check if row is deletable or not
            var canDeleteRow = (!_.isUndefined(this.column.get('canDeleteRow')) &&
                _.isFunction(this.column.get('canDeleteRow'))) ?
              Backgrid.callByNeed(this.column.get('canDeleteRow'),
                this.column, this.model) : true;
            if (canDeleteRow) {
              if (self.model.isNew()) {
                self.model.destroy();
              } else {
                alertify.confirm(
                  gettext('Delete user?'),
                  gettext('Are you sure you wish to delete this user?'),
                  function() {
                    self.model.destroy({
                      wait: true,
                      success: function() {
                        alertify.success(gettext('User deleted.'));
                      },
                      error: function() {
                        alertify.error(
                          gettext('Error during deleting user.')
                        );
                      },
                    });
                  },
                  function() {
                    return true;
                  }
                );
              }
            } else {
              alertify.alert(
                gettext('Error'),
                gettext('This user cannot be deleted.'),
                function() {
                  return true;
                }
              );
            }
          },
        });

      gridSchema.columns.unshift({
        name: 'pg-backform-delete',
        label: '',
        cell: deleteUserCell,
        editable: false,
        cell_priority: -1,
        canDeleteRow: true,
      });

      // Users Management dialog code here
      if (!alertify.UserManagement) {
        alertify.dialog('UserManagement', function factory() {
          return {
            main: function(title) {
              this.set('title', title);
            },
            build: function() {
              alertify.pgDialogBuild.apply(this);
            },
            setup: function() {
              return {
                buttons: [{
                  text: '',
                  key: 112,
                  className: 'btn btn-primary-icon pull-left fa fa-question pg-alertify-icon-button',
                  attrs: {
                    name: 'dialog_help',
                    type: 'button',
                    label: gettext('Users'),
                    url: url_for(
                      'help.static', {
                        'filename': 'user_management.html',
                      }),
                  },
                }, {
                  text: gettext('Close'),
                  key: 27,
                  className: 'btn btn-secondary fa fa-lg fa-times pg-alertify-button user_management_pg-alertify-button',
                  attrs: {
                    name: 'close',
                    type: 'button',
                  },
                }],
                // Set options for dialog
                options: {
                  title: gettext('User Management'),
                  //disable both padding and overflow control.
                  padding: !1,
                  overflow: !1,
                  modal: false,
                  resizable: true,
                  maximizable: true,
                  pinnable: false,
                  closableByDimmer: false,
                  closable: false,
                },
              };
            },
            hooks: {
              // Triggered when the dialog is closed
              onclose: function() {
                if (this.view) {
                  // clear our backform model/view
                  this.view.remove({
                    data: true,
                    internal: true,
                    silent: true,
                  });
                  this.$content.remove();
                }
              },
            },
            prepare: function() {
              var footerTpl = _.template([
                  '<div class="pg-prop-footer" style="visibility:hidden;">',
                  ' <div class="pg-prop-status-bar">',
                  '    <div class="error-in-footer"> ',
                  '      <div class="d-flex px-2 py-1"> ',
                  '        <div class="pr-2"> ',
                  '          <i class="fa fa-exclamation-triangle text-danger" aria-hidden="true"></i> ',
                  '        </div> ',
                  '        <div class="alert-text" role="status"></div> ',
                  '        <div class="ml-auto close-error-bar"> ',
                  '          <a class="close-error fa fa-times text-danger"></a> ',
                  '        </div> ',
                  '      </div> ',
                  '    </div> ',
                  ' </div>',
                  '</div>',
                ].join('\n')),
                $statusBar = $(footerTpl()),
                UserRow = Backgrid.Row.extend({
                  userInvalidClass: 'bg-user-invalid',

                  initialize: function() {
                    Backgrid.Row.prototype.initialize.apply(this, arguments);
                    this.listenTo(this.model, 'pgadmin:user:invalid', this.userInvalid);
                    this.listenTo(this.model, 'pgadmin:user:valid', this.userValid);
                  },
                  userInvalid: function() {
                    $(this.el).removeClass('new');
                    $(this.el).addClass(this.userInvalidClass);
                  },
                  userValid: function() {
                    $(this.el).removeClass(this.userInvalidClass);
                  },
                }),
                UserCollection = Backbone.Collection.extend({
                  model: UserModel,
                  url: USERURL,
                  initialize: function() {
                    Backbone.Collection.prototype.initialize.apply(this, arguments);
                    var self = this;
                    self.changedUser = null;
                    self.invalidUsers = {};
                    self.nonFilter = this;

                    self.on('add', self.onModelAdd);
                    self.on('remove', self.onModelRemove);
                    self.on('pgadmin-session:model:invalid', function(msg, m) {
                      self.invalidUsers[m.cid] = msg;
                      m.trigger('pgadmin:user:invalid', m);
                      $statusBar.find('.alert-text').html(msg);
                      $statusBar.css('visibility', 'visible');
                    });
                    self.on('pgadmin-session:model:valid', function(m) {
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
                      msg = self.invalidUsers[key];
                      if (msg) {
                        break;
                      }
                    }

                    if (msg) {
                      $statusBar.find('.alert-text').html(msg);
                      $statusBar.css('visibility', 'visible');
                    } else {
                      $statusBar.find('.alert-text').empty();
                      $statusBar.css('visibility', 'hidden');
                    }
                  },
                  saveUser: function(m) {
                    var d = m.toJSON(true);

                    if((m.isNew() && m.get('auth_source') == 'ldap' && (!m.get('username') || !m.get('auth_source') || !m.get('role')))
                      || (m.isNew() && m.get('auth_source') == DEFAULT_AUTH_SOURCE &&  (!m.get('email') || !m.get('role') ||
                          !m.get('newPassword') || !m.get('confirmPassword') || m.get('newPassword') != m.get('confirmPassword')))
                      || (!m.isNew() && m.get('newPassword') != m.get('confirmPassword'))) {
                      // For old user password change is in progress and user model is valid but admin has not added
                      // both the passwords so return without saving.
                      return false;
                    }

                    if (m.sessChanged() && d && !_.isEmpty(d)) {
                      m.stopSession();
                      m.save({}, {
                        attrs: d,
                        wait: true,
                        success: function() {
                          // User created/updated on server now start new session for this user.
                          let temp_auth_sources = m.get('auth_source');
                          m.set({
                            'newPassword': undefined,
                            'confirmPassword': undefined,
                            'auth_source': undefined,
                          });

                          // It's a heck to re-render the Auth Source control.
                          m.set({
                            'auth_source': temp_auth_sources,
                          });

                          m.startNewSession();
                          alertify.success(gettext('User \'%s\' saved.',
                            m.get('username')
                          ));
                        },
                        error: function(res, jqxhr) {
                          m.startNewSession();
                          alertify.error(
                            gettext('Error saving user: \'%s\'',
                              jqxhr.responseJSON.errormsg
                            )
                          );
                        },
                      });
                    }
                  },
                }),
                userCollection = this.userCollection = new UserCollection(),
                header =
                  `<div class="navtab-inline-controls pgadmin-controls">
                    <div class="input-group">
                      <div class="input-group-prepend">
                        <span class="input-group-text fa fa-search" id="labelSearch"></span>
                        </div>
                          <input type="search" class="form-control" id="txtGridSearch" placeholder="` + gettext('Search') + '" aria-label="' + gettext('Search') + `" aria-describedby="labelSearch" />
                        </div>
                        <button id="btn_add" type="button" class="btn btn-secondary btn-navtab-inline add" title="` + gettext('Add') + `">
                          <span class="fa fa-plus "></span>
                        </button>
                      </div>
                    </div>
                  </div>`,
                headerTpl = _.template(header),
                data = {
                  canAdd: true,
                  add_title: gettext('Add new user'),
                },
                $gridBody = $('<div></div>', {
                  class: 'user_container flex-grow-1',
                });

              $.ajax({
                url: ROLEURL,
                method: 'GET',
                async: false,
              })
                .done(function(res) {
                  Roles = res;
                })
                .fail(function() {
                  setTimeout(function() {
                    alertify.alert(
                      gettext('Error'),
                      gettext('Cannot load user roles.')
                    );
                  }, 100);
                });

              $.ajax({
                url: SOURCEURL,
                method: 'GET',
                async: false,
              })
                .done(function(res) {
                  Sources = res;
                })
                .fail(function() {
                  setTimeout(function() {
                    alertify.alert(
                      gettext('Error'),
                      gettext('Cannot load user Sources.')
                    );
                  }, 100);
                });

              var view = this.view = new Backgrid.Grid({
                row: UserRow,
                columns: gridSchema.columns,
                collection: userCollection,
                className: 'backgrid table table-bordered table-noouter-border table-bottom-border table-hover',
              });

              $gridBody.append(view.render().$el[0]);

              this.$content = $('<div class=\'user_management object subnode subnode-noouter-border d-flex flex-column\'></div>').append(
                headerTpl(data)).append($gridBody).append($statusBar);

              this.elements.content.appendChild(this.$content[0]);

              // Render Search Filter
              userCollection.nonFilter = userFilter(userCollection).setCustomSearchBox($('#txtGridSearch')).shadowCollection;
              userCollection.fetch();

              this.$content.find('a.close-error').on('click',() => {
                $statusBar.find('.alert-text').empty();
                $statusBar.css('visibility', 'hidden');
              });

              this.$content.find('button.add').first().on('click',(e) => {
                e.preventDefault();
                // There should be only one empty row.
                for(const [idx, model] of userCollection.models.entries()) {
                  if(model.isNew()) {
                    let row = view.body.rows[idx].$el;
                    row.addClass('new');
                    $(row).pgMakeVisible('backgrid');
                    $(row).find('.email').trigger('click');
                    return false;
                  }
                }

                $(view.body.$el.find($('tr.new'))).removeClass('new');
                var m = new(UserModel)(null, {
                  handler: userCollection,
                  top: userCollection,
                  collection: userCollection,
                });
                userCollection.add(m);

                var newRow = view.body.rows[userCollection.indexOf(m)].$el;
                newRow.addClass('new');
                $(newRow).pgMakeVisible('backgrid');
                $(newRow).find('.email').trigger('click');
                return false;
              });

              commonUtils.findAndSetFocus(this.$content);
            },
            callback: function(e) {
              if (e.button.element.name == 'dialog_help') {
                e.cancel = true;
                pgBrowser.showHelp(e.button.element.name, e.button.element.getAttribute('url'),
                  null, null);
                return;
              }
              if (e.button.element.name == 'close') {
                var self = this;
                if (!_.all(this.userCollection.pluck('id')) || !_.isEmpty(this.userCollection.invalidUsers)) {
                  e.cancel = true;
                  alertify.confirm(
                    gettext('Discard unsaved changes?'),
                    gettext('Are you sure you want to close the dialog? Any unsaved changes will be lost.'),
                    function() {
                      self.close();
                      return true;
                    },
                    function() {
                      // Do nothing.
                      return true;
                    }
                  );
                }
              }
            },
          };
        });
      }
      alertify.UserManagement(true).resizeTo(pgBrowser.stdW.md, pgBrowser.stdH.md);
    },

  };
  return pgBrowser.UserManagement;
});
