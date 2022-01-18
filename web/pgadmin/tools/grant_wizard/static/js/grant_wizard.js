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
import GrantWizard from './GrantWizard';


// Grant Wizard
define([
  'sources/gettext', 'jquery', 'underscore',
  'pgadmin.alertifyjs', 'pgadmin.browser',
  'tools/grant_wizard/static/js/menu_utils',
  'sources/nodes/supported_database_node',
  'backgrid.select.all',
  'backgrid.filter', 'pgadmin.browser.server.privilege',
  'pgadmin.browser.wizard',
], function(
  gettext, $, _, Alertify, pgBrowser, menuUtils, supportedNodes
) {

  // if module is already initialized, refer to that.
  if (pgBrowser.GrantWizard) {
    return pgBrowser.GrantWizard;
  }


  // Create an Object GrantWizard of pgBrowser class
  pgBrowser.GrantWizard = {
    init: function() {
      if (this.initialized)
        return;

      this.initialized = true;

      // Define the nodes on which the menus to be appear
      var menus = [{
        name: 'grant_wizard_schema',
        module: this,
        applies: ['tools'],
        callback: 'start_grant_wizard',
        priority: 1,
        label: gettext('Grant Wizard...'),
        icon: 'fa fa-unlock',
        enable: supportedNodes.enabled.bind(
          null, pgBrowser.tree, menuUtils.supportedNodes
        ),
        data: {
          data_disabled: gettext('Please select any database, schema or schema objects from the browser tree to access Grant Wizard Tool.'),
        },
      }];

      // Add supported menus into the menus list
      for (let mnu_val of menuUtils.supportedNodes) {
        menus.push({
          name: 'grant_wizard_schema_context_' + mnu_val,
          node: mnu_val,
          module: this,
          applies: ['context'],
          callback: 'start_grant_wizard',
          priority: 14,
          label: gettext('Grant Wizard...'),
          icon: 'fa fa-unlock',
          enable: supportedNodes.enabled.bind(
            null, pgBrowser.tree, menuUtils.supportedNodes
          ),
        });
      }
      pgBrowser.add_menus(menus);

      return this;
    },

    // Callback to draw Wizard Dialog
    start_grant_wizard: function() {

      // Declare Wizard dialog
      if (!Alertify.grantWizardDialog) {
        Alertify.dialog('grantWizardDialog', function factory() {

          // Generate wizard main container
          var $container = $('<div class=\'wizard_dlg\' id=\'grantWizardDlg\'></div>');
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

              var sid = info.server._id,
                did = info.database._id;

              setTimeout(function () {
                if (document.getElementById('grantWizardDlg')) {
                  ReactDOM.render(
                    <Theme>
                      <GrantWizard sid={sid} did={did} nodeInfo={info} nodeData={d} />
                    </Theme>,
                    document.getElementById('grantWizardDlg'));
                  Alertify.grantWizardDialog().elements.modal.style.maxHeight=0;
                  Alertify.grantWizardDialog().elements.modal.style.maxWidth='none';
                  Alertify.grantWizardDialog().elements.modal.style.overflow='visible';
                  Alertify.grantWizardDialog().elements.dimmer.style.display='none';
                }
              }, 10);

            },
            prepare: function () {
              $container.empty().append('<div class=\'grant_wizard_container\'></div>');
            },
            hooks: {
              // Triggered when the dialog is closed
              onclose: function () {
                // Clear the view and remove the react component.
                return setTimeout((function () {
                  ReactDOM.unmountComponentAtNode(document.getElementById('grantWizardDlg'));
                  return Alertify.grantWizardDialog().destroy();
                }), 500);
              },
            }
          };
        });
      }
      // Call Grant Wizard Dialog and set dimensions for wizard
      Alertify.grantWizardDialog('').set({
        onmaximize:function(){
          Alertify.grantWizardDialog().elements.modal.style.maxHeight='initial';
        },
        onrestore:function(){
          Alertify.grantWizardDialog().elements.modal.style.maxHeight=0;
        },
      }).resizeTo(pgBrowser.stdW.lg, pgBrowser.stdH.lg);
    },
  };

  return pgBrowser.GrantWizard;
});
