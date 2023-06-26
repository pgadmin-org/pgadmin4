/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import React, { useEffect, useMemo, useState } from 'react';
import gettext from 'sources/gettext';
import PropTypes from 'prop-types';
import getApiInstance from 'sources/api_instance';
import PgTable from 'sources/components/PgTable';
import { InputCheckbox } from '../../../static/js/components/FormComponents';
import { makeStyles } from '@material-ui/core/styles';
import url_for from 'sources/url_for';
import Graphs from './Graphs';
import { Box, Tab, Tabs } from '@material-ui/core';
import { PgIconButton } from '../../../static/js/components/Buttons';
import CancelIcon from '@material-ui/icons/Cancel';
import StopSharpIcon from '@material-ui/icons/StopSharp';
import ArrowRightOutlinedIcon from '@material-ui/icons/ArrowRightOutlined';
import ArrowDropDownOutlinedIcon from '@material-ui/icons/ArrowDropDownOutlined';
import WelcomeDashboard from './WelcomeDashboard';
import ActiveQuery from './ActiveQuery.ui';
import _ from 'lodash';
import CachedOutlinedIcon from '@material-ui/icons/CachedOutlined';
import EmptyPanelMessage from '../../../static/js/components/EmptyPanelMessage';
import TabPanel from '../../../static/js/components/TabPanel';
import Summary from './SystemStats/Summary';
import CPU from './SystemStats/CPU';
import Memory from './SystemStats/Memory';
import Storage from './SystemStats/Storage';
import withStandardTabInfo from '../../../static/js/helpers/withStandardTabInfo';
import { BROWSER_PANELS } from '../../../browser/static/js/constants';
import { usePgAdmin } from '../../../static/js/BrowserComponent';
import usePreferences from '../../../preferences/static/js/store';
import ErrorBoundary from '../../../static/js/helpers/ErrorBoundary';

function parseData(data) {
  let res = [];

  data.forEach((row) => {
    res.push({ ...row, icon: '' });
  });
  return res;
}

const useStyles = makeStyles((theme) => ({
  emptyPanel: {
    width: '100%',
    background: theme.otherVars.emptySpaceBg,
    overflow: 'auto',
    padding: '8px',
    display: 'flex',
  },
  fixedSizeList: {
    overflowX: 'hidden !important',
    overflow: 'overlay !important',
    height: 'auto !important',
  },
  dashboardPanel: {
    height: '100%',
    background: theme.palette.grey[400],
  },
  cardHeader: {
    padding: '0.25rem 0.5rem',
    fontWeight: 'bold',
    backgroundColor: theme.otherVars.tableBg,
    borderBottom: '1px solid',
    borderBottomColor: theme.otherVars.borderColor,
  },
  searchPadding: {
    display: 'flex',
    flex: 2.5,
  },
  component: {
    padding: '8px',
  },
  searchInput: {
    flex: 1,
  },
  panelIcon: {
    width: '80%',
    margin: '0 auto',
    marginTop: '25px !important',
    position: 'relative',
    textAlign: 'center',
  },
  panelMessage: {
    marginLeft: '0.5rem',
    fontSize: '0.875rem',
  },
  panelContent: {
    ...theme.mixins.panelBorder.all,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden !important',
    height: '100%',
    width: '100%',
    minHeight: '400px',
    padding: '8px'
  },
  mainTabs: {
    ...theme.mixins.panelBorder.all,
    height: '100%',
    display: 'flex',
    flexDirection: 'column'
  },
  arrowButton: {
    fontSize: '2rem !important',
    margin: '-7px'
  },
  terminateButton: {
    color: theme.palette.error.main
  },
  buttonClick: {
    backgroundColor: theme.palette.grey[400]
  },
  refreshButton: {
    marginLeft: 'auto',
    height:  '1.9rem',
    width:  '2.2rem',
    ...theme.mixins.panelBorder,
  },
  chartCard: {
    border: '1px solid '+theme.otherVars.borderColor,
  },
  chartCardContent: {
    padding: '0.25rem 0.5rem',
    height: '165px',
    display: 'flex',
  },
  chartLegend: {
    marginLeft: 'auto',
    '& > div': {
      display: 'flex',
      fontWeight: 'normal',
      flexWrap: 'wrap',

      '& .legend-value': {
        marginLeft: '4px',
        '& .legend-label': {
          marginLeft: '4px',
        }
      }
    }
  }
}));

function Dashboard({
  nodeItem, nodeData, node, treeNodeInfo,
  ...props
}) {
  const classes = useStyles();
  let tabs = [gettext('Sessions'), gettext('Locks'), gettext('Prepared Transactions')];
  let mainTabs = [gettext('General'), gettext('System Statistics')];
  let systemStatsTabs = [gettext('Summary'), gettext('CPU'), gettext('Memory'), gettext('Storage')];
  const [dashData, setdashData] = useState([]);
  const [msg, setMsg] = useState('');
  const [ssMsg, setSsMsg] = useState('');
  const [tabVal, setTabVal] = useState(0);
  const [mainTabVal, setMainTabVal] = useState(0);
  const [refresh, setRefresh] = useState(false);
  const [activeOnly, setActiveOnly] = useState(false);
  const [schemaDict, setSchemaDict] = React.useState({});
  const [systemStatsTabVal, setSystemStatsTabVal] = useState(0);
  const [ldid, setLdid] = useState(0);

  const systemStatsTabChanged = (e, tabVal) => {
    setSystemStatsTabVal(tabVal);
  };
  const pgAdmin = usePgAdmin();
  const did = treeNodeInfo?.database?._id ?? 0;
  const sid = treeNodeInfo?.server?._id ?? 0;
  const dbConnected = treeNodeInfo?.database?.connected ?? false;
  const serverConnected = treeNodeInfo?.server?.connected ?? false;
  const prefStore = usePreferences();
  const preferences = _.merge(
    usePreferences().getPreferencesForModule('dashboards'),
    usePreferences().getPreferencesForModule('graphs')
  );

  if (!did) {
    tabs.push(gettext('Configuration'));
  }

  const tabChanged = (e, tabVal) => {
    setTabVal(tabVal);
  };

  const mainTabChanged = (e, tabVal) => {
    setMainTabVal(tabVal);
  };

  const serverConfigColumns = [
    {
      accessor: 'name',
      Header: gettext('Name'),
      sortable: true,
      resizable: true,
      disableGlobalFilter: false,
      minWidth: 50,
      width: 100,
      minResizeWidth: 150,
    },
    {
      accessor: 'category',
      Header: gettext('Category'),
      sortable: true,
      resizable: true,
      disableGlobalFilter: false,
      minWidth: 50,
    },
    {
      accessor: 'setting',
      Header: gettext('Value'),
      sortable: true,
      resizable: true,
      disableGlobalFilter: false,
      minWidth: 50,
      width: 100,
    },
    {
      accessor: 'unit',
      Header: gettext('Unit'),
      sortable: true,
      resizable: true,
      disableGlobalFilter: false,
      minWidth: 26,
      width: 30,
    },
    {
      accessor: 'short_desc',
      Header: gettext('Description'),
      sortable: true,
      resizable: true,
      disableGlobalFilter: false,
    },
  ];

  const activityColumns = [
    {
      accessor: 'terminate_query',
      Header: () => null,
      sortable: true,
      resizable: false,
      disableGlobalFilter: false,
      width: 35,
      minWidth: 0,
      id: 'btn-terminate',
      // eslint-disable-next-line react/display-name
      Cell: ({ row }) => {
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
            className={classes.terminateButton}
            onClick={() => {
              if (
                !canTakeAction(row, 'terminate')
              )
                return;
              let url = action_url + '/' + row.values.pid;
              pgAdmin.Browser.notifier.confirm(
                title,
                txtConfirm,
                function () {
                  api
                    .delete(url)
                    .then(function (res) {
                      if (res.data == gettext('Success')) {
                        pgAdmin.Browser.notifier.success(txtSuccess);
                        setRefresh(!refresh);
                      } else {
                        pgAdmin.Browser.notifier.error(txtError);
                      }
                    })
                    .catch(function (error) {
                      pgAdmin.Browser.notifier.alert(
                        gettext('Failed to retrieve data from the server.'),
                        error.message
                      );
                    });
                },
                function () {
                  return true;
                }
              );
            }}
            color="default"
            aria-label="Terminate Session?"
            title={gettext('Terminate Session?')}
          ></PgIconButton>
        );
      },
    },
    {
      accessor: 'cancel_Query',
      Header: () => null,
      sortable: true,
      resizable: false,
      disableGlobalFilter: false,
      width: 35,
      minWidth: 0,
      id: 'btn-cancel',
      Cell: ({ row }) => {
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
              let url = action_url + '/' + row.values.pid;
              pgAdmin.Browser.notifier.confirm(
                title,
                txtConfirm,
                function () {
                  api
                    .delete(url)
                    .then(function (res) {
                      if (res.data == gettext('Success')) {
                        pgAdmin.Browser.notifier.success(txtSuccess);
                        setRefresh(!refresh);
                      } else {
                        pgAdmin.Browser.notifier.error(txtError);
                        setRefresh(!refresh);

                      }
                    })
                    .catch(function (error) {
                      pgAdmin.Browser.notifier.alert(
                        gettext('Failed to retrieve data from the server.'),
                        error.message
                      );
                    });
                },
                function () {
                  return true;
                }
              );
            }}
            color="default"
            aria-label="Cancel the query"
            title={gettext('Cancel the active query')}
          ></PgIconButton>
        );
      },
    },
    {
      accessor: 'view_active_query',
      Header: () => null,
      sortable: true,
      resizable: false,
      disableGlobalFilter: false,
      width: 35,
      minWidth: 0,
      id: 'btn-edit',
      Cell: ({ row }) => {
        let canEditRow = true;
        return (
          <PgIconButton
            size="xs"
            className={row.isExpanded ?classes.buttonClick : ''}
            icon={
              row.isExpanded ? (
                <ArrowDropDownOutlinedIcon  className={classes.arrowButton}/>
              ) : (
                <ArrowRightOutlinedIcon className={classes.arrowButton}/>
              )
            }
            noBorder
            onClick={(e) => {
              e.preventDefault();
              row.toggleRowExpanded(!row.isExpanded);
              let schema = new ActiveQuery({
                query: row.original.query,
                backend_type: row.original.backend_type,
                state_change: row.original.state_change,
                query_start: row.original.query_start,
              });
              setSchemaDict(prevState => ({
                ...prevState,
                [row.id]: schema
              }));
            }}
            disabled={!canEditRow}
            aria-label="View the active session details"
            title={gettext('View the active session details')}
          />
        );
      },
    },
    {
      accessor: 'pid',
      Header: gettext('PID'),
      sortable: true,
      resizable: true,
      disableGlobalFilter: false,
      minWidth: 26,
      width: 60,
    },
    {
      accessor: 'datname',
      Header: gettext('Database'),
      sortable: true,
      resizable: true,
      disableGlobalFilter: false,
      minWidth: 26,
      width: 80,
      isVisible: !did ? true: false
    },
    {
      accessor: 'usename',
      Header: gettext('User'),
      sortable: true,
      resizable: true,
      disableGlobalFilter: false,
      minWidth: 26,
      width: 60
    },
    {
      accessor: 'application_name',
      Header: gettext('Application'),
      sortable: true,
      resizable: true,
      disableGlobalFilter: false,
      minWidth: 26,
    },
    {
      accessor: 'client_addr',
      Header: gettext('Client'),
      sortable: true,
      resizable: true,
      disableGlobalFilter: false,
      minWidth: 26,
    },
    {
      accessor: 'backend_start',
      Header: gettext('Backend start'),
      sortable: true,
      resizable: true,
      disableGlobalFilter: false,
      minWidth: 100,
    },
    {
      accessor: 'xact_start',
      Header: gettext('Transaction start'),
      sortable: true,
      resizable: true,
      disableGlobalFilter: false,
      minWidth: 26,
    },
    {
      accessor: 'state',
      Header: gettext('State'),
      sortable: true,
      resizable: true,
      disableGlobalFilter: false,
      minWidth: 26,
      width:40
    },

    {
      accessor: 'waiting',
      Header: gettext('Waiting'),
      sortable: true,
      resizable: true,
      disableGlobalFilter: false,
      isVisible: treeNodeInfo?.server?.version < 90600
    },
    {
      accessor: 'wait_event',
      Header: gettext('Wait event'),
      sortable: true,
      resizable: true,
      disableGlobalFilter: false,
    },
    {
      accessor: 'blocking_pids',
      Header: gettext('Blocking PIDs'),
      sortable: true,
      resizable: true,
      disableGlobalFilter: false,
    },
  ];

  const databaseLocksColumns = [
    {
      accessor: 'pid',
      Header: gettext('PID'),
      sortable: true,
      resizable: true,
      disableGlobalFilter: false,
      minWidth: 26,
      width: 50,
    },
    {
      accessor: 'datname',
      Header: gettext('Database'),
      sortable: true,
      resizable: true,
      disableGlobalFilter: false,
      minWidth: 26,
      isVisible: !did ? true: false,
      width: 80
    },
    {
      accessor: 'locktype',
      Header: gettext('Lock type'),
      sortable: true,
      resizable: true,
      disableGlobalFilter: false,
      minWidth: 26,
      width: 80,
    },
    {
      accessor: 'relation',
      Header: gettext('Target relation'),
      sortable: true,
      resizable: true,
      disableGlobalFilter: false,
    },
    {
      accessor: 'page',
      Header: gettext('Page'),
      sortable: true,
      resizable: true,
      disableGlobalFilter: false,
      minWidth: 26,
      width: 80,
    },
    {
      accessor: 'tuple',
      Header: gettext('Tuple'),
      sortable: true,
      resizable: true,
      disableGlobalFilter: false,
      minWidth: 26,
    },
    {
      accessor: 'virtualxid',
      Header: gettext('vXID (target)'),
      sortable: true,
      resizable: true,
      disableGlobalFilter: false,
      minWidth: 50,
      width: 80
    },
    {
      accessor: 'transactionid',
      Header: gettext('XID (target)'),
      sortable: true,
      resizable: true,
      disableGlobalFilter: false,
      minWidth: 50,
      width: 80,
    },
    {
      accessor: 'classid',
      Header: gettext('Class'),
      sortable: true,
      resizable: true,
      disableGlobalFilter: false,
      minWidth: 26,
      width: 80,
    },
    {
      accessor: 'objid',
      Header: gettext('Object ID'),
      sortable: true,
      resizable: true,
      disableGlobalFilter: false,
      minWidth: 50,
      width: 80,

    },
    {
      accessor: 'virtualtransaction',
      Header: gettext('vXID (owner)'),
      sortable: true,
      resizable: true,
      disableGlobalFilter: false,
      minWidth: 50,
    },
    {
      accessor: 'mode',
      Header: gettext('Mode'),
      sortable: true,
      resizable: true,
      disableGlobalFilter: false,
    },
    {
      id: 'granted',
      accessor: 'granted',
      Header: gettext('Granted?'),
      sortable: true,
      resizable: true,
      disableGlobalFilter: false,
      minWidth: 30,
      width: 80,
      Cell: ({ value }) => String(value)
    },
  ];

  const databasePreparedColumns = [
    {
      accessor: 'git',
      Header: gettext('Name'),
      sortable: true,
      resizable: true,
      disableGlobalFilter: false,
    },
    {
      accessor: 'datname',
      Header: gettext('Database'),
      sortable: true,
      resizable: true,
      disableGlobalFilter: false,
      minWidth: 26,
      width: 80,
      isVisible: !did ? true: false
    },
    {
      accessor: 'Owner',
      Header: gettext('Owner'),
      sortable: true,
      resizable: true,
      disableGlobalFilter: false,
    },
    {
      accessor: 'transaction',
      Header: gettext('XID'),
      sortable: true,
      resizable: true,
      disableGlobalFilter: false,
    },
    {
      accessor: 'prepared',
      Header: gettext('Prepared at'),
      sortable: true,
      resizable: true,
      disableGlobalFilter: false,
    },
  ];

  const canTakeAction = (row, cellAction) => {
    // We will validate if user is allowed to cancel the active query
    // If there is only one active session means it probably our main
    // connection session
    cellAction = cellAction || null;
    let pg_version = treeNodeInfo.server.version || null,
      is_cancel_session = cellAction === 'cancel',
      txtMessage,
      maintenance_database = treeNodeInfo.server.db,
      is_super_user,
      current_user;

    let can_signal_backend =
      treeNodeInfo.server && treeNodeInfo.server.user
        ? treeNodeInfo.server.user.can_signal_backend
        : false;

    if (
      treeNodeInfo.server &&
      treeNodeInfo.server.user &&
      treeNodeInfo.server.user.is_superuser
    ) {
      is_super_user = true;
    } else {
      is_super_user = false;
      current_user =
        treeNodeInfo.server && treeNodeInfo.server.user
          ? treeNodeInfo.server.user.name
          : null;
    }

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
      row.original.state == 'active'
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
    } else if (can_signal_backend) {
      // user with membership of 'pg_signal_backend' can terminate the session of non admin user.
      return true;
    } else if (is_super_user) {
      // Super user can do anything
      return true;
    } else if (current_user && current_user == row.original.usename) {
      // Non-super user can cancel only their active queries
      return true;
    } else {
      // Do not allow to cancel someone else session to non-super user
      if (is_cancel_session) {
        txtMessage = gettext(
          'Superuser privileges are required to cancel another users query.'
        );
      } else {
        txtMessage = gettext(
          'Superuser privileges are required to terminate another users query.'
        );
      }
      pgAdmin.Browser.notifier.error(txtMessage);
      return false;
    }
  };
  useEffect(() => {
    // Reset Tab values to 0, so that it will select "Sessions" on node changed.
    nodeData?._type === 'database' && setTabVal(0);
  },[nodeData]);

  useEffect(() => {
    let url,
      ssExtensionCheckUrl = url_for('dashboard.check_system_statistics'),
      message = gettext(
        'Please connect to the selected server to view the dashboard.'
      );

    if(tabVal == 3 && did) {
      setTabVal(0);
    }

    if (sid && serverConnected) {
      if (tabVal === 0) {
        url = url_for('dashboard.activity');
      } else if (tabVal === 1) {
        url = url_for('dashboard.locks');
      } else if (tabVal === 2) {
        url = url_for('dashboard.prepared');
      } else {
        url = url_for('dashboard.config');
      }

      message = gettext('Loading dashboard...');
      if (did && !dbConnected) return;
      if (did) url += sid + '/' + did;
      else url += sid;

      if (did && !dbConnected) return;
      if (did && did > 0) ssExtensionCheckUrl += '/' + sid + '/' + did;
      else ssExtensionCheckUrl += '/' + sid;

      const api = getApiInstance();
      if (node) {
        if (mainTabVal == 0) {
          api({
            url: url,
            type: 'GET',
          })
            .then((res) => {
              setdashData(parseData(res.data));
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
        else if (mainTabVal == 1) {
          api({
            url: ssExtensionCheckUrl,
            type: 'GET',
          })
            .then((res) => {
              const data = res.data;
              if(data['ss_present'] == false){
                setSsMsg(gettext('System stats extension is not installed. You can install the extension in a database using the "CREATE EXTENSION system_stats;" SQL command. Reload the pgAdmin once you installed.'));
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
  }, [nodeData, tabVal, treeNodeInfo, prefStore, refresh, mainTabVal]);

  const filteredDashData = useMemo(()=>{
    if (tabVal == 0 && activeOnly) {
      // we want to show 'idle in transaction', 'active', 'active in transaction', and future non-blank, non-"idle" status values
      return dashData.filter((r)=>(r.state && r.state != '' && r.state != 'idle'));
    }
    return dashData;
  }, [dashData, activeOnly, tabVal]);

  const RefreshButton = () =>{
    return(
      <PgIconButton
        size="xs"
        noBorder
        className={classes.refreshButton}
        icon={<CachedOutlinedIcon />}
        onClick={(e) => {
          e.preventDefault();
          setRefresh(!refresh);
        }}
        color="default"
        aria-label="Refresh"
        title={gettext('Refresh')}
      ></PgIconButton>
    );
  };

  const showDefaultContents = () => {
    return (
      sid && !serverConnected ? (
        <Box className={classes.dashboardPanel}>
          <div className={classes.emptyPanel}>
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

  const CustomActiveOnlyHeaderLabel =
    {
      label: gettext('Active sessions only'),
    };
  const CustomActiveOnlyHeader = () => {
    return (
      <InputCheckbox
        label={gettext('Active sessions only')}
        labelPlacement="end"
        className={classes.searchInput}
        onChange={(e) => {
          e.preventDefault();
          setActiveOnly(e.target.checked);
        }}
        value={activeOnly}
        controlProps={CustomActiveOnlyHeaderLabel}
      ></InputCheckbox>);
  };

  return (
    <>
      {sid && serverConnected ? (
        <Box className={classes.dashboardPanel}>
          <Box className={classes.panelContent}>
            <Box className={classes.mainTabs}>
              <Box>
                <Tabs
                  value={mainTabVal}
                  onChange={mainTabChanged}
                >
                  {mainTabs.map((tabValue) => {
                    return <Tab key={tabValue} label={tabValue} />;
                  })}
                </Tabs>
              </Box>
              {/* General Statistics */}
              <TabPanel value={mainTabVal} index={0} classNameRoot={classes.tabPanel}>
                {!_.isUndefined(preferences) && preferences.show_graphs && (
                  <Graphs
                    key={sid + did}
                    preferences={preferences}
                    sid={sid}
                    did={did}
                    pageVisible={props.isActive}
                  ></Graphs>
                )}
                {!_.isUndefined(preferences) && preferences.show_activity && (
                  <Box className={classes.panelContent}>
                    <Box
                      className={classes.cardHeader}
                      title={dbConnected ?  gettext('Database activity') : gettext('Server activity')}
                    >
                      {dbConnected ?  gettext('Database activity') : gettext('Server activity')}{' '}
                    </Box>
                    <Box height="100%" display="flex" flexDirection="column">
                      <Box>
                        <Tabs
                          value={tabVal}
                          onChange={tabChanged}
                        >
                          {tabs.map((tabValue) => {
                            return <Tab key={tabValue} label={tabValue} />;
                          })}
                          <RefreshButton/>
                        </Tabs>
                      </Box>
                      <TabPanel value={tabVal} index={0} classNameRoot={classes.tabPanel}>
                        <PgTable
                          caveTable={false}
                          CustomHeader={CustomActiveOnlyHeader}
                          columns={activityColumns}
                          data={filteredDashData}
                          schema={schemaDict}
                        ></PgTable>
                      </TabPanel>
                      <TabPanel value={tabVal} index={1} classNameRoot={classes.tabPanel}>
                        <PgTable
                          caveTable={false}
                          columns={databaseLocksColumns}
                          data={dashData}
                        ></PgTable>
                      </TabPanel>
                      <TabPanel value={tabVal} index={2} classNameRoot={classes.tabPanel}>
                        <PgTable
                          caveTable={false}
                          columns={databasePreparedColumns}
                          data={dashData}
                        ></PgTable>
                      </TabPanel>
                      <TabPanel value={tabVal} index={3} classNameRoot={classes.tabPanel}>
                        <PgTable
                          caveTable={false}
                          columns={serverConfigColumns}
                          data={dashData}
                        ></PgTable>
                      </TabPanel>
                    </Box>
                  </Box>
                )}
              </TabPanel>
              {/* System Statistics */}
              <TabPanel value={mainTabVal} index={1} classNameRoot={classes.tabPanel}>
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
                      <TabPanel value={systemStatsTabVal} index={0} classNameRoot={classes.tabPanel}>
                        <Summary
                          key={sid + did}
                          preferences={preferences}
                          sid={sid}
                          did={did}
                          pageVisible={props.isActive}
                          serverConnected={serverConnected}
                        />
                      </TabPanel>
                      <TabPanel value={systemStatsTabVal} index={1} classNameRoot={classes.tabPanel}>
                        <CPU
                          key={sid + did}
                          preferences={preferences}
                          sid={sid}
                          did={did}
                          pageVisible={props.isActive}
                          serverConnected={serverConnected}
                        />
                      </TabPanel>
                      <TabPanel value={systemStatsTabVal} index={2} classNameRoot={classes.tabPanel}>
                        <Memory
                          key={sid + did}
                          preferences={preferences}
                          sid={sid}
                          did={did}
                          pageVisible={props.isActive}
                          serverConnected={serverConnected}
                        />
                      </TabPanel>
                      <TabPanel value={systemStatsTabVal} index={3} classNameRoot={classes.tabPanel}>
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
                    <div className={classes.emptyPanel}>
                      <EmptyPanelMessage text={ssMsg}/>
                    </div>
                  }
                </Box>
              </TabPanel>
            </Box>
          </Box>
        </Box>
      ) : showDefaultContents() }
    </>
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
};

export default withStandardTabInfo(Dashboard, BROWSER_PANELS.DASHBOARD);
