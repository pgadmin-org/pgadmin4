/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { Box } from '@material-ui/core';
import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

import gettext from 'sources/gettext';
import url_for from 'sources/url_for';
import Loader from 'sources/components/Loader';

import Layout, { LayoutDocker } from '../../../../../static/js/helpers/Layout';
import EventBus from '../../../../../static/js/helpers/EventBus';
import getApiInstance, { callFetch } from '../../../../../static/js/api_instance';

import { PANELS, DEBUGGER_EVENTS, MENUS } from '../DebuggerConstants';
import { retrieveNodeName } from '../../../../sqleditor/static/js/show_view_data';
import { useModal } from '../../../../../static/js/helpers/ModalProvider';
import DebuggerEditor from './DebuggerEditor';
import DebuggerMessages from './DebuggerMessages';
import { ToolBar } from './ToolBar';
import { Stack } from './Stack';
import { Results } from './Results';
import { LocalVariablesAndParams } from './LocalVariablesAndParams';
import DebuggerArgumentComponent from './DebuggerArgumentComponent';
import usePreferences from '../../../../../preferences/static/js/store';

export const DebuggerContext = React.createContext();
export const DebuggerEventsContext = React.createContext();

export default function DebuggerComponent({ pgAdmin, selectedNodeInfo, panelId, panelDocker, eventBusObj, layout, params }) {
  const savedLayout = layout;
  const containerRef = React.useRef(null);
  const docker = useRef(null);
  const api = getApiInstance();
  const modal = useModal();
  const eventBus = useRef(eventBusObj || (new EventBus()));
  const [loaderText, setLoaderText] = React.useState('');
  const editor = useRef(null);
  const preferencesStore = usePreferences();
  let timeOut = null;
  const qtState = {
    is_new_tab: window.location == window.parent?.location,
    params: {
      ...params,
      node_name: retrieveNodeName(selectedNodeInfo),
    }
  };

  const disableToolbarButtons = () => {
    eventBus.current.fireEvent(DEBUGGER_EVENTS.DISABLE_MENU);
    eventBus.current.fireEvent(DEBUGGER_EVENTS.GET_TOOL_BAR_BUTTON_STATUS, { disabled: true });
  };

  const enableToolbarButtons = (key = null) => {
    if (key) {
      eventBus.current.fireEvent(DEBUGGER_EVENTS.ENABLE_SPECIFIC_MENU, key);
    } else {
      eventBus.current.fireEvent(DEBUGGER_EVENTS.ENABLE_MENU);
    }

    eventBus.current.fireEvent(DEBUGGER_EVENTS.GET_TOOL_BAR_BUTTON_STATUS, { disabled: false });
  };

  // Function to get the breakpoint information from the server
  const getBreakpointInformation = (transId, callBackFunc) => {
    let result = '';

    // Make ajax call to listen the database message
    let baseUrl = url_for('debugger.execute_query', {
      'trans_id': transId,
      'query_type': 'get_breakpoints',
    });
    api({
      url: baseUrl,
      method: 'GET',
    })
      .then(function (res) {
        if (res.data.data.status === 'Success') {
          result = res.data.data.result;
          if (callBackFunc) {
            callBackFunc(result);
          }
        } else if (res.data.data.status === 'NotConnected') {
          raiseFetchingBreakpointError();
        }
      })
      .catch(raiseFetchingBreakpointError);

    return result;
  };

  const clearAllBreakpoint = (transId) => {
    let clearBreakpoint = (br_list) => {
      // If there is no break point to clear then we should return from here.
      if ((br_list.length == 1) && (br_list[0].linenumber == -1))
        return;

      disableToolbarButtons();
      let breakpoint_list = getBreakpointList(br_list);

      // Make ajax call to listen the database message
      let baseUrl = url_for('debugger.clear_all_breakpoint', {
        'trans_id': transId,
      });

      api({
        url: baseUrl,
        method: 'POST',
        data: {
          'breakpoint_list': breakpoint_list.lenght > 0 ? breakpoint_list.join() : null,
        },
      })
        .then(function (res) {
          if (res.data.data.status) {
            executeQuery(transId);
            setUnsetBreakpoint(res, breakpoint_list);
          }
          enableToolbarButtons();
        })
        .catch(raiseClearBrekpointError);
    };
    getBreakpointInformation(transId, clearBreakpoint);
  };

  const raiseJSONError = (xhr) => {
    try {
      let err = xhr.response.data;
      if (err.success == 0) {
        let header_msg = gettext('Debugger Error'),
          err_msg = err.errormsg;

        // Stopped Debugger forcefully. 57014 is the SQL State
        if (err.errormsg.indexOf('57014') !== -1) {
          header_msg = gettext('Debugger Aborted');
          err_msg = gettext('Debugger has been aborted. '
           + 'On clicking the ok button, debugger panel will be closed.');
        }

        pgAdmin.Browser.notifier.alert(header_msg, err_msg, () => {
          if (panelId) {
            panelDocker.close(panelId, true);
          }
        });
      }
    } catch (e) {
      alert(xhr);
      pgAdmin.Browser.notifier.alert(
        gettext('Debugger Error'),
        gettext('Error while starting debugging listener.')
      );
    }
  };

  const raisePollingError = () => {
    pgAdmin.Browser.notifier.alert(
      gettext('Debugger Error'),
      gettext('Error while polling result.')
    );
  };

  const raiseClearBrekpointError = () => {
    pgAdmin.Browser.notifier.alert(
      gettext('Debugger Error'),
      gettext('Error while clearing all breakpoint.')
    );
  };

  const raiseFetchingBreakpointError = () => {
    pgAdmin.Browser.notifier.alert(
      gettext('Debugger Error'),
      gettext('Error while fetching breakpoint information.')
    );
  };

  const messages = (transId) => {
    // Make ajax call to listen the database message
    let baseUrl = url_for('debugger.messages', {
      'trans_id': transId,
    });

    api({
      url: baseUrl,
      method: 'GET',
    })
      .then(function (res) {
        if (res.data.data.status === 'Success') {
          enableToolbarButtons();
          // If status is Success then find the port number to attach the executer.
          startExecution(transId, res.data.data.result);
        } else if (res.data.data.status === 'Busy') {
          // If status is Busy then poll the result by recursive call to the poll function
          messages(transId);
        } else if (res.data.data.status === 'NotConnected') {
          pgAdmin.Browser.notifier.alert(
            gettext('Not connected to server or connection with the server has been closed.'),
            res.data.result
          );
        }
      })
      .catch(function () {
        pgAdmin.Browser.notifier.alert(
          gettext('Debugger Error'),
          gettext('Error while fetching messages information.')
        );
      });

  };

  const startExecution = (transId, port_num) => {
    // Make ajax call to listen the database message
    let baseUrl = url_for(
      'debugger.start_execution', {
        'trans_id': transId,
        'port_num': port_num,
      });
    api({
      url: baseUrl,
      method: 'GET',
    })
      .then(function (res) {
        if (res.data.data.status === 'Success') {
          // If status is Success then find the port number to attach the executer.
          executeQuery(transId);
        } else if (res.data.data.status === 'NotConnected') {
          pgAdmin.Browser.notifier.alert(
            gettext('Debugger Error'),
            gettext('Error while starting debugging session.')
          );
        }
      })
      .catch(function () {
        pgAdmin.Browser.notifier.alert(
          gettext('Debugger Error'),
          gettext('Error while starting debugging session.')
        );
      });
  };

  const executeQuery = (transId) => {
    // Make ajax call to listen the database message
    let baseUrl = url_for(
      'debugger.execute_query', {
        'trans_id': transId,
        'query_type': 'wait_for_breakpoint',
      });
    api({
      url: baseUrl,
      method: 'GET',
    })
      .then(function (res) {
        if (res.data.data.status === 'Success') {
          // set the return code to the code editor text area
          if (
            res.data.data.result[0].src != null &&
            res.data.data.result[0].linenumber != null
          ) {
            editor.current.setValue(res.data.data.result[0].src);

            setActiveLine(res.data.data.result[0].linenumber - 2);
          }
          // Call function to create and update Stack information ....
          getStackInformation(transId);
          if (params.directDebugger.debug_type) {
            pollEndExecutionResult(transId);
          }
        } else if (res.data.data.status === 'NotConnected') {
          pgAdmin.Browser.notifier.alert(
            gettext('Debugger Error'),
            gettext('Error while executing requested debugging information.')
          );
        }
      })
      .catch(function () {
        pgAdmin.Browser.notifier.alert(
          gettext('Debugger Error'),
          gettext('Error while executing requested debugging information.')
        );
      });
  };

  const setActiveLine = (lineNo) => {
    /* If lineNo sent, remove active line */
    if (lineNo && editor.current.activeLineNo) {
      editor.current.removeLineClass(
        editor.current.activeLineNo, 'wrap', 'CodeMirror-activeline-background'
      );
    }

    /* If lineNo not sent, set it to active line */
    if (!lineNo && editor.current.activeLineNo) {
      lineNo = editor.current.activeLineNo;
    }

    /* Set new active line only if positive */
    if (lineNo > 0) {
      editor.current.activeLineNo = lineNo;
      editor.current.addLineClass(
        editor.current.activeLineNo, 'wrap', 'CodeMirror-activeline-background'
      );

      /* centerOnLine is codemirror extension in bundle/codemirror.js */
      editor.current.centerOnLine(editor.current.activeLineNo);
    }
  };

  const selectFrame = (frameId) => {
    // Make ajax call to listen the database message
    let baseUrl = url_for('debugger.select_frame', {
      'trans_id': params.transId,
      'frame_id': frameId,
    });
    api({
      url: baseUrl,
      method: 'GET',
    })
      .then(function (res) {
        if (res.data.data.status) {
          editor.current.setValue(res.data.data.result[0].src);
          updateBreakpoint(params.transId, true);
          setActiveLine(res.data.data.result[0].linenumber - 2);
        }
      })
      .catch(function () {
        pgAdmin.Browser.notifier.alert(
          gettext('Debugger Error'),
          gettext('Error while selecting frame.')
        );
      });
  };

  useEffect(() => {
    let baseUrl = '';
    if (params.transId != undefined && !params.directDebugger.debug_type) {
      // Make ajax call to execute the and start the target for execution
      baseUrl = url_for('debugger.start_listener', {
        'trans_id': params.transId,
      });

      api({
        url: baseUrl,
        method: 'POST',
      })
        .catch(raiseJSONError);
      enableToolbarButtons();
      pollResult(params.transId);
    } else if (params.transId != undefined) {
      // Make api call to execute the and start the target for execution
      baseUrl = url_for('debugger.start_listener', {
        'trans_id': params.transId,
      });

      api({
        url: baseUrl,
        method: 'POST',
      })
        .catch(raiseJSONError);
      messages(params.transId);
    }

    const closeConn = ()=>{
      /* Using fetch with keepalive as the browser may
      cancel the axios request on tab close. keepalive will
      make sure the request is completed */
      callFetch(
        url_for('debugger.close', {
          'trans_id': params.transId,
        }), {
          keepalive: true,
          method: 'DELETE',
        }
      )
        .then(()=>{/* Success */})
        .catch((err)=>console.error(err));
    };
    window.addEventListener('unload', closeConn);

    return ()=>{
      window.removeEventListener('unload', closeConn);
    };
  }, []);

  const setUnsetBreakpoint = (res, breakpoint_list) => {
    if (res.data.data.status) {
      for (let brk_val of breakpoint_list) {
        let info = editor.current.lineInfo((brk_val - 1));

        if (info) {
          if (info.gutterMarkers != undefined) {
            editor.current.setGutterMarker((brk_val - 1), 'breakpoints', null);
          }
        }
      }
    }
  };

  const triggerClearBreakpoint = () => {
    let clearBreakpoint = (br_list) => {
      // If there is no break point to clear then we should return from here.
      if ((br_list.length == 1) && (br_list[0].linenumber == -1))
        return;

      disableToolbarButtons();
      let breakpoint_list = getBreakpointList(br_list);

      // Make ajax call to listen the database message
      let _baseUrl = url_for('debugger.clear_all_breakpoint', {
        'trans_id': params.transId,
      });

      api({
        url: _baseUrl,
        method: 'POST',
        data: {
          'breakpoint_list': breakpoint_list.join(),
        },
      })
        .then(function (res) {
          setUnsetBreakpoint(res, breakpoint_list);
          enableToolbarButtons();
        })
        .catch(raiseClearBrekpointError);
    };
    // Make ajax call to listen the database message
    let baseUrl = url_for('debugger.execute_query', {
      'trans_id': params.transId,
      'query_type': 'get_breakpoints',
    });
    api({
      url: baseUrl,
      method: 'GET',
    })
      .then(function (res) {
        if (res.data.data.status === 'Success') {
          let result = res.data.data.result;
          clearBreakpoint(result);
        } else if (res.data.data.status === 'NotConnected') {
          raiseFetchingBreakpointError();
        }
      })
      .catch(raiseFetchingBreakpointError);

  };

  const debuggerMark = () => {
    let marker = document.createElement('div');
    marker.style.color = '#822';
    marker.innerHTML = '●';
    return marker;
  };

  const triggerToggleBreakpoint = () => {
    disableToolbarButtons();
    let info = editor.current.lineInfo(editor.current.activeLineNo);
    let baseUrl = '';

    // If gutterMarker is undefined that means there is no marker defined previously
    // So we need to set the breakpoint command here...
    if (info.gutterMarkers == undefined) {
      baseUrl = url_for('debugger.set_breakpoint', {
        'trans_id': params.transId,
        'line_no': editor.current.activeLineNo + 1,
        'set_type': '1',
      });
    } else {
      baseUrl = url_for('debugger.set_breakpoint', {
        'trans_id': params.transId,
        'line_no': editor.current.activeLineNo + 1,
        'set_type': '0',
      });
    }

    api({
      url: baseUrl,
      method: 'GET',
    })
      .then(function (res) {
        if (res.data.data.status) {
          // Call function to create and update local variables ....
          let info_local = editor.current.lineInfo(editor.current.activeLineNo);

          if (info_local.gutterMarkers != undefined) {
            editor.current.setGutterMarker(editor.current.activeLineNo, 'breakpoints', null);
          } else {
            editor.current.setGutterMarker(editor.current.activeLineNo, 'breakpoints', debuggerMark());
          }

          enableToolbarButtons();
        } else if (res.data.status === 'NotConnected') {
          pgAdmin.Browser.notifier.alert(
            gettext('Debugger Error'),
            gettext('Error while toggling breakpoint.')
          );
        }
      })
      .catch(function () {
        pgAdmin.Browser.notifier.alert(
          gettext('Debugger Error'),
          gettext('Error while toggling breakpoint.')
        );
      });
  };

  const stopDebugging = () => {
    disableToolbarButtons();
    // Make ajax call to listen the database message
    let baseUrl = url_for(
      'debugger.execute_query', {
        'trans_id': params.transId,
        'query_type': 'abort_target',
      });
    api({
      url: baseUrl,
      method: 'GET',
    })
      .then(function (res) {
        if (res.data.data.status) {
          // Remove active time in the editor
          setActiveLine(-1);
          // Clear timeout on stop debugger.
          clearTimeout(timeOut);

          params.directDebugger.direct_execution_completed = true;
          params.directDebugger.is_user_aborted_debugging = true;

          // Stop further pooling
          params.directDebugger.is_polling_required = false;

          // Restarting debugging in the same transaction do not work
          // We will give same behaviour as pgAdmin3 and disable all buttons
          disableToolbarButtons();

          // Set the message to inform the user that execution
          // is completed.
          pgAdmin.Browser.notifier.success(res.data.info, 3000);
        } else if (res.data.data.status === 'NotConnected') {
          pgAdmin.Browser.notifier.alert(
            gettext('Debugger Error'),
            gettext('Error while executing stop in debugging session.')
          );
        }
      })
      .catch(function () {
        pgAdmin.Browser.notifier.alert(
          gettext('Debugger Error'),
          gettext('Error while executing stop in debugging session.')
        );
      });
  };

  const restart = (transId) => {
    let baseUrl = url_for('debugger.restart', { 'trans_id': transId });
    disableToolbarButtons();

    api({
      url: baseUrl,
    })
      .then(function (res) {
        // Restart the same function debugging with previous arguments
        let restart_dbg = res.data.data.restart_debug ? 1 : 0;

        // Start pooling again
        params.directDebugger.polling_timeout_idle = false;
        params.directDebugger.is_polling_required = true;
        pollResult(transId);

        if (restart_dbg) {
          params.directDebugger.debug_restarted = true;
        }

        /*
        Need to check if restart debugging really require to open the input
        dialog? If yes then we will get the previous arguments from database
        and populate the input dialog, If no then we should directly start the
        listener.
        */
        if (res.data.data.result.require_input) {
          let t = pgAdmin.Browser.tree,
            i = t.selected(),
            d = i ? t.itemData(i) : undefined;

          let treeInfo = t.getTreeNodeHierarchy(i);

          if (d) {
            let isEdbProc = d._type == 'edbproc';
            modal.showModal(gettext('Debugger'), (closeModal) => {
              return <DebuggerArgumentComponent
                closeModal={closeModal}
                debuggerInfo={res.data.data.result}
                restartDebug={restart_dbg}
                isEdbProc={isEdbProc}
                transId={params.transId.toString()}
                pgData={d}
                pgTreeInfo={treeInfo}
              ></DebuggerArgumentComponent>;
            }, { isFullScreen: false, isResizeable: true, showFullScreen: true, isFullWidth: true, dialogWidth: pgAdmin.Browser.stdW.md, dialogHeight: pgAdmin.Browser.stdH.md });
          }
        } else {
          // This will start lister for void de
          restartDebuggerListener();
        }
      })
      .catch(raiseJSONError);
  };

  function restartDebuggerListener() {
    // Debugging of void function is started again so we need to start
    // the listener again
    let base_url = url_for('debugger.start_listener', {
      'trans_id': params.transId,
    });

    api({
      url: base_url,
      method: 'POST',
    })
      .catch(raisePollingError);
    if (params.directDebugger.debug_type) {
      pollEndExecutionResult(params.transId);
    }
  }

  const pollEndExecuteError = (res) => {
    params.directDebugger.direct_execution_completed = true;
    setActiveLine(-1);

    //Set the notification message to inform the user that execution is
    // completed with error.
    if (!params.directDebugger.is_user_aborted_debugging) {
      pgAdmin.Browser.notifier.error(res.data.info, 3000);
    }

    // Update the message tab of the debugger
    updateMessages(res.data.data.status_message);

    eventBus.current.fireEvent(DEBUGGER_EVENTS.FOCUS_PANEL, PANELS.MESSAGES);
    disableToolbarButtons();
    // If debugging is stopped by user then do not enable
    // continue/restart button
    if (!params.directDebugger.is_user_aborted_debugging) {
      enableToolbarButtons();
      params.directDebugger.is_user_aborted_debugging = false;
    }

    // Stop further pooling
    params.directDebugger.is_polling_required = false;
  };

  const updateResultAndMessages = (res) => {
    if (res.data.data.result != null) {
      setActiveLine(-1);
      // Call function to update results information and set result panel focus
      eventBus.current.fireEvent(DEBUGGER_EVENTS.SET_RESULTS, res.data.data.col_info, res.data.data.result);
      eventBus.current.fireEvent(DEBUGGER_EVENTS.FOCUS_PANEL, PANELS.RESULTS);

      params.directDebugger.direct_execution_completed = true;
      params.directDebugger.polling_timeout_idle = true;

      //Set the message to inform the user that execution is completed.
      pgAdmin.Browser.notifier.success(res.data.info, 3000);

      // Update the message tab of the debugger
      updateMessages(res.data.data.status_message);

      // Execution completed so disable the buttons other than
      // "Continue/Start" button because user can still
      // start the same execution again.
      disableToolbarButtons();
      enableToolbarButtons(MENUS.START);

      // Stop further pooling
      params.directDebugger.is_polling_required = false;
    }
  };

  /*
    For the direct debugging, we need to check weather the functions execution
    is completed or not. After completion of the debugging, we will stop polling
    the result  until new execution starts.
  */
  const pollEndExecutionResult = (transId) => {
    // Do we need to poll?
    if (!params.directDebugger.is_polling_required) {
      return;
    }

    // Make ajax call to listen the database message
    let baseUrl = url_for('debugger.poll_end_execution_result', {
        'trans_id': transId,
      }),
      poll_end_timeout;

    /*
      * During the execution we should poll the result in minimum seconds
      * but once the execution is completed and wait for the another
      * debugging session then we should decrease the polling frequency.
    */
    if (params.directDebugger.polling_timeout_idle) {
      // Poll the result to check that execution is completed or not
      // after 1200 ms
      poll_end_timeout = 1200;
    } else {
      // Poll the result to check that execution is completed or not
      // after 350 ms
      poll_end_timeout = 250;
    }

    timeOut = setTimeout(
      function () {
        api({
          url: baseUrl,
          method: 'GET',
        })
          .then(function (res) {
            if (res.data.data.status === 'Success') {
              if (res.data.data.result == undefined) {
                /*
                "result" is undefined only in case of EDB procedure.
                As Once the EDB procedure execution is completed then we are
                not getting any result so we need to ignore the result.
                */
                setActiveLine(-1);
                params.directDebugger.direct_execution_completed = true;
                params.directDebugger.polling_timeout_idle = true;

                //Set the message to inform the user that execution is completed.
                pgAdmin.Browser.notifier.success(res.data.info, 3000);

                // Update the message tab of the debugger
                updateMessages(res.data.data.status_message);

                // Execution completed so disable the buttons other than
                // "Continue/Start" button because user can still
                // start the same execution again.
                disableToolbarButtons();
                enableToolbarButtons(MENUS.START);

                // Stop further polling
                params.directDebugger.is_polling_required = false;
              } else {
                updateResultAndMessages(res);
              }
            } else if (res.data.data.status === 'Busy') {
              // If status is Busy then poll the result by recursive call to
              // the poll function
              pollEndExecutionResult(transId);
              // Update the message tab of the debugger
              updateMessages(res.data.data.status_message);
            } else if (res.data.status === 'NotConnected') {
              pgAdmin.Browser.notifier.alert(
                gettext('Debugger poll end execution error'),
                res.data.result
              );
            } else if (res.data.data.status === 'ERROR') {
              pollEndExecuteError(res);
            }
          })
          .catch(raisePollingError);
      }, poll_end_timeout);

  };

  // This function will update messages tab
  const updateMessages = (msg) => {
    if (msg) {
      // Call function to update messages information
      eventBus.current.fireEvent(DEBUGGER_EVENTS.SET_MESSAGES, msg, true);
    }
  };

  const continueDebugger = () => {
    disableToolbarButtons();

    //Check first if previous execution was completed or not
    if (params.directDebugger.direct_execution_completed &&
      params.directDebugger.direct_execution_completed == params.directDebugger.polling_timeout_idle) {
      restart(params.transId);
    } else {
      // Make ajax call to listen the database message
      let baseUrl = url_for('debugger.execute_query', {
        'trans_id': params.transId,
        'query_type': 'continue',
      });
      api({
        url: baseUrl,
        method: 'GET',
      })
        .then(function (res) {
          if (res.data.data.status) {
            pollResult(params.transId);
          } else {
            pgAdmin.Browser.notifier.alert(
              gettext('Debugger Error'),
              gettext('Error while executing continue in debugging session.')
            );
          }
        })
        .catch(function () {
          pgAdmin.Browser.notifier.alert(
            gettext('Debugger Error'),
            gettext('Error while executing continue in debugging session.')
          );
        });
    }
  };

  const stepOver = () => {
    disableToolbarButtons();

    // Make ajax call to listen the database message
    let baseUrl = url_for('debugger.execute_query', {
      'trans_id': params.transId,
      'query_type': 'step_over',
    });
    api({
      url: baseUrl,
      method: 'GET',
    })
      .then(function (res) {
        if (res.data.data.status) {
          pollResult(params.transId);
        } else {
          pgAdmin.Browser.notifier.alert(
            gettext('Debugger Error'),
            gettext('Error while executing step over in debugging session.')
          );
        }
      })
      .catch(function () {
        pgAdmin.Browser.notifier.alert(
          gettext('Debugger Error'),
          gettext('Error while executing step over in debugging session.')
        );
      });

  };

  const getBreakpointList = (br_list) => {
    let breakpoint_list = [];
    for (let val of br_list) {
      if (val.linenumber != -1) {
        breakpoint_list.push(val.linenumber);
      }
    }

    return breakpoint_list;
  };

  // Function to get the latest breakpoint information and update the
  // gutters of codemirror
  const updateBreakpoint = (transId, updateLocalVar = false) => {
    let callBackFunc = (br_list) => {
      // If there is no break point to clear then we should return from here.
      if ((br_list.length == 1) && (br_list[0].linenumber == -1))
        return;

      let breakpoint_list = getBreakpointList(br_list);


      for (let brk_val of breakpoint_list) {
        let info = editor.current.lineInfo((brk_val - 1));

        if (info.gutterMarkers != undefined) {
          editor.current.setGutterMarker((brk_val - 1), 'breakpoints', null);
        } else {
          editor.current.setGutterMarker((brk_val - 1), 'breakpoints', debuggerMark());
        }
      }
      if (updateLocalVar) {
        // Call function to create and update local variables ....
        getLocalVariables(params.transId);
      }
    };
    getBreakpointInformation(transId, callBackFunc);
  };

  // Get the local variable information of the functions and update the grid
  const getLocalVariables = (transId) => {
    // Make ajax call to listen the database message
    let baseUrl = url_for(
      'debugger.execute_query', {
        'trans_id': transId,
        'query_type': 'get_variables',
      });
    api({
      url: baseUrl,
      method: 'GET',
    })
      .then(function (res) {
        if (res.data.data.status === 'Success') {
          // Call function to update local variables
          let variablesResult = res.data.data.result.filter((lvar) => {
            return lvar.varclass == 'L';
          });
          eventBus.current.fireEvent(DEBUGGER_EVENTS.SET_LOCAL_VARIABLES, variablesResult);

          let parametersResult = res.data.data.result.filter((lvar) => {
            return lvar.varclass == 'A';
          });
          // update Parameter panel data.
          eventBus.current.fireEvent(DEBUGGER_EVENTS.SET_PARAMETERS, parametersResult);
          // If debug function is restarted then again start listener to
          // read the updated messages.
          if (params.directDebugger.debug_restarted) {
            if (params.directDebugger.debug_type) {
              pollEndExecutionResult(transId);
            }
            params.directDebugger.debug_restarted = false;
          }
        } else if (res.data.data.status === 'NotConnected') {
          pgAdmin.Browser.notifier.alert(
            gettext('Debugger Error'),
            gettext('Error while fetching variable information.')
          );
        }
      })
      .catch(function () {
        pgAdmin.Browser.notifier.alert(
          gettext('Debugger Error'),
          gettext('Error while fetching variable information.')
        );
      });
  };

  const getStackInformation = (transId) => {
    // Make ajax call to listen the database message
    let baseUrl = url_for(
      'debugger.execute_query', {
        'trans_id': transId,
        'query_type': 'get_stack_info',
      });
    api({
      url: baseUrl,
      method: 'GET',
    })
      .then(function (res) {
        if (res.data.data.status === 'Success') {
          // Call function to update stack information
          eventBus.current.fireEvent(DEBUGGER_EVENTS.SET_STACK, res.data.data.result);
          // Call function to create and update stack information
          getLocalVariables(params.transId);
        } else if (res.data.data.status === 'NotConnected') {
          pgAdmin.Browser.notifier.alert(
            gettext('Debugger Error'),
            gettext('Error while fetching stack information.')
          );
        }
      })
      .catch(function () {
        pgAdmin.Browser.notifier.alert(
          gettext('Debugger Error'),
          gettext('Error while fetching stack information.')
        );
      });
  };


  const updateBreakpointInfo = (res, transId) => {
    if (res.data.data.result[0].src != editor.current.getValue()) {
      editor.current.setValue(res.data.data.result[0].src);
      try {
        updateBreakpoint(transId);
      } catch (err) {
        pgAdmin.Browser.notifier.alert(gettext('Error in update'), err);
      }

    }
  };

  const updateInfo = (res, transId) => {
    if (!params.directDebugger.debug_type && !params.directDebugger.first_time_indirect_debug) {
      setLoaderText('');
      setActiveLine(-1);
      clearAllBreakpoint(transId);

      params.directDebugger.first_time_indirect_debug = true;
      params.directDebugger.polling_timeout_idle = false;
    } else {
      params.directDebugger.polling_timeout_idle = false;
      setLoaderText('');
      // If the source is really changed then only update the breakpoint information
      updateBreakpointInfo(res, transId);

      setActiveLine(res.data.data.result[0].linenumber - 2);
      // Update the stack, local variables and parameters information
      setTimeout(function () {
        getStackInformation(transId);
      }, 10);
    }
  };

  const checkDebuggerStatus = (transId) => {
    // If status is Busy then poll the result by recursive call to the poll function
    if (!params.directDebugger.debug_type) {
      setLoaderText(gettext('Waiting for another session to invoke the target...'));
      // As we are waiting for another session to invoke the target,disable all the buttons
      disableToolbarButtons();
      params.directDebugger.first_time_indirect_debug = false;
      pollResult(transId);
    } else {
      pollResult(transId);
    }
  };

  /* poll the actual result after user has executed the "continue", "step-into",
    "step-over" actions and get the other updated information from the server.
  */
  const pollResult = (transId) => {
    // Do we need to poll?
    if (!params.directDebugger.is_polling_required) {
      return;
    }

    // Make ajax call to listen the database message
    let baseUrl = url_for('debugger.poll_result', {
        'trans_id': transId,
      }),
      poll_timeout;

    /*
          During the execution we should poll the result in minimum seconds but
          once the execution is completed and wait for the another debugging
          session then we should decrease the polling frequency.
        */
    if (params.directDebugger.polling_timeout_idle) {
      // Poll the result after 1 second
      poll_timeout = 1000;
    } else {
      // Poll the result after 200 ms
      poll_timeout = 200;
    }

    setTimeout(
      function () {
        api({
          url: baseUrl,
          method: 'GET',
          beforeSend: function (xhr) {
            xhr.setRequestHeader(
              pgAdmin.csrf_token_header, pgAdmin.csrf_token
            );
          },
        })
          .then(function (res) {
            if (res.data.data.status === 'Success') {
              // If no result then poll again to wait for results.
              if (res.data.data.result == null || res.data.data.result.length == 0) {
                pollResult(transId);
              } else {
                updateInfo(res, transId);
                // Enable all the buttons as we got the results
                enableToolbarButtons();
              }
            } else if (res.data.data.status === 'Busy') {
              params.directDebugger.polling_timeout_idle = true;
              checkDebuggerStatus(transId);
            } else if (res.data.data.status === 'NotConnected') {
              pgAdmin.Browser.notifier.alert(
                gettext('Debugger Error: poll_result'),
                gettext('Error while polling result.')
              );
            }
          })
          .catch(raisePollingError);
      }, poll_timeout);

  };

  const stepInto = () => {
    disableToolbarButtons();
    // Make ajax call to listen the database message
    let baseUrl = url_for('debugger.execute_query', {
      'trans_id': params.transId,
      'query_type': 'step_into',
    });
    api({
      url: baseUrl,
      method: 'GET',
    })
      .then(function (res) {
        if (res.data.data.status) {
          pollResult(params.transId);
        } else {
          pgAdmin.Browser.notifier.alert(
            gettext('Debugger Error'),
            gettext('Error while executing step into in debugging session.')
          );
        }
      })
      .catch(function () {
        pgAdmin.Browser.notifier.alert(
          gettext('Debugger Error'),
          gettext('Error while executing step into in debugging session.')
        );
      });
  };


  const onChangesLocalVarParameters = (data) => {
    // Make api call to listen the database message
    let baseUrl = url_for('debugger.deposit_value', {
      'trans_id': params.transId,
    });
    api({
      url: baseUrl,
      method: 'POST',
      data: data,
    })
      .then(function (res) {
        if (res.data.data.status) {
          // Get the updated variables value
          getLocalVariables(params.transId);
          // Show the message to the user that deposit value is success or failure
          if (res.data.data.result) {
            pgAdmin.Browser.notifier.success(res.data.data.info, 3000);
          } else {
            pgAdmin.Browser.notifier.error(res.data.data.info, 3000);
          }
        }
      })
      .catch(function () {
        pgAdmin.Browser.notifier.alert(
          gettext('Debugger Error'),
          gettext('Error while depositing variable value.')
        );
      });
  };

  useEffect(() => {
    // Register all eventes for debugger.
    eventBus.current.registerListener(
      DEBUGGER_EVENTS.TRIGGER_CLEAR_ALL_BREAKPOINTS, triggerClearBreakpoint);

    eventBus.current.registerListener(
      DEBUGGER_EVENTS.TRIGGER_TOGGLE_BREAKPOINTS, triggerToggleBreakpoint);

    eventBus.current.registerListener(
      DEBUGGER_EVENTS.TRIGGER_STOP_DEBUGGING, stopDebugging);

    eventBus.current.registerListener(
      DEBUGGER_EVENTS.TRIGGER_CONTINUE_DEBUGGING, continueDebugger);

    eventBus.current.registerListener(
      DEBUGGER_EVENTS.TRIGGER_STEPOVER_DEBUGGING, stepOver);

    eventBus.current.registerListener(
      DEBUGGER_EVENTS.TRIGGER_STEINTO_DEBUGGING, stepInto);

    eventBus.current.registerListener(
      DEBUGGER_EVENTS.SET_LOCAL_VARIABLE_VALUE_CHANGE, onChangesLocalVarParameters);

    eventBus.current.registerListener(
      DEBUGGER_EVENTS.SET_PARAMETERS_VALUE_CHANGE, onChangesLocalVarParameters);

    eventBus.current.registerListener(DEBUGGER_EVENTS.SET_FRAME, (frameId) => {
      selectFrame(frameId);
    });

    eventBus.current.registerListener(DEBUGGER_EVENTS.FOCUS_PANEL, (panelId) => {
      docker.current.focus(panelId);
    });

    eventBus.current.registerListener(
      DEBUGGER_EVENTS.TRIGGER_RESET_LAYOUT, () => {
        docker.current?.resetLayout();
      });
  }, []);

  const DebuggerContextValue = React.useMemo(() => ({
    docker: docker.current,
    api: api,
    modal: modal,
    params: qtState.params,
    preferences: {
      browser: preferencesStore.getPreferencesForModule('browser'),
      debugger: preferencesStore.getPreferencesForModule('debugger'),
    },
  }), [qtState.params, preferencesStore]);

  // Define the debugger layout components such as DebuggerEditor to show queries and
  let defaultLayout = {
    dockbox: {
      mode: 'vertical',
      children: [
        {
          mode: 'horizontal',
          children: [
            {
              tabs: [
                LayoutDocker.getPanel({
                  id: PANELS.DEBUGGER, title: gettext('Debugger'), content: <DebuggerEditor getEditor={(edRef) => {
                    editor.current = edRef;
                  }} params={{ transId: params.transId, debuggerDirect: params.directDebugger }} />
                })
              ],
            }
          ]
        },
        {
          mode: 'horizontal',
          children: [
            {
              tabs: [
                LayoutDocker.getPanel({
                  id: PANELS.PARAMETERS, title: gettext('Parameters'), content: <LocalVariablesAndParams type={1} />,
                }),
                LayoutDocker.getPanel({
                  id: PANELS.LOCAL_VARIABLES, title: gettext('Local Variables'), content: <LocalVariablesAndParams type={2} />,
                }),
                LayoutDocker.getPanel({
                  id: PANELS.MESSAGES, title: gettext('Messages'), content: <DebuggerMessages />,
                }),
                LayoutDocker.getPanel({
                  id: PANELS.RESULTS, title: gettext('Result'), content: <Results />,
                }),
                LayoutDocker.getPanel({
                  id: PANELS.STACK, title: gettext('Stack'), content: <Stack />,
                }),
              ],
            }
          ]
        },
      ]
    },
  };

  return (
    <DebuggerContext.Provider value={DebuggerContextValue}>
      <DebuggerEventsContext.Provider value={eventBus.current}>
        <Loader message={loaderText} />
        <Box width="100%" height="100%" display="flex" flexDirection="column" flexGrow="1" tabIndex="0" ref={containerRef}>
          <ToolBar
            containerRef={containerRef}
          />
          <Layout
            getLayoutInstance={(obj) => docker.current = obj}
            defaultLayout={defaultLayout}
            layoutId="Debugger/Layout"
            savedLayout={savedLayout}
          />
        </Box>
      </DebuggerEventsContext.Provider>
    </DebuggerContext.Provider>
  );
}

DebuggerComponent.propTypes = {
  pgAdmin: PropTypes.object,
  selectedNodeInfo: PropTypes.object,
  panelId: PropTypes.string,
  panelDocker: PropTypes.object,
  eventBusObj: PropTypes.object,
  layout: PropTypes.string,
  params: PropTypes.object
};
