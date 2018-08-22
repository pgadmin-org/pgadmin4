import gettext from 'sources/gettext';
import url_for from 'sources/url_for';
import $ from 'jquery';
import Alertify from 'pgadmin.alertifyjs';
import pgAdmin from 'sources/pgadmin';
import Backform from 'pgadmin.backform';
import axios from 'axios';
import queryToolActions from 'sources/sqleditor/query_tool_actions';
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
                className: 'btn btn-default pull-left fa fa-lg fa-question',
                attrs: {
                  name: 'dialog_help',
                  type: 'button',
                  label: gettext('Help'),
                  url: url_for('help.static', {
                    'filename': 'editgrid.html',
                  }),
                },
              }, {
                text: gettext('OK'),
                className: 'btn btn-primary pg-alertify-button',
                'data-btn-name': 'ok',
              }, {
                text: gettext('Cancel'),
                key: 27,
                className: 'btn btn-danger pg-alertify-button',
                'data-btn-name': 'cancel',
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
            this.__internal.buttons[1].element.disabled = true;

            // Status bar
            this.statusBar = $('<div class=\'pg-prop-status-bar pg-el-xs-12 hide\'>' +
              '  <div class=\'media error-in-footer bg-red-1 border-red-2 font-red-3 text-14\'>' +
              '    <div class=\'media-body media-middle\'>' +
              '      <div class=\'alert-icon error-icon\'>' +
              '        <i class=\'fa fa-exclamation-triangle\' aria-hidden=\'true\'></i>' +
              '      </div>' +
              '      <div class=\'alert-text\'>' +
              '      </div>' +
              '    </div>' +
              '  </div>' +
              '</div>', {
                text: '',
              }).appendTo($container);

            // To show progress on filter Saving/Updating on AJAX
            this.showFilterProgress = $(
              '<div id="show_filter_progress" class="wcLoadingIconContainer busy-fetching hidden">' +
              '<div class="wcLoadingBackground"></div>' +
              '<span class="wcLoadingIcon fa fa-spinner fa-pulse"></span>' +
              '<span class="busy-text wcLoadingLabel">' + gettext('Loading data...') + '</span>' +
              '</div>').appendTo($container);

            $(
              self.showFilterProgress[0]
            ).removeClass('hidden');

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
                self.statusBar.removeClass('hide');
                $(self.statusBar.find('.alert-text')).html(msg);
                // Disable Okay button
                self.__internal.buttons[1].element.disabled = true;
              });

              view.listenTo(view.model, 'pgadmin-session:valid', function() {
                self.statusBar.addClass('hide');
                $(self.statusBar.find('.alert-text')).html('');
                // Enable Okay button
                self.__internal.buttons[1].element.disabled = false;
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
            ).addClass('hidden');

          },
          // Callback functions when click on the buttons of the Alertify dialogs
          callback: function(e) {
            let self = this;

            if (e.button.element.name == 'dialog_help') {
              e.cancel = true;
              pgAdmin.Browser.showHelp(e.button.element.name, e.button.element.getAttribute('url'),
                null, null, e.button.element.getAttribute('label'));
              return;
            } else if (e.button['data-btn-name'] === 'ok') {
              e.cancel = true; // Do not close dialog

              let filterCollectionModel = this.filterCollectionModel.toJSON();

              // Show Progress ...
              $(
                self.showFilterProgress[0]
              ).removeClass('hidden');

              axios.put(
                url_for('sqleditor.set_filter_data', {
                  'trans_id': handler.transId,
                }),
                filterCollectionModel
              ).then(function () {
                // Hide Progress ...
                $(
                  self.showFilterProgress[0]
                ).addClass('hidden');
                setTimeout(
                  function() {
                    self.close(); // Close the dialog now
                    Alertify.success(gettext('Filter updated successfully'));
                    queryToolActions.executeQuery(handler);
                  }, 10
                );

              }).catch(function (error) {
                // Hide Progress ...
                $(
                  self.showFilterProgress[0]
                ).addClass('hidden');
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

      Alertify.filterDialog(title).resizeTo('65%', '60%');
    })
    .fail(function(e) {
      handleQueryToolAjaxError(pgAdmin, handler, e, '_show_filter', [], true);
    });
  },
};

module.exports = FilterDialog;
