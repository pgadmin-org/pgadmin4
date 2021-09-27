/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import React from 'react';
import ReactDOM from 'react-dom';
import Theme from 'sources/Theme';
import GrantWizard from 'sources/components/GrantWizard';


// Grant Wizard
define([
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore', 'backbone',
  'pgadmin.alertifyjs', 'pgadmin.backgrid', 'pgadmin.backform',
  'pgadmin.browser', 'pgadmin.browser.node',
  'tools/grant_wizard/static/js/menu_utils',
  'sources/utils',
  'sources/nodes/supported_database_node',
  'backgrid.select.all',
  'backgrid.filter', 'pgadmin.browser.server.privilege',
  'pgadmin.browser.wizard',
], function(
  gettext, url_for, $, _, Backbone, Alertify, Backgrid, Backform, pgBrowser,
  pgNode, menuUtils, commonUtils, supportedNodes
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
        priority: 14,
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
      for (var idx = 0; idx < menuUtils.supportedNodes.length; idx++) {
        menus.push({
          name: 'grant_wizard_schema_context_' + menuUtils.supportedNodes[idx],
          node: menuUtils.supportedNodes[idx],
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
      if (!Alertify.wizardDialog) {
        Alertify.dialog('wizardDialog', function factory() {

          // Generate wizard main container
          var $container = $('<div class=\'wizard_dlg\' id=\'grantWizardDlg\'></div>');
          return {
            main: function () {
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
                  Alertify.wizardDialog().elements.modal.style.maxHeight=0;
                  Alertify.wizardDialog().elements.modal.style.maxWidth='none';
                  Alertify.wizardDialog().elements.modal.style.overflow='visible';
                  Alertify.wizardDialog().elements.dimmer.style.display='none';
                }
              }, 500);

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
                  return Alertify.wizardDialog().destroy();
                }), 500);
              },
            }
          };
        });
      }
      // Call Grant Wizard Dialog and set dimensions for wizard
      Alertify.wizardDialog('').set({
        onmaximize:function(){
          Alertify.wizardDialog().elements.modal.style.maxHeight='initial';
        },
        onrestore:function(){
          Alertify.wizardDialog().elements.modal.style.maxHeight=0;
        },
      }).resizeTo(pgBrowser.stdW.lg, pgBrowser.stdH.lg);
    },
  };

  return pgBrowser.GrantWizard;
});
