/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import pgAdmin from 'sources/pgadmin';
import pgBrowser from 'top/browser/static/js/browser';
import React from 'react';
import gettext from 'sources/gettext';
import SearchObjects from './SearchObjects';
import {getPanelTitle} from '../../../sqleditor/static/js/sqleditor_title';
import { BROWSER_PANELS } from '../../../../browser/static/js/constants';

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

    return isEnabled;
  }

  show_search_objects(action, treeItem) {
    const nodeData = pgBrowser.tree.getTreeNodeHierarchy(treeItem);
    const panelTitle = gettext('Search Objects - ') + getPanelTitle(pgBrowser, treeItem);
    const panelId = BROWSER_PANELS.SEARCH_OBJECTS;
    pgAdmin.Browser.docker.openDialog({
      id: panelId,
      title: panelTitle,
      manualClose: false,
      content: (
        <SearchObjects nodeData={nodeData}/>
      )
    }, pgAdmin.Browser.stdW.md, pgAdmin.Browser.stdH.lg);
  }
}

if(!pgAdmin.Tools) {
  pgAdmin.Tools = {};
}

pgAdmin.Tools.SearchObjects = SearchObjectModule.getInstance();

module.exports = {
  SearchObjects: pgAdmin.Tools.SearchObjects,
};
