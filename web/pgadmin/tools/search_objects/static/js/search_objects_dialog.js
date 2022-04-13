/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2022, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import {Dialog} from 'sources/alertify/dialog';
import {getPanelTitle} from 'tools/sqleditor/static/js/sqleditor_title';
import {retrieveAncestorOfTypeDatabase} from 'sources/tree/tree_utils';

export default class SearchObjectsDialog extends Dialog {
  constructor(pgBrowser, $, alertify, BackupModel, backform = null) {
    super(gettext('Search Objects Error'),
      '<div class=\'search_objects_dialog\'></div>',
      pgBrowser, $, alertify, BackupModel, backform
    );
  }

  dialogName() {
    return 'search_objects';
  }

  draw(action, treeItem, params, width=0, height=0) {
    let dbInfo = retrieveAncestorOfTypeDatabase(this.pgBrowser, treeItem, gettext('Search Objects Error'), this.alertify);
    if (!dbInfo) {
      return;
    }

    let dialogTitle = getPanelTitle(this.pgBrowser, treeItem);
    dialogTitle = gettext('Search Objects - ')  + dialogTitle;
    const dialog = this.createOrGetDialog(
      gettext('Search Objects...'),
      'search_objects'
    );
    dialog(dialogTitle).resizeTo(width, height);
  }
}
