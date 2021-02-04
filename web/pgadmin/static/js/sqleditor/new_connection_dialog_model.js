/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
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


export default function newConnectionDialogModel(response, sgid, sid, handler, conn_self) {

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

  var formatNode = function (opt) {
    if (!opt.id) {
      return opt.text;
    }

    var optimage = $(opt.element).data('image');

    if (!optimage) {
      return opt.text;
    } else {
      return $('<span></span>').append(
        $('<span></span>', {
          class: 'wcTabIcon ' + optimage,
        })
      ).append($('<span></span>').text(opt.text));
    }
  };

  let newConnectionModel = pgAdmin.Browser.DataModel.extend({
    idAttribute: 'name',
    defaults: {
      server: parseInt(sid),
      database: null,
      user: null,
      server_name: server_name,
      database_name: database_name,
    },
    schema: [
      {
        id: 'server',
        name: 'server',
        label: gettext('Server'),
        type: 'text',
        editable: true,
        disabled: false,
        select2: {
          allowClear: false,
          width: 'style',
          templateResult: formatNode,
          templateSelection: formatNode,
        },
        events: {
          'focus select': 'clearInvalid',
          'keydown :input': 'processTab',
          'select2:select': 'onSelect',
          'select2:selecting': 'beforeSelect',
          'select2:clear': 'onChange',
        },
        transform: function(data) {
          let group_template_options = [];
          for (let key in data) {
            if (data.hasOwnProperty(key)) {
              group_template_options.push({'group': key, 'optval': data[key]});
            }
          }
          return group_template_options;
        },
        control: Backform.Select2Control.extend({
          template: _.template([
            '<% if(label == false) {} else {%>',
            '  <label class="<%=Backform.controlLabelClassName%>"><%=label%></label>',
            '<% }%>',
            '<div class="<%=controlsClassName%>">',
            ' <select class="<%=Backform.controlClassName%> <%=extraClasses.join(\' \')%>"',
            '  name="<%=name%>" value="<%-value%>" <%=disabled ? "disabled" : ""%>',
            '  <%=required ? "required" : ""%><%= select2.multiple ? " multiple>" : ">" %>',
            '  <%=select2.first_empty ? " <option></option>" : ""%>',
            '  <% for (var i=0; i < options.length; i++) {%>',
            '   <% if (options[i].group) { %>',
            '     <% var group = options[i].group; %>',
            '     <% if (options[i].optval) { %> <% var option_length = options[i].optval.length; %>',
            '      <optgroup label="<%=group%>">',
            '      <% for (var subindex=0; subindex < option_length; subindex++) {%>',
            '        <% var option = options[i].optval[subindex]; %>',
            '        <option ',
            '        <% if (option.image) { %> data-image=<%=option.image%> <%}%>',
            '        <% if (option.connected) { %> data-connected=connected <%}%>',
            '        value=<%- formatter.fromRaw(option.value) %>',
            '        <% if (option.selected) {%>selected="selected"<%} else {%>',
            '        <% if (!select2.multiple && option.value === rawValue) {%>selected="selected"<%}%>',
            '        <% if (select2.multiple && rawValue && rawValue.indexOf(option.value) != -1){%>selected="selected" data-index="rawValue.indexOf(option.value)"<%}%>',
            '        <%}%>',
            '        <%= disabled ? "disabled" : ""%>><%-option.label%></option>',
            '      <%}%>',
            '      </optgroup>',
            '     <%}%>',
            '   <%} else {%>',
            '     <% var option = options[i]; %>',
            '     <option ',
            '     <% if (option.image) { %> data-image=<%=option.image%> <%}%>',
            '     <% if (option.connected) { %> data-connected=connected <%}%>',
            '     value=<%- formatter.fromRaw(option.value) %>',
            '     <% if (option.selected) {%>selected="selected"<%} else {%>',
            '     <% if (!select2.multiple && option.value === rawValue) {%>selected="selected"<%}%>',
            '     <% if (select2.multiple && rawValue && rawValue.indexOf(option.value) != -1){%>selected="selected" data-index="rawValue.indexOf(option.value)"<%}%>',
            '     <%}%>',
            '     <%= disabled ? "disabled" : ""%>><%-option.label%></option>',
            '   <%}%>',
            '  <%}%>',
            ' </select>',
            ' <% if (helpMessage && helpMessage.length) { %>',
            ' <span class="<%=Backform.helpMessageClassName%>"><%=helpMessage%></span>',
            ' <% } %>',
            '</div>',
          ].join('\n')),
          beforeSelect: function() {
            var selVal = arguments[0].params.args.data.id;

            if(this.field.get('connect') && this.$el.find('option[value="'+selVal+'"]').attr('data-connected') !== 'connected') {
              this.field.get('connect').apply(this, [selVal, this.changeIcon.bind(this)]);
            } else {
              $(this.$sel).trigger('change');
              setTimeout(function(){ this.onChange.apply(this); }.bind(this), 200);
            }
          },
          changeIcon: function(data) {
            let span = this.$el.find('.select2-selection .select2-selection__rendered span.wcTabIcon'),
              selSpan = this.$el.find('option:selected');

            if (span.hasClass('icon-server-not-connected') || span.hasClass('icon-shared-server-not-connected')) {
              let icon = (data.icon) ? data.icon : 'icon-pg';
              span.removeClass('icon-server-not-connected');
              span.addClass(icon);
              span.attr('data-connected', 'connected');

              selSpan.data().image = icon;
              selSpan.attr('data-connected', 'connected');
              alertify.connectServer().destroy();
              this.onChange.apply(this);
            }
            else if (span.hasClass('icon-database-not-connected')) {
              let icon = (data.icon) ? data.icon : 'pg-icon-database';

              span.removeClass('icon-database-not-connected');
              span.addClass(icon);
              span.attr('data-connected', 'connected');

              selSpan.removeClass('icon-database-not-connected');
              selSpan.data().image = icon;
              selSpan.attr('data-connected', 'connected');
              alertify.connectServer().destroy();
              this.onChange.apply(this);
            }
          },
          connect: function(self) {
            let local_self = self;

            if(alertify.connectServer) {
              delete alertify.connectServer;
            }

            alertify.dialog('connectServer', function factory() {
              return {
                main: function(
                  title, message, server_id, submit_password=true, connect_server=null,
                ) {
                  this.set('title', title);
                  this.message = message;
                  this.server_id = server_id;
                  this.submit_password = submit_password;
                  this.connect_server = connect_server;
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
                  var loadingDiv = $('#show_filter_progress');
                  if (closeEvent.button.text == gettext('OK')) {
                    if(this.submit_password) {
                      var _url = url_for('sqleditor.connect_server', {'sid': this.server_id});

                      loadingDiv.removeClass('d-none');
                      $.ajax({
                        type: 'POST',
                        timeout: 30000,
                        url: _url,
                        data: $('#frmPassword').serialize(),
                      })
                        .done(function(res) {

                          local_self.model.attributes.database = null;
                          local_self.changeIcon(res.data);
                          local_self.model.attributes.user = null;
                          local_self.model.attributes.role = null;
                          Backform.Select2Control.prototype.onChange.apply(local_self, arguments);
                          Object.keys(response.server_list).forEach(key => {
                            response.server_list[key].forEach(option => {
                              if (option.value == local_self.getValueFromDOM()) {
                                response.server_name = option.label;
                              }
                            });
                          });

                          loadingDiv.addClass('d-none');
                          alertify.connectServer().destroy();
                        })
                        .fail(function(xhr) {
                          loadingDiv.addClass('d-none');
                          alertify.connectServer().destroy();
                          alertify.connectServer('Connect to server', xhr.responseJSON.result, local_self.getValueFromDOM());
                        });
                    } else {
                      if(Object.keys(this.connect_server).length > 0) {
                        this.connect_server['password'] = $('#password').val();
                        this.connect_server['is_selected'] = false;
                        handler.gridView.on_change_connection(this.connect_server, conn_self, false);
                        loadingDiv = $('#fetching_data');
                        loadingDiv.addClass('d-none');
                      } else {
                        response.password = $('#password').val();
                        loadingDiv.addClass('d-none');
                      }
                    }
                  } else {
                    local_self.model.attributes.database = null;
                    local_self.model.attributes.user = null;
                    local_self.model.attributes.role = null;
                    Backform.Select2Control.prototype.onChange.apply(local_self, arguments);
                    loadingDiv.addClass('d-none');
                    alertify.connectServer().destroy();

                  }
                  closeEvent.close = true;
                },
              };
            });
          },
          render: function() {
            let self = this;
            self.connect(self);
            Object.keys(response.server_list).forEach(key => {
              response.server_list[key].forEach(option => {
                if (option.value == parseInt(sid)) {
                  response.server_name = option.label;
                }
              });
            });
            var transform = self.field.get('transform') || self.defaults.transform;
            if (transform && _.isFunction(transform)) {
              self.field.set('options', transform.bind(self, response.server_list));
            } else {
              self.field.set('options', response.server_list);
            }
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
              Object.keys(response.server_list).forEach(key => {
                response.server_list[key].forEach(option => {
                  if (option.value == self.getValueFromDOM()) {
                    response.server_name = option.label;
                  }
                });
              });
              loadingDiv.addClass('d-none');
            }).fail(function(xhr){
              loadingDiv.addClass('d-none');
              alertify.connectServer('Connect to server', xhr.responseJSON.result, self.getValueFromDOM());
            });

          },
        }),
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
      return null;
    },
  });

  let model = new newConnectionModel();
  return model;
}
