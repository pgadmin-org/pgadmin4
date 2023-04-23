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
import { registerDetachEvent } from 'sources/utils';

import { _set_dynamic_tab } from '../../../sqleditor/static/js/show_query_tool';
import getApiInstance from '../../../../static/js/api_instance';
import Theme from '../../../../static/js/Theme';
import ModalProvider from '../../../../static/js/helpers/ModalProvider';
import Notify from '../../../../static/js/helpers/Notifier';
import SchemaDiffComponent from './components/SchemaDiffComponent';
import { showRenamePanel } from '../../../../static/js/Dialogs';


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
    this.wcDocker = window.wcDocker;
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

    /* Create and load the new frame required for schema diff panel */
    self.frame = new self.pgBrowser.Frame({
      name: 'frm_schemadiff',
      title: gettext('Schema Diff'),
      showTitle: true,
      isCloseable: true,
      isRenamable: true,
      isPrivate: true,
      icon: 'pg-font-icon icon-compare',
      url: 'about:blank',
    });

    /* Cache may take time to load for the first time. Keep trying till available */
    let cacheIntervalId = setInterval(function () {
      if (self.pgBrowser.preference_version() > 0) {
        self.preferences = self.pgBrowser.get_preferences_for_module('schema_diff');
        clearInterval(cacheIntervalId);
      }
    }, 0);

    self.pgBrowser.onPreferencesChange('schema_diff', function () {
      self.preferences = self.pgBrowser.get_preferences_for_module('schema_diff');
    });

    self.frame.load(self.pgBrowser.docker);
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
        Notify.error(gettext(`Error in schema diff initialize ${error.response.data}`));
      });
  }

  launchSchemaDiff(data) {
    let self = this;
    let panelTitle = data.panel_title,
      trans_id = data.schemaDiffTransId,
      panelTooltip = '';

    let url_params = {
        'trans_id': trans_id,
        'editor_title': panelTitle,
      },
      baseUrl = url_for('schema_diff.panel', url_params);

    let browserPreferences = this.pgBrowser.get_preferences_for_module('browser');
    let openInNewTab = browserPreferences.new_browser_tab_open;
    if (openInNewTab && openInNewTab.includes('schema_diff')) {
      window.open(baseUrl, '_blank');
      // Send the signal to runtime, so that proper zoom level will be set.
      setTimeout(function () {
        self.pgBrowser.Events.trigger('pgadmin:nw-set-new-window-open-size');
      }, 500);
    } else {
      this.pgBrowser.Events.once(
        'pgadmin-browser:frame:urlloaded:frm_schemadiff',
        function (frame) {
          frame.openURL(baseUrl);
        });
      let propertiesPanel = this.pgBrowser.docker.findPanels('properties'),
        schemaDiffPanel = this.pgBrowser.docker.addPanel('frm_schemadiff', this.wcDocker.DOCK.STACKED, propertiesPanel[0]);

      registerDetachEvent(schemaDiffPanel);

      // Panel Rename event
      schemaDiffPanel.on(self.wcDocker.EVENT.RENAME, function (panel_data) {
        self.panel_rename_event(panel_data, schemaDiffPanel, browserPreferences);
      });

      _set_dynamic_tab(this.pgBrowser, browserPreferences['dynamic_tabs']);
      // Set panel title and icon
      schemaDiffPanel.title('<span title="' + panelTooltip + '">' + panelTitle + '</span>');
      schemaDiffPanel.icon('pg-font-icon icon-compare');
      schemaDiffPanel.focus();

    }
  }

  panel_rename_event(panel_data, panel) {
    showRenamePanel(panel_data.$titleText[0].textContent, null, panel);
  }

  load(container, trans_id) {
    ReactDOM.render(
      <Theme>
        <ModalProvider>
          <SchemaDiffComponent params={{ transId: trans_id, pgAdmin: pgWindow.pgAdmin }}></SchemaDiffComponent>
        </ModalProvider>
      </Theme>,
      container
    );
  }

}
