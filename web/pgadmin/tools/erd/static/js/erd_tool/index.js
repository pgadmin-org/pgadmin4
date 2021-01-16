/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import ReactDOM from 'react-dom';
import BodyWidget from './ui_components/BodyWidget';
import getDialog, {transformToSupported} from './dialogs';
import Alertify from 'pgadmin.alertifyjs';
import pgWindow from 'sources/window';

export default class ERDTool {
  constructor(container, params) {
    this.container = document.querySelector(container);
    this.params = params;
  }

  render() {
    /* Mount the React ERD tool to the container */
    ReactDOM.render(
      <BodyWidget params={this.params} getDialog={getDialog} transformToSupported={transformToSupported} pgAdmin={pgWindow.pgAdmin} alertify={Alertify} />,
      this.container
    );
  }
}
