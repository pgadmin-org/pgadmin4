/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import ReactDOM from 'react-dom/client';

import gettext from 'sources/gettext';
import url_for from 'sources/url_for';
import pgWindow from 'sources/window';
import * as commonUtils from 'sources/utils';

import getApiInstance from '../../../../static/js/api_instance';
import Theme from '../../../../static/js/Theme';
import ModalProvider from '../../../../static/js/helpers/ModalProvider';
import SchemaDiffComponent from './components/SchemaDiffComponent';
import { BROWSER_PANELS } from '../../../../browser/static/js/constants';
import { NotifierProvider } from '../../../../static/js/helpers/Notifier';
import usePreferences, { listenPreferenceBroadcast } from '../../../../preferences/static/js/store';
import pgAdmin from 'sources/pgadmin';
import { PgAdminProvider } from '../../../../static/js/PgAdminProvider';

export default class SchemaDiff {
  static instance;
  static panelTitleCount = 1;

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
      callback: 'launchSchemaDiff',
      priority: 1,
      label: gettext('Schema Diff'),
      enable: true,
      below: true,
    }]);
  }

  launchSchemaDiff() {
    let panelTitle = SchemaDiff.panelTitleCount > 1 ? gettext('Schema Diff - %s', SchemaDiff.panelTitleCount) : gettext('Schema Diff');
    SchemaDiff.panelTitleCount++;
    const trans_id = commonUtils.getRandomInt(1, 9999999);

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

  async load(container, trans_id) {
    pgAdmin.Browser.keyboardNavigation.init();
    await listenPreferenceBroadcast();
    const root = ReactDOM.createRoot(container);
    root.render(
      <Theme>
        <PgAdminProvider value={pgAdmin}>
          <ModalProvider>
            <NotifierProvider pgAdmin={pgAdmin} pgWindow={pgWindow} />
            <SchemaDiffComponent params={{ transId: trans_id, pgAdmin: pgWindow.pgAdmin }}></SchemaDiffComponent>
          </ModalProvider>
        </PgAdminProvider>
      </Theme>
    );
  }
}
