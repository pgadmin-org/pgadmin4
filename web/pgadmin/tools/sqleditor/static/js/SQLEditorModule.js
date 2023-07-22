
/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import * as showViewData from './show_view_data';
import * as showQueryTool from './show_query_tool';
import * as toolBar from 'pgadmin.browser.toolbar';
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
import { showRenamePanel } from '../../../../static/js/Dialogs';
import { openNewWindow } from '../../../../static/js/utils';

const wcDocker = window.wcDocker;

export function setPanelTitle(queryToolPanel, panelTitle) {
  queryToolPanel.title('<span title="'+panelTitle+'">'+panelTitle+'</span>');
}

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

    toolBar.enable(gettext('View Data'), isEnabled);
    toolBar.enable(gettext('Filtered Rows'), isEnabled);
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

    toolBar.enable(gettext('Query Tool'), isEnabled);
    return isEnabled;
  }

  init() {
    if(this.initialized)
      return;
    this.initialized = true;

    let self = this;
    /* Cache may take time to load for the first time
     * Keep trying till available
     */
    let cacheIntervalId = setInterval(function() {
      if(pgBrowser.preference_version() > 0) {
        self.preferences = pgBrowser.get_preferences_for_module('sqleditor');
        clearInterval(cacheIntervalId);
      }
    },0);

    pgBrowser.onPreferencesChange('sqleditor', function() {
      self.preferences = pgBrowser.get_preferences_for_module('sqleditor');
    });

    // Define the nodes on which the menus to be appear
    let menus = [{
      name: 'query_tool',
      module: this,
      applies: ['tools'],
      callback: 'showQueryTool',
      enable: self.queryToolMenuEnabled,
      priority: 1,
      label: gettext('Query Tool'),
      data:{
        applies: 'tools',
        data_disabled: gettext('Please select a database from the object explorer to access Query Tool.'),
      },
    }];

    // Create context menu
    for (const supportedNode of self.SUPPORTED_NODES) {
      menus.push({
        name: 'view_all_rows_context_' + supportedNode,
        node: supportedNode,
        module: this,
        data: {
          mnuid: 3,
        },
        applies: ['context', 'object'],
        callback: 'showViewData',
        enable: self.viewMenuEnabled,
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
        enable: self.viewMenuEnabled,
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
        enable: self.viewMenuEnabled,
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
        enable: self.viewMenuEnabled,
        category: 'view_data',
        priority: 104,
        label: gettext('Filtered Rows...'),
      });
    }

    pgBrowser.add_menu_category('view_data', gettext('View/Edit Data'), 100, '');
    pgBrowser.add_menus(menus);

    // Creating a new pgAdmin.Browser frame to show the data.
    let frame = new pgAdmin.Browser.Frame({
      name: 'frm_sqleditor',
      showTitle: true,
      isCloseable: true,
      isRenamable: true,
      isPrivate: true,
      url: 'about:blank',
    });

    // Load the newly created frame
    frame.load(pgBrowser.docker);
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

    //Open query tool with create script if copy_sql_to_query_tool is true else open blank query tool
    let preference = pgBrowser.get_preference('sqleditor', 'copy_sql_to_query_tool');
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

  onPanelRename(queryToolPanel, panelData, is_query_tool) {

    let preferences = pgBrowser.get_preferences_for_module('browser');
    let temp_title = panelData.$titleText[0].textContent;
    let is_dirty_editor = queryToolPanel.is_dirty_editor ? queryToolPanel.is_dirty_editor : false;
    let title = queryToolPanel.is_dirty_editor ? panelData.$titleText[0].textContent.replace(/.$/, '') : temp_title;

    let qtdata = {
      is_query_tool: is_query_tool,
      is_file: panelData.$titleText[0].innerHTML.includes('File - '),
      is_dirty_editor: is_dirty_editor
    };

    showRenamePanel(title, preferences, queryToolPanel, 'querytool', qtdata);
  }


  openQueryToolPanel(trans_id, is_query_tool, panel_title, queryToolForm) {
    let self = this;
    let browser_preferences = pgBrowser.get_preferences_for_module('browser');
    let propertiesPanel = pgBrowser.docker.findPanels('properties');
    let queryToolPanel = pgBrowser.docker.addPanel('frm_sqleditor', wcDocker.DOCK.STACKED, propertiesPanel[0]);
    queryToolPanel.trans_id = trans_id;
    showQueryTool._set_dynamic_tab(pgBrowser, browser_preferences['dynamic_tabs']);

    // Set panel title and icon
    panelTitleFunc.setQueryToolDockerTitle(queryToolPanel, is_query_tool, _.unescape(panel_title));
    queryToolPanel.focus();

    queryToolPanel.on(wcDocker.EVENT.VISIBILITY_CHANGED, function() {
      queryToolPanel.trigger(wcDocker.EVENT.RESIZED);
    });

    commonUtils.registerDetachEvent(queryToolPanel);

    // Listen on the panelRename event.
    queryToolPanel.on(wcDocker.EVENT.RENAME, function(panelData) {
      self.onPanelRename(queryToolPanel, panelData, is_query_tool);
    });

    let openQueryToolURL = function(j) {
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
            frame.openHTML(queryToolForm);
          }
        }
      }, 100);
    };

    openQueryToolURL(queryToolPanel);
  }

  launch(trans_id, panel_url, is_query_tool, panel_title, params={}) {
    const self = this;
    let queryToolForm = `
      <form id="queryToolForm" action="${panel_url}" method="post">
        <input id="title" name="title" hidden />`;


    if(params.query_url && typeof(params.query_url) === 'string'){
      queryToolForm +=`<input name="query_url" value="${params.query_url}" hidden />`;
    }
    if(params.sql_filter) {
      queryToolForm +=`<textarea name="sql_filter" hidden>${params.sql_filter}</textarea>`;
    }
    if(params.user) {
      queryToolForm +=`<input name="user" value="${_.escape(params.user)}" hidden />`;
    }
    if(params.role) {
      queryToolForm +=`<input name="role" value="${_.escape(params.role)}" hidden />`;
    }

    /* Escape backslashes as it is stripped by back end */
    queryToolForm +=`
      </form>
        <script>
          document.getElementById("title").value = "${_.escape(panel_title)}";
          document.getElementById("queryToolForm").submit();
        </script>
      `;

    let browser_preferences = pgBrowser.get_preferences_for_module('browser');
    let open_new_tab = browser_preferences.new_browser_tab_open;
    if (open_new_tab && open_new_tab.includes('qt')) {
      openNewWindow(queryToolForm, panel_title);
    } else {
      /* On successfully initialization find the dashboard panel,
       * create new panel and add it to the dashboard panel.
       */
      self.openQueryToolPanel(trans_id, is_query_tool, panel_title, queryToolForm);
    }
    return true;
  }
  setupPreferencesWorker() {
    if (window.location == window.parent?.location) {
      /* Sync the local preferences with the main window if in new tab */
      setInterval(()=>{
        if(pgWindow?.pgAdmin) {
          if(pgAdmin.Browser.preference_version() < pgWindow.pgAdmin.Browser.preference_version()){
            pgAdmin.Browser.preferences_cache = pgWindow.pgAdmin.Browser.preferences_cache;
            pgAdmin.Browser.preference_version(pgWindow.pgAdmin.Browser.preference_version());
            pgAdmin.Browser.triggerPreferencesChange('browser');
            pgAdmin.Browser.triggerPreferencesChange('sqleditor');
            pgAdmin.Browser.triggerPreferencesChange('graphs');
          }
        }
      }, 1000);
    }
  }

  loadComponent(container, params) {
    let panel = null;
    let selectedNodeInfo = pgWindow.pgAdmin.Browser.tree.getTreeNodeHierarchy(
      pgWindow.pgAdmin.Browser.tree.selected()
    );
    _.each(pgWindow.pgAdmin.Browser.docker.findPanels('frm_sqleditor'), function(p) {
      if (p.trans_id == params.trans_id) {
        panel = p;
      }
    });
    this.setupPreferencesWorker();
    ReactDOM.render(
      <Theme>
        <ModalProvider>
          <QueryToolComponent params={params} pgWindow={pgWindow} pgAdmin={pgAdmin} panel={panel} selectedNodeInfo={selectedNodeInfo}/>
        </ModalProvider>
      </Theme>,
      container
    );
  }
}
