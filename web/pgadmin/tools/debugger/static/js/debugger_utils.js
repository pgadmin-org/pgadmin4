//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
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

function getFunctionId(treeInfoObject) {
  let objectId;
  if(treeInfoObject) {
    if (treeInfoObject.function && treeInfoObject.function._id) {
      objectId = treeInfoObject.function._id;
    } else if (treeInfoObject.edbfunc && treeInfoObject.edbfunc._id) {
      objectId = treeInfoObject.edbfunc._id;
    }
  }
  return objectId;
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

function setDebuggerTitle(panel, preferences, function_name, schema_name, database_name, custom_title) {
  var debugger_title_placeholder = '';
  if(custom_title) {
    debugger_title_placeholder = custom_title;
  } else {
    debugger_title_placeholder = preferences['debugger_tab_title_placeholder'];
  }

  var function_data = function_name.split('(');
  function_name = get_function_name(function_name);

  var args_list = function_data[function_data.length - 1].split(')');
  var args = '';
  if(args_list.length > 0) {
    args = args.concat(args_list[0]);
  }

  debugger_title_placeholder = debugger_title_placeholder.replace(new RegExp('%FUNCTION%'), function_name);
  debugger_title_placeholder = debugger_title_placeholder.replace(new RegExp('%ARGS%'), args);
  debugger_title_placeholder = debugger_title_placeholder.replace(new RegExp('%SCHEMA%'), schema_name);
  debugger_title_placeholder = debugger_title_placeholder.replace(new RegExp('%DATABASE%'), database_name);

  panel.title('<span>'+ _.escape(debugger_title_placeholder) +'</span>');
}

function get_function_name(function_name) {
  var function_data = function_name.split('(');
  function_data.splice(-1, 1);
  var index = 0;
  var func_name = '';
  for(index=0; index < function_data.length; index++) {
    func_name = func_name.concat(function_data[index]);
    if (index != function_data.length -1) {
      func_name = func_name.concat('(');
    }
  }
  return func_name;
}

module.exports = {
  setFocusToDebuggerEditor: setFocusToDebuggerEditor,
  getFunctionId: getFunctionId,
  getProcedureId: getProcedureId,
  setDebuggerTitle: setDebuggerTitle,
};
