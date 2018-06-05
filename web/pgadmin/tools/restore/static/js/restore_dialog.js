/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2018, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from '../../../../static/js/gettext';
import {sprintf} from 'sprintf-js';
import Backform from '../../../../static/js/backform.pgadmin';
import {Dialog} from '../../../../static/js/alertify/dialog';

export class RestoreDialog extends Dialog {
  constructor(pgBrowser, $, alertify, RestoreModel, backform = Backform) {
    super('Restore Error',
      '<div class=\'restore_dialog\'></div>',
      pgBrowser, $, alertify, RestoreModel, backform);
  }

  draw(action, aciTreeItem) {

    const serverInformation = this.retrieveAncestorOfTypeServer(aciTreeItem);

    if (!serverInformation) {
      return;
    }

    if (!this.hasBinariesConfiguration(serverInformation)) {
      return;
    }

    if (!this.canExecuteOnCurrentDatabase(aciTreeItem)) {
      return;
    }

    let aciTreeItem1 = aciTreeItem || this.pgBrowser.treeMenu.selected();
    let item = this.pgBrowser.treeMenu.findNodeByDomElement(aciTreeItem1);
    const data = item.getData();
    const node = this.pgBrowser.Nodes[data._type];

    if (!node)
      return;

    let title = sprintf(gettext('Restore (%s: %s)'), node.label, data.label);

    this.createOrGetDialog(title, 'restore');

    this.alertify.pg_restore(title, aciTreeItem1, data, node).resizeTo('65%', '60%');
  }

  dialogName() {
    return 'pg_restore';
  }
}

