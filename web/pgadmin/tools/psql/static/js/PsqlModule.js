/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { getRandomInt, hasBinariesConfiguration } from 'sources/utils';
import { retrieveAncestorOfTypeServer } from 'sources/tree/tree_utils';
import { generateTitle } from 'tools/sqleditor/static/js/sqleditor_title';
import { BROWSER_PANELS } from '../../../../browser/static/js/constants';
import usePreferences,{ listenPreferenceBroadcast } from '../../../../preferences/static/js/store';
import 'pgadmin.browser.keyboard';
import pgWindow from 'sources/window';
import pgAdmin from 'sources/pgadmin';
import pgBrowser from 'pgadmin.browser';
import PsqlComponent from './components/PsqlComponent';
import { PgAdminProvider } from '../../../../static/js/PgAdminProvider';
import getApiInstance from '../../../../static/js/api_instance';
import gettext from 'sources/gettext';
import url_for from 'sources/url_for';
import Theme from '../../../../static/js/Theme';
import { NotifierProvider } from '../../../../static/js/helpers/Notifier';
import ModalProvider from '../../../../static/js/helpers/ModalProvider';
import * as csrfToken from 'sources/csrf';

import React from 'react';
import ReactDOM from 'react-dom/client';


export default class Psql {
  static instance;

  static getInstance(...args) {
    if (!Psql.instance) {
      Psql.instance = new Psql(...args);
    }
    return Psql.instance;
  }

  constructor(pgAdmin, pgBrowser) {
    this.pgAdmin = pgAdmin;
    this.pgBrowser = pgBrowser;
    this.api = getApiInstance();
  }

  /* Enable/disable PSQL tool menu in tools based
    * on node selected. if selected node is present
    * in unsupported_nodes, menu will be disabled
    * otherwise enabled.
    */
  psqlToolEnabled(obj) {

    let isEnabled = (() => {
      if (!_.isUndefined(obj) && !_.isNull(obj) && pgAdmin['enable_psql']) {
        if (_.indexOf(pgAdmin.unsupported_nodes, obj._type) == -1) {
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

    return isEnabled;
  }

  init() {
    if (this.initialized)
      return;
    this.initialized = true;
    csrfToken.setPGCSRFToken(pgAdmin.csrf_token_header, pgAdmin.csrf_token);
    // Define the nodes on which the menus to be appear

    let menus = [{
      name: 'psql',
      module: this,
      applies: ['tools'],
      callback: 'openPsqlTool',
      enable: this.psqlToolEnabled,
      priority: 1,
      label: gettext('PSQL Tool'),
      data:{
        applies: 'tools',
        data_disabled: gettext('Please select a database from the object explorer to access Pql Tool.'),
      },
    }];


    this.enable_psql_tool = pgAdmin['enable_psql'];
    if(pgAdmin['enable_psql']) {
      pgBrowser.add_menus(menus);
    }
  }

  openPsqlTool(data, treeIdentifier) {

    const serverInformation = retrieveAncestorOfTypeServer(pgBrowser, treeIdentifier, gettext('PSQL Error'));
    if (!hasBinariesConfiguration(pgBrowser, serverInformation)) {
      return;
    }

    const node = pgBrowser.tree.findNodeByDomElement(treeIdentifier);
    if (node === undefined || !node.getData()) {
      pgAdmin.Browser.notifier.alert(
        gettext('PSQL Error'),
        gettext('No object selected.')
      );
      return;
    }

    const parentData = pgBrowser.tree.getTreeNodeHierarchy(treeIdentifier);

    if(_.isUndefined(parentData.server)) {
      pgAdmin.Browser.notifier.alert(
        gettext('PSQL Error'),
        gettext('Please select a server/database object.')
      );
      return;
    }

    const transId = getRandomInt(1, 9999999);

    let panelTitle = '';
    // Set psql tab title as per prefrences setting.
    let title_data = {
      'database': parentData.database ? _.unescape(parentData.database.label) : 'postgres' ,
      'username': parentData.server.user.name,
      'server': parentData.server.label,
      'type': 'psql_tool',
    };
    let tab_title_placeholder = usePreferences.getState().getPreferencesForModule('browser').psql_tab_title_placeholder;
    panelTitle = generateTitle(tab_title_placeholder, title_data);

    const [panelUrl, db_label] = this.getPanelUrls(transId, parentData);

    const open_new_tab = usePreferences.getState().getPreferencesForModule('browser').new_browser_tab_open;

    pgAdmin.Browser.Events.trigger(
      'pgadmin:tool:show',
      `${BROWSER_PANELS.PSQL_TOOL}_${transId}`,
      panelUrl,
      {title: panelTitle, db: db_label},
      {title: panelTitle, icon: 'pg-font-icon icon-terminal', manualClose: false, renamable: true},
      Boolean(open_new_tab?.includes('psql_tool'))
    );

    return true;
  }

  getPanelUrls(transId, pData) {
    let openUrl = url_for('psql.panel', {
      trans_id: transId,
    });
    const misc_preferences = usePreferences.getState().getPreferencesForModule('misc');
    let theme = misc_preferences.theme;

    openUrl += `?sgid=${pData.server_group._id}`
      +`&sid=${pData.server._id}`
      +`&did=${pData.database._id}`
      +`&server_type=${pData.server.server_type}`
      + `&theme=${theme}`;

    if(pData.database?._id) {
      openUrl += `&db=${encodeURIComponent(pData.database._label)}`;
    } else {
      openUrl += `&db=${''}`;
    }

    return [openUrl, pData.database._label];
  }


  async loadComponent(container, params) {
    pgAdmin.Browser.keyboardNavigation.init();
    await listenPreferenceBroadcast();
    const root = ReactDOM.createRoot(container);
    root.render(
      <Theme>
        <PgAdminProvider value={pgAdmin}>
          <ModalProvider>
            <NotifierProvider pgAdmin={pgAdmin} pgWindow={pgWindow} />
            <PsqlComponent params={params} pgAdmin={pgAdmin} />
          </ModalProvider>
        </PgAdminProvider>
      </Theme>
    );
  }



}
