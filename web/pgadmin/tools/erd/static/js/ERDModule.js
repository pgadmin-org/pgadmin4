/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import pgWindow from 'sources/window';
import {getPanelTitle} from 'tools/sqleditor/static/js/sqleditor_title';
import {getRandomInt} from 'sources/utils';
import url_for from 'sources/url_for';
import gettext from 'sources/gettext';
import React from 'react';
import ReactDOM from 'react-dom';
import ERDTool from './erd_tool/components/ERDTool';
import ModalProvider from '../../../../static/js/helpers/ModalProvider';
import Theme from '../../../../static/js/Theme';
import { BROWSER_PANELS } from '../../../../browser/static/js/constants';
import { NotifierProvider } from '../../../../static/js/helpers/Notifier';
import usePreferences, { listenPreferenceBroadcast } from '../../../../preferences/static/js/store';
import pgAdmin from 'sources/pgadmin';
import { PgAdminContext } from '../../../../static/js/BrowserComponent';

export function setPanelTitle(docker, panelId, panelTitle) {
  docker.setTitle(panelId, panelTitle);
}
export default class ERDModule {
  static instance;

  static getInstance(...args) {
    if(!ERDModule.instance) {
      ERDModule.instance = new ERDModule(...args);
    }
    return ERDModule.instance;
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
    this.pgBrowser.add_menus([{
      name: 'erd',
      module: this,
      applies: ['tools'],
      callback: 'showErdTool',
      priority: 1,
      label: gettext('ERD Tool'),
      enable: this.erdToolEnabled,
      data: {
        data_disabled: gettext('The selected tree node does not support this option.'),
      },
    }]);
    return this;
  }

  erdToolEnabled(obj) {
    /* Same as query tool */
    return (() => {
      if (!_.isUndefined(obj) && !_.isNull(obj)) {
        if (_.indexOf(this.pgAdmin.unsupported_nodes, obj._type) == -1) {
          if (obj._type == 'database' && obj.allowConn) {
            return true;
          } else if (obj._type != 'database') {
            return true;
          } else {
            return false;
          }
        } else {
          return false;
        }
      } else {
        return false;
      }
    })();
  }

  // Callback to draw ERD Tool for objects
  showErdTool(_data, treeIdentifier, gen=false) {
    if (treeIdentifier === undefined) {
      pgAdmin.Browser.notifier.alert(
        gettext('ERD Error'),
        gettext('No object selected.')
      );
      return;
    }

    const parentData = this.pgBrowser.tree.getTreeNodeHierarchy(treeIdentifier);

    if(_.isUndefined(parentData.database)) {
      pgAdmin.Browser.notifier.alert(
        gettext('ERD Error'),
        gettext('Please select a database/database object.')
      );
      return;
    }

    const transId = getRandomInt(1, 9999999);
    const panelTitle = getPanelTitle(this.pgBrowser, treeIdentifier);
    const panelUrl = this.getPanelUrl(transId, parentData, gen);
    const open_new_tab = usePreferences.getState().getPreferencesForModule('browser').new_browser_tab_open;

    pgAdmin.Browser.Events.trigger(
      'pgadmin:tool:show',
      `${BROWSER_PANELS.ERD_TOOL}_${transId}`,
      panelUrl,
      {title: _.escape(panelTitle)},
      {title: 'Untitled', icon: 'fa fa-sitemap'},
      Boolean(open_new_tab?.includes('erd_tool'))
    );

    return true;
  }
  getPanelUrl(transId, parentData, gen) {
    let openUrl = url_for('erd.panel', {
      trans_id: transId,
    });

    openUrl += `?sgid=${parentData.server_group._id}`
      +`&sid=${parentData.server._id}`
      +`&server_type=${parentData.server.server_type}`
      +`&did=${parentData.database._id}`
      +`&gen=${gen}`;

    if(parentData.table) {
      openUrl += `&scid=${parentData.schema._id}`
      +`&tid=${parentData.table._id}`;
    }

    return openUrl;
  }

  async loadComponent(container, params) {
    await listenPreferenceBroadcast();
    ReactDOM.render(
      <Theme>
        <PgAdminContext.Provider value={pgAdmin}>
          <ModalProvider>
            <NotifierProvider pgAdmin={this.pgAdmin} pgWindow={pgWindow} />
            <ERDTool
              params={params}
              pgWindow={pgWindow}
              pgAdmin={this.pgAdmin}
              panelId={`${BROWSER_PANELS.ERD_TOOL}_${params.trans_id}`}
              panelDocker={pgWindow.pgAdmin.Browser.docker}
            />
          </ModalProvider>
        </PgAdminContext.Provider>
      </Theme>,
      container
    );
  }
}
