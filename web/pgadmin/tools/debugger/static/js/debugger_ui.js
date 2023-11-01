///////////////////////////////////////////////////////////////
////
//// pgAdmin 4 - PostgreSQL Tools
////
//// Copyright (C) 2013 - 2023, The pgAdmin Development Team
//// This software is released under the PostgreSQL Licence
////
////////////////////////////////////////////////////////////////

import React from 'react';

import gettext from 'sources/gettext';
import pgAdmin from 'sources/pgadmin';

import DebuggerArgumentComponent from './components/DebuggerArgumentComponent';

export default class FunctionArguments {

  show(debugInfo, restartDebug, isEdbProc, transId) {
    let t = pgAdmin.Browser.tree,
      i = t.selected(),
      d = i ? t.itemData(i) : undefined;

    if (!d)
      return;

    let treeInfo = t.getTreeNodeHierarchy(i);
    // Render Debugger argument component
    pgAdmin.Browser.notifier.showModal(gettext('Debugger'), (closeModal) => {
      return <DebuggerArgumentComponent closeModal={closeModal} debuggerInfo={debugInfo} restartDebug={restartDebug} isEdbProc={isEdbProc} transId={transId} pgTreeInfo={treeInfo} pgData={d}></DebuggerArgumentComponent>;
    }, { isFullScreen: false, isResizeable: true, showFullScreen: true, isFullWidth: true, dialogWidth: pgAdmin.Browser.stdW.md, dialogHeight: pgAdmin.Browser.stdH.md });
  }
}
