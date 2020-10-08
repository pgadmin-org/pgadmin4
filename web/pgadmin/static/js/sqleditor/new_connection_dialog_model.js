/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import _ from 'underscore';
import $ from 'jquery';
import pgAdmin from 'sources/pgadmin';
import Backform from 'pgadmin.backform';
import url_for from 'sources/url_for';
import alertify from 'pgadmin.alertifyjs';

export default function newConnectionDialogModel(response, sgid, sid) {

  let server_name = '';
  let database_name = '';

  let NewConnectionSelect2Control = Backform.Select2Control.extend({
    fetchData: function(){
      let self = this;
      let url = self.field.get('url');

      url = url_for(url, {
        'sid': self.model.attributes.server,
        'sgid': sgid,
      });

      $.ajax({
        url: url,
        headers: {
          'Cache-Control' : 'no-cache',
        },
      }).done(function (res) {
        var transform = self.field.get('transform');
        if(res.data.status){
          let data = res.data.result.data;

          if (transform && _.isFunction(transform)) {
            self.field.set('options', transform.bind(self, data));
          } else {
            self.field.set('options', data);
          }
        } else {
          if (transform && _.isFunction(transform)) {
            self.field.set('options', transform.bind(self, []));
          } else {
            self.field.set('options', []);
          }
        }
        Backform.Select2Control.prototype.render.apply(self, arguments);
      }).fail(function(e){
        let msg = '';
        if(e.status == 404) {
          msg = 'Unable to find url.';
        } else {
          msg = e.responseJSON.errormsg;
        }
        alertify.error(msg);
      });
    },
    render: function() {
      this.fetchData();
      return Backform.Select2Control.prototype.render.apply(this, arguments);
    },
    onChange: function() {
      Backform.Select2Control.prototype.onChange.apply(this, arguments);
    },
  });

  let newConnectionModel = pgAdmin.Browser.DataModel.extend({
    idAttribute: 'name',
    defaults: {
      server: parseInt(sid),
      database: null,
      user: null,
      password: null,
      server_name: server_name,
      database_name: database_name,
    },
    schema: [{
      id: 'server',
      name: 'server',
      label: gettext('Server'),
      type: 'text',
      editable: true,
      disabled: false,
      select2: {
        allowClear: false,
      },
      control: Backform.Select2Control.extend({
        connect: function(self) {
          let local_self = self;
          if(!alertify.connectServer){
            alertify.dialog('connectServer', function factory() {
              return {
                main: function(
                  title, message, server_id, submit_password=true
                ) {
                  this.set('title', title);
                  this.message = message;
                  this.server_id = server_id;
                  this.submit_password = submit_password;
                },
                setup:function() {
                  return {
                    buttons:[{
                      text: gettext('Cancel'), className: 'btn btn-secondary fa fa-times pg-alertify-button',
                      key: 27,
                    },{
                      text: gettext('OK'), key: 13, className: 'btn btn-primary fa fa-check pg-alertify-button',
                    }],
                    focus: {element: '#password', select: true},
                    options: {
                      modal: 0, resizable: false, maximizable: false, pinnable: false,
                    },
                  };
                },
                build:function() {
                },
                prepare:function() {
                  this.setContent(this.message);
                },
                callback: function(closeEvent) {

                  if (closeEvent.button.text == gettext('OK')) {
                    if(this.submit_password) {
                      var _url = url_for('sqleditor.connect_server', {'sid': this.server_id});
                      var loadingDiv = $('#show_filter_progress');
                      loadingDiv.removeClass('d-none');
                      $.ajax({
                        type: 'POST',
                        timeout: 30000,
                        url: _url,
                        data: $('#frmPassword').serialize(),
                      })
                        .done(function() {
                          local_self.model.attributes.database = null;
                          local_self.model.attributes.user = null;
                          local_self.model.attributes.role = null;
                          Backform.Select2Control.prototype.onChange.apply(local_self, arguments);
                          response.server_list.forEach(function(obj){
                            if(obj.id==self.model.changed.server) {
                              response.server_name = obj.name;
                            }
                          });
                          loadingDiv.addClass('d-none');
                        })
                        .fail(function(xhr) {
                          loadingDiv.addClass('d-none');
                          alertify.connectServer('Connect to server', xhr.responseJSON.result, local_self.getValueFromDOM());
                        });
                    } else {
                      response.password = $('#password').val();
                    }
                  } else {
                    local_self.model.attributes.database = null;
                    local_self.model.attributes.user = null;
                    local_self.model.attributes.role = null;
                    Backform.Select2Control.prototype.onChange.apply(local_self, arguments);
                  }
                  closeEvent.close = true;
                },
              };
            });
          }
        },
        render: function() {
          let self = this;
          self.connect(self);
          return Backform.Select2Control.prototype.render.apply(self, arguments);
        },
        onChange: function() {
          this.model.attributes.database = null;
          this.model.attributes.user = null;
          let self = this;
          self.connect(self);

          let url = url_for('sqleditor.connect_server', {
            'sid': self.getValueFromDOM(),
            'usr': self.model.attributes.user,
          });
          var loadingDiv = $('#show_filter_progress');
          loadingDiv.removeClass('d-none');
          $.ajax({
            url: url,
            type: 'POST',
            headers: {
              'Cache-Control' : 'no-cache',
            },
          }).done(function () {
            Backform.Select2Control.prototype.onChange.apply(self, arguments);
            response.server_list.forEach(function(obj){
              if(obj.id==self.model.changed.server) {
                response.server_name = obj.name;
              }
            });
            loadingDiv.addClass('d-none');
          }).fail(function(xhr){
            loadingDiv.addClass('d-none');
            alertify.connectServer('Connect to server', xhr.responseJSON.result, self.getValueFromDOM());
          });

        },
      }),
      options: function() {
        return _.map(response.server_list, (obj) => {
          if (obj.id == parseInt(sid))
            response.server_name = obj.name;

          return {
            value: obj.id,
            label: obj.name,
          };
        });
      },
    },
    {
      id: 'database',
      name: 'database',
      label: gettext('Database'),
      type: 'text',
      editable: true,
      disabled: function(m) {
        let self_local = this;
        if (!_.isUndefined(m.get('server')) && !_.isNull(m.get('server'))
            && m.get('server') !== '') {
          setTimeout(function() {
            if(self_local.options.length) {
              m.set('database', self_local.options[0].value);
            }
          }, 10);
          return false;
        }

        return true;
      },
      deps: ['server'],
      url: 'sqleditor.get_new_connection_database',
      select2: {
        allowClear: false,
        width: '100%',
        first_empty: true,
        select_first: false,
      },
      extraClasses:['new-connection-dialog-style'],
      control: NewConnectionSelect2Control,
      transform: function(data) {
        response.database_list = data;
        return data;
      },
    },
    {
      id: 'user',
      name: 'user',
      label: gettext('User'),
      type: 'text',
      editable: true,
      deps: ['server'],
      select2: {
        allowClear: false,
        width: '100%',
      },
      control: NewConnectionSelect2Control,
      url: 'sqleditor.get_new_connection_user',
      disabled: function(m) {
        let self_local = this;
        if (!_.isUndefined(m.get('server')) && !_.isNull(m.get('server'))
            && m.get('server') !== '') {
          setTimeout(function() {
            if(self_local.options.length) {
              m.set('user', self_local.options[0].value);
            }
          }, 10);
          return false;
        }
        return true;
      },
    },{
      id: 'role',
      name: 'role',
      label: gettext('Role'),
      type: 'text',
      editable: true,
      deps: ['server'],
      select2: {
        allowClear: false,
        width: '100%',
        first_empty: true,
      },
      control: NewConnectionSelect2Control,
      url: 'sqleditor.get_new_connection_role',
      disabled: false,
    },
    /*{
      id: 'password',
      name: 'password',
      label: gettext('Password'tools/sqleditor/__init__.py),
      type: 'password',
      editable: true,
      disabled: true,
      deps: ['user'],
      control: Backform.InputControl.extend({
        render: function() {
          let self = this;
          self.model.attributes.password = null;
          Backform.InputControl.prototype.render.apply(self, arguments);
          return self;
        },
        onChange: function() {
          let self = this;
          Backform.InputControl.prototype.onChange.apply(self, arguments);
        },
      }),
    },*/
    ],
    validate: function() {
      let msg = null;
      this.errorModel.clear();
      if(_.isUndefined(this.get('database')) || _.isNull(this.get('database'))){
        msg = gettext('Please select database');
        this.errorModel.set('database', msg);
        return msg;
      } else if(_.isUndefined(this.get('database')) || _.isUndefined(this.get('user'))|| _.isNull(this.get('user'))) {
        msg = gettext('Please select user');
        this.errorModel.set('user', msg);
        return msg;
      }
      /*else if((this.attributes.password == '' || _.isUndefined(this.get('password')) || _.isNull(this.get('password')))) {
        msg = gettext('Please enter password');
        this.errorModel.set('password', msg);
        return msg;
      }*/
      return null;
    },
  });

  let model = new newConnectionModel();
  return model;
}
