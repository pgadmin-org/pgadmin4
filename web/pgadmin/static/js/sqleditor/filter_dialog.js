/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import url_for from 'sources/url_for';
import $ from 'jquery';
import Alertify from 'pgadmin.alertifyjs';
import pgAdmin from 'sources/pgadmin';
import Backform from 'pgadmin.backform';
import axios from 'axios';
var queryToolActions = require('sources/sqleditor/query_tool_actions');
import filterDialogModel from 'sources/sqleditor/filter_dialog_model';
import {handleQueryToolAjaxError} from 'sources/sqleditor/query_tool_http_error_handler';

let FilterDialog = {
  geturl: function(transId, reconnect) {
    let url = url_for('sqleditor.get_filter_data', {
      'trans_id': transId,
    });

    if(reconnect) {
      url += '?connect=1';
    }

    return url;
  },

  'dialog': function(handler, reconnect) {
    let title = gettext('Sort/Filter options');

    $.ajax({
      url: this.geturl(handler.transId, reconnect),
      headers: {
        'Cache-Control' : 'no-cache',
      },
    })
      .done(function (res) {
        let response = res.data.result;

        // Check the alertify dialog already loaded then delete it to clear
        // the cache
        if (Alertify.filterDialog) {
          delete Alertify.filterDialog;
        }

        // Create Dialog
        Alertify.dialog('filterDialog', function factory() {
          let $container = $('<div class=\'data_sorting_dialog\'></div>');
          return {
            main: function() {
              this.set('title', gettext('Sort/Filter options'));
            },
            build: function() {
              this.elements.content.appendChild($container.get(0));
              Alertify.pgDialogBuild.apply(this);
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
                    label: gettext('Help'),
                    'aria-label': gettext('Help'),
                    url: url_for('help.static', {
                      'filename': 'editgrid.html',
                    }),
                  },
                }, {
                  text: gettext('Cancel'),
                  key: 27,
                  className: 'btn btn-secondary fa fa-times pg-alertify-button',
                  'data-btn-name': 'cancel',
                }, {
                  text: gettext('OK'),
                  className: 'btn btn-primary fa fa-check pg-alertify-button',
                  'data-btn-name': 'ok',
                }],
                // Set options for dialog
                options: {
                  title: title,
                  //disable both padding and overflow control.
                  padding: !1,
                  overflow: !1,
                  model: 0,
                  resizable: true,
                  maximizable: true,
                  pinnable: false,
                  closableByDimmer: false,
                  modal: false,
                  autoReset: false,
                },
              };
            },
            hooks: {
            // triggered when the dialog is closed
              onclose: function() {
                if (this.view) {
                  this.filterCollectionModel.stopSession();
                  this.view.model.stopSession();
                  this.view.remove({
                    data: true,
                    internal: true,
                    silent: true,
                  });
                }
              },
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
              this.showFilterProgress = $(
                `<div id="show_filter_progress" class="pg-sp-container sql-editor-busy-fetching d-none">
                  <div class="pg-sp-content">
                      <div class="row"><div class="col-12 pg-sp-icon sql-editor-busy-icon"></div></div>
                      <div class="row"><div class="col-12 pg-sp-text sql-editor-busy-text">` + gettext('Loading data...') + `</div></div>
                  </div>
              </div>`
              ).appendTo($container);
              $(
                self.showFilterProgress[0]
              ).removeClass('d-none');

              self.filterCollectionModel = filterDialogModel(response);

              let fields = Backform.generateViewSchema(
                null, self.filterCollectionModel, 'create', null, null, true
              );

              let view = this.view = new Backform.Dialog({
                el: '<div></div>',
                model: self.filterCollectionModel,
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
                  self.__internal.buttons[2].element.disabled = true;
                });

                view.listenTo(view.model, 'pgadmin-session:valid', function() {
                  self.statusBar.addClass('d-none');
                  $(self.statusBar.find('.alert-text')).html('');
                  // Enable Okay button
                  self.__internal.buttons[2].element.disabled = false;
                });
              });

              view.listenTo(view.model, 'pgadmin-session:stop', function() {
                view.stopListening(view.model, 'pgadmin-session:invalid');
                view.stopListening(view.model, 'pgadmin-session:valid');
              });

              // Starts monitoring changes to model
              view.model.startNewSession();

              // Set data in collection
              let viewDataSortingModel = view.model.get('data_sorting');
              viewDataSortingModel.add(response['data_sorting']);

              // Hide Progress ...
              $(
                self.showFilterProgress[0]
              ).addClass('d-none');

            },
            // Callback functions when click on the buttons of the Alertify dialogs
            callback: function(e) {
              let self = this;

              if (e.button.element.name == 'dialog_help') {
                e.cancel = true;
                pgAdmin.Browser.showHelp(e.button.element.name, e.button.element.getAttribute('url'),
                  null, null);
                return;
              } else if (e.button['data-btn-name'] === 'ok') {
                e.cancel = true; // Do not close dialog

                let filterCollectionModel = this.filterCollectionModel.toJSON();

                // Show Progress ...
                $(
                  self.showFilterProgress[0]
                ).removeClass('d-none');

                axios.put(
                  url_for('sqleditor.set_filter_data', {
                    'trans_id': handler.transId,
                  }),
                  filterCollectionModel
                ).then(function (result) {
                // Hide Progress ...
                  $(
                    self.showFilterProgress[0]
                  ).addClass('d-none');

                  let filterResponse = result.data.data;

                  if (filterResponse.status) {
                    setTimeout(
                      function() {
                        self.close(); // Close the dialog now
                        Alertify.success(gettext('Filter updated successfully'));
                        queryToolActions.executeQuery(handler);
                      }, 10
                    );
                  } else {
                    Alertify.alert(
                      gettext('Validation Error'),
                      filterResponse.result
                    );
                  }

                }).catch(function (error) {
                // Hide Progress ...
                  $(
                    self.showFilterProgress[0]
                  ).addClass('d-none');
                  handler.onExecuteHTTPError(error);

                  setTimeout(
                    function() {
                      Alertify.error(error);
                    }, 10
                  );
                });
              } else {
                self.close();
              }
            },
          };
        });

        Alertify.filterDialog(title).resizeTo(pgAdmin.Browser.stdW.md,pgAdmin.Browser.stdH.md);
      })
      .fail(function(e) {
        handleQueryToolAjaxError(pgAdmin, handler, e, '_show_filter', [], true);
      });
  },
};

module.exports = FilterDialog;
