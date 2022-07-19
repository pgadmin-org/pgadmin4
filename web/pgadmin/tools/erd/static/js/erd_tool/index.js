/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2022, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import ReactDOM from 'react-dom';
import _ from 'lodash';

import BodyWidget from './ui_components/BodyWidget';
import getDialog from './dialogs';
import Alertify from 'pgadmin.alertifyjs';
import pgWindow from 'sources/window';
import pgAdmin from 'sources/pgadmin';

import ModalProvider from '../../../../../static/js/helpers/ModalProvider';
import Theme from '../../../../../static/js/Theme';

export default class ERDTool {
  constructor(container, params) {
    this.container = document.querySelector(container);
    this.params = params;
  }

  getPreferencesForModule() {
    /*This is intentional (SonarQube)*/
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
      <Theme>
        <ModalProvider>
          <BodyWidget
            params={this.params}
            getDialog={getDialog}
            pgWindow={pgWindow}
            pgAdmin={pgAdmin}
            panel={panel}
            alertify={Alertify} />
        </ModalProvider>
      </Theme>,
      this.container
    );
  }
}
