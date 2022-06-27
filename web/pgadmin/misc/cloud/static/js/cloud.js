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
import Theme from 'sources/Theme';
import CloudWizard from './CloudWizard';
import getApiInstance from '../../../../static/js/api_instance';


// Cloud Wizard
define('pgadmin.misc.cloud', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore',
  'pgadmin.alertifyjs',
  'pgadmin.browser',
  'pgadmin.browser.wizard',
], function(
  gettext, url_for, $, _, Alertify, pgBrowser
) {

  // if module is already initialized, refer to that.
  if (pgBrowser.Cloud) {
    return pgBrowser.Cloud;
  }


  // Create an Object Cloud of pgBrowser class
  pgBrowser.Cloud = {
    init: function() {
      if (this.initialized)
        return;

      this.initialized = true;

      // Define the nodes on which the menus to be appear
      var menus = [{
        name: 'register_and_deploy_cloud_instance',
        module: this,
        applies: ['object', 'context'],
        callback: 'start_cloud_wizard',
        priority: 15,
        label: gettext('Deploy Cloud Instance...'),
        icon: 'wcTabIcon icon-server',
        enable: true,
        data: {action: 'create'},
        category: 'register',
        node: 'server_group',
      }, {
        name: 'register_and_deploy_cloud_instance',
        module: this,
        applies: ['object', 'context'],
        callback: 'start_cloud_wizard',
        priority: 15,
        label: gettext('Deploy Cloud Instance...'),
        icon: 'wcTabIcon icon-server',
        enable: true,
        data: {action: 'create'},
        category: 'register',
        node: 'server',
      }];

      pgBrowser.add_menus(menus);
      return this;
    },

    // Callback to draw Wizard Dialog
    start_cloud_wizard: function() {

      // Declare Wizard dialog
      if (!Alertify.cloudWizardDialog) {
        Alertify.dialog('cloudWizardDialog', function factory() {

          // Generate wizard main container
          var $container = $('<div class=\'wizard_dlg\' id=\'cloudWizardDlg\'></div>');
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
              var t = pgBrowser.tree,
                i = t.selected(),
                d = this.d = i ? t.itemData(i) : undefined,
                info = this.info = pgBrowser.tree.getTreeNodeHierarchy(i);

              setTimeout(function () {
                if (document.getElementById('cloudWizardDlg')) {
                  ReactDOM.render(
                    <Theme>
                      <CloudWizard nodeInfo={info} nodeData={d} />
                    </Theme>,
                    document.getElementById('cloudWizardDlg'));
                  Alertify.cloudWizardDialog().elements.modal.style.maxHeight=0;
                  Alertify.cloudWizardDialog().elements.modal.style.maxWidth='none';
                  Alertify.cloudWizardDialog().elements.modal.style.overflow='visible';
                  Alertify.cloudWizardDialog().elements.dimmer.style.display='none';
                }
              }, 500);

            },
            prepare: function () {
              $container.empty().append('<div class=\'cloud_wizard_container\'></div>');
            },
            hooks: {
              // Triggered when the dialog is closed
              onclose: function () {
                if(event.target instanceof Object && event.target.className == 'ajs-close'){
                  const axiosApi = getApiInstance();
                  let _url = url_for('cloud.clear_cloud_session');
                  axiosApi.post(_url)
                    .then(() => {})
                    .catch((error) => {
                      Alertify.error(gettext(`Error while clearing cloud wizard data: ${error.response.data.errormsg}`));
                    });
                }
                // Clear the view and remove the react component.
                return setTimeout((function () {
                  ReactDOM.unmountComponentAtNode(document.getElementById('cloudWizardDlg'));
                  return Alertify.cloudWizardDialog().destroy();
                }), 10);
              },
            }
          };
        });
      }
      // Call Grant Wizard Dialog and set dimensions for wizard
      Alertify.cloudWizardDialog('').set({
        onmaximize:function(){
          Alertify.cloudWizardDialog().elements.modal.style.maxHeight='initial';
        },
        onrestore:function(){
          Alertify.cloudWizardDialog().elements.modal.style.maxHeight=0;
        },
      }).resizeTo(920, 650);
    },


  };

  return pgBrowser.Cloud;
});
