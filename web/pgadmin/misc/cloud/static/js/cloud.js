/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import React from 'react';
import CloudWizard from './CloudWizard';
import getApiInstance from '../../../../static/js/api_instance';
import { BROWSER_PANELS } from '../../../../browser/static/js/constants';
import pgAdmin from 'sources/pgadmin';
import current_user from 'pgadmin.user_management.current_user';

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
        enable: 'canCreate',
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
        enable: 'canCreate',
        data: {action: 'create'},
        category: 'register',
        node: 'server',
      }];

      pgBrowser.add_menus(menus);
      return this;
    },
    canCreate: function(node){
      let serverOwner = node.user_id;
      return (serverOwner == current_user.id || _.isUndefined(serverOwner));
    },

    // Callback to draw Wizard Dialog
    start_cloud_wizard: function() {
      let t = pgBrowser.tree,
        i = t.selected(),
        d = this.d = i ? t.itemData(i) : undefined,
        info = this.info = pgBrowser.tree.getTreeNodeHierarchy(i);

      const panelTitle = gettext('Deploy Cloud Instance');
      const panelId = BROWSER_PANELS.CLOUD_WIZARD;
      pgAdmin.Browser.docker.openDialog({
        id: panelId,
        title: panelTitle,
        manualClose: true,
        content: (
          <CloudWizard nodeInfo={info} nodeData={d} cloudPanelId={panelId}
            onClose={() => {
              const axiosApi = getApiInstance();
              let _url = url_for('cloud.clear_cloud_session');
              axiosApi.post(_url)
                .then(() => {/*This is intentional (SonarQube)*/})
                .catch((error) => {
                  pgAdmin.Browser.notifier.error(gettext(`Error while clearing cloud wizard data: ${error.response.data.errormsg}`));
                });
              pgAdmin.Browser.docker.close(panelId, true);
            }}/>
        )
      }, pgAdmin.Browser.stdW.lg, pgAdmin.Browser.stdH.lg);
    },
  };

  return pgBrowser.Cloud;
});
