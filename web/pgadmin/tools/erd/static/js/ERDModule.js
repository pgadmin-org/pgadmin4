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
import {getRandomInt, registerDetachEvent} from 'sources/utils';
import Notify from '../../../../static/js/helpers/Notifier';
import url_for from 'sources/url_for';
import gettext from 'sources/gettext';
import React from 'react';
import ReactDOM from 'react-dom';
import ERDTool from './erd_tool/components/ERDTool';
import ModalProvider from '../../../../static/js/helpers/ModalProvider';
import Theme from '../../../../static/js/Theme';
import { openNewWindow } from '../../../../static/js/utils';

const wcDocker = window.wcDocker;

export function setPanelTitle(erdToolPanel, panelTitle) {
  erdToolPanel?.title('<span title="'+panelTitle+'">'+panelTitle+'</span>');
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

    // Creating a new this.pgBrowser frame to show the data.
    const erdFrameType = new this.pgBrowser.Frame({
      name: 'frm_erdtool',
      showTitle: true,
      isCloseable: true,
      isPrivate: true,
      url: 'about:blank',
    });

    // Load the newly created frame
    erdFrameType.load(this.pgBrowser.docker);
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
      Notify.alert(
        gettext('ERD Error'),
        gettext('No object selected.')
      );
      return;
    }

    const parentData = this.pgBrowser.tree.getTreeNodeHierarchy(treeIdentifier);

    if(_.isUndefined(parentData.database)) {
      Notify.alert(
        gettext('ERD Error'),
        gettext('Please select a database/database object.')
      );
      return;
    }

    const transId = getRandomInt(1, 9999999);
    const panelTitle = getPanelTitle(this.pgBrowser, treeIdentifier);
    const panelUrl = this.getPanelUrl(transId, parentData, gen);

    let erdToolForm = `
      <form id="erdToolForm" action="${panelUrl}" method="post">
        <input id="title" name="title" hidden />
      </form>
      <script>
        document.getElementById("title").value = "${_.escape(panelTitle)}";
        document.getElementById("erdToolForm").submit();
      </script>
    `;

    let open_new_tab = this.pgBrowser.get_preferences_for_module('browser').new_browser_tab_open;
    if (open_new_tab && open_new_tab.includes('erd_tool')) {
      openNewWindow(erdToolForm, panelTitle);
    } else {
      /* On successfully initialization find the dashboard panel,
       * create new panel and add it to the dashboard panel.
       */
      let propertiesPanel = this.pgBrowser.docker.findPanels('properties');
      let erdToolPanel = this.pgBrowser.docker.addPanel('frm_erdtool', wcDocker.DOCK.STACKED, propertiesPanel[0]);

      // Set panel title and icon
      setPanelTitle(erdToolPanel, 'Untitled');
      erdToolPanel.icon('fa fa-sitemap');
      erdToolPanel.focus();

      // Register detach event.
      registerDetachEvent(erdToolPanel);
      let openErdToolURL = function(j) {
        // add spinner element
        const frame = j.frameData.embeddedFrame;
        const spinner = document.createElement('div');
        spinner.setAttribute('class', 'pg-sp-container');
        spinner.innerHTML = `
          <div class="pg-sp-content">
            <div class="pg-sp-icon"></div>
          </div>
        `;

        frame.$container[0].appendChild(spinner);

        let init_poller_id = setInterval(function() {
          if (j.frameData.frameInitialized) {
            clearInterval(init_poller_id);
            if (frame) {
              frame.onLoaded(()=>{
                spinner.remove();
              });
              frame.openHTML(erdToolForm);
            }
          }
        }, 100);
      };

      openErdToolURL(erdToolPanel);
    }
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

  setupPreferencesWorker() {
    if (window.location == window.parent?.location) {
      /* Sync the local preferences with the main window if in new tab */
      setInterval(()=>{
        if(pgWindow?.pgAdmin) {
          if(this.pgAdmin.Browser.preference_version() < pgWindow.pgAdmin.Browser.preference_version()){
            this.pgAdmin.Browser.preferences_cache = pgWindow.pgAdmin.Browser.preferences_cache;
            this.pgAdmin.Browser.preference_version(pgWindow.pgAdmin.Browser.preference_version());
            this.pgAdmin.Browser.triggerPreferencesChange('browser');
            this.pgAdmin.Browser.triggerPreferencesChange('erd');
          }
        }
      }, 1000);
    }
  }

  loadComponent(container, params) {
    let panel = null;

    /* Mount the React ERD tool to the container */
    _.each(pgWindow.pgAdmin.Browser.docker.findPanels('frm_erdtool'), function(p) {
      if (p.isVisible()) {
        panel = p;
      }
    });

    this.setupPreferencesWorker();
    ReactDOM.render(
      <Theme>
        <ModalProvider>
          <ERDTool
            params={params}
            pgWindow={pgWindow}
            pgAdmin={this.pgAdmin}
            panel={panel}
          />
        </ModalProvider>
      </Theme>,
      container
    );
  }
}
