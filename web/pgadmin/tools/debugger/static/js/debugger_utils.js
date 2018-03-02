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

module.exports = {
  setFocusToDebuggerEditor: setFocusToDebuggerEditor,
};
