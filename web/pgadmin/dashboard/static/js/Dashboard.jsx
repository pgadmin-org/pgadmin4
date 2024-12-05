/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import React, { useEffect, useMemo, useState, Fragment } from 'react';
import { styled } from '@mui/material/styles';
import gettext from 'sources/gettext';
import PropTypes from 'prop-types';
import getApiInstance from 'sources/api_instance';
import PgTable from 'sources/components/PgTable';
import { InputCheckbox, FormInputSwitch, FormInputToggle } from '../../../static/js/components/FormComponents';
import url_for from 'sources/url_for';
import Graphs from './Graphs';
import { Box, Tab, Tabs } from '@mui/material';
import { PgIconButton } from '../../../static/js/components/Buttons';
import CancelIcon from '@mui/icons-material/Cancel';
import StopSharpIcon from '@mui/icons-material/StopSharp';
import WelcomeDashboard from './WelcomeDashboard';
import ActiveQuery from './ActiveQuery.ui';
import ServerLog from './ServerLog.ui';
import _ from 'lodash';
import EmptyPanelMessage from '../../../static/js/components/EmptyPanelMessage';
import TabPanel from '../../../static/js/components/TabPanel';
import Summary from './SystemStats/Summary';
import CpuDetails from './SystemStats/CpuDetails';
import Memory from './SystemStats/Memory';
import Storage from './SystemStats/Storage';
import withStandardTabInfo from '../../../static/js/helpers/withStandardTabInfo';
import { BROWSER_PANELS } from '../../../browser/static/js/constants';
import { usePgAdmin } from '../../../static/js/BrowserComponent';
import usePreferences from '../../../preferences/static/js/store';
import ErrorBoundary from '../../../static/js/helpers/ErrorBoundary';
import { parseApiError } from '../../../static/js/api_instance';
import SectionContainer from './components/SectionContainer';
import Replication from './Replication';
import { getExpandCell } from '../../../static/js/components/PgReactTableStyled';
import CodeMirror from '../../../static/js/components/ReactCodeMirror';
import GetAppRoundedIcon from '@mui/icons-material/GetAppRounded';
import { getBrowser } from '../../../static/js/utils';
import RefreshButton from './components/RefreshButtons';

function parseData(data) {
  let res = [];

  data.forEach((row) => {
    res.push({ ...row, icon: '' });
  });
  return res;
}
const Root = styled('div')(({theme}) => ({
  height: '100%',
  width: '100%',
  '& .Dashboard-dashboardPanel': {
    height: '100%',
    background: theme.palette.grey[400],
    '& .Dashboard-panelContent': {
      ...theme.mixins.panelBorder.all,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden !important',
      height: '100%',
      width: '100%',
      minHeight: '400px',
      padding: '4px',
      '& .serverLog .TabPanel-content': {
        height: '94%',
      },
      '& .systemStorage .TabPanel-content': {
        overflowY: 'auto',
        overflowX: 'hidden',
      },
      '& .Dashboard-cardHeader': {
        padding: '8px',
      },
      '& .Dashboard-mainTabs': {
        ...theme.mixins.panelBorder.all,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        '& .Dashboard-terminateButton': {
          color: theme.palette.error.main
        },
        '& .Dashboard-download': {
          '& .Dashboard-downloadButton': {
            width: '40px',
            height:'30px !important',
          },
        },
        '& .RefreshButtons': {
          display: 'flex',
        },
      },
    },
  },
  '& .Dashboard-emptyPanel': {
    width: '100%',
    background: theme.otherVars.emptySpaceBg,
    padding: '8px',
    display: 'flex',
  },
}));

let activeQSchemaObj = new ActiveQuery();
let serverLogSchemaObj = new ServerLog();

const cellPropTypes = {
  row: PropTypes.any,
};

function getTerminateCell(pgAdmin, sid, did, canTakeAction, onSuccess) {
  function TerminateCell({row}) {
    let terminate_session_url =
      url_for('dashboard.index') + 'terminate_session' + '/' + sid,
      title = gettext('Terminate Session?'),
      txtConfirm = gettext(
        'Are you sure you wish to terminate the session?'
      ),
      txtSuccess = gettext('Session terminated successfully.'),
      txtError = gettext(
        'An error occurred whilst terminating the active query.'
      );
    const action_url = did
      ? terminate_session_url + '/' + did
      : terminate_session_url;

    const api = getApiInstance();

    return (
      <PgIconButton
        size="xs"
        noBorder
        icon={<CancelIcon />}
        className='Dashboard-terminateButton'
        onClick={() => {
          if (
            !canTakeAction(row, 'terminate')
          )
            return;
          let url = action_url + '/' + row.original.pid;
          pgAdmin.Browser.notifier.confirm(
            title,
            txtConfirm,
            function () {
              api
                .delete(url)
                .then(function (res) {
                  if (res.data == gettext('Success')) {
                    pgAdmin.Browser.notifier.success(txtSuccess);
                    onSuccess?.();
                  } else {
                    pgAdmin.Browser.notifier.error(txtError);
                  }
                })
                .catch(function (error) {
                  pgAdmin.Browser.notifier.alert(
                    gettext('Failed to perform the operation.'),
                    parseApiError(error)
                  );
                });
            },
            function () {
              return true;
            }
          );
        }}
        aria-label="Terminate Session?"
        title={gettext('Terminate Session?')}
      ></PgIconButton>
    );
  }

  TerminateCell.propTypes = cellPropTypes;
  return TerminateCell;
}

function getCancelCell(pgAdmin, sid, did, canTakeAction, onSuccess) {
  function CancelCell({ row }) {
    let cancel_query_url =
      url_for('dashboard.index') + 'cancel_query' + '/' + sid,
      title = gettext('Cancel Active Query?'),
      txtConfirm = gettext(
        'Are you sure you wish to cancel the active query?'
      ),
      txtSuccess = gettext('Active query cancelled successfully.'),
      txtError = gettext(
        'An error occurred whilst cancelling the active query.'
      );

    const action_url = did ? cancel_query_url + '/' + did : cancel_query_url;

    const api = getApiInstance();

    return (
      <PgIconButton
        size="xs"
        noBorder
        icon={<StopSharpIcon/>}
        onClick={() => {
          if (!canTakeAction(row, 'cancel'))
            return;
          let url = action_url + '/' + row.original.pid;
          pgAdmin.Browser.notifier.confirm(
            title,
            txtConfirm,
            function () {
              api
                .delete(url)
                .then(function (res) {
                  if (res.data == gettext('Success')) {
                    pgAdmin.Browser.notifier.success(txtSuccess);
                    onSuccess?.();
                  } else {
                    pgAdmin.Browser.notifier.error(txtError);
                    onSuccess?.();
                  }
                })
                .catch(function (error) {
                  pgAdmin.Browser.notifier.alert(
                    gettext('Failed to perform the operation.'),
                    parseApiError(error)
                  );
                });
            },
            function () {
              return true;
            }
          );
        }}
        aria-label="Cancel the query"
        title={gettext('Cancel the active query')}
      ></PgIconButton>
    );
  }
  CancelCell.propTypes = cellPropTypes;
  return CancelCell;
}

function CustomRefresh({refresh, setRefresh}) {
  return (
    <RefreshButton noBorder={false} onClick={(e) => {
      e.preventDefault();
      setRefresh(!refresh);
    }}/>
  );
}
CustomRefresh.propTypes = {
  refresh: PropTypes.bool,
  setRefresh: PropTypes.func,
};


function ActiveOnlyHeader({activeOnly, setActiveOnly}) {
  return (
    <InputCheckbox
      label={gettext('Active sessions only')}
      labelPlacement="end"
      className='Dashboard-searchInput'
      onChange={(e) => {
        setActiveOnly(e.target.checked);
      }}
      value={activeOnly}
      controlProps={{
        label: gettext('Active sessions only'),
      }}
    />
  );
}
ActiveOnlyHeader.propTypes = {
  activeOnly: PropTypes.bool,
  setActiveOnly: PropTypes.func,
  refresh: PropTypes.bool,
  setRefresh: PropTypes.func,
};

function Dashboard({
  nodeItem, nodeData, node, treeNodeInfo,
  ...props
}) {
  const preferences = _.merge(
    usePreferences().getPreferencesForModule('dashboards'),
    usePreferences().getPreferencesForModule('graphs'),
    usePreferences().getPreferencesForModule('misc')
  );

  // Set Active tab depending on preferences setting
  let activeTab = 0;
  if (!_.isUndefined(preferences) && !preferences.show_graphs && preferences.show_activity) activeTab = 1;
  else if (!_.isUndefined(preferences) && !preferences.show_graphs && !preferences.show_activity) activeTab = 2;

  const api = getApiInstance();
  const [dashData, setDashData] = useState([]);
  const [msg, setMsg] = useState('');
  const [ssMsg, setSsMsg] = useState('');
  const [mainTabVal, setMainTabVal] = useState(activeTab);
  const [refresh, setRefresh] = useState(false);
  const [activeOnly, setActiveOnly] = useState(false);
  const [systemStatsTabVal, setSystemStatsTabVal] = useState(0);
  const [ldid, setLdid] = useState(0);

  const [logCol, setLogCol] = useState(false);
  const [logFormat, setLogFormat] = useState('T');
  const [logConfigFormat, setLogConfigFormat] = useState([]);
  const [nextPage, setNextPage] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isNextPageLoading, setIsNextPageLoading] = useState(false);


  const systemStatsTabChanged = (e, tabVal) => {
    setSystemStatsTabVal(tabVal);
  };
  const pgAdmin = usePgAdmin();
  const did = treeNodeInfo?.database?._id ?? 0;
  const sid = treeNodeInfo?.server?._id ?? 0;
  const dbConnected = treeNodeInfo?.database?.connected ?? false;
  const serverConnected = treeNodeInfo?.server?.connected ?? false;
  const prefStore = usePreferences();
  let mainTabs = [gettext('Activity'), gettext('State')];

  mainTabs.push(gettext('Configuration'), gettext('Logs'), gettext('System'));
  if(treeNodeInfo?.server?.replication_type) {
    mainTabs.push(gettext('Replication'));
  }
  let systemStatsTabs = [gettext('Summary'), gettext('CPU'), gettext('Memory'), gettext('Storage')];

  const mainTabChanged = (e, tabVal) => {
    setMainTabVal(tabVal);
  };

  const canTakeAction = (row, cellAction) => {
    // We will validate if user is allowed to cancel the active query
    // If there is only one active session means it probably our main
    // connection session
    cellAction = cellAction || null;
    let pg_version = treeNodeInfo.server.version || null,
      is_cancel_session = cellAction === 'cancel',
      txtMessage,
      maintenance_database = treeNodeInfo.server.db;

    let maintenanceActiveSessions = dashData.filter((data) => data.state === 'active'&&
      maintenance_database === data.datname);

    // With PG10, We have background process showing on dashboard
    // We will not allow user to cancel them as they will fail with error
    // anyway, so better usability we will throw our on notification

    // Background processes do not have database field populated
    if (pg_version && pg_version >= 100000 && !row.original.datname) {
      if (is_cancel_session) {
        txtMessage = gettext('You cannot cancel background worker processes.');
      } else {
        txtMessage = gettext(
          'You cannot terminate background worker processes.'
        );
      }
      pgAdmin.Browser.notifier.info(txtMessage);
      return false;
      // If it is the last active connection on maintenance db then error out
    } else if (
      maintenance_database == row.original.datname &&
      row.original.state == 'active' &&
      maintenanceActiveSessions.length === 1
    ) {
      if (is_cancel_session) {
        txtMessage = gettext(
          'You are not allowed to cancel the main active session.'
        );
      } else {
        txtMessage = gettext(
          'You are not allowed to terminate the main active session.'
        );
      }
      pgAdmin.Browser.notifier.error(txtMessage);
      return false;
    } else if (is_cancel_session && row.original.state == 'idle') {
      // If this session is already idle then do nothing
      pgAdmin.Browser.notifier.info(gettext('The session is already in idle state.'));
      return false;
    } else {
      // Will return true and let the backend handle all the cases.
      // Added as fix of #7217
      return true;
    }
  };

  const serverConfigColumns = [
    {
      accessorKey: 'name',
      header: gettext('Name'),
      enableSorting: true,
      enableResizing: true,
      enableFilters: true,
      minSize: 100,
      size: 100,
    },
    {
      accessorKey: 'category',
      header: gettext('Category'),
      enableSorting: true,
      enableResizing: true,
      enableFilters: true,
      minSize: 50,
      size: 50,
    },
    {
      accessorKey: 'setting',
      header: gettext('Value'),
      enableSorting: true,
      enableResizing: true,
      enableFilters: true,
      minSize: 50,
      size: 100,
    },
    {
      accessorKey: 'unit',
      header: gettext('Unit'),
      enableSorting: true,
      enableResizing: true,
      enableFilters: true,
      minSize: 30,
      size: 30,
    },
    {
      accessorKey: 'short_desc',
      header: gettext('Description'),
      enableSorting: true,
      enableResizing: true,
      enableFilters: true,
    },
  ];

  const downloadServerLogs = async () => {
    let extension = '.txt',
      type = 'plain',
      respData = '';

    if(logCol === false) {
      if (logFormat == 'C') {
        extension = '.csv';
        type = 'csv';
      } else if (logFormat == 'J') {
        extension = '.json';
        type = 'json';
      }
      respData = dashData[0]['pg_read_file'];
    } else if (logCol === true) {
      extension = '.csv';
      type = 'csv';
      respData = dashData.map((d)=> {return Object.values(d).join(','); }).join('\n');
    }

    let fileName = 'data-' + new Date().getTime() + extension;

    try {
      let respBlob = new Blob([respData], {type : 'text/'+type}),
        urlCreator = window.URL || window.webkitURL,
        download_url = urlCreator.createObjectURL(respBlob),
        link = document.createElement('a');

      document.body.appendChild(link);

      if (getBrowser() == 'IE' && window.navigator.msSaveBlob) {
        // IE10: (has Blob, but not a[download] or URL)
        window.navigator.msSaveBlob(respBlob, fileName);
      } else {
        link.setAttribute('href', download_url);
        link.setAttribute('download', fileName);
        link.click();
      }
      document.body.removeChild(link);
    } catch {
      setSsMsg(gettext('Failed to download the logs.'));
    }
  };

  const serverLogColumns = [
    {
      header: () => null,
      enableSorting: false,
      enableResizing: false,
      enableFilters: false,
      size: 35,
      maxSize: 35,
      minSize: 35,
      id: 'btn-edit',
      cell: getExpandCell({
        title: gettext('View the log details')
      }),
    },
    {
      accessorKey: 'error_severity',
      header: gettext('Error Severity'),
      enableSorting: true,
      enableResizing: true,
      enableFilters: true,
      size: 100,
      minSize: 35,
      filterFn: 'equalsString'
    },
    {
      accessorKey: 'timestamp',
      header: gettext('Log Prefix/Timestamp'),
      sortable: true,
      enableResizing: true,
      enableSorting: false,
      enableFilters: true,
      size: 150,
      minSize: 35,
      filterFn: 'equalsString'
    },
    {
      accessorKey: 'message',
      header: gettext('Logs'),
      enableResizing: true,
      enableSorting: false,
      enableFilters: false,
      size: 35,
      minSize: 200,
      filterFn: 'equalsString'
    },
  ];

  const activityColumns = [
    {
      header: () => null,
      enableSorting: true,
      enableResizing: false,
      enableFilters: false,
      size: 35,
      maxSize: 35,
      minSize: 35,
      id: 'btn-terminate',
      cell: getTerminateCell(pgAdmin, sid, did, canTakeAction, setRefresh, ()=>setRefresh(!refresh)),
    },
    {
      header: () => null,
      enableSorting: true,
      enableResizing: false,
      enableFilters: false,
      size: 35,
      maxSize: 35,
      minSize: 35,
      id: 'btn-cancel',
      cell: getCancelCell(pgAdmin, sid, did, canTakeAction, setRefresh, ()=>setRefresh(!refresh)),
    },
    {
      header: () => null,
      enableSorting: true,
      enableResizing: false,
      enableFilters: false,
      size: 35,
      maxSize: 35,
      minSize: 35,
      id: 'btn-edit',
      cell: getExpandCell({
        title: gettext('View the active session details')
      }),
    },
    {
      accessorKey: 'pid',
      header: gettext('PID'),
      enableSorting: true,
      enableResizing: true,
      enableFilters: true,
      minSize: 50,
      size: 60,
    },
    {
      accessorKey: 'datname',
      header: gettext('Database'),
      enableSorting: true,
      enableResizing: true,
      enableFilters: true,
      enableVisibility: !did,
      minSize: 50,
      size: 80,
    },
    {
      accessorKey: 'usename',
      header: gettext('User'),
      enableSorting: true,
      enableResizing: true,
      enableFilters: true,
      minSize: 50,
      size: 60,
    },
    {
      accessorKey: 'application_name',
      header: gettext('Application'),
      enableSorting: true,
      enableResizing: true,
      enableFilters: true,
      minSize: 50,
    },
    {
      accessorKey: 'client_addr',
      header: gettext('Client'),
      enableSorting: true,
      enableResizing: true,
      enableFilters: true,
      minSize: 50,
      size: 100
    },
    {
      accessorKey: 'backend_start',
      header: gettext('Backend start'),
      enableSorting: true,
      enableResizing: true,
      enableFilters: true,
      minSize: 100,
    },
    {
      accessorKey: 'xact_start',
      header: gettext('Transaction start'),
      enableSorting: true,
      enableResizing: true,
      enableFilters: true,
      minSize: 100,
    },
    {
      accessorKey: 'state',
      header: gettext('State'),
      enableSorting: true,
      enableResizing: true,
      enableFilters: true,
      minSize: 50,
      size: 50,
    },

    {
      accessorKey: 'waiting',
      header: gettext('Waiting'),
      enableSorting: true,
      enableResizing: true,
      enableFilters: true,
      enableVisibility: treeNodeInfo?.server?.version < 90600
    },
    {
      accessorKey: 'wait_event',
      header: gettext('Wait event'),
      enableSorting: true,
      enableResizing: true,
      enableFilters: true,
    },
    {
      accessorKey: 'blocking_pids',
      header: gettext('Blocking PIDs'),
      enableSorting: true,
      enableResizing: true,
      enableFilters: true,
    },
  ];

  const databaseLocksColumns = [
    {
      accessorKey: 'pid',
      header: gettext('PID'),
      enableSorting: true,
      enableResizing: true,
      enableFilters: true,
      minSize: 50,
      size: 50,
    },
    {
      accessorKey: 'datname',
      header: gettext('Database'),
      enableSorting: true,
      enableResizing: true,
      enableFilters: true,
      enableVisibility: !did,
      minSize: 50,
      size: 80,
    },
    {
      accessorKey: 'locktype',
      header: gettext('Lock type'),
      enableSorting: true,
      enableResizing: true,
      enableFilters: true,
      minSize: 50,
      size: 80,
    },
    {
      accessorKey: 'relation',
      header: gettext('Target relation'),
      enableSorting: true,
      enableResizing: true,
      enableFilters: true,
    },
    {
      accessorKey: 'page',
      header: gettext('Page'),
      enableSorting: true,
      enableResizing: true,
      enableFilters: true,
      minSize: 50,
      size: 80,
    },
    {
      accessorKey: 'tuple',
      header: gettext('Tuple'),
      enableSorting: true,
      enableResizing: true,
      enableFilters: true,
      minSize: 50,
      size: 50,
    },
    {
      accessorKey: 'virtualxid',
      header: gettext('vXID (target)'),
      enableSorting: true,
      enableResizing: true,
      enableFilters: true,
      minSize: 50,
      size: 50,
    },
    {
      accessorKey: 'transactionid',
      header: gettext('XID (target)'),
      enableSorting: true,
      enableResizing: true,
      enableFilters: true,
      minSize: 50,
      size: 80,
    },
    {
      accessorKey: 'classid',
      header: gettext('Class'),
      enableSorting: true,
      enableResizing: true,
      enableFilters: true,
      minSize: 50,
      size: 80,
    },
    {
      accessorKey: 'objid',
      header: gettext('Object ID'),
      enableSorting: true,
      enableResizing: true,
      enableFilters: true,
      minSize: 50,
      size: 80,
    },
    {
      accessorKey: 'virtualtransaction',
      header: gettext('vXID (owner)'),
      enableSorting: true,
      enableResizing: true,
      enableFilters: true,
      minSize: 50,
      size: 50,
    },
    {
      accessorKey: 'mode',
      header: gettext('Mode'),
      enableSorting: true,
      enableResizing: true,
      enableFilters: true,
      minSize: 50,
      size: 50,
    },
    {
      id: 'granted',
      accessorKey: 'granted',
      header: gettext('Granted?'),
      enableSorting: true,
      enableResizing: true,
      enableFilters: true,
      minSize: 50,
      size: 80,
    },
  ];

  const databasePreparedColumns = [
    {
      accessorKey: 'git',
      header: gettext('Name'),
      enableSorting: true,
      enableResizing: true,
      enableFilters: true,
    },
    {
      accessorKey: 'datname',
      header: gettext('Database'),
      enableSorting: true,
      enableResizing: true,
      enableVisibility: !did,
      enableFilters: true,
      minWidth: 26,
      width: 80,
    },
    {
      accessorKey: 'Owner',
      header: gettext('Owner'),
      enableSorting: true,
      enableResizing: true,
      enableFilters: true,
    },
    {
      accessorKey: 'transaction',
      header: gettext('XID'),
      enableSorting: true,
      enableResizing: true,
      enableFilters: true,
    },
    {
      accessorKey: 'prepared',
      header: gettext('Prepared at'),
      enableSorting: true,
      enableResizing: true,
      enableFilters: true,
    },
  ];
  useEffect(() => {
    if (mainTabVal == 3) {
      setLogFormat('T');
      let url = url_for('dashboard.log_formats') +  '/' + sid;
      api({
        url: url,
        type: 'GET',
      })
        .then((res) => {
          let _format = res.data;
          let _frm = [
            {'label': gettext('Text'), 'value': 'T', 'disabled': !_format.includes('stderr')},
            {'label': gettext('JSON'), 'value': 'J', 'disabled': !_format.includes('jsonlog')},
            {'label': gettext('CSV'), 'value': 'C', 'disabled': !_format.includes('csvlog')}
          ];
          setLogConfigFormat(_frm);
        })
        .catch((error) => {
          pgAdmin.Browser.notifier.alert(
            gettext('Failed to retrieve data from the server.'),
            _.isUndefined(error.response) ? error.message : error.response.data.errormsg
          );
        });
    }
  },[nodeData, mainTabVal]);

  useEffect(() => {

    // disable replication tab
    if(!treeNodeInfo?.server?.replication_type && mainTabVal == 5) {
      setMainTabVal(0);
    }

    let url,
      ssExtensionCheckUrl = url_for('dashboard.check_system_statistics'),
      message = gettext(
        'Please connect to the selected server to view the dashboard.'
      );

    if (sid && serverConnected) {

      message = gettext('Loading dashboard...');
      if (did && !dbConnected) return;

      if (mainTabVal === 1) {
        url = url_for('dashboard.activity');
        if (did) url += sid + '/' + did;
        else url += '/' + sid;

      } else if (mainTabVal === 2) {
        url = url_for('dashboard.config', {'sid': sid});
      } else if (mainTabVal === 3) {
        if(logCol === false) {
          url = url_for('dashboard.logs', {'log_format': logFormat, 'disp_format': 'plain', 'sid': sid});
        } else if (logCol === true) {
          url = url_for('dashboard.logs', {'log_format': logFormat, 'disp_format': 'table', 'sid': sid});
          setNextPage(0);
        }
      }

      if (did && did > 0) ssExtensionCheckUrl += '/' + sid + '/' + did;
      else ssExtensionCheckUrl += '/' + sid;

      if (node) {
        setSsMsg(gettext('Loading logs...'));
        setDashData([]);
        if (mainTabVal == 1 || mainTabVal == 2 || mainTabVal == 3) {
          api({
            url: url,
            type: 'GET',
          })
            .then((res) => {
              if (res.data && res.data['logs_disabled']) {
                setSsMsg(gettext('Please enable the logging to view the server logs or check the log file is in place or not.'));
              } else {
                setDashData(parseData(res.data));
              }
            })
            .catch((error) => {
              pgAdmin.Browser.notifier.alert(
                gettext('Failed to retrieve data from the server.'),
                _.isUndefined(error.response) ? error.message : error.response.data.errormsg
              );
              // show failed message.
              setMsg(gettext('Failed to retrieve data from the server.'));
            });
        }
        else if (mainTabVal == 4) {
          api({
            url: ssExtensionCheckUrl,
            type: 'GET',
          })
            .then((res) => {
              const data = res.data;
              if(!data['ss_present']){
                setSsMsg(gettext('The system_stats extension is not installed. You can install the extension in a database using the "CREATE EXTENSION system_stats;" SQL command. Reload pgAdmin once it is installed.'));
                setLdid(0);
              } else {
                setSsMsg('installed');
                setLdid(did);
              }
            })
            .catch(() => {
              setSsMsg(gettext('Failed to verify the presence of system stats extension.'));
              setLdid(0);
            });
        } else {
          setSsMsg('');
          setLdid(0);
        }
      } else {
        setMsg(message);
      }
    }
    if (message != '') {
      setMsg(message);
    }
  }, [nodeData, treeNodeInfo, prefStore, refresh, mainTabVal, logCol, logFormat]);

  const filteredDashData = useMemo(()=>{
    if (mainTabVal == 1 && activeOnly && dashData.length > 0) {
      // we want to show 'idle in transaction', 'active', 'active in transaction', and future non-blank, non-"idle" status values
      return dashData[0]['activity']?.filter((r)=>(r.state && r.state != '' && r.state != 'idle'));
    }
    return dashData && dashData[0] && dashData[0]['activity'] || [];
  }, [dashData, activeOnly, mainTabVal]);

  const showDefaultContents = () => {
    return (
      sid && !serverConnected ? (
        <Box className='Dashboard-dashboardPanel'>
          <div className='Dashboard-emptyPanel'>
            <EmptyPanelMessage text={msg}/>
          </div>
        </Box>
      ) : (
        <WelcomeDashboard
          pgBrowser={pgAdmin.Browser}
          node={node}
          itemData={nodeData}
          item={nodeItem}
          sid={sid}
          did={did}
        />
      )
    );
  };

  const CustomLogHeaderLabel =
    {
      label: gettext('Table based logs'),
    };
  const CustomLogHeader = () => {
    return ( <Box className='Dashboard-cardHeader' display="flex" flexDirection="row">
      <FormInputToggle
        label={gettext('Log Format')}
        className='Dashboard-searchInput'
        value={logFormat}
        onChange={(val) => {
          setLogFormat(val);
        }}
        options={logConfigFormat}
        controlProps={CustomLogHeaderLabel}
        labelGridBasis={3}
        controlGridBasis={3}
      ></FormInputToggle>
      <FormInputSwitch
        label={gettext('Tabular format?')}
        labelPlacement="end"
        className='Dashboard-searchInput'
        value={logCol}
        onChange={(e) => {
          setDashData([]);
          setLogCol(e.target.checked);
        }}
        controlProps={CustomLogHeaderLabel}
        labelGridBasis={3}
        controlGridBasis={3}
      ></FormInputSwitch>
      <div className='Dashboard-download'><PgIconButton
        size="xs"
        className='Dashboard-downloadButton'
        icon={<GetAppRoundedIcon />}
        onClick={downloadServerLogs}
        aria-label="Download"
        title={gettext('Download logs ')}
      ></PgIconButton></div>
    </Box>);
  };


  const loadNextPage = () => {
    setIsNextPageLoading(true);
    setTimeout(() => {
      setHasNextPage(true);
      setIsNextPageLoading(false);

      let _url = url_for('dashboard.logs', {'log_format': logFormat, 'disp_format': 'table', 'sid': sid});
      _url += '/' + (nextPage +1);

      const api = getApiInstance();
      api({
        url: _url,
        type: 'GET',
      })
        .then((res) => {
          console.warn(res.data.length);
          if (res.data && res.data.length > 0) {
            let _d = dashData.concat(parseData(res.data));
            setDashData(_d);
            setNextPage(nextPage + 1);
          }
        })
        .catch((error) => {
          pgAdmin.Browser.notifier.alert(
            gettext('Failed to retrieve data from the server.'),
            _.isUndefined(error.response) ? error.message : error.response.data.errormsg
          );
          // show failed message.
          setMsg(gettext('Failed to retrieve data from the server.'));
        });

    }, 500);
  };

  return (
    (<Root>
      {sid && serverConnected ? (
        <Box className='Dashboard-dashboardPanel'>
          <Box className='Dashboard-panelContent'>
            <Box className='Dashboard-mainTabs'>
              <Box>
                <Tabs
                  value={mainTabVal}
                  onChange={mainTabChanged}
                >
                  {mainTabs.map((tabValue, i) => {
                    if (tabValue == 'Activity') {
                      if (!_.isUndefined(preferences) && preferences.show_graphs) {
                        return <Tab key={tabValue} label={tabValue} value={i}/>;
                      }
                    } else if (tabValue == 'State') {
                      if (!_.isUndefined(preferences) && preferences.show_activity) {
                        return <Tab key={tabValue} label={tabValue} value={i}/>;
                      }
                    }
                    else {
                      return <Tab key={tabValue} label={tabValue} value={i}/>;
                    }
                  })}
                </Tabs>
              </Box>
              {/* Server Activity */}
              {!_.isUndefined(preferences) && preferences.show_graphs && (
                <TabPanel value={mainTabVal} index={0}>
                  <Graphs
                    key={sid + did}
                    preferences={preferences}
                    sid={sid}
                    did={did}
                    pageVisible={props.isActive}
                  ></Graphs>
                </TabPanel>
              )}
              {/* Server Activity */}
              <TabPanel value={mainTabVal} index={1} classNameRoot='Dashboard-tabPanel'>
                {!_.isUndefined(preferences) && preferences.show_activity && (
                  <Fragment>
                    <CustomRefresh refresh={refresh} setRefresh={setRefresh}/>
                    <SectionContainer title={gettext('Sessions')} style={{height: 'auto', minHeight: '200px', maxHeight:'400px', paddingBottom: '20px'}}>
                      <PgTable
                        caveTable={false}
                        tableNoBorder={false}
                        customHeader={<ActiveOnlyHeader activeOnly={activeOnly} setActiveOnly={setActiveOnly} refresh={refresh} setRefresh={setRefresh}/>}
                        columns={activityColumns}
                        data={(dashData !== undefined && dashData[0] && filteredDashData) || []}
                        schema={activeQSchemaObj}
                      ></PgTable>
                    </SectionContainer>
                    <SectionContainer title={gettext('Locks')} style={{height: 'auto', minHeight: '200px',  maxHeight:'400px', paddingBottom: '20px'}}>
                      <PgTable
                        caveTable={false}
                        tableNoBorder={false}
                        columns={databaseLocksColumns}
                        data={(dashData !== undefined && dashData[0] && dashData[0]['locks']) || []}
                      ></PgTable>
                    </SectionContainer>
                    <SectionContainer title={gettext('Prepared Transactions')} style={{height: 'auto', minHeight: '200px',  maxHeight:'400px', paddingBottom: '20px'}}>
                      <PgTable
                        caveTable={false}
                        tableNoBorder={false}
                        columns={databasePreparedColumns}
                        data={(dashData !== undefined &&  dashData[0] && dashData[0]['prepared']) || []}
                      ></PgTable>
                    </SectionContainer>
                  </Fragment>
                )}
              </TabPanel>
              {/* Server Configuration */}
              <TabPanel value={mainTabVal} index={2} classNameRoot='Dashboard-tabPanel'>
                <PgTable
                  caveTable={false}
                  tableNoBorder={false}
                  columns={serverConfigColumns}
                  data={dashData}
                ></PgTable>
              </TabPanel>
              {/* Server Logs */}
              <TabPanel value={mainTabVal} index={3} classNameRoot='Dashboard-tabPanel serverLog'>
                {dashData &&  dashData.length != 0 &&
                  <CustomLogHeader/>}
                {dashData.length == 0 && <div className='Dashboard-emptyPanel'>
                  <EmptyPanelMessage text={ssMsg}/>
                </div>}
                {dashData && logCol === false && dashData.length == 1 && <CodeMirror
                  id='tests'
                  language={logFormat== 'J' ? 'json':'pgsql'}
                  className='Dashboard-textArea'
                  value={dashData[0]['pg_read_file']}
                  readonly={true}
                  options={{
                    lineNumbers: true,
                    mode: 'text/plain',
                  }}
                />}
                {dashData && logCol === true && <PgTable
                  caveTable={false}
                  tableNoBorder={false}
                  columns={serverLogColumns}
                  data={dashData}
                  hasNextPage={hasNextPage}
                  isNextPageLoading={isNextPageLoading}
                  loadNextPage={loadNextPage}
                  schema={serverLogSchemaObj}
                ></PgTable>}
              </TabPanel>
              {/* System Statistics */}
              <TabPanel value={mainTabVal} index={4} classNameRoot='Dashboard-tabPanel systemStorage'>
                <Box height="100%" display="flex" flexDirection="column">
                  {ssMsg === 'installed' && did === ldid ?
                    <ErrorBoundary>
                      <Box>
                        <Tabs
                          value={systemStatsTabVal}
                          onChange={systemStatsTabChanged}
                        >
                          {systemStatsTabs.map((tabValue) => {
                            return <Tab key={tabValue} label={tabValue} />;
                          })}
                        </Tabs>
                      </Box>
                      <TabPanel value={systemStatsTabVal} index={0} classNameRoot='Dashboard-tabPanel'>
                        <Summary
                          key={sid + did}
                          preferences={preferences}
                          sid={sid}
                          did={did}
                          pageVisible={props.isActive}
                          serverConnected={serverConnected}
                        />
                      </TabPanel>
                      <TabPanel value={systemStatsTabVal} index={1} classNameRoot='Dashboard-tabPanel'>
                        <CpuDetails
                          key={sid + did}
                          preferences={preferences}
                          sid={sid}
                          did={did}
                          pageVisible={props.isActive}
                          serverConnected={serverConnected}
                        />
                      </TabPanel>
                      <TabPanel value={systemStatsTabVal} index={2} classNameRoot='Dashboard-tabPanel'>
                        <Memory
                          key={sid + did}
                          preferences={preferences}
                          sid={sid}
                          did={did}
                          pageVisible={props.isActive}
                          serverConnected={serverConnected}
                        />
                      </TabPanel>
                      <TabPanel value={systemStatsTabVal} index={3} classNameRoot='Dashboard-tabPanel'>
                        <Storage
                          key={sid + did}
                          preferences={preferences}
                          sid={sid}
                          did={did}
                          pageVisible={props.isActive}
                          serverConnected={serverConnected}
                          systemStatsTabVal={systemStatsTabVal}
                        />
                      </TabPanel>
                    </ErrorBoundary> :
                    <div className='Dashboard-emptyPanel'>
                      <EmptyPanelMessage text={ssMsg}/>
                    </div>
                  }
                </Box>
              </TabPanel>
              {/* Replication */}
              <TabPanel value={mainTabVal} index={5} classNameRoot='Dashboard-tabPanel'>
                <Replication key={sid} sid={sid} node={node}
                  preferences={preferences} treeNodeInfo={treeNodeInfo} nodeData={nodeData} pageVisible={props.isActive} />
              </TabPanel>
            </Box>
          </Box>
        </Box>
      ) : showDefaultContents() }
    </Root>)
  );
}

Dashboard.propTypes = {
  node: PropTypes.func,
  itemData: PropTypes.object,
  nodeData: PropTypes.object,
  treeNodeInfo: PropTypes.object,
  nodeItem: PropTypes.object,
  preferences: PropTypes.object,
  sid: PropTypes.string,
  did: PropTypes.oneOfType([PropTypes.bool, PropTypes.number]),
  row: PropTypes.object,
  serverConnected: PropTypes.bool,
  dbConnected: PropTypes.bool,
  isActive: PropTypes.bool,
  column: PropTypes.object,
};

export default withStandardTabInfo(Dashboard, BROWSER_PANELS.DASHBOARD);
