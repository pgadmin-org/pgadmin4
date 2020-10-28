/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import url_for from 'sources/url_for';
import $ from 'jquery';
import Alertify from 'pgadmin.alertifyjs';
import pgAdmin from 'sources/pgadmin';
import Backform from 'pgadmin.backform';
import newConnectionDialogModel from 'sources/sqleditor/new_connection_dialog_model';


let NewConnectionDialog = {
  'dialog': function(handler, reconnect, preferences) {
    let url = url_for('sqleditor.get_new_connection_data', {
      'sid': handler.url_params.sid,
      'sgid': handler.url_params.sgid,
    });

    if(reconnect) {
      url += '?connect=1';
    }

    let title = gettext('Connect to server');

    $.ajax({
      url: url,
      headers: {
        'Cache-Control' : 'no-cache',
      },
    }).done(function (res) {
      let response = res.data.result;
      response.database_list = [];
      response.user_list = [];
      if (Alertify.newConnectionDialog) {
        delete Alertify.newConnectionDialog;
      }

      // Create Dialog
      Alertify.dialog('newConnectionDialog', function factory() {
        let $container = $('<div class=\'new-connection-dialog\'></div>');
        return {
          main: function(message) {
            this.msg = message;
          },
          build: function() {
            this.elements.content.appendChild($container.get(0));
            Alertify.pgDialogBuild.apply(this);
          },
          setup: function(){
            return {
              buttons: [
                {
                  text: '',
                  key: 112,
                  className: 'btn btn-primary-icon pull-left fa fa-question pg-alertify-icon-button',
                  attrs: {
                    name: 'dialog_help',
                    type: 'button',
                    label: gettext('Help'),
                    'aria-label': gettext('Help'),
                    url: url_for('help.static', {
                      'filename': 'query_tool.html',
                    }),
                  },
                },
                {
                  text: gettext('Cancel'),
                  key: 27,
                  className: 'btn btn-secondary fa fa-times pg-alertify-button',
                  'data-btn-name': 'cancel',
                }, {
                  text: gettext('OK'),
                  key: 13,
                  className: 'btn btn-primary fa fa-check pg-alertify-button',
                  'data-btn-name': 'ok',
                },
              ],
              // Set options for dialog
              options: {
                title: title,
                //disable both padding and overflow control.
                padding: !1,
                overflow: !1,
                model: 0,
                resizable: true,
                maximizable: false,
                pinnable: false,
                closableByDimmer: false,
                modal: false,
                autoReset: false,
                closable: false,
              },
            };
          },
          prepare: function() {
            let self = this;
            $container.html('');
            // Disable Ok button
            this.__internal.buttons[2].element.disabled = true;

            // Status bar
            this.statusBar = $(
              '<div class=\'pg-prop-status-bar pg-el-xs-12 d-none\'>' +
            '  <div class="error-in-footer"> ' +
            '    <div class="d-flex px-2 py-1"> ' +
            '      <div class="pr-2"> ' +
            '        <i class="fa fa-exclamation-triangle text-danger" aria-hidden="true"></i> ' +
            '      </div> ' +
            '      <div class="alert-text" role="alert"></div> ' +
            '    </div> ' +
            '  </div> ' +
            '</div>').appendTo($container);

            // To show progress on filter Saving/Updating on AJAX
            this.showNewConnectionProgress = $(
              `<div id="show_filter_progress" class="pg-sp-container sql-editor-busy-fetching d-none">
                <div class="pg-sp-content">
                    <div class="row"><div class="col-12 pg-sp-icon sql-editor-busy-icon"></div></div>
                    <div class="row"><div class="col-12 pg-sp-text sql-editor-busy-text">` + gettext('Loading data...') + `</div></div>
                </div>
            </div>`
            ).appendTo($container);
            $(
              self.showNewConnectionProgress[0]
            ).removeClass('d-none');

            self.newConnCollectionModel = newConnectionDialogModel(response, handler.url_params.sgid, handler.url_params.sid, handler, self);
            let fields = Backform.generateViewSchema(null, self.newConnCollectionModel, 'create', null, null, true);

            let view = this.view = new Backform.Dialog({
              el: '<div></div>',
              model: self.newConnCollectionModel,
              schema: fields,
            });

            $(this.elements.body.childNodes[0]).addClass(
              'alertify_tools_dialog_properties obj_properties'
            );

            $container.append(view.render().$el);

            // Enable/disable save button and show/hide statusbar based on session
            view.listenTo(view.model, 'pgadmin-session:start', function() {
              view.listenTo(view.model, 'pgadmin-session:invalid', function(msg) {
                self.statusBar.removeClass('d-none');
                $(self.statusBar.find('.alert-text')).html(msg);
                // Disable Okay button
                if(self.__internal){
                  self.__internal.buttons[2].element.disabled = true;
                }
              });

              view.listenTo(view.model, 'pgadmin-session:valid', function() {
                self.statusBar.addClass('d-none');
                $(self.statusBar.find('.alert-text')).html('');
                // Enable Okay button
                if(self.__internal) {
                  self.__internal.buttons[2].element.disabled = false;
                }
              });
            });

            view.listenTo(view.model, 'pgadmin-session:stop', function() {
              view.stopListening(view.model, 'pgadmin-session:invalid');
              view.stopListening(view.model, 'pgadmin-session:valid');
            });

            // Starts monitoring changes to model
            view.model.startNewSession();

            // Hide Progress ...
            $(
              self.showNewConnectionProgress[0]
            ).addClass('d-none');
          },
          callback: function(e) {
            let self = this;
            if (e.button.element.name == 'dialog_help') {
              e.cancel = true;
              pgAdmin.Browser.showHelp(e.button.element.name, e.button.element.getAttribute('url'),
                null, null);
              return;
            } else if (e.button['data-btn-name'] === 'ok') {
              e.cancel = true; // Do not close dialog
              let newConnCollectionModel = this.newConnCollectionModel.toJSON();

              let selected_database_name = null;
              response.database_list.forEach(function(data){
                if(newConnCollectionModel['database'] == data['value']) {
                  selected_database_name = data['label'];
                  return false;
                }
              });
              let tab_title = '';

              var qt_title_placeholder = preferences['qt_tab_title_placeholder'];
              qt_title_placeholder = qt_title_placeholder.replace(new RegExp('%DATABASE%'), selected_database_name);

              if(newConnCollectionModel['role']) {
                qt_title_placeholder = qt_title_placeholder.replace(new RegExp('%USERNAME%'), newConnCollectionModel['role']);
              } else {
                qt_title_placeholder = qt_title_placeholder.replace(new RegExp('%USERNAME%'), newConnCollectionModel['user']);
              }

              qt_title_placeholder = qt_title_placeholder.replace(new RegExp('%SERVER%'), response.server_name);

              tab_title = qt_title_placeholder;

              if(!newConnCollectionModel['role']) {
                newConnCollectionModel['role'] = null;
              }

              let is_create_connection = true;

              handler.gridView.connection_list.forEach(function(connection_data) {
                if(parseInt(connection_data['server']) == newConnCollectionModel['server']
                && parseInt(connection_data['database']) == newConnCollectionModel['database']
                && connection_data['user'] == newConnCollectionModel['user'] && connection_data['role'] == newConnCollectionModel['role']) {
                  is_create_connection = false;
                  return false;
                }
              });
              if(!is_create_connection) {
                let errmsg = 'Connection with this configuration already present.';
                Alertify.info(errmsg);
              } else {
                let connection_details = {
                  'server_group': handler.gridView.handler.url_params.sgid,
                  'server': newConnCollectionModel['server'],
                  'database': newConnCollectionModel['database'],
                  'title': _.escape(tab_title),
                  'user': newConnCollectionModel['user'],
                  'role': newConnCollectionModel['role'],
                  'server_name': _.escape(response.server_name),
                  'database_name': _.escape(selected_database_name),
                  'password': response.password,
                  'is_selected': false,
                };
                handler.gridView.on_change_connection(connection_details, self);
              }
            } else {
              Alertify.newConnectionDialog().destroy();
            }
          },
        };
      });

      setTimeout(function(){
        Alertify.newConnectionDialog('Connect to server.').resizeTo(pgAdmin.Browser.stdW.md,pgAdmin.Browser.stdH.md);
      }, 500);
    }).fail(function() {
      Alertify.alert().setting({
        'title': gettext('Connection lost'),
        'label':gettext('Ok'),
        'message': gettext('Connection to the server has been lost.'),
        'onok': function(){
          //Close the window after connection is lost
          window.close();
        },
      }).show();
    });

  },

};

module.exports = NewConnectionDialog;
