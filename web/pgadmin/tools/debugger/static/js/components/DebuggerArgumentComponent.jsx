/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import PropTypes from 'prop-types';

import React, { useEffect, useRef } from 'react';

import DeleteSweepIcon from '@material-ui/icons/DeleteSweep';
import { Box } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import BugReportRoundedIcon from '@material-ui/icons/BugReportRounded';
import CloseSharpIcon from '@material-ui/icons/CloseSharp';

import url_for from 'sources/url_for';
import gettext from 'sources/gettext';
import pgAdmin from 'sources/pgadmin';
import Loader from 'sources/components/Loader';

import SchemaView from '../../../../../static/js/SchemaView';
import getApiInstance from '../../../../../static/js/api_instance';
import { DefaultButton, PrimaryButton } from '../../../../../static/js/components/Buttons';
import { getAppropriateLabel, getDebuggerTitle } from '../debugger_utils';
import { DebuggerArgumentSchema } from './DebuggerArgs.ui';
import { DEBUGGER_ARGS } from '../DebuggerConstants';
import { BROWSER_PANELS } from '../../../../../browser/static/js/constants';
import usePreferences from '../../../../../preferences/static/js/store';


const useStyles = makeStyles((theme) =>
  ({
    root: {
      display: 'flex',
      flexDirection: 'column',
      flexGrow: 1,
      height: '100%',
      backgroundColor: theme.palette.background.default,
      overflow: 'hidden',
    },
    body: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: 0,
    },
    actionBtn: {
      alignItems: 'flex-start',
    },
    buttonMargin: {
      marginLeft: '0.5em'
    },
    debugBtn: {
      fontSize: '1.12rem !important',
    },
    footer: {
      borderTop: `1px solid ${theme.otherVars.inputBorderColor} !important`,
      padding: '0.5rem',
      display: 'flex',
      width: '100%',
      background: theme.otherVars.headerBg,
    }
  }),
);


export default function DebuggerArgumentComponent({ debuggerInfo, restartDebug, isEdbProc, transId, pgTreeInfo, pgData, ...props }) {
  const classes = useStyles();
  const debuggerArgsSchema = useRef(new DebuggerArgumentSchema());
  const api = getApiInstance();
  const debuggerArgsData = useRef([]);
  const [loadArgs, setLoadArgs] = React.useState(0);
  const [isDisableDebug, setIsDisableDebug] = React.useState(true);
  const [loaderText, setLoaderText] = React.useState('');
  const debuggerFinalArgs = useRef([]);
  const InputArgIds = useRef([]);
  const browserPreferences = usePreferences().getPreferencesForModule('browser');

  function getURL() {
    let _Url = null;

    if (restartDebug == 0) {

      if (!pgData)
        return;

      let treeInfo = pgTreeInfo;

      if (pgData._type == 'function') {
        // Get the existing function parameters available from sqlite database
        _Url = url_for('debugger.get_arguments', {
          'sid': treeInfo.server._id,
          'did': treeInfo.database._id,
          'scid': treeInfo.schema._id,
          'func_id': treeInfo.function._id,
        });
      } else if (pgData._type == 'procedure') {
        // Get the existing function parameters available from sqlite database
        _Url = url_for('debugger.get_arguments', {
          'sid': treeInfo.server._id,
          'did': treeInfo.database._id,
          'scid': treeInfo.schema._id,
          'func_id': treeInfo.procedure._id,
        });
      } else if (pgData._type == 'edbfunc') {
        // Get the existing function parameters available from sqlite database
        _Url = url_for('debugger.get_arguments', {
          'sid': treeInfo.server._id,
          'did': treeInfo.database._id,
          'scid': treeInfo.schema._id,
          'func_id': treeInfo.edbfunc._id,
        });
      } else if (pgData._type == 'edbproc') {
        // Get the existing function parameters available from sqlite database
        _Url = url_for('debugger.get_arguments', {
          'sid': treeInfo.server._id,
          'did': treeInfo.database._id,
          'scid': treeInfo.schema._id,
          'func_id': treeInfo.edbproc._id,
        });
      }
    } else {
      // Get the existing function parameters available from sqlite database
      _Url = url_for('debugger.get_arguments', {
        'sid': debuggerInfo.server_id,
        'did': debuggerInfo.database_id,
        'scid': debuggerInfo.schema_id,
        'func_id': debuggerInfo.function_id,
      });
    }
    return _Url;
  }

  function setArgs(res) {
    let funcArgsData = [];
    if (res.data.data.args_count != 0) {
      setIsDisableDebug(false);
      for (const i of res.data.data.result) {
        // Below will format the data to be stored in sqlite database
        funcArgsData.push({
          'arg_id': i['arg_id'],
          'is_null': i['is_null'],
          'is_expression': i['is_expression'],
          'use_default': i['use_default'],
          'value': i['value'],
        });
      }
    }
    return funcArgsData;
  }

  function checkModesAndTypes() {
    // Check modes and type in the arguments.
    if (debuggerInfo['proargmodes'] != null) {
      let argmodes = debuggerInfo['proargmodes'].split(',');
      argmodes.forEach((NULL, indx) => {
        if (argmodes[indx] == 'i' || argmodes[indx] == 'b' ||
          (isEdbProc && argmodes[indx] == 'o')) {
          InputArgIds.current.push(indx);
        }
      });
    } else {
      let argtypes = debuggerInfo['proargtypenames'].split(',');
      argtypes.forEach((NULL, indx) => {
        InputArgIds.current.push(indx);
      });
    }

    // Get argument types
    let argType = debuggerInfo['proargtypenames'].split(',');
    let argMode, defaultArgs, argCnt;

    if (debuggerInfo['proargmodes'] != null) {
      argMode = debuggerInfo['proargmodes'].split(',');
    }

    if (debuggerInfo['pronargdefaults']) {
      let defaultArgsCount = debuggerInfo['pronargdefaults'];
      defaultArgs = debuggerInfo['proargdefaults'].split(',');
      argCnt = defaultArgsCount;
    }

    return [argType, argMode, argCnt, defaultArgs];
  }

  function setDefaultValues(defValList, argCnt, argName, argMode, defaultArgs) {
    for (let j = (argName.length - 1); j >= 0; j--) {
      if (debuggerInfo['proargmodes'] != null) {
        if (argMode && (argMode[j] == 'i' || argMode[j] == 'b' ||
          (isEdbProc && argMode[j] == 'o'))) {
          defValList[j] = DEBUGGER_ARGS.NO_DEFAULT;
          if (argCnt) {
            argCnt = argCnt - 1;
            defValList[j] = defaultArgs[argCnt];
          }
        }
      } else if (argCnt) {
        argCnt = argCnt - 1;
        defValList[j] = defaultArgs[argCnt];
      } else {
        defValList[j] = DEBUGGER_ARGS.NO_DEFAULT;
      }
    }
  }

  function addArg(argtype, defvalList, argname, useDefValue) {
    let myObj = {};
    if (defvalList != DEBUGGER_ARGS.NO_DEFAULT) {
      useDefValue = true;
    }
    myObj = {
      'name': argname,
      'type': argtype,
      'use_default': useDefValue,
      'default_value': defvalList,
      'disable_use_default': defvalList == DEBUGGER_ARGS.NO_DEFAULT
    };

    return myObj;
  }

  function getArgsList(argType, argMode, defValList, argName, useDefValue) {
    let myObj = [];
    if (argType.length != 0) {
      for (let i = 0; i < argType.length; i++) {
        if (debuggerInfo['proargmodes'] != null) {
          if (argMode && (argMode[i] == 'i' || argMode[i] == 'b' ||
            (isEdbProc && argMode[i] == 'o'))) {
            useDefValue = false;
            myObj.push(addArg(argType[i], defValList[i], argName[i], useDefValue));
          }
        } else {
          useDefValue = false;
          myObj.push(addArg(argType[i], defValList[i], argName[i], useDefValue));
        }
      }
    }
    return myObj;
  }

  function getFormattedArgsValues(argType, index, argData) {
    let values = [];
    if (argType[index].indexOf('[]') != -1 && argData['value'].length > 0) {
      values = `{${argData['value']}}`;
    } else {
      values = argData['value'];
    }

    return values;
  }

  function setFuncObj(funcArgsData, argMode, argType, argName, defValList, isUnnamedParam = false) {
    let index, values, funcObj = [];
    for (const argData of funcArgsData) {
      index = argData['arg_id'];
      if (debuggerInfo['proargmodes'] != null &&
        (argMode && argMode[index] == 'o' && !isEdbProc) && !isUnnamedParam) {
        continue;
      }
      // Get formated values for argument.
      values = getFormattedArgsValues(argType, index, argData);

      funcObj.push({
        'name': argName[index],
        'type': argType[index],
        'is_null': argData['is_null'] ? true : false,
        'expr': argData['is_expression'] ? true : false,
        'value': values,
        'use_default': argData['use_default'] ? true : false,
        'default_value': defValList[index],
        'disable_use_default': isUnnamedParam ? defValList[index] == DEBUGGER_ARGS.NO_DEFAULT_VALUE : defValList[index] == DEBUGGER_ARGS.NO_DEFAULT,
      });
    }

    return funcObj;
  }

  function setUnnamedParamNonDefVal(argType, defValList, myargname) {
    let myObj = [];
    for (let i = 0; i < argType.length; i++) {
      myObj.push({
        'name': myargname[i],
        'type': argType[i],
        'use_default': false,
        'default_value': DEBUGGER_ARGS.NO_DEFAULT_VALUE,
        'disable_use_default': true
      });
      defValList[i] = DEBUGGER_ARGS.NO_DEFAULT_VALUE;
    }
    return myObj;
  }

  function setUnnamedParamDefVal(myargname, argCnt, defValList, defaultArgs) {
    for (let j = (myargname.length - 1); j >= 0; j--) {
      if (argCnt) {
        argCnt = argCnt - 1;
        defValList[j] = defaultArgs[argCnt];
      } else {
        defValList[j] = DEBUGGER_ARGS.NO_DEFAULT_VALUE;
      }
    }

  }

  function checkIsDefault(defValList) {
    let useDefValue = false;
    if (defValList != DEBUGGER_ARGS.NO_DEFAULT_VALUE) {
      useDefValue = true;
    }

    return useDefValue;
  }
  function setUnnamedArgs(argType, argMode, useDefValue, defValList, myargname) {
    let myObj = [];
    for (let i = 0; i < argType.length; i++) {
      let useDefValue = checkIsDefault(defValList[i]);
      if (debuggerInfo['proargmodes'] == null) {
        myObj.push({
          'name': myargname[i],
          'type': argType[i],
          'use_default': useDefValue,
          'default_value': defValList[i],
          'disable_use_default': defValList[i] == DEBUGGER_ARGS.NO_DEFAULT_VALUE,
        });
      } else {
        if (argMode && (argMode[i] == 'i' || argMode[i] == 'b' ||
          (isEdbProc && argMode[i] == 'o'))) {
          myObj.push({
            'name': myargname[i],
            'type': argType[i],
            'use_default': useDefValue,
            'default_value': defValList[i],
            'disable_use_default': defValList[i] == DEBUGGER_ARGS.NO_DEFAULT_VALUE,
          });
        }
      }
    }
    return myObj;
  }

  function generateArgsNames(argType) {
    let myargname = [];
    for (let i = 0; i < argType.length; i++) {
      myargname[i] = 'dbgparam' + (i + 1);
    }

    return myargname;
  }

  function setDebuggerArgs(funcArgsData, funcObj, myObj) {
    // Check if the arguments already available in the sqlite database
    // then we should use the existing arguments
    let initVal = { 'aregsCollection': [] };
    if (funcArgsData.length == 0) {
      initVal = { 'aregsCollection': myObj };
      debuggerArgsData.current = initVal;
    } else {
      initVal = { 'aregsCollection': funcObj };
      debuggerArgsData.current = initVal;
    }
  }

  function getDebuggerArgsSchema() {
    // Variables to store the data sent from sqlite database
    let funcArgsData = [];

    // As we are not getting Browser.tree when we debug again
    // so tree info will be updated from the server data
    let baseURL = getURL();

    api({
      url: baseURL,
      method: 'GET',
    })
      .then(function (res) {
        funcArgsData = setArgs(res);
        let argName;

        let defValList = [];
        let myObj = [];
        let funcObj = [];

        let [argType, argMode, argCnt, defaultArgs] = checkModesAndTypes();

        let useDefValue;

        if (debuggerInfo['proargnames'] != null) {
          argName = debuggerInfo['proargnames'].split(',');

          // It will assign default values to "Default value" column
          setDefaultValues(defValList, argCnt, argName, argMode, defaultArgs);
          // It wil check and add args in myObj list.
          myObj = getArgsList(argType, argMode, defValList, argName, useDefValue);

          // Need to update the funcObj variable from sqlite database if available
          if (funcArgsData.length != 0) {
            funcObj = setFuncObj(funcArgsData, argMode, argType, argName, defValList);
          }
        }
        else {
          /* Generate the name parameter if function do not have arguments name
          like dbgparam1, dbgparam2 etc. */
          let myargname = generateArgsNames(argType);

          // If there is no default arguments
          if (!debuggerInfo['pronargdefaults']) {
            myObj = setUnnamedParamNonDefVal(argType, defValList, myargname);
          } else {
            // If there is default arguments
            //Below logic will assign default values to "Default value" column
            setUnnamedParamDefVal(myargname, argCnt, defValList, defaultArgs);

            myObj = setUnnamedArgs(argType, argMode, useDefValue, defValList, myargname);
          }

          // Need to update the funcObj variable from sqlite database if available
          if (funcArgsData.length != 0) {
            funcObj = setFuncObj(funcArgsData, argMode, argType, myargname, defValList, true);
          }
        }

        setDebuggerArgs(funcArgsData, funcObj, myObj);
        debuggerArgsSchema.current = new DebuggerArgumentSchema();
        setLoadArgs(crypto.getRandomValues(new Uint16Array(1)));
      })
      .catch(() => {
        pgAdmin.Browser.notifier.alert(
          gettext('Debugger Error'),
          gettext('Unable to fetch the arguments from server')
        );
      });
  }

  useEffect(() => {
    getDebuggerArgsSchema();
  }, []);

  let initData = () => new Promise((resolve, reject) => {
    try {
      resolve(debuggerArgsData.current);
    } catch (error) {
      reject(error);
    }
  });

  function clearArgs() {
    setLoaderText('Loading...');
    setLoadArgs(0);
    let base_url = null;

    if (restartDebug == 0) {
      if (!pgData)
        return;

      let treeInfo = pgTreeInfo;

      base_url = url_for('debugger.clear_arguments', {
        'sid': treeInfo.server._id,
        'did': treeInfo.database._id,
        'scid': treeInfo.schema._id,
        'func_id': pgData._id,
      });
    } else {
      base_url = url_for('debugger.clear_arguments', {
        'sid': debuggerInfo.server_id,
        'did': debuggerInfo.database_id,
        'scid': debuggerInfo.schema_id,
        'func_id': debuggerInfo.function_id,
      });
    }
    api({
      url: base_url,
      method: 'POST',
      data: {},
    }).then(function () {
      /* Get updated debugger arguments */
      getDebuggerArgsSchema();
      /* setTimeout required to get updated argruments as 'Clear All' will delete all saved arguments form sqlite db. */
      setTimeout(() => {
        /* Reload the debugger arguments */
        setLoaderText('');
        setLoadArgs(crypto.getRandomValues(new Uint16Array(1)));
        /* Disable debug button */
        setIsDisableDebug(true);
      }, 100);
    }).catch(function (er) {
      setLoaderText('');
      pgAdmin.Browser.notifier.alert(
        gettext('Clear failed'),
        er.responseJSON.errormsg
      );
    });
  }

  function setDebuggingArgs(argsList, argSet) {
    if (argsList.length === 0) {
      // Add all parameters
      debuggerArgsData.current.aregsCollection.forEach(arg => {
        if (!argSet.includes(arg.name)) {
          argSet.push(arg.name);
          argsList.push(arg);
        }
      });

      // Update values if any change in the args.
      if (debuggerFinalArgs.current) {
        debuggerFinalArgs.current.changed.forEach(changedArg => {
          argsList.forEach((el, _index) => {
            if (changedArg.name == el.name) {
              argsList[_index] = changedArg;
            }
          });
        });
      }

    }
  }

  function checkArgsVal(arg, argsValueList) {
    // Check if value is set to NULL then we should ignore the value field
    if (arg.is_null) {
      argsValueList.push({
        'name': arg.name,
        'type': arg.type,
        'value': 'NULL',
      });
    } else {
      // Check if default value to be used or not
      if (arg.use_default) {
        argsValueList.push({
          'name': arg.name,
          'type': arg.type,
          'value': arg.default_value,
        });
      } else {
        argsValueList.push({
          'name': arg.name,
          'type': arg.type,
          'value': arg.value,
        });
      }
    }
  }
  function getFunctionID(d, treeInfo) {
    let functionId;
    if (d._type == 'function') {
      functionId = treeInfo.function._id;
    } else if (d._type == 'procedure') {
      functionId = treeInfo.procedure._id;
    } else if (d._type == 'edbfunc') {
      functionId = treeInfo.edbfunc._id;
    } else if (d._type == 'edbproc') {
      functionId = treeInfo.edbproc._id;
    }
    return functionId;
  }

  function setSqliteFuncArgs(d, treeInfo, arg, intCount, sqliteFuncArgsList) {
    if (restartDebug == 0) {
      let functionId = getFunctionID(d, treeInfo);
      // Below will format the data to be stored in sqlite database
      sqliteFuncArgsList.push({
        'server_id': treeInfo.server._id,
        'database_id': treeInfo.database._id,
        'schema_id': treeInfo.schema._id,
        'function_id': functionId,
        'arg_id': InputArgIds.current[intCount],
        'is_null': arg.is_null ? 1 : 0,
        'is_expression': arg.expr ? 1 : 0,
        'use_default': arg.use_default ? 1 : 0,
        'value': arg.value,
        'is_array_value': arg?.isArrayType,
      });
    } else {
      // Below will format the data to be stored in sqlite database
      sqliteFuncArgsList.push({
        'server_id': debuggerInfo.server_id,
        'database_id': debuggerInfo.database_id,
        'schema_id': debuggerInfo.schema_id,
        'function_id': debuggerInfo.function_id,
        'arg_id': InputArgIds.current[intCount],
        'is_null': arg.is_null ? 1 : 0,
        'is_expression': arg.expr ? 1 : 0,
        'use_default': arg.use_default ? 1 : 0,
        'value': arg.value,
        'is_array_value': arg?.isArrayType,
      });
    }

    return sqliteFuncArgsList;
  }

  function checkTypeAndGetUrl(d, treeInfo) {
    let baseUrl;
    if (d && d._type == 'function') {
      baseUrl = url_for('debugger.initialize_target_for_function', {
        'debug_type': 'direct',
        'trans_id': transId,
        'sid': treeInfo.server._id,
        'did': treeInfo.database._id,
        'scid': treeInfo.schema._id,
        'func_id': treeInfo.function._id,
      });
    } else if (d && d._type == 'procedure') {
      baseUrl = url_for('debugger.initialize_target_for_function', {
        'debug_type': 'direct',
        'trans_id': transId,
        'sid': treeInfo.server._id,
        'did': treeInfo.database._id,
        'scid': treeInfo.schema._id,
        'func_id': treeInfo.procedure._id,
      });
    } else if (d && d._type == 'edbfunc') {
      baseUrl = url_for('debugger.initialize_target_for_function', {
        'debug_type': 'direct',
        'trans_id': transId,
        'sid': treeInfo.server._id,
        'did': treeInfo.database._id,
        'scid': treeInfo.schema._id,
        'func_id': treeInfo.edbfunc._id,
      });
    } else if (d && d._type == 'edbproc') {
      baseUrl = url_for('debugger.initialize_target_for_function', {
        'debug_type': 'direct',
        'trans_id': transId,
        'sid': treeInfo.server._id,
        'did': treeInfo.database._id,
        'scid': treeInfo.schema._id,
        'func_id': treeInfo.edbproc._id,
      });
    }

    return baseUrl;
  }

  function getSetArgsUrl(d, treeInfo) {
    let baseUrl;
    if (d._type == 'function') {
      baseUrl = url_for('debugger.set_arguments', {
        'sid': treeInfo.server._id,
        'did': treeInfo.database._id,
        'scid': treeInfo.schema._id,
        'func_id': treeInfo.function._id,
      });
    } else if (d._type == 'procedure') {
      baseUrl = url_for('debugger.set_arguments', {
        'sid': treeInfo.server._id,
        'did': treeInfo.database._id,
        'scid': treeInfo.schema._id,
        'func_id': treeInfo.procedure._id,
      });
    } else if (d._type == 'edbfunc') {
      // Get the existing function parameters available from sqlite database
      baseUrl = url_for('debugger.set_arguments', {
        'sid': treeInfo.server._id,
        'did': treeInfo.database._id,
        'scid': treeInfo.schema._id,
        'func_id': treeInfo.edbfunc._id,
      });
    } else if (d._type == 'edbproc') {
      // Get the existing function parameters available from sqlite database
      baseUrl = url_for('debugger.set_arguments', {
        'sid': treeInfo.server._id,
        'did': treeInfo.database._id,
        'scid': treeInfo.schema._id,
        'func_id': treeInfo.edbproc._id,
      });
    }

    return baseUrl;
  }

  function startDebugging() {
    setLoaderText('Starting debugger...');
    try {
      /* Initialize the target once the debug button is clicked and create asynchronous connection
        and unique transaction ID If the debugging is started again then treeInfo is already stored. */
      let treeInfo = pgTreeInfo;
      if (!pgData) return;

      let argsValueList = [];
      let sqliteFuncArgsList = [];
      let intCount = 0;

      let argsList = [];
      let argSet = [];

      setDebuggingArgs(argsList, argSet);

      argsList.forEach(arg => {
        checkArgsVal(arg, argsValueList);
        setSqliteFuncArgs(pgData, treeInfo, arg, intCount, sqliteFuncArgsList);
        intCount = intCount + 1;
      });

      let baseUrl;

      /* If debugging is not started again then we should initialize the target otherwise not */
      if (restartDebug == 0) {
        baseUrl = checkTypeAndGetUrl(pgData, treeInfo);

        api({
          url: baseUrl,
          method: 'POST',
          data: JSON.stringify(argsValueList),
        })
          .then(function (res_post) {

            let url = url_for(
              'debugger.direct', {
                'trans_id': res_post.data.data.debuggerTransId,
              }
            );

            let open_new_tab = browserPreferences.new_browser_tab_open;
            let label = getAppropriateLabel(treeInfo);

            pgAdmin.Browser.Events.trigger(
              'pgadmin:tool:show',
              `${BROWSER_PANELS.DEBUGGER_TOOL}_${res_post.data.data.debuggerTransId}`,
              url,
              null,
              {title: getDebuggerTitle(browserPreferences, label, treeInfo.schema.label, treeInfo.database.label, null, pgAdmin.Browser),
                icon: 'fa fa-bug', manualClose: false, renamable: true},
              Boolean(open_new_tab?.includes('debugger'))
            );

            let _url = getSetArgsUrl(pgData, treeInfo);

            api({
              url: _url,
              method: 'POST',
              data: JSON.stringify(sqliteFuncArgsList),
            })
              .then(function () {/*This is intentional (SonarQube)*/ })
              .catch((error) => {
                setLoaderText('');
                pgAdmin.Browser.notifier.alert(
                  gettext('Error occured: '),
                  gettext(error.response.data)
                );
              });
            /* Close the debugger modal dialog */
            props.closeModal();
            setLoaderText('');
          })
          .catch(function (error) {
            setLoaderText('');
            pgAdmin.Browser.notifier.alert(
              gettext('Debugger Target Initialization Error'),
              gettext(error.response.data)
            );
          });

      }
      else {
        // If the debugging is started again then we should only set the
        // arguments and start the listener again
        baseUrl = url_for('debugger.start_listener', {
          'trans_id': transId,
        });

        api({
          url: baseUrl,
          method: 'POST',
          data: JSON.stringify(argsValueList),
        })
          .catch(function (error) {
            props.closeModal();
            pgAdmin.Browser.notifier.alert(
              gettext('Debugger Listener Startup Error'),
              gettext(error.response.data)
            );
          });
        setLoaderText('');
        // Set the new input arguments given by the user during debugging
        let _Url = url_for('debugger.set_arguments', {
          'sid': debuggerInfo.server_id,
          'did': debuggerInfo.database_id,
          'scid': debuggerInfo.schema_id,
          'func_id': debuggerInfo.function_id,
        });
        api({
          url: _Url,
          method: 'POST',
          data: JSON.stringify(sqliteFuncArgsList),
        })
          .then(function () {
            /*This is intentional (SonarQube)*/
            props.closeModal();
          })
          .catch(function (error) {
            setLoaderText('');
            pgAdmin.Browser.notifier.alert(
              gettext('Debugger Listener Startup Set Arguments Error'),
              gettext(error.response.data)
            );
          });
      }
    } catch (err) {
      setLoaderText('');
      pgAdmin.Browser.notifier.alert(
        gettext('Debugger Error'),
        gettext(err.message)
      );
    }

  }

  return (
    <Box className={classes.root}>
      <Box className={classes.body}>
        {
          loadArgs > 0 &&
          <>
            <Loader message={loaderText} />
            <SchemaView
              formType={'dialog'}
              getInitData={initData}
              viewHelperProps={{ mode: 'edit' }}
              schema={debuggerArgsSchema.current}
              showFooter={false}
              isTabView={false}
              Notifier={pgAdmin.Browser.notifier}
              onDataChange={(isChanged, changedData) => {
                let isValid = false;
                let skipStep = false;
                if ('_sessData' in debuggerArgsSchema.current) {
                  isValid = true;
                  debuggerArgsSchema.current._sessData.aregsCollection.forEach((data) => {

                    if (skipStep) { return; }

                    if ((data.is_null || data.use_default || data?.value?.toString()?.length > 0) && isValid) {
                      isValid = true;
                    } else {
                      isValid = false;
                      skipStep = true;
                    }

                    if (!data.isValid) {
                      isValid = false;
                      skipStep = true;
                    }

                  });
                }
                setIsDisableDebug(!isValid);
                debuggerFinalArgs.current = changedData.aregsCollection;
              }}
            />
          </>
        }
      </Box>
      <Box className={classes.footer}>
        <Box>
          <DefaultButton className={classes.buttonMargin} onClick={() => { clearArgs(); }} startIcon={<DeleteSweepIcon onClick={() => { clearArgs(); }} />}>
            {gettext('Clear All')}
          </DefaultButton>
        </Box>
        <Box className={classes.actionBtn} marginLeft="auto">
          <DefaultButton className={classes.buttonMargin} onClick={() => { props.closeModal(); }} startIcon={<CloseSharpIcon onClick={() => { props.closeModal(); }} />}>
            {gettext('Cancel')}
          </DefaultButton>
          <PrimaryButton className={classes.buttonMargin} startIcon={<BugReportRoundedIcon className={classes.debugBtn} />}
            disabled={isDisableDebug}
            onClick={() => { startDebugging(); }}>
            {gettext('Debug')}
          </PrimaryButton>
        </Box>
      </Box>
    </Box>

  );
}

DebuggerArgumentComponent.propTypes = {
  debuggerInfo: PropTypes.object,
  restartDebug: PropTypes.number,
  isEdbProc: PropTypes.bool,
  transId: PropTypes.string,
  closeModal: PropTypes.func,
  pgTreeInfo: PropTypes.object,
  pgData: PropTypes.object,
};

