/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2022, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import ReactDOM from 'react-dom';
import gettext from 'sources/gettext';
import Alertify from 'pgadmin.alertifyjs';
import Theme from 'sources/Theme';
import ImportExportServers from './ImportExportServers';
import $ from 'jquery';

export default class ImportExportServersModule {
  static instance;

  static getInstance(...args) {
    if(!ImportExportServersModule.instance) {
      ImportExportServersModule.instance = new ImportExportServersModule(...args);
    }
    return ImportExportServersModule.instance;
  }

  constructor(pgAdmin, pgBrowser) {
    this.pgAdmin = pgAdmin;
    this.pgBrowser = pgBrowser;
  }

  init() {
    if (this.initialized)
      return;
    this.initialized = true;

    // Define the nodes on which the menus to be appear
    var menus = [{
      name: 'import_export_servers',
      module: this,
      applies: ['tools'],
      callback: 'showImportExportServers',
      enable: true,
      priority: 3,
      label: gettext('Import/Export Servers...'),
      icon: 'fa fa-shopping-cart',
    }];

    this.pgBrowser.add_menus(menus);
  }

  // This is a callback function to show import/export servers when user click on menu item.
  showImportExportServers() {
    // Declare Wizard dialog
    if (!Alertify.importExportWizardDialog) {
      Alertify.dialog('importExportWizardDialog', function factory() {

        // Generate wizard main container
        var $container = $('<div class=\'wizard_dlg\' id=\'importExportServersDlg\'></div>');
        return {
          main: function () {
            /*This is intentional (SonarQube)*/
          },
          setup: function () {
            return {
              // Set options for dialog
              options: {
                frameless: true,
                resizable: true,
                autoReset: false,
                maximizable: true,
                closable: true,
                closableByDimmer: false,
                modal: true,
                pinnable: false,
              },
            };
          },
          build: function () {
            this.elements.content.appendChild($container.get(0));
            Alertify.pgDialogBuild.apply(this);

            setTimeout(function () {
              if (document.getElementById('importExportServersDlg')) {
                ReactDOM.render(
                  <Theme>
                    <ImportExportServers />
                  </Theme>,
                  document.getElementById('importExportServersDlg'));
                Alertify.importExportWizardDialog().elements.modal.style.maxHeight=0;
                Alertify.importExportWizardDialog().elements.modal.style.maxWidth='none';
                Alertify.importExportWizardDialog().elements.modal.style.overflow='visible';
                Alertify.importExportWizardDialog().elements.dimmer.style.display='none';
              }
            }, 10);

          },
          prepare: function () {
            $container.empty().append('<div class=\'import_export_servers_container\'></div>');
          },
          hooks: {
            // Triggered when the dialog is closed
            onclose: function () {
              // Clear the view and remove the react component.
              return setTimeout((function () {
                ReactDOM.unmountComponentAtNode(document.getElementById('importExportServersDlg'));
                return Alertify.importExportWizardDialog().destroy();
              }), 500);
            },
          }
        };
      });
    }
    Alertify.importExportWizardDialog('').set({
      onmaximize:function(){
        Alertify.importExportWizardDialog().elements.modal.style.maxHeight='initial';
      },
      onrestore:function(){
        Alertify.importExportWizardDialog().elements.modal.style.maxHeight=0;
      },
    }).resizeTo(880, 550);
  }
}
