
/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import * as showViewData from './show_view_data';
import * as showQueryTool from './show_query_tool';
import * as panelTitleFunc from './sqleditor_title';
import * as commonUtils from 'sources/utils';
import _ from 'lodash';
import pgWindow from 'sources/window';
import pgAdmin from 'sources/pgadmin';
import pgBrowser from 'pgadmin.browser';
import 'pgadmin.tools.user_management';
import 'pgadmin.tools.file_manager';
import gettext from 'sources/gettext';
import React from 'react';
import ReactDOM from 'react-dom';
import QueryToolComponent from './components/QueryToolComponent';
import ModalProvider from '../../../../static/js/helpers/ModalProvider';
import Theme from '../../../../static/js/Theme';
import { BROWSER_PANELS } from '../../../../browser/static/js/constants';
import { NotifierProvider } from '../../../../static/js/helpers/Notifier';
import usePreferences, { listenPreferenceBroadcast } from '../../../../preferences/static/js/store';
import { PgAdminContext } from '../../../../static/js/BrowserComponent';

export default class SQLEditor {
  static instance;

  static getInstance(...args) {
    if(!SQLEditor.instance) {
      SQLEditor.instance = new SQLEditor(...args);
    }
    return SQLEditor.instance;
  }

  SUPPORTED_NODES = [
    'table', 'view', 'mview',
    'foreign_table', 'catalog_object', 'partition',
  ];

  /* Enable/disable View data menu in tools based
  * on node selected. if selected node is present
  * in supportedNodes, menu will be enabled
  * otherwise disabled.
  */
  viewMenuEnabled(obj) {
    let isEnabled = (() => {
      if (!_.isUndefined(obj) && !_.isNull(obj))
        return (_.indexOf(this.SUPPORTED_NODES, obj._type) !== -1 ? true : false);
      else
        return false;
    })();

    return isEnabled;
  }

  /* Enable/disable Query tool menu in tools based
  * on node selected. if selected node is present
  * in unsupported_nodes, menu will be disabled
  * otherwise enabled.
  */
  queryToolMenuEnabled(obj) {
    let isEnabled = (() => {
      if (!_.isUndefined(obj) && !_.isNull(obj)) {
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
    if(this.initialized)
      return;
    this.initialized = true;

    // Define the nodes on which the menus to be appear
    let menus = [{
      name: 'query_tool',
      module: this,
      applies: ['tools'],
      callback: 'showQueryTool',
      enable: this.queryToolMenuEnabled,
      priority: 1,
      label: gettext('Query Tool'),
      data:{
        applies: 'tools',
        data_disabled: gettext('Please select a database from the object explorer to access Query Tool.'),
      },
    }];

    // Create context menu
    for (const supportedNode of this.SUPPORTED_NODES) {
      menus.push({
        name: 'view_all_rows_context_' + supportedNode,
        node: supportedNode,
        module: this,
        data: {
          mnuid: 3,
        },
        applies: ['context', 'object'],
        callback: 'showViewData',
        enable: this.viewMenuEnabled,
        category: 'view_data',
        priority: 101,
        label: gettext('All Rows'),
      }, {
        name: 'view_first_100_rows_context_' + supportedNode,
        node: supportedNode,
        module: this,
        data: {
          mnuid: 1,
        },
        applies: ['context', 'object'],
        callback: 'showViewData',
        enable: this.viewMenuEnabled,
        category: 'view_data',
        priority: 102,
        label: gettext('First 100 Rows'),
      }, {
        name: 'view_last_100_rows_context_' + supportedNode,
        node: supportedNode,
        module: this,
        data: {
          mnuid: 2,
        },
        applies: ['context', 'object'],
        callback: 'showViewData',
        enable: this.viewMenuEnabled,
        category: 'view_data',
        priority: 103,
        label: gettext('Last 100 Rows'),
      }, {
        name: 'view_filtered_rows_context_' + supportedNode,
        node: supportedNode,
        module: this,
        data: {
          mnuid: 4,
        },
        applies: ['context', 'object'],
        callback: 'showFilteredRow',
        enable: this.viewMenuEnabled,
        category: 'view_data',
        priority: 104,
        label: gettext('Filtered Rows...'),
      });
    }

    pgBrowser.add_menu_category('view_data', gettext('View/Edit Data'), 100, '');
    pgBrowser.add_menus(menus);
  }

  // This is a callback function to show data when user click on menu item.
  showViewData(data, i) {
    const transId = commonUtils.getRandomInt(1, 9999999);
    showViewData.showViewData(this, pgBrowser, data, i, transId);
  }

  // This is a callback function to show filtered data when user click on menu item.
  showFilteredRow(data, i) {
    const transId = commonUtils.getRandomInt(1, 9999999);
    showViewData.showViewData(this, pgBrowser, data, i, transId, true);
  }

  // This is a callback function to show query tool when user click on menu item.
  showQueryTool(url, treeIdentifier) {
    const transId = commonUtils.getRandomInt(1, 9999999);
    let t = pgBrowser.tree,
      i = treeIdentifier || t.selected(),
      d = i ? t.itemData(i) : undefined;

    if(typeof(url) != 'string') {
      url = '';
    }
    //Open query tool with create script if copy_sql_to_query_tool is true else open blank query tool
    let preference = usePreferences.getState().getPreferences('sqleditor', 'copy_sql_to_query_tool');
    if(preference.value && !d._type.includes('coll-') && (url === '' || url['applies'] === 'tools')){
      let stype = d._type.toLowerCase();
      let data = {
        'script': stype,
        data_disabled: gettext('The selected tree node does not support this option.'),
      };
      pgBrowser.Node.callbacks.show_script(data);
    } else {
      if(d._type.includes('coll-')){
        url = '';
      }
      showQueryTool.showQueryTool(this, pgBrowser, url, treeIdentifier, transId);
    }
  }

  launch(trans_id, panel_url, is_query_tool, panel_title, params={}) {
    let browser_preferences = usePreferences.getState().getPreferencesForModule('browser');
    let open_new_tab = browser_preferences.new_browser_tab_open;
    const [icon, tooltip] = panelTitleFunc.getQueryToolIcon(panel_title, is_query_tool);

    pgAdmin.Browser.Events.trigger(
      'pgadmin:tool:show',
      `${BROWSER_PANELS.QUERY_TOOL}_${trans_id}`,
      panel_url,
      {...params, title: _.escape(panel_title.replace('\\', '\\\\'))},
      {title: panel_title, icon: icon, tooltip: tooltip, renamable: true},
      Boolean(open_new_tab?.includes('qt'))
    );
    return true;
  }

  async loadComponent(container, params) {
    let selectedNodeInfo = pgWindow.pgAdmin.Browser.tree.getTreeNodeHierarchy(
      pgWindow.pgAdmin.Browser.tree.selected()
    );
    await listenPreferenceBroadcast();
    ReactDOM.render(
      <Theme>
        <PgAdminContext.Provider value={pgAdmin}>
          <ModalProvider>
            <NotifierProvider pgAdmin={pgAdmin} pgWindow={pgWindow} />
            <QueryToolComponent params={params} pgWindow={pgWindow} pgAdmin={pgAdmin} qtPanelDocker={pgWindow.pgAdmin.Browser.docker}
              qtPanelId={`${BROWSER_PANELS.QUERY_TOOL}_${params.trans_id}`} selectedNodeInfo={selectedNodeInfo}/>
          </ModalProvider>
        </PgAdminContext.Provider>
      </Theme>,
      container
    );
  }
}
