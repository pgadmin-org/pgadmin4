/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import * as alertify from 'pgadmin.alertifyjs';
import url_for from 'sources/url_for';
import pgAdmin from 'sources/pgadmin';

let counter = 1;

function url_dialog(_title, _url, _help_filename, _width, _height) {

  let pgBrowser = pgAdmin.Browser;

  const dlgName = 'UrlDialog' + counter++;

  alertify.dialog(dlgName, function factory() {
    return {
      main: function(_title) {
        this.set({'title': _title});
      },
      build: function() {
        alertify.pgDialogBuild.apply(this);
      },
      settings: {
        url: _url,
        title: _title,
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
              label: _title,
              url: url_for('help.static', {
                'filename': _help_filename,
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
            return (alertify[dlgName]()).destroy();
          }), 1000);
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
          pgBrowser.showHelp(
            e.button.element.name, e.button.element.getAttribute('url'),
            null, null
          );
          return;
        }
      },
    };
  });
  (alertify[dlgName](_title)).show().resizeTo(_width || pgBrowser.stdW.lg, _height || pgBrowser.stdH.md);
}

pgAdmin.ui.dialogs.url_dialog = url_dialog;

export {
  url_dialog,
};
