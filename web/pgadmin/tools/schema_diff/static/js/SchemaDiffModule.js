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

import gettext from 'sources/gettext';
import url_for from 'sources/url_for';
import pgWindow from 'sources/window';

import getApiInstance from '../../../../static/js/api_instance';
import Theme from '../../../../static/js/Theme';
import ModalProvider from '../../../../static/js/helpers/ModalProvider';
import SchemaDiffComponent from './components/SchemaDiffComponent';
import { BROWSER_PANELS } from '../../../../browser/static/js/constants';
import { NotifierProvider } from '../../../../static/js/helpers/Notifier';
import usePreferences from '../../../../preferences/static/js/store';
import pgAdmin from 'sources/pgadmin';
import { PgAdminContext } from '../../../../static/js/BrowserComponent';


export default class SchemaDiff {
  static instance;

  static getInstance(...args) {
    if (!SchemaDiff.instance) {
      SchemaDiff.instance = new SchemaDiff(...args);
    }
    return SchemaDiff.instance;
  }

  constructor(pgAdmin, pgBrowser) {
    this.pgAdmin = pgAdmin;
    this.pgBrowser = pgBrowser;
    this.api = getApiInstance();
  }

  init() {
    let self = this;
    if (self.initialized)
      return;
    self.initialized = true;
    // Define the nodes on which the menus to be appear
    self.pgBrowser.add_menus([{
      name: 'schema_diff',
      module: self,
      applies: ['tools'],
      callback: 'showSchemaDiffTool',
      priority: 1,
      label: gettext('Schema Diff'),
      enable: true,
      below: true,
    }]);
  }

  showSchemaDiffTool() {
    let self = this;

    self.api({
      url: url_for('schema_diff.initialize', null),
      method: 'GET',
    })
      .then(function (res) {
        self.trans_id = res.data.data.schemaDiffTransId;
        res.data.data.panel_title = gettext('Schema Diff');
        self.launchSchemaDiff(res.data.data);
      })
      .catch(function (error) {
        pgAdmin.Browser.notifier.error(gettext(`Error in schema diff initialize ${error.response.data}`));
      });
  }

  launchSchemaDiff(data) {
    let panelTitle = data.panel_title,
      trans_id = data.schemaDiffTransId;

    let url_params = {
        'trans_id': trans_id,
        'editor_title': panelTitle,
      },
      baseUrl = url_for('schema_diff.panel', url_params);

    let browserPreferences = usePreferences.getState().getPreferencesForModule('browser');
    let openInNewTab = browserPreferences.new_browser_tab_open;

    pgAdmin.Browser.Events.trigger(
      'pgadmin:tool:show',
      `${BROWSER_PANELS.SCHEMA_DIFF_TOOL}_${trans_id}`,
      baseUrl,
      null,
      {title: panelTitle, icon: 'pg-font-icon icon-compare', manualClose: false, renamable: true},
      Boolean(openInNewTab?.includes('schema_diff'))
    );
    return true;
  }

  load(container, trans_id) {
    ReactDOM.render(
      <Theme>
        <PgAdminContext.Provider value={pgAdmin}>
          <ModalProvider>
            <NotifierProvider pgAdmin={pgAdmin} pgWindow={pgWindow} />
            <SchemaDiffComponent params={{ transId: trans_id, pgAdmin: pgWindow.pgAdmin }}></SchemaDiffComponent>
          </ModalProvider>
        </PgAdminContext.Provider>
      </Theme>,
      container
    );
  }

}
