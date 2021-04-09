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
import _ from 'underscore';
import Alertify from 'pgadmin.alertifyjs';
import pgAdmin from 'sources/pgadmin';
import Backform from 'pgadmin.backform';
import macroModel from 'sources/sqleditor/macro_model';
import axios from 'axios';

let MacroDialog = {
  'dialog': function(handler) {
    let title = gettext('Manage Macros');

    // Check the alertify dialog already loaded then delete it to clear
    // the cache
    if (Alertify.macroDialog) {
      delete Alertify.macroDialog;
    }

    // Create Dialog
    Alertify.dialog('macroDialog', function factory() {
      let $container = $('<div class=\'macro_dialog\'></div>');
      return {
        main: function() {
          this.set('title', '<i class="fa fa-scroll sql-icon-lg" aria-hidden="true" role="img"></i> ' + gettext('Manage Macros'));
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
                  'filename': 'query_tool.html',
                }),
              },
            }, {
              text: gettext('Cancel'),
              key: 27,
              className: 'btn btn-secondary fa fa-times pg-alertify-button',
              'data-btn-name': 'cancel',
            }, {
              text: gettext('Save'),
              className: 'btn btn-primary fa fa-save pg-alertify-button',
              'data-btn-name': 'ok',
            }],
            focus: {
              element: function(){
              /*
              returning false will focus nothing, but it will make
              contents behind the modal accessible via Tab key,
              so focus the dialog itself instead.
              */
                return $(this.elements.dialog).find('.header-icon-cell button')[0];
              },
              select: true,
            },
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
              this.macroCollectionModel.stopSession();
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

          self.macroCollectionModel = macroModel(handler.transId);

          let fields = Backform.generateViewSchema(
            null, self.macroCollectionModel, 'edit', null, null, true
          );

          let ManageMacroDialog = Backform.Dialog.extend({
            template: {
              'panel': _.template(
                '<div role="tabpanel" tabindex="-1" class="tab-pane <%=label%> <%=tabPanelCodeClass%> pg-el-sm-12 pg-el-md-12 pg-el-lg-12 pg-el-12 fade" id="<%=cId%>"></div>'
              ),
            },
            render: function() {
              this.cleanup();

              var  m = this.model,
                controls = this.controls,
                tmpls = this.template,
                dialog_obj = this,
                idx = (this.tabIndex * 100),
                evalF = function(f, d, model) {
                  return (_.isFunction(f) ? !!f.apply(d, [model]) : !!f);
                };

              this.$el
                .empty()
                .attr('role', 'tabpanel')
                .attr('class', _.result(this, 'tabPanelClassName'));
              m.panelEl = this.$el;

              var tabContent = $('<div class="tab-content pg-el-sm-12 pg-el-md-12 pg-el-lg-12 pg-el-12 macro-tab"></div>')
                .appendTo(this.$el);

              _.each(this.schema, function(o) {
                idx++;
                if (!o.version_compatible || !evalF(o.visible, o, m)) {
                  return;
                }
                var el = $((tmpls['panel'])(_.extend(o, {
                  'tabIndex': idx,
                  'tabPanelCodeClass': o.tabPanelCodeClass ? o.tabPanelCodeClass : '',
                })))
                  .appendTo(tabContent)
                  .removeClass('collapse').addClass('collapse');

                o.fields.each(function(f) {
                  var cntr = new(f.get('control'))({
                    field: f,
                    model: m,
                    dialog: dialog_obj,
                    tabIndex: idx,
                  });
                  el.append(cntr.render().$el);
                  controls.push(cntr);
                });
              });

              tabContent.find('.tab-pane').first().addClass('active show');

              return this;
            },
          });

          let view = self.view = new ManageMacroDialog({
            el: '<div></div>',
            model: self.macroCollectionModel,
            schema: fields,
          });

          self.macroCollectionModel.fetch({
            success: function() {

              // We got the latest attributes of the object. Render the view
              // now.
              $container.append(self.view.render().$el);
              self.__internal.buttons[2].element.disabled = true;


              // Enable/disable save button and show/hide statusbar based on session
              self.view.listenTo(self.view.model, 'pgadmin-session:start', function() {
                self.view.listenTo(self.view.model, 'pgadmin-session:invalid', function(msg) {
                  self.statusBar.removeClass('d-none');
                  $(self.statusBar.find('.alert-text')).html(msg);
                  // Disable Okay button
                  self.__internal.buttons[2].element.disabled = true;
                });

                view.listenTo(self.view.model, 'pgadmin-session:valid', function() {
                  self.statusBar.addClass('d-none');
                  $(self.statusBar.find('.alert-text')).html('');
                  // Enable Okay button
                  self.__internal.buttons[2].element.disabled = false;
                });
              });

              view.listenTo(self.view.model, 'pgadmin-session:stop', function() {
                view.stopListening(self.view.model, 'pgadmin-session:invalid');
                view.stopListening(self.view.model, 'pgadmin-session:valid');
              });

              // Starts monitoring changes to model
              self.view.model.startNewSession();

            }});

          $(this.elements.body.childNodes[0]).addClass(
            'alertify_tools_dialog_properties obj_properties'
          );



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

            let data = self.view.model.get('macro').toJSON(true);

            if (data == undefined || data == null) {
              self.close();
              return;
            }

            axios.put(
              url_for('sqleditor.set_macros', {
                'trans_id': handler.transId,
              }),
              data
            ).then(function (result) {
            // Hide Progress ...
              $(
                self.showFilterProgress[0]
              ).addClass('d-none');

              let macroResponse = result;

              if (macroResponse.status) {
                setTimeout(
                  function() {
                    // Update Macro Menu
                    let macros = self.view.model.get('macro').toJSON().filter(m => m.name !== undefined || m.name !== null);
                    handler.macros = macros;
                    var str = `
                      <li>
                          <a class="dropdown-item" id="btn-manage-macros" href="#" tabindex="0">
                              <span> ${gettext('Manage Macros...')} </span>
                          </a>
                      </li>`;

                    let macro_list_tmpl = '';
                    _.each(macros, function(m) {
                      if (m.name) {
                        macro_list_tmpl += `<li>
                        <a class="dropdown-item btn-macro" data-macro-id="${m.id}" href="#" tabindex="0">
                            <span> ${_.escape(m.name)} </span>
                            <span> (${m.key_label}) </span>
                        </a>
                       </li>`;
                      }
                    });

                    if (macro_list_tmpl.length > 0) str += '<li class="dropdown-divider"></li>' + macro_list_tmpl;
                    $($.find('div.btn-group.mr-1.user_macros ul.dropdown-menu')).html($(str));

                    self.close(); // Close the dialog now
                    Alertify.success(gettext('Macro updated successfully'));
                  }, 10
                );
              } else {
                Alertify.alert(
                  gettext('Validation Error'),
                  macroResponse.result
                );
              }

            }).catch(function (error) {
            // Hide Progress ...
              $(
                self.showFilterProgress[0]
              ).addClass('d-none');

              setTimeout(
                function() {
                  Alertify.error(error.response.data.errormsg);
                }, 10
              );
            });

          } else {
            self.close();
          }
        },
      };
    });

    Alertify.macroDialog(title).resizeTo(pgAdmin.Browser.stdW.calc(pgAdmin.Browser.stdW.lg),
      pgAdmin.Browser.stdH.calc(pgAdmin.Browser.stdH.lg));
  },
};

module.exports = MacroDialog;
