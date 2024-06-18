/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import React, { useEffect, useMemo, useState } from 'react';
import { styled } from '@mui/material/styles';
import gettext from 'sources/gettext';
import PropTypes from 'prop-types';
import getApiInstance from 'sources/api_instance';
import PgTable from 'sources/components/PgTable';
import { InputCheckbox } from '../../../static/js/components/FormComponents';
import url_for from 'sources/url_for';
import Graphs from './Graphs';
import { Box, Tab, Tabs } from '@mui/material';
import { PgIconButton } from '../../../static/js/components/Buttons';
import CancelIcon from '@mui/icons-material/Cancel';
import StopSharpIcon from '@mui/icons-material/StopSharp';
import WelcomeDashboard from './WelcomeDashboard';
import ActiveQuery from './ActiveQuery.ui';
import _ from 'lodash';
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
import { parseApiError } from '../../../static/js/api_instance';
import SectionContainer from './components/SectionContainer';
import Replication from './Replication';
import RefreshButton from './components/RefreshButtons';
import { getExpandCell } from '../../../static/js/components/PgReactTableStyled';

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
      '& .Dashboard-mainTabs': {
        ...theme.mixins.panelBorder.all,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        '& .Dashboard-terminateButton': {
          color: theme.palette.error.main
        },
      },
    },
  },
  '& .Dashboard-emptyPanel': {
    width: '100%',
    height: '100%',
    background: theme.otherVars.emptySpaceBg,
    overflow: 'auto',
    padding: '8px',
    display: 'flex',
  },
}));

let activeQSchemaObj = new ActiveQuery();

function Dashboard({
  nodeItem, nodeData, node, treeNodeInfo,
  ...props
}) {

  let tabs = [gettext('Sessions'), gettext('Locks'), gettext('Prepared Transactions')];
  let mainTabs = [gettext('General'), gettext('System Statistics')];
  if(treeNodeInfo?.server?.replication_type) {
    mainTabs.push(gettext('Replication'));
  }
  let systemStatsTabs = [gettext('Summary'), gettext('CPU'), gettext('Memory'), gettext('Storage')];
  const [dashData, setDashData] = useState([]);
  const [msg, setMsg] = useState('');
  const [ssMsg, setSsMsg] = useState('');
  const [tabVal, setTabVal] = useState(0);
  const [mainTabVal, setMainTabVal] = useState(0);
  const [refresh, setRefresh] = useState(false);
  const [activeOnly, setActiveOnly] = useState(false);
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
    usePreferences().getPreferencesForModule('graphs'),
    usePreferences().getPreferencesForModule('misc')
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
      // eslint-disable-next-line react/display-name
      cell: ({ row }) => {
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
                        setRefresh(!refresh);
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
      },
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
      cell: ({ row }) => {
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
                        setRefresh(!refresh);
                      } else {
                        pgAdmin.Browser.notifier.error(txtError);
                        setRefresh(!refresh);

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
      },
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
      cell: ({ value }) => String(value)
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
  useEffect(() => {
    // Reset Tab values to 0, so that it will select "Sessions" on node changed.
    nodeData?._type === 'database' && setTabVal(0);
  },[nodeData]);

  useEffect(() => {
    // disable replication tab
    if(!treeNodeInfo?.server?.replication_type && mainTabVal == 2) {
      setMainTabVal(0);
    }

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
              setDashData(parseData(res.data));
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
  }, [nodeData, tabVal, treeNodeInfo, prefStore, refresh, mainTabVal]);

  const filteredDashData = useMemo(()=>{
    if (tabVal == 0 && activeOnly) {
      // we want to show 'idle in transaction', 'active', 'active in transaction', and future non-blank, non-"idle" status values
      return dashData.filter((r)=>(r.state && r.state != '' && r.state != 'idle'));
    }
    return dashData;
  }, [dashData, activeOnly, tabVal]);

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

  const CustomActiveOnlyHeaderLabel =
    {
      label: gettext('Active sessions only'),
    };
  const CustomActiveOnlyHeader = () => {
    return (
      <InputCheckbox
        label={gettext('Active sessions only')}
        labelPlacement="end"
        className='Dashboard-searchInput'
        onChange={(e) => {
          e.preventDefault();
          setActiveOnly(e.target.checked);
        }}
        value={activeOnly}
        controlProps={CustomActiveOnlyHeaderLabel}
      ></InputCheckbox>);
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
                  {mainTabs.map((tabValue) => {
                    return <Tab key={tabValue} label={tabValue} />;
                  })}
                </Tabs>
              </Box>
              {/* General Statistics */}
              <TabPanel value={mainTabVal} index={0}>
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
                  <SectionContainer title={dbConnected ?  gettext('Database activity') : gettext('Server activity')}>
                    <Box>
                      <Tabs
                        value={tabVal}
                        onChange={tabChanged}
                      >
                        {tabs.map((tabValue) => {
                          return <Tab key={tabValue} label={tabValue} />;
                        })}
                        <RefreshButton onClick={(e) => {
                          e.preventDefault();
                          setRefresh(!refresh);
                        }}/>
                      </Tabs>
                    </Box>
                    <TabPanel value={tabVal} index={0}>
                      <PgTable
                        caveTable={false}
                        tableNoBorder={false}
                        CustomHeader={CustomActiveOnlyHeader}
                        columns={activityColumns}
                        data={filteredDashData}
                        schema={activeQSchemaObj}
                      ></PgTable>
                    </TabPanel>
                    <TabPanel value={tabVal} index={1}>
                      <PgTable
                        caveTable={false}
                        tableNoBorder={false}
                        columns={databaseLocksColumns}
                        data={dashData}
                      ></PgTable>
                    </TabPanel>
                    <TabPanel value={tabVal} index={2}>
                      <PgTable
                        caveTable={false}
                        tableNoBorder={false}
                        columns={databasePreparedColumns}
                        data={dashData}
                      ></PgTable>
                    </TabPanel>
                    <TabPanel value={tabVal} index={3}>
                      <PgTable
                        caveTable={false}
                        tableNoBorder={false}
                        columns={serverConfigColumns}
                        data={dashData}
                      ></PgTable>
                    </TabPanel>
                  </SectionContainer>
                )}
              </TabPanel>
              {/* System Statistics */}
              <TabPanel value={mainTabVal} index={1} classNameRoot='Dashboard-tabPanel'>
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
                        <CPU
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
              <TabPanel value={mainTabVal} index={2} classNameRoot='Dashboard-tabPanel'>
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
};

export default withStandardTabInfo(Dashboard, BROWSER_PANELS.DASHBOARD);
