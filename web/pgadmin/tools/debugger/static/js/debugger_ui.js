///////////////////////////////////////////////////////////////
////
//// pgAdmin 4 - PostgreSQL Tools
////
//// Copyright (C) 2013 - 2022, The pgAdmin Development Team
//// This software is released under the PostgreSQL Licence
////
////////////////////////////////////////////////////////////////

import React from 'react';

import gettext from 'sources/gettext';
import pgAdmin from 'sources/pgadmin';

import Notify from '../../../../static/js/helpers/Notifier';
import DebuggerArgumentComponent from './components/DebuggerArgumentComponent';

export default class FunctionArguments {

  show(debugInfo, restartDebug, isEdbProc, transId) {
    // Render Debugger argument component
    Notify.showModal(gettext('Debugger'), (closeModal) => {
      return <DebuggerArgumentComponent closeModal={closeModal} debuggerInfo={debugInfo} restartDebug={restartDebug} isEdbProc={isEdbProc} transId={transId}></DebuggerArgumentComponent>;
    }, { isFullScreen: false, isResizeable: true, showFullScreen: true, isFullWidth: true, dialogWidth: pgAdmin.Browser.stdW.md, dialogHeight: pgAdmin.Browser.stdH.md });
  }
}
