//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2018, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

function setFocusToDebuggerEditor(editor, command) {
  const TAB = 9;
  if (!command)
    return;
  let key = command.which || command.keyCode;
  // Keys other than Tab key
  if (key !== TAB) {
    editor.focus();
  }
}

function getProcedureId(treeInfoObject) {
  let objectId;
  if(treeInfoObject) {
    if (treeInfoObject.procedure && treeInfoObject.procedure._id) {
      objectId = treeInfoObject.procedure._id;
    } else if (treeInfoObject.edbproc && treeInfoObject.edbproc._id) {
      objectId = treeInfoObject.edbproc._id;
    }
  }
  return objectId;
}

module.exports = {
  setFocusToDebuggerEditor: setFocusToDebuggerEditor,
  getProcedureId: getProcedureId,
};
