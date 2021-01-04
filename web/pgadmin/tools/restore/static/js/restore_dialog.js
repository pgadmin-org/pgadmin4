/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from '../../../../static/js/gettext';
import Backform from '../../../../static/js/backform.pgadmin';
import {Dialog} from '../../../../static/js/alertify/dialog';
import url_for from 'sources/url_for';
import axios from 'axios/index';

export class RestoreDialog extends Dialog {
  constructor(pgBrowser, $, alertify, RestoreModel, backform = Backform) {
    super(gettext('Restore Error'),
      '<div class=\'restore_dialog\'></div>',
      pgBrowser, $, alertify, RestoreModel, backform);
  }

  url_for_utility_exists(id){
    return url_for('restore.utility_exists', {
      'sid': id,
    });
  }

  draw(action, aciTreeItem, width, height) {

    const serverInformation = this.retrieveAncestorOfTypeServer(aciTreeItem);

    if (!serverInformation) {
      return;
    }

    if (!this.hasBinariesConfiguration(serverInformation)) {
      return;
    }

    var sid = serverInformation._type == 'database' ? serverInformation._pid : serverInformation._id;
    const baseUrl = this.url_for_utility_exists(sid);
    // Check pg_restore utility exists or not.
    let that = this;
    axios.get(
      baseUrl
    ).then(function(res) {
      if (!res.data.success) {
        that.alertify.alert(
          gettext('Utility not found'),
          res.data.errormsg
        );
        return;
      }

      if (!that.canExecuteOnCurrentDatabase(aciTreeItem)) {
        return;
      }

      let aciTreeItem1 = aciTreeItem || that.pgBrowser.treeMenu.selected();
      let item = that.pgBrowser.treeMenu.findNodeByDomElement(aciTreeItem1);
      const data = item.getData();
      const node = that.pgBrowser.Nodes[data._type];

      if (!node)
        return;

      let title = gettext('Restore (%s: %s)', node.label, data.label);
      that.createOrGetDialog(title, 'restore');
      that.alertify.pg_restore(title, aciTreeItem1, data, node)
        .resizeTo(width, height);
    }).catch(function() {
      that.alertify.alert(
        gettext('Utility not found'),
        gettext('Failed to fetch Utility information')
      );
      return;
    });
  }

  dialogName() {
    return 'pg_restore';
  }
}

