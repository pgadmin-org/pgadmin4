/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import React from 'react';
import ReactDOM from 'react-dom';
import Theme from 'sources/Theme';
import GrantWizard from './GrantWizard';


// Grant Wizard
define([
  'sources/gettext', 'pgadmin.browser',
  'tools/grant_wizard/static/js/menu_utils',
  'sources/nodes/supported_database_node',
], function(
  gettext, pgBrowser, menuUtils, supportedNodes
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
      let menus = [{
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
      let t = pgBrowser.tree,
        i = t.selected(),
        d = this.d = i ? t.itemData(i) : undefined,
        info = this.info = pgBrowser.tree.getTreeNodeHierarchy(i);

      // Register dialog panel
      pgBrowser.Node.registerUtilityPanel();
      let panel = pgBrowser.Node.addUtilityPanel(pgBrowser.stdW.lg, pgBrowser.stdH.lg),
        j = panel.$container.find('.obj_properties').first();
      panel.title(gettext('Grant Wizard'));

      let sid = info.server._id,
        did = info.database._id;

      ReactDOM.render(
        <Theme>
          <GrantWizard sid={sid} did={did} nodeInfo={info} nodeData={d}
            onClose={() => {
              ReactDOM.unmountComponentAtNode(j[0]);
              panel.close();
            }}/>
        </Theme>, j[0]);
    },
  };

  return pgBrowser.GrantWizard;
});
