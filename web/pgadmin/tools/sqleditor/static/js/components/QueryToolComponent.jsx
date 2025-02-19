/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import React, {useCallback, useRef, useMemo, useState, useEffect} from 'react';
import _ from 'lodash';
import Layout, { LayoutDocker, LAYOUT_EVENTS } from '../../../../../static/js/helpers/Layout';
import EventBus from '../../../../../static/js/helpers/EventBus';
import Query from './sections/Query';
import { ConnectionBar } from './sections/ConnectionBar';
import { ResultSet } from './sections/ResultSet';
import { StatusBar } from './sections/StatusBar';
import { MainToolBar } from './sections/MainToolBar';
import { Messages } from './sections/Messages';
import getApiInstance, {callFetch, parseApiError} from '../../../../../static/js/api_instance';
import url_for from 'sources/url_for';
import { PANELS, QUERY_TOOL_EVENTS, CONNECTION_STATUS, MAX_QUERY_LENGTH, OS_EOL } from './QueryToolConstants';
import { useBeforeUnload, useInterval } from '../../../../../static/js/custom_hooks';
import { Box } from '@mui/material';
import { getDatabaseLabel, getTitle, setQueryToolDockerTitle } from '../sqleditor_title';
import gettext from 'sources/gettext';
import NewConnectionDialog from './dialogs/NewConnectionDialog';
import { evalFunc } from '../../../../../static/js/utils';
import { Notifications } from './sections/Notifications';
import MacrosDialog from './dialogs/MacrosDialog';
import FilterDialog from './dialogs/FilterDialog';
import { QueryHistory } from './sections/QueryHistory';
import * as showQueryTool from '../show_query_tool';
import * as commonUtils from 'sources/utils';
import * as Kerberos from 'pgadmin.authenticate.kerberos';
import PropTypes from 'prop-types';
import { retrieveNodeName } from '../show_view_data';
import { useModal } from '../../../../../static/js/helpers/ModalProvider';
import ConnectServerContent from '../../../../../static/js/Dialogs/ConnectServerContent';
import usePreferences from '../../../../../preferences/static/js/store';

export const QueryToolContext = React.createContext();
export const QueryToolConnectionContext = React.createContext();
export const QueryToolEventsContext = React.createContext();

function fetchConnectionStatus(api, transId) {
  return api.get(url_for('sqleditor.connection_status', {trans_id: transId}));
}

function initConnection(api, params, passdata) {
  return api.post(url_for('NODE-server.connect_id', params), passdata);
}

export function getRandomName(existingNames) {
  const maxNumber = existingNames.reduce((max, name) => {
    const match = name.match(/\d+$/); // Extract the number from the name
    if (match) {
      const number = parseInt(match[0], 10);
      return number > max ? number : max;
    }
    return max;
  }, 0);

  // Generate the new name
  const newName = `Macro ${maxNumber + 1}`;
  return newName;
}

function setPanelTitle(docker, panelId, title, qtState, dirty=false) {
  if(qtState.current_file) {
    title = qtState.current_file.split('\\').pop().split('/').pop();
  } else if (!qtState.is_new_tab && !title) {
    const internal = docker.getInternalAttrs(panelId);
    title = internal.title;
    if(internal.isDirty) {
      // remove asterisk
      title = title.slice(0, -1);
    }
  } else {
    title = title ?? qtState.params.title;
  }

  title = title + (dirty ? '*': '');
  if (qtState.is_new_tab) {
    window.document.title = title;
  } else {
    docker.setInternalAttrs(panelId, {
      isDirty: dirty,
    });
    setQueryToolDockerTitle(docker, panelId, true, title, qtState.current_file);
  }
}

const FIXED_PREF = {
  find: {
    'control': true,
    ctrl_is_meta: true,
    'shift': false,
    'alt': false,
    'key': {
      'key_code': 70,
      'char': 'F',
    },
  },
  replace: {
    'control': true,
    ctrl_is_meta: true,
    'shift': false,
    'alt': true,
    'key': {
      'key_code': 70,
      'char': 'F',
    },
  },
  gotolinecol: {
    'control': true,
    ctrl_is_meta: true,
    'shift': false,
    'alt': false,
    'key': {
      'key_code': 76,
      'char': 'L',
    },
  },
  indent: {
    'control': false,
    'shift': false,
    'alt': false,
    'key': {
      'key_code': 9,
      'char': 'Tab',
    },
  },
  unindent: {
    'control': false,
    'shift': true,
    'alt': false,
    'key': {
      'key_code': 9,
      'char': 'Tab',
    },
  },
  comment: {
    'control': true,
    ctrl_is_meta: true,
    'shift': false,
    'alt': false,
    'key': {
      'key_code': 191,
      'char': '/',
    },
  },
  format_sql: {
    'control': true,
    ctrl_is_meta: true,
    'shift': false,
    'alt': false,
    'key': {
      'key_code': 75,
      'char': 'k',
    },
  },
};

export default function QueryToolComponent({params, pgWindow, pgAdmin, selectedNodeInfo, qtPanelDocker, qtPanelId, eventBusObj}) {
  const containerRef = React.useRef(null);
  const preferencesStore = usePreferences();
  const [qtState, setQtState] = useState({
    preferences: {
      browser: preferencesStore.getPreferencesForModule('browser'),
      sqleditor: {...preferencesStore.getPreferencesForModule('sqleditor'), ...FIXED_PREF},
      graphs: preferencesStore.getPreferencesForModule('graphs'),
      misc: preferencesStore.getPreferencesForModule('misc'),
    },
    is_new_tab: window.location == window.parent?.location,
    is_visible: true,
    current_file: null,
    obtaining_conn: true,
    connected: false,
    connected_once: false,
    connection_status: null,
    connection_status_msg: '',
    params: {
      ...params,
      title: _.unescape(params.title),
      is_query_tool: params.is_query_tool == 'true',
      node_name: retrieveNodeName(selectedNodeInfo),
      dbname: _.unescape(params.database_name) || getDatabaseLabel(selectedNodeInfo)
    },
    connection_list: [{
      sgid: params.sgid,
      sid: params.sid,
      did: params.did,
      user: _.unescape(params.user),
      role: _.unescape(params.role),
      title: _.unescape(params.title),
      fgcolor: params.fgcolor,
      bgcolor: params.bgcolor,
      conn_title: getTitle(
        pgAdmin, null, selectedNodeInfo, true, _.unescape(params.server_name), _.unescape(params.database_name) || getDatabaseLabel(selectedNodeInfo),
        _.unescape(params.role) || _.unescape(params.user), params.is_query_tool == 'true'),
      server_name: _.unescape(params.server_name),
      database_name: _.unescape(params.database_name) || getDatabaseLabel(selectedNodeInfo),
      is_selected: true,
    }],
    editor_disabled:true,
    eol:OS_EOL
  });
  const [selectedText, setSelectedText] = useState('');

  const setQtStatePartial = (state)=>{
    setQtState((prev)=>({...prev,...evalFunc(null, state, prev)}));
  };
  const isDirtyRef = useRef(false); // usefull when conn change.
  const eventBus = useRef(eventBusObj || (new EventBus()));
  const docker = useRef(null);
  const api = useMemo(()=>getApiInstance(), []);
  const modal = useModal();

  /* Connection status poller */
  let pollTime = qtState.preferences.sqleditor.connection_status_fetch_time > 0
    && !qtState.obtaining_conn && qtState.connected_once && qtState.preferences?.sqleditor?.connection_status ?
    qtState.preferences.sqleditor.connection_status_fetch_time*1000 : -1;
  /* No need to poll when the query is executing. Query poller will get the txn status */
  if(qtState.connection_status === CONNECTION_STATUS.TRANSACTION_STATUS_ACTIVE && qtState.connected
      || !qtState.is_visible) {
    pollTime = -1;
  }

  const handleEndOfLineChange = useCallback((e)=>{
    const val = e.value || e;
    const lineSep = val === 'crlf' ? '\r\n' : '\n';
    setQtStatePartial({ eol: val });
    eventBus.current.fireEvent(QUERY_TOOL_EVENTS.CHANGE_EOL, lineSep);
  }, []);

  useInterval(async ()=>{
    try {
      let {data: respData} = await fetchConnectionStatus(api, qtState.params.trans_id);
      if(respData.data) {
        setQtStatePartial({
          connected: true,
          connection_status: respData.data.status,
        });
      } else {
        setQtStatePartial({
          connected: false,
          connection_status: null,
          connection_status_msg: gettext('An unexpected error occurred - ensure you are logged into the application.')
        });
      }
      if(respData.data.notifies) {
        eventBus.current.fireEvent(QUERY_TOOL_EVENTS.PUSH_NOTICE, respData.data.notifies);
      }
    } catch (error) {
      console.error(error);
      setQtStatePartial({
        connected: false,
        connection_status: null,
        connection_status_msg: parseApiError(error),
      });
    }
  }, pollTime);

  let defaultLayout = {
    dockbox: {
      mode: 'vertical',
      children: [
        {
          mode: 'horizontal',
          children: [
            {
              maximizable: true,
              tabs: [
                LayoutDocker.getPanel({id: PANELS.QUERY, title: gettext('Query'), content: <Query  onTextSelect={(text) => setSelectedText(text)} setQtStatePartial={setQtStatePartial}/>}),
                LayoutDocker.getPanel({id: PANELS.HISTORY, title: gettext('Query History'), content: <QueryHistory />,
                  cached: undefined}),
              ],
            },
            {
              size: 75,
              maximizable: true,
              tabs: [
                LayoutDocker.getPanel({
                  id: PANELS.SCRATCH, title: gettext('Scratch Pad'),
                  closable: true,
                  content: <textarea style={{
                    border: 0,
                    height: '100%',
                    width: '100%',
                    resize: 'none'
                  }} title={gettext('Scratch Pad')}/>
                }),
              ]
            }
          ]
        },
        {
          mode: 'horizontal',
          children: [
            {
              maximizable: true,
              tabs: [
                LayoutDocker.getPanel({
                  id: PANELS.DATA_OUTPUT, title: gettext('Data Output'), content: <ResultSet />,
                }),
                LayoutDocker.getPanel({
                  id: PANELS.MESSAGES, title: gettext('Messages'), content: <Messages />,
                }),
                LayoutDocker.getPanel({
                  id: PANELS.NOTIFICATIONS, title: gettext('Notifications'), content: <Notifications />,
                }),
              ],
            }
          ]
        },
      ]
    },
  };

  const getSQLScript = () => {
    // Fetch the SQL for Scripts (eg: CREATE/UPDATE/DELETE/SELECT)
    // Call AJAX only if script type URL is present
    if (qtState.params.is_query_tool && qtState.params.query_url) {
      api.get(qtState.params.query_url)
        .then((res) => {
          eventBus.current.fireEvent(QUERY_TOOL_EVENTS.EDITOR_SET_SQL, res.data);
          setQtStatePartial({ editor_disabled: false });
        })
        .catch((err) => {
          eventBus.current.fireEvent(QUERY_TOOL_EVENTS.HANDLE_API_ERROR, err);
          setQtStatePartial({ editor_disabled: true });
        });
    } else if (qtState.params.sql_id) {
      let sqlValue = localStorage.getItem(qtState.params.sql_id);
      localStorage.removeItem(qtState.params.sql_id);
      if (sqlValue) {
        eventBus.current.fireEvent(QUERY_TOOL_EVENTS.EDITOR_SET_SQL, sqlValue);
      }
      setQtStatePartial({ editor_disabled: false });
    } else {
      setQtStatePartial({ editor_disabled: false });
    }
  };

  const initializeQueryTool = (password, explainObject=null, macroSQL='', executeCursor=false, reexecute=false)=>{
    let selectedConn = _.find(qtState.connection_list, (c)=>c.is_selected);
    let baseUrl = '';
    if(qtState.params.is_query_tool) {
      let endpoint = 'sqleditor.initialize_sqleditor';

      if(qtState.params.did) {
        endpoint = 'sqleditor.initialize_sqleditor_with_did';
      }
      baseUrl = url_for(endpoint, {
        ...selectedConn,
        trans_id: qtState.params.trans_id,
      });
    } else {
      baseUrl = url_for('sqleditor.initialize_viewdata', {
        ...qtState.params,
      });
    }
    api.post(baseUrl, qtState.params.is_query_tool ? {
      user: selectedConn.user,
      role: selectedConn.role,
      password: password,
      dbname: selectedConn.database_name
    } : qtState.params.sql_filter)
      .then(()=>{
        setQtStatePartial({
          connected: true,
          connected_once: true,
          obtaining_conn: false,
        });
        //this condition works if user is in View/Edit Data or user does not saved server or tunnel password and disconnected the server and executing the query
        if(!qtState.params.is_query_tool || reexecute) {
          eventBus.current.fireEvent(QUERY_TOOL_EVENTS.TRIGGER_EXECUTION, explainObject, macroSQL, executeCursor);
          let msg = `${selectedConn['server_name']}/${selectedConn['database_name']} - Database connected`;
          pgAdmin.Browser.notifier.success(_.escape(msg));
        }
      }).catch((error)=>{
        if(error.response?.request?.responseText?.search('Ticket expired') !== -1) {
          Kerberos.fetch_ticket()
            .then(()=>{
              initializeQueryTool();
            })
            .catch((kberr)=>{
              setQtStatePartial({
                connected: false,
                obtaining_conn: false,
              });
              eventBus.current.fireEvent(QUERY_TOOL_EVENTS.HANDLE_API_ERROR, kberr);
            });
        } else if(error?.response?.status == 428) {
          connectServerModal(error.response?.data?.result, (passwordData)=>{
            initializeQueryTool(passwordData.password);
          }, ()=>{
            setQtStatePartial({
              connected: false,
              obtaining_conn: false,
              connection_status_msg: gettext('Not Connected'),
            });
          });
        } else {
          setQtStatePartial({
            connected: false,
            obtaining_conn: false,
          });
          eventBus.current.fireEvent(QUERY_TOOL_EVENTS.HANDLE_API_ERROR, error);
        }
      });
  };

  const {forceClose} = useBeforeUnload({
    enabled: qtState.preferences.browser.confirm_on_refresh_close,
    isNewTab: qtState.is_new_tab,
    beforeClose: ()=>{
      eventBus.current.fireEvent(QUERY_TOOL_EVENTS.WARN_SAVE_DATA_CLOSE);
    },
    closePanel: ()=>{
      qtPanelDocker.close(qtPanelId, true);
    }
  });

  useEffect(()=>{
    getSQLScript();
    initializeQueryTool();

    eventBus.current.registerListener(QUERY_TOOL_EVENTS.REINIT_QT_CONNECTION, initializeQueryTool);

    eventBus.current.registerListener(QUERY_TOOL_EVENTS.FOCUS_PANEL, (qtPanelId)=>{
      docker.current.focus(qtPanelId);
    });

    eventBus.current.registerListener(QUERY_TOOL_EVENTS.SET_CONNECTION_STATUS, (status)=>{
      setQtStatePartial({connection_status: status});
    });

    eventBus.current.registerListener(QUERY_TOOL_EVENTS.FORCE_CLOSE_PANEL, ()=>{
      forceClose();
    });

    qtPanelDocker.eventBus.registerListener(LAYOUT_EVENTS.CLOSING, (id)=>{
      if(qtPanelId == id) {
        eventBus.current.fireEvent(QUERY_TOOL_EVENTS.WARN_SAVE_DATA_CLOSE);
      }
    });

    qtPanelDocker.eventBus.registerListener(LAYOUT_EVENTS.ACTIVE, _.debounce((currentTabId)=>{
      /* Focus the appropriate panel on visible */
      if(qtPanelId == currentTabId) {
        setQtStatePartial({is_visible: true});

        if(docker.current.isTabVisible(PANELS.QUERY)) {
          docker.current.focus(PANELS.QUERY);
        } else if(docker.current.isTabVisible(PANELS.HISTORY)) {
          docker.current.focus(PANELS.HISTORY);
        }

        eventBus.current.fireEvent(QUERY_TOOL_EVENTS.GOTO_LAST_SCROLL);
      } else {
        setQtStatePartial({is_visible: false});
      }
    }, 100));

    /* If the tab or window is not visible, applicable for open in new tab */
    document.addEventListener('visibilitychange', function() {
      if(document.hidden) {
        setQtStatePartial({is_visible: false});
      } else {
        setQtStatePartial({is_visible: true});
      }
    });
  }, []);

  useEffect(() => usePreferences.subscribe(
    state => {
      setQtStatePartial({preferences: {
        browser: state.getPreferencesForModule('browser'),
        sqleditor: {...state.getPreferencesForModule('sqleditor'), ...FIXED_PREF},
        graphs: state.getPreferencesForModule('graphs'),
        misc: state.getPreferencesForModule('misc'),
      }});
    }
  ), []);

  useEffect(()=>{
    const closeConn = ()=>{
      /* Using fetch with keepalive as the browser may
      cancel the axios request on tab close. keepalive will
      make sure the request is completed */
      callFetch(
        url_for('sqleditor.close', {
          'trans_id': qtState.params.trans_id,
        }), {
          keepalive: true,
          method: 'DELETE',
        }
      )
        .then(()=>{/* Success */})
        .catch((err)=>console.error(err));
    };
    window.addEventListener('unload', closeConn);

    const pushHistory = (h)=>{
      // Do not store query text if max lenght exceeds.
      if(h?.query?.length > MAX_QUERY_LENGTH) {
        h = {
          ...h,
          query: gettext(`-- Query text not stored as it exceeds maximum length of ${MAX_QUERY_LENGTH}`)
        };
      }
      api.post(
        url_for('sqleditor.add_query_history', {
          'trans_id': qtState.params.trans_id,
        }),
        JSON.stringify(h),
      ).catch((error)=>{console.error(error);});
    };
    eventBus.current.registerListener(QUERY_TOOL_EVENTS.PUSH_HISTORY, pushHistory);
    return ()=>{
      eventBus.current.deregisterListener(QUERY_TOOL_EVENTS.PUSH_HISTORY, pushHistory);
      window.removeEventListener('unload', closeConn);
    };
  }, [qtState.params.trans_id]);


  const handleApiError = (error, handleParams)=>{
    if(error.response?.status == 503 && error.response.data?.info == 'CONNECTION_LOST') {
      // We will display re-connect dialog, no need to display error message again
      modal.confirm(
        gettext('Connection Warning'),
        <p>
          <span>{gettext('The application has lost the database connection:')}</span>
          <br/><span>{gettext('⁃ If the connection was idle it may have been forcibly disconnected.')}</span>
          <br/><span>{gettext('⁃ The application server or database server may have been restarted.')}</span>
          <br/><span>{gettext('⁃ The user session may have timed out.')}</span>
          <br />
          <span>{gettext('Do you want to continue and establish a new session')}</span>
        </p>,
        function() {
          handleParams?.connectionLostCallback?.();
        }, null,
        gettext('Continue'),
        gettext('Cancel')
      );
    } else if(handleParams?.checkTransaction && error.response?.data.info == 'DATAGRID_TRANSACTION_REQUIRED') {
      let selectedConn = _.find(qtState.connection_list, (c)=>c.is_selected);
      initConnection(api, {
        'gid': selectedConn.sgid,
        'sid': selectedConn.sid,
        'did': selectedConn.did,
        'role': selectedConn.role,
      }).then(()=>{
        initializeQueryTool();
      }).catch((err)=>{
        eventBus.fireEvent(QUERY_TOOL_EVENTS.HANDLE_API_ERROR, err);
      });
    } else if(error.response?.status == 403  && error.response?.data.info == 'ACCESS_DENIED') {
      pgAdmin.Browser.notifier.error(error.response.data.errormsg);
    }else {
      let msg = parseApiError(error);
      eventBus.current.fireEvent(QUERY_TOOL_EVENTS.SET_MESSAGE, msg, true);
      eventBus.current.fireEvent(QUERY_TOOL_EVENTS.FOCUS_PANEL, PANELS.MESSAGES);
    }
  };

  useEffect(()=>{
    const fileDone = (fileName, success=true)=>{
      if(success) {
        setQtStatePartial({
          current_file: fileName,
        });
        isDirtyRef.current = false;
        setPanelTitle(qtPanelDocker, qtPanelId, fileName, {...qtState, current_file: fileName}, isDirtyRef.current);
      }
      eventBus.current.fireEvent(QUERY_TOOL_EVENTS.EDITOR_LAST_FOCUS);
    };
    const events = [
      [QUERY_TOOL_EVENTS.TRIGGER_LOAD_FILE, ()=>{
        let fileParams = {
          'supported_types': ['sql', '*'], // file types allowed
          'dialog_type': 'select_file', // open select file dialog
        };
        pgAdmin.Tools.FileManager.show(fileParams, (fileName, storage)=>{
          eventBus.current.fireEvent(QUERY_TOOL_EVENTS.LOAD_FILE, fileName, storage);
        }, null, modal);
      }],
      [QUERY_TOOL_EVENTS.TRIGGER_SAVE_FILE, (isSaveAs=false)=>{
        if(!isSaveAs && qtState.current_file) {
          eventBus.current.fireEvent(QUERY_TOOL_EVENTS.SAVE_FILE, qtState.current_file);
        } else {
          let fileParams = {
            'supported_types': ['sql', '*'],
            'dialog_type': 'create_file',
            'dialog_title': 'Save File',
            'btn_primary': 'Save',
          };
          pgAdmin.Tools.FileManager.show(fileParams, (fileName)=>{
            eventBus.current.fireEvent(QUERY_TOOL_EVENTS.SAVE_FILE, fileName);
          }, null, modal);
        }
      }],
      [QUERY_TOOL_EVENTS.LOAD_FILE_DONE, fileDone],
      [QUERY_TOOL_EVENTS.SAVE_FILE_DONE, fileDone],
      [QUERY_TOOL_EVENTS.QUERY_CHANGED, (isDirty)=>{
        isDirtyRef.current = isDirty;
        if(qtState.params.is_query_tool) {
          setPanelTitle(qtPanelDocker, qtPanelId, null, qtState, isDirty);
        }
      }],
      [QUERY_TOOL_EVENTS.HANDLE_API_ERROR, handleApiError],
    ];

    events.forEach((e)=>{
      eventBus.current.registerListener(e[0], e[1]);
    });

    return ()=>{
      events.forEach((e)=>{
        eventBus.current.deregisterListener(e[0], e[1]);
      });
    };
  }, [qtState.params, qtState.current_file]);

  useEffect(()=>{
    /* Fire query change so that title changes to latest */
    eventBus.current.fireEvent(QUERY_TOOL_EVENTS.TRIGGER_QUERY_CHANGE);
  }, [qtState.params.title]);

  const connectServerModal = async (modalData, connectCallback, cancelCallback) => {
    modal.showModal(gettext('Connect to server'), (closeModal)=>{
      return (
        <ConnectServerContent
          closeModal={()=>{
            cancelCallback?.();
            closeModal();
          }}
          data={modalData}
          onOK={(formData)=>{
            connectCallback(Object.fromEntries(formData));
            closeModal();
          }}
        />
      );
    }, {
      onClose: cancelCallback,
    });
  };

  const updateQueryToolConnection = (connectionData, isNew=false)=>{
    let currSelectedConn = _.find(qtState.connection_list, (c)=>c.is_selected);
    let currConnected = qtState.connected;

    const selectConn = (newConnData, connected=false, obtainingConn=true)=>{
      setQtStatePartial((prevQtState)=>{
        let newConnList = [...prevQtState.connection_list];
        /* If new, add to the list */
        if(isNew) {
          newConnList.push(newConnData);
        }
        for (const connItem of newConnList) {
          if(newConnData.sid == connItem.sid
            && newConnData.did == connItem.did
            && newConnData.user == connItem.user
            && newConnData.role == connItem.role) {
            connItem.is_selected = true;
          } else {
            connItem.is_selected = false;
          }
        }
        return {
          connection_list: newConnList,
          obtaining_conn: obtainingConn,
          connected: connected,
        };
      });
    };
    /* If not new, select it initially to show loading */
    if(!isNew) {
      selectConn(connectionData);
    }

    return new Promise((resolve, reject)=>{
      api.post(url_for('sqleditor.update_sqleditor_connection', {
        trans_id: qtState.params.trans_id,
        sgid: connectionData.sgid,
        sid: connectionData.sid,
        did: connectionData.did
      }), connectionData)
        .then(({data: respData})=>{
          if(isNew) {
            selectConn(connectionData);
          }
          setQtStatePartial((prev)=>{
            return {
              params: {
                ...prev.params,
                trans_id: respData.data.trans_id,
                server_name: connectionData.server_name,
                database_name: connectionData.database_name,
                dbname: connectionData.database_name,
                user: connectionData.user,
                sid: connectionData.sid,
                did: connectionData.did,
                title: connectionData.title,
                fgcolor: connectionData.fgcolor,
                bgcolor: connectionData.bgcolor,
              },
              connected: Boolean(respData.data.trans_id),
              obtaining_conn: false,
            };
          });
          setPanelTitle(qtPanelDocker, qtPanelId, connectionData.title, qtState, isDirtyRef.current);
          let msg = `${connectionData['server_name']}/${connectionData['database_name']} - Database connected`;
          pgAdmin.Browser.notifier.success(_.escape(msg));
          resolve();
        })
        .catch((error)=>{
          if(error?.response?.status == 428) {
            connectServerModal(error.response?.data?.result, (passwordData)=>{
              resolve(
                updateQueryToolConnection({
                  ...connectionData,
                  ...passwordData,
                }, isNew)
              );
            }, ()=>{
              /*This is intentional (SonarQube)*/
            });
          } else {
            selectConn(currSelectedConn, currConnected, false);
            reject(error instanceof Error ? error : Error(gettext('Something went wrong')));
          }
        });
    });
  };

  const onNewConnClick = useCallback(()=>{
    const onClose = ()=>docker.current.close('new-conn');
    docker.current.openDialog({
      id: 'new-conn',
      title: gettext('Add New Connection'),
      content: <NewConnectionDialog onSave={(_isNew, data)=>{
        return new Promise((resolve, reject)=>{
          let connectionData = {
            sgid: 0,
            sid: data.sid,
            did: data.did,
            user: data.user,
            role: data.role,
            password: data.password,
            title: getTitle(pgAdmin, qtState.preferences.browser, null, false, data.server_name, data.database_name, data.role || data.user, true),
            conn_title: getTitle(pgAdmin, null, null, true, data.server_name, data.database_name, data.role || data.user, true),
            server_name: data.server_name,
            database_name: data.database_name,
            bgcolor: data.bgcolor,
            fgcolor: data.fgcolor,
            is_selected: true,
          };

          let existIdx = _.findIndex(qtState.connection_list, (conn)=>{
            conn.role= conn.role == ''? null :conn.role;
            return(
              conn.sid == connectionData.sid  && conn.database_name == connectionData.database_name
              && conn.user == connectionData.user && conn.role == connectionData.role
            );
          });
          if(existIdx > -1) {
            reject(new Error(gettext('Connection with this configuration already present.')));
            return;
          }
          updateQueryToolConnection(connectionData, true)
            .catch((err)=>{
              reject(err instanceof Error ? err : Error(gettext('Something went wrong')));
            }).then(()=>{
              resolve();
              onClose();
            });
        });
      }}
      onClose={onClose}/>
    });
  }, [qtState.preferences.browser, qtState.connection_list, qtState.params]);


  const onNewQueryToolClick = ()=>{
    const transId = commonUtils.getRandomInt(1, 9999999);
    let selectedConn = _.find(qtState.connection_list, (c)=>c.is_selected);
    let parentData = {
      server_group: {
        _id: selectedConn.sgid || 0,
      },
      server: {
        _id: selectedConn.sid,
        server_type: qtState.params.server_type,
      },
      database: {
        _id: selectedConn.did,
        label: selectedConn.database_name,
        _label: selectedConn.database_name,
      },
    };

    const gridUrl = showQueryTool.generateUrl(transId, parentData, null);
    const title = getTitle(pgAdmin, qtState.preferences.browser, null, false, selectedConn.server_name, selectedConn.database_name, selectedConn.role || selectedConn.user);
    showQueryTool.launchQueryTool(pgWindow.pgAdmin.Tools.SQLEditor, transId, gridUrl, title, {
      user: selectedConn.user,
      role: selectedConn.role,
    });
  };

  const onManageMacros = useCallback(()=>{
    const onClose = ()=>docker.current.close('manage-macros');
    docker.current.openDialog({
      id: 'manage-macros',
      title: gettext('Manage Macros'),
      content: <MacrosDialog onSave={(newMacros)=>{
        setQtStatePartial((prev)=>{
          return {
            params: {
              ...prev.params,
              macros: newMacros,
            },
          };
        });
      }}
      onClose={onClose}/>
    }, 850, 500);
  }, [qtState.preferences.browser]);

  const onAddToMacros = () => {
    if (selectedText){
      let currMacros = qtState.params.macros;
      const existingNames = currMacros.map(macro => macro.name);
      const newName = getRandomName(existingNames);
      let changed = [{ 'name': newName, 'sql': selectedText }];

      api.put(
        url_for('sqleditor.set_macros', {
          'trans_id': qtState.params.trans_id,
        }),
        { changed: changed }
      )
        .then(({ data: respData }) => {
          const filteredData = respData.filter(m => Boolean(m.name));
          setQtStatePartial(prev => ({
            ...prev,
            params: {
              ...prev.params,
              macros: filteredData,
            },
          }));
        })
        .catch(error => {
          console.error(error);
        });
    }
    setSelectedText('');
  };


  const onFilterClick = useCallback(()=>{
    const onClose = ()=>docker.current.close('filter-dialog');
    docker.current.openDialog({
      id: 'filter-dialog',
      title: gettext('Sort/Filter options'),
      content: <FilterDialog onSave={()=>{
        onClose();
        eventBus.current.fireEvent(QUERY_TOOL_EVENTS.TRIGGER_EXECUTION);
      }}
      onClose={onClose}/>
    }, 700, 400);
  }, [qtState.preferences.browser]);

  const onResetLayout = useCallback(()=>{
    docker.current?.resetLayout();
    eventBus.current.fireEvent(QUERY_TOOL_EVENTS.FOCUS_PANEL, PANELS.QUERY);
  }, []);

  const queryToolContextValue = React.useMemo(()=>({
    docker: docker.current,
    api: api,
    modal: modal,
    params: qtState.params,
    preferences: qtState.preferences,
    mainContainerRef: containerRef,
    editor_disabled: qtState.editor_disabled,
    eol: qtState.eol,
    toggleQueryTool: () => setQtStatePartial((prev)=>{
      return {
        ...prev,
        params: {
          ...prev.params,
          is_query_tool: true
        }
      };
    }),
    updateTitle: (title) => {
      setPanelTitle(qtPanelDocker, qtPanelId, title, qtState, isDirtyRef.current);
      setQtStatePartial((prev) => {
        // Update connection Title
        let newConnList = [...prev.connection_list];
        newConnList.forEach((conn) => {
          if (conn.sgid == params.sgid && conn.sid == params.sid && conn.did == params.did) {
            conn.title = title;
            conn.conn_title = title;
          }
        });
        return {
          ...prev,
          params: {
            ...prev.params,
            title: title
          },
          connection_list: newConnList,
        };
      });
    },
  }), [qtState.params, qtState.preferences, containerRef.current, qtState.editor_disabled, qtState.eol]);

  const queryToolConnContextValue = React.useMemo(()=>({
    connected: qtState.connected,
    obtainingConn: qtState.obtaining_conn,
    connectionStatus: qtState.connection_status,
  }), [qtState]);

  /* Push only those things in context which do not change frequently */
  return (
    <QueryToolContext.Provider value={queryToolContextValue}>
      <QueryToolConnectionContext.Provider value={queryToolConnContextValue}>
        <QueryToolEventsContext.Provider value={eventBus.current}>
          <Box width="100%" height="100%" display="flex" flexDirection="column" flexGrow="1" tabIndex="0" ref={containerRef}>
            <ConnectionBar
              connected={qtState.connected}
              connecting={qtState.obtaining_conn}
              connectionStatus={qtState.connection_status}
              connectionStatusMsg={qtState.connection_status_msg}
              connectionList={qtState.connection_list}
              onConnectionChange={(connectionData)=>updateQueryToolConnection(connectionData)}
              onNewConnClick={onNewConnClick}
              onNewQueryToolClick={onNewQueryToolClick}
              onResetLayout={onResetLayout}
              docker={docker.current}
              containerRef={containerRef}
            />
            {React.useMemo(()=>(
              <MainToolBar
                containerRef={containerRef}
                onManageMacros={onManageMacros}
                onAddToMacros={onAddToMacros}
                onFilterClick={onFilterClick}
              />), [containerRef.current, onManageMacros, onFilterClick, onAddToMacros])}
            <Layout
              getLayoutInstance={(obj)=>docker.current=obj}
              defaultLayout={defaultLayout}
              layoutId="SQLEditor/Layout"
              savedLayout={params.layout}
              resetToTabPanel={PANELS.MESSAGES}
            />
            <StatusBar eol={qtState.eol} handleEndOfLineChange={handleEndOfLineChange}/>
          </Box>
        </QueryToolEventsContext.Provider>
      </QueryToolConnectionContext.Provider>
    </QueryToolContext.Provider>
  );
}

QueryToolComponent.propTypes = {
  params:PropTypes.shape({
    trans_id: PropTypes.number.isRequired,
    sgid: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    sid: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    did: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    server_type: PropTypes.string,
    title: PropTypes.string.isRequired,
    bgcolor: PropTypes.string,
    fgcolor: PropTypes.string,
    is_query_tool: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]).isRequired,
    user: PropTypes.string,
    role: PropTypes.string,
    server_name: PropTypes.string,
    database_name: PropTypes.string,
    layout: PropTypes.string,
  }),
  pgWindow: PropTypes.object.isRequired,
  pgAdmin: PropTypes.object.isRequired,
  selectedNodeInfo: PropTypes.object,
  qtPanelDocker: PropTypes.object,
  qtPanelId: PropTypes.string,
  eventBusObj: PropTypes.objectOf(EventBus),
};
