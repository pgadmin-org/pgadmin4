/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import pgAdmin from 'sources/pgadmin';
import pgBrowser from 'top/browser/static/js/browser';
import React from 'react';
import ReactDOM from 'react-dom';
import gettext from 'sources/gettext';
import Theme from 'sources/Theme';
import * as toolBar from 'pgadmin.browser.toolbar';
import SearchObjects from './SearchObjects';
import {getPanelTitle} from '../../../sqleditor/static/js/sqleditor_title';

/* eslint-disable */
/* This is used to change publicPath of webpack at runtime for loading chunks */
/* Do not add let, var, const to this variable */
__webpack_public_path__ = window.resourceBasePath;
/* eslint-enable */

export default class SearchObjectModule {
  static instance;

  static getInstance(...args) {
    if(!SearchObjectModule.instance) {
      SearchObjectModule.instance = new SearchObjectModule(...args);
    }
    return SearchObjectModule.instance;
  }

  init() {
    if(this.initialized)
      return;
    this.initialized = true;

    // Define the nodes on which the menus to be appear
    let menus = [{
      name: 'search_objects',
      module: this,
      applies: ['tools'],
      callback: 'show_search_objects',
      enable: this.search_objects_enabled,
      priority: 3,
      label: gettext('Search Objects...'),
      below: true,
      data: {
        data_disabled: gettext('Please select a database from the object explorer to search the database objects.'),
      },
    }];

    pgBrowser.add_menus(menus);
  }

  search_objects_enabled(obj) {
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

    toolBar.enable(gettext('Search objects'), isEnabled);
    return isEnabled;
  }

  show_search_objects(action, treeItem) {
    let dialogTitle = getPanelTitle(pgBrowser, treeItem);
    dialogTitle = gettext('Search Objects - ')  + dialogTitle;

    let nodeData = pgBrowser.tree.getTreeNodeHierarchy(treeItem);

    pgBrowser.Node.registerUtilityPanel();
    let panel = pgBrowser.Node.addUtilityPanel(pgBrowser.stdW.md, pgBrowser.stdH.lg),
      j = panel.$container.find('.obj_properties').first();

    panel.title(dialogTitle);
    panel.focus();

    ReactDOM.render(
      <Theme>
        <SearchObjects nodeData={nodeData}/>
      </Theme>, j[0]);
  }
}

if(!pgAdmin.Tools) {
  pgAdmin.Tools = {};
}

pgAdmin.Tools.SearchObjects = SearchObjectModule.getInstance();

module.exports = {
  SearchObjects: pgAdmin.Tools.SearchObjects,
};
