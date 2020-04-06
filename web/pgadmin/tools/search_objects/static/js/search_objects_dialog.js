/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import {Dialog} from 'sources/alertify/dialog';
import {getPanelTitle} from 'tools/datagrid/static/js/datagrid_panel_title';

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

  draw(action, aciTreeItem, params, width=0, height=0) {
    let dbInfo = this.retrieveAncestorOfTypeDatabase(aciTreeItem);
    if (!dbInfo) {
      return;
    }

    let dialogTitle = getPanelTitle(this.pgBrowser, aciTreeItem);
    dialogTitle = gettext('Search Objects - ')  + dialogTitle;
    const dialog = this.createOrGetDialog(
      gettext('Search Objects...'),
      'search_objects'
    );
    dialog(dialogTitle).resizeTo(width, height);
  }
}
