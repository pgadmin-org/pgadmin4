//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

import {generateTitle} from '../../../sqleditor/static/js/sqleditor_title';

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

function getDebuggerTitle(preferences, function_name, schema_name, database_name, custom_title=null) {
  let debugger_title_placeholder = '';
  if(custom_title) {
    debugger_title_placeholder = custom_title;
  } else {
    debugger_title_placeholder = preferences['debugger_tab_title_placeholder'];
  }

  let function_data = function_name.split('(');
  function_name = get_function_name(function_name);

  let args_list = function_data[function_data.length - 1].split(')');
  let args = '';
  if(args_list.length > 0) {
    args = args.concat(args_list[0]);
  }

  let title_data = {
    'function_name': function_name,
    'args': args,
    'schema': schema_name,
    'database': database_name,
    'type': 'debugger',
  };
  let title = generateTitle(debugger_title_placeholder, title_data);
  return title;
}

function get_function_name(function_name) {
  let function_data = function_name.split('(');
  function_data.splice(-1, 1);
  let index = null;
  let func_name = '';
  for(index=0; index < function_data.length; index++) {
    func_name = func_name.concat(function_data[index]);
    if (index != function_data.length -1) {
      func_name = func_name.concat('(');
    }
  }
  return func_name;
}
function getAppropriateLabel(treeInfo) {
  if (treeInfo.function) {
    return treeInfo.function.label;
  } else if (treeInfo.trigger_function) {
    return treeInfo.trigger_function.label;
  } else if (treeInfo.trigger) {
    return treeInfo.trigger.label;
  } else if(treeInfo.edbfunc) {
    return treeInfo.edbfunc.label;
  } else if(treeInfo.edbproc) {
    return treeInfo.edbproc.label;
  }
  else {
    return treeInfo.procedure.label;
  }
}

module.exports = {
  getFunctionId: getFunctionId,
  getProcedureId: getProcedureId,
  setDebuggerTitle: getDebuggerTitle,
  getDebuggerTitle: getDebuggerTitle,
  getAppropriateLabel: getAppropriateLabel,
};
