/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import ReactDOM from 'react-dom';
import _ from 'lodash';

import BodyWidget from './ui_components/BodyWidget';
import getDialog, {transformToSupported} from './dialogs';
import Alertify from 'pgadmin.alertifyjs';
import pgWindow from 'sources/window';
import pgAdmin from 'sources/pgadmin';

export default class ERDTool {
  constructor(container, params) {
    this.container = document.querySelector(container);
    this.params = params;
  }

  getPreferencesForModule() {

  }

  render() {
    /* Mount the React ERD tool to the container */
    let panel = null;
    _.each(pgWindow.pgAdmin.Browser.docker.findPanels('frm_erdtool'), function(p) {
      if (p.isVisible()) {
        panel = p;
      }
    });

    ReactDOM.render(
      <BodyWidget
        params={this.params}
        getDialog={getDialog}
        transformToSupported={transformToSupported}
        pgWindow={pgWindow}
        pgAdmin={pgAdmin}
        panel={panel}
        alertify={Alertify} />,
      this.container
    );
  }
}
