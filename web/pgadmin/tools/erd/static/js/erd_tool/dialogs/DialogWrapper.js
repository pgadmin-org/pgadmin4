/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import * as commonUtils from 'sources/utils';

export default class DialogWrapper {
  constructor(dialogContainerSelector, dialogTitle, typeOfDialog,
    jquery, pgBrowser, alertify, backform, backgrid) {

    this.dialogContainerSelector = dialogContainerSelector;
    this.dialogTitle = dialogTitle;
    this.jquery = jquery;
    this.pgBrowser = pgBrowser;
    this.alertify = alertify;
    this.backform = backform;
    this.backgrid = backgrid;
    this.typeOfDialog = typeOfDialog;
  }

  main(title, dialogModel, okCallback) {
    this.set('title', title);
    this.dialogModel = dialogModel;
    this.okCallback = okCallback;
  }

  build() {
    this.alertify.pgDialogBuild.apply(this);
  }

  disableOKButton() {
    this.__internal.buttons[1].element.disabled = true;
  }

  enableOKButton() {
    this.__internal.buttons[1].element.disabled = false;
  }

  focusOnDialog(alertifyDialog) {
    let backform_tab = this.jquery(alertifyDialog.elements.body).find('.backform-tab');
    backform_tab.attr('tabindex', -1);
    this.pgBrowser.keyboardNavigation.getDialogTabNavigator(this.jquery(alertifyDialog.elements.dialog));
    let container = backform_tab.find('.tab-content:first > .tab-pane.active:first');

    if(container.length === 0 && alertifyDialog.elements.content.innerHTML) {
      container = this.jquery(alertifyDialog.elements.content);
    }
    commonUtils.findAndSetFocus(container);
  }

  setup() {
    return {
      buttons: [{
        text: gettext('Cancel'),
        key: 27,
        className: 'btn btn-secondary fa fa-lg fa-times pg-alertify-button',
        'data-btn-name': 'cancel',
      }, {
        text: gettext('OK'),
        key: 13,
        className: 'btn btn-primary fa fa-lg fa-save pg-alertify-button',
        'data-btn-name': 'ok',
      }],
      // Set options for dialog
      options: {
        title: this.dialogTitle,
        //disable both padding and overflow control.
        padding: !1,
        overflow: !1,
        model: 0,
        resizable: true,
        maximizable: true,
        pinnable: false,
        closableByDimmer: false,
        modal: false,
      },
    };
  }

  prepare() {
    const $container = this.jquery(this.dialogContainerSelector);
    const dialog = this.createDialog($container);
    dialog.render();
    this.elements.content.innerHTML = '';
    this.elements.content.appendChild($container.get(0));
    this.jquery(this.elements.body.childNodes[0]).addClass(
      'alertify_tools_dialog_properties obj_properties'
    );
    const statusBar = this.jquery(
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

    statusBar.find('.close-error').on('click', ()=>{
      statusBar.addClass('d-none');
    });

    var onSessionInvalid = (msg) => {
      statusBar.find('.alert-text').text(msg);
      statusBar.removeClass('d-none');
      this.disableOKButton();
      return true;
    };

    var onSessionValidated = () => {
      statusBar.find('.alert-text').text('');
      statusBar.addClass('d-none');
      this.enableOKButton();
      return true;
    };

    this.dialogModel.on('pgadmin-session:valid', onSessionValidated);
    this.dialogModel.on('pgadmin-session:invalid', onSessionInvalid);
    this.dialogModel.startNewSession();
    this.disableOKButton();
    this.focusOnDialog(this);
  }

  callback(event) {
    if (this.wasOkButtonPressed(event)) {
      this.okCallback(this.view.model.toJSON(true));
    }
  }

  createDialog($container) {
    let fields = this.backform.generateViewSchema(
      null, this.dialogModel, 'create', null, null, true, null
    );

    this.view = new this.backform.Dialog({
      el: $container,
      model: this.dialogModel,
      schema: fields,
    });

    return this.view;
  }

  wasOkButtonPressed(event) {
    return event.button['data-btn-name'] === 'ok';
  }
}
