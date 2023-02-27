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
import CloudWizard from './CloudWizard';
import getApiInstance from '../../../../static/js/api_instance';
import Notifier from '../../../../static/js/helpers/Notifier';


// Cloud Wizard
define('pgadmin.misc.cloud', [
  'sources/gettext', 'sources/url_for',
  'pgadmin.browser',
], function(
  gettext, url_for, pgBrowser
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
      let menus = [{
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
      let t = pgBrowser.tree,
        i = t.selected(),
        d = this.d = i ? t.itemData(i) : undefined,
        info = this.info = pgBrowser.tree.getTreeNodeHierarchy(i);

      // Register dialog panel
      pgBrowser.Node.registerUtilityPanel();
      let panel = pgBrowser.Node.addUtilityPanel(930, 650),
        j = panel.$container.find('.obj_properties').first();
      panel.title(gettext('Deploy Cloud Instance'));

      panel.on(window.wcDocker.EVENT.CLOSED, function() {
        const axiosApi = getApiInstance();
        let _url = url_for('cloud.clear_cloud_session');
        axiosApi.post(_url)
          .then(() => {/*This is intentional (SonarQube)*/})
          .catch((error) => {
            Notifier.error(gettext(`Error while clearing cloud wizard data: ${error.response.data.errormsg}`));
          });
      });

      ReactDOM.render(
        <Theme>
          <CloudWizard nodeInfo={info} nodeData={d} cloudPanel={panel}
            onClose={() => {
              ReactDOM.unmountComponentAtNode(j[0]);
              panel.close();
            }}/>
        </Theme>, j[0]);
    },
  };

  return pgBrowser.Cloud;
});
