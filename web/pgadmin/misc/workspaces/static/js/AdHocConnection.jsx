/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useEffect, useMemo } from 'react';
import gettext from 'sources/gettext';
import url_for from 'sources/url_for';
import _ from 'lodash';
import pgWindow from 'sources/window';
import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import current_user from 'pgadmin.user_management.current_user';
import VariableSchema from '../../../../browser/server_groups/servers/static/js/variable.ui';
import { getConnectionParameters } from '../../../../browser/server_groups/servers/static/js/server.ui';
import { flattenSelectOptions } from '../../../../static/js/components/FormComponents';
import ConnectServerContent from '../../../../static/js/Dialogs/ConnectServerContent';
import SchemaView from '../../../../static/js/SchemaView';
import PropTypes from 'prop-types';
import getApiInstance from '../../../../static/js/api_instance';
import { useModal } from '../../../../static/js/helpers/ModalProvider';
import { usePgAdmin } from '../../../../static/js/PgAdminProvider';
import * as commonUtils from 'sources/utils';
import * as showQueryTool from '../../../../tools/sqleditor/static/js/show_query_tool';
import { getTitle, generateTitle } from '../../../../tools/sqleditor/static/js/sqleditor_title';
import usePreferences from '../../../../preferences/static/js/store';
import { BROWSER_PANELS, WORKSPACES } from '../../../../browser/static/js/constants';
import { isEmptyString } from '../../../../static/js/validators';
import { getRandomInt } from '../../../../static/js/utils';
import { useWorkspace } from './WorkspaceProvider';

class AdHocConnectionSchema extends BaseUISchema {
  constructor(connectExistingServer, initValues={}) {
    super({
      sid: null,
      did: null,
      user: null,
      server_name: null,
      database_name: null,
      connected: false,
      host: '',
      port: undefined,
      username: current_user.name,
      role: null,
      password: undefined,
      service: undefined,
      connection_params: [
        {'name': 'sslmode', 'value': 'prefer', 'keyword': 'sslmode'},
        {'name': 'connect_timeout', 'value': 10, 'keyword': 'connect_timeout'}],
      ...initValues,
      connection_refresh: 0,
    });
    this.flatServers = [];
    this.groupedServers = [];
    this.dbs = [];
    this.api = getApiInstance();
    this.connectExistingServer = connectExistingServer;
    this.paramSchema = new VariableSchema(getConnectionParameters, null, null, ['name', 'keyword', 'value']);
  }

  refreshServerList() {
    // its better to refresh the server list than monkey patching server connected status.
    this.groupedServers = [];
    this.state.setUnpreparedData(['connection_refresh'], getRandomInt(1, 9999));
  }

  setServerConnected(sid, icon) {
    for(const group of this.groupedServers) {
      for(const opt of group.options) {
        if(opt.value == sid) {
          opt.connected = true;
          opt.image = icon || 'icon-pg';
          break;
        }
      }
    }
  }

  isServerConnected(sid) {
    return _.find(this.flatServers, (s) => s.value == sid)?.connected;
  }

  getServerList() {
    if(this.groupedServers?.length != 0) {
      return Promise.resolve(this.groupedServers);
    }
    return new Promise((resolve, reject)=>{
      this.api.get(url_for('sqleditor.get_new_connection_servers'))
        .then(({data: respData})=>{
          let groupedOptions = [];
          _.forIn(respData.data.result.server_list, (v, k)=>{
            if(v.length == 0) {
              return;
            }
            groupedOptions.push({
              label: k,
              options: v,
            });
          });
          /* Will be re-used for changing icon when connected */
          this.groupedServers = groupedOptions.map((group)=>{
            return {
              label: group.label,
              options: group.options.map((o)=>({...o, selected: false})),
            };
          });
          resolve(groupedOptions);
        })
        .catch((error)=>{
          reject(error instanceof Error ? error : Error(gettext('Something went wrong')));
        });
    });
  }

  getOtherOptions(sid, type) {
    if(!sid) {
      return [];
    }

    if(!this.isServerConnected(sid)) {
      return [];
    }
    return new Promise((resolve, reject)=>{
      this.api.get(url_for(`sqleditor.${type}`, {
        'sid': sid,
        'sgid': 0,
      }))
        .then(({data: respData})=>{
          resolve(respData.data.result.data);
        })
        .catch((error)=>{
          reject(error instanceof Error ? error : Error(gettext('Something went wrong')));
        });
    });
  }

  get baseFields() {
    let self = this;
    return [
      {
        id: 'sid', label: gettext('Existing Server (Optional)'), deps: ['connected', 'connection_refresh'],
        type: (state) => ({
          type: 'select',
          options: () => self.getServerList(),
          optionsLoaded: (res) => self.flatServers = flattenSelectOptions(res),
          optionsReloadBasis: `${self.flatServers.map((s) => s.connected).join('')}${state.connection_refresh}`,
        }),
        depChange: (state, source)=>{
          // Check for connection status
          let selectedServer = _.find(
            self.flatServers, (s) => s.value == state.sid
          );
          if(source.includes('connection_refresh')) {
            return {
              connected: selectedServer?.connected
            };
          }
          return {
            server_name: null,
            did: null,
            user: null,
            role: null,
            sid: null,
            host: null,
            port: null,
            service: null,
            connection_params: null,
            password: null,
            connected: selectedServer?.connected
          };
        },
        deferredDepChange: (state, source, topState, actionObj) => {
          if(source.includes('connection_refresh')) return;
          return new Promise((resolve) => {
            let sid = actionObj.value;
            let selectedServer = _.find(self.flatServers, (s)=>s.value==sid);
            if(sid && !_.find(self.flatServers, (s) => s.value == sid)?.connected) {
              this.connectExistingServer(sid, state.user, null, (data) => {
                self.setServerConnected(sid, data.icon);
                selectedServer.connected = true;
                resolve(() => ({ sid: sid, server_name:selectedServer?.label, host: selectedServer?.host,
                  port: selectedServer?.port, service: selectedServer?.service,
                  connection_params: selectedServer?.connection_params, connected: true
                }));
              });
            } else {
              resolve(()=>({ sid: sid, server_name:selectedServer?.label, host: selectedServer?.host,
                port: selectedServer?.port, service: selectedServer?.service,
                connection_params: selectedServer?.connection_params, connected: true
              }));
            }
          });
        },
      },
      {
        id: 'server_name', label: gettext('Server Name'), type: 'text', noEmpty: true,
        deps: ['sid', 'connected'],
        disabled: (state) => state.sid,
      }, {
        id: 'host', label: gettext('Host name/address'), type: 'text',
        deps: ['sid', 'connected'],
        disabled: (state) => state.sid,
      }, {
        id: 'port', label: gettext('Port'), type: 'int', min: 1, max: 65535,
        deps: ['sid', 'connected'],
        disabled: (state) => state.sid,
      },{
        id: 'did', label: gettext('Database'), deps: ['sid', 'connected'],
        controlProps: {creatable: true},
        type: (state) => {
          if (state?.sid) {
            return {
              type: 'select',
              options: () => this.getOtherOptions(
                state.sid, 'get_new_connection_database'
              ),
              optionsReloadBasis: `${state.sid} ${this.isServerConnected(state.sid)}`,
            };
          } else {
            return {type: 'text'};
          }
        },
        optionsLoaded: (res) => this.dbs = res,
        depChange: (state) => {
          /* Once the option is selected get the name */
          return {
            database_name: _.find(this.dbs, (s) => s.value == state.did)?.label
          };
        }
      }, {
        id: 'user', label: gettext('User'), deps: ['sid', 'connected'],
        controlProps: {creatable: true},
        type: (state) => {
          if (state?.sid) {
            return {
              type: 'select',
              options: () => this.getOtherOptions(
                state.sid, 'get_new_connection_user'
              ),
              optionsReloadBasis: `${state.sid} ${this.isServerConnected(state.sid)}`,
            };
          } else {
            return {type: 'text'};
          }
        },
      }, {
        id: 'password', label: gettext('Password'), type: 'password',
        controlProps: {
          maxLength: null,
          autoComplete: 'new-password'
        },
        deps: ['sid', 'did', 'user', 'role'],
        depChange: (state, source)=> {
          if (source == 'sid' || source == 'did' || source == 'user' ||  source == 'role') {
            state.password = null;
          }
        }
      },{
        id: 'role', label: gettext('Role'), deps: ['sid', 'connected'],
        controlProps: {creatable: true},
        type: (state)=>({
          type: 'select',
          options: () => this.getOtherOptions(
            state.sid, 'get_new_connection_role'
          ),
          optionsReloadBasis: `${state.sid} ${this.isServerConnected(state.sid)}`,
        }),
      },{
        id: 'service', label: gettext('Service'), type: 'text', deps: ['sid', 'connected'],
        disabled: (state) => state.sid,
      }, {
        id: 'connection_params', label: gettext('Connection Parameters'),
        type: 'collection',
        schema: this.paramSchema, mode: ['edit', 'create'], uniqueCol: ['name'],
        canAdd: true, canEdit: false, canDelete: true,
      }, {
        id: 'connected', label: '', type: 'text', visible: false,
      }, {
        id: 'database_name', label: '', type: 'text', visible: false,
      }
    ];
  }

  validate(state, setError) {
    let errmsg = null;

    if (isEmptyString(state.service)) {
      errmsg = gettext('Either Host name or Service must be specified.');
      if(isEmptyString(state.host)) {
        setError('host', errmsg);
        return true;
      } else {
        setError('host', null);
      }

      /* Hostname, IP address validate */
      if (state.host) {
        // Check for leading and trailing spaces.
        if (/(^\s)|(\s$)/.test(state.host)){
          errmsg = gettext('Host name must be valid hostname or IPv4 or IPv6 address.');
          setError('host', errmsg);
          return true;
        } else {
          setError('host', null);
        }
      }
      if(isEmptyString(state.port)) {
        errmsg = gettext('Port must be specified.');
        setError('port', errmsg);
        return true;
      } else {
        setError('port', null);
      }

      if(isEmptyString(state.did)) {
        errmsg = gettext('Database must be specified.');
        setError('did', errmsg);
        return true;
      } else {
        setError('did', null);
      }

      if(isEmptyString(state.user)) {
        errmsg = gettext('User must be specified.');
        setError('user', errmsg);
        return true;
      } else {
        setError('user', null);
      }
    } else {
      _.each(['host', 'port', 'did', 'user'], (item) => {
        setError(item, null);
      });
    }
    return false;
  }
}

export default function AdHocConnection({mode}) {
  const api = getApiInstance();
  const modal = useModal();
  const pgAdmin = usePgAdmin();
  const preferencesStore = usePreferences();
  const {currentWorkspace} = useWorkspace();

  const connectExistingServer = async (sid, user, formData, connectCallback) => {
    try {
      let {data: respData} = await api({
        method: 'POST',
        url: url_for('sqleditor.connect_server', {
          'sid': sid,
          ...(user ? {
            'usr': user,
          }:{}),
        }),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        data: formData
      });
      connectCallback?.(respData.data);
    } catch (error) {
      if(!error.response) {
        pgAdmin.Browser.notifier.pgNotifier('error', error, 'Connection error', gettext('Connection to pgAdmin server has been lost.'));
      } else {
        modal.showModal(gettext('Connect to server'), (closeModal)=>{
          return (
            <ConnectServerContent
              closeModal={()=>{
                closeModal();
              }}
              data={error.response?.data?.result}
              onOK={(formData)=>{
                connectExistingServer(sid, null, formData, connectCallback);
              }}
              hideSavePassword={true}
            />
          );
        });
      }
    }
  };

  const openQueryTool = (respData, formData)=>{
    const transId = commonUtils.getRandomInt(1, 9999999);
    let db_name = _.isNil(formData.database_name) ? formData.did : formData.database_name;
    let user_name = formData.role || formData.user || respData.data.user.name;

    let parentData = {
      server_group: {_id: 1},
      server: {
        _id: respData.data.sid,
        server_type: respData.data.server_type,
      },
      database: {
        _id: respData.data.did,
        label: db_name,
        _label: db_name,
      },
    };

    const gridUrl = showQueryTool.generateUrl(transId, parentData, null);
    const title = getTitle(pgAdmin, preferencesStore.getPreferencesForModule('browser'), null, false, formData.server_name, db_name, user_name);
    showQueryTool.launchQueryTool(pgWindow.pgAdmin.Tools.SQLEditor, transId, gridUrl, title, {
      user: formData.user,
      role: formData.role,
    });
  };

  const openPSQLTool = (respData, formData)=> {
    const transId = commonUtils.getRandomInt(1, 9999999);
    let db_name = _.isNil(formData.database_name) ? formData.did : formData.database_name;
    let user_name = formData.role || formData.user || respData.data.user.name;

    let panelTitle = '';
    // Set psql tab title as per prefrences setting.
    let title_data = {
      'database': db_name ? _.unescape(db_name) : 'postgres' ,
      'username': user_name,
      'server': formData.server_name,
      'type': 'psql_tool',
    };
    let tab_title_placeholder = usePreferences.getState().getPreferencesForModule('browser').psql_tab_title_placeholder;
    panelTitle = generateTitle(tab_title_placeholder, title_data);

    let openUrl = url_for('psql.panel', {
      trans_id: transId,
    });
    const misc_preferences = usePreferences.getState().getPreferencesForModule('misc');
    let theme = misc_preferences.theme;

    openUrl += `?sgid=${1}`
      +`&sid=${respData.data.sid}`
      +`&did=${respData.data.did}`
      +`&server_type=${respData.data.server_type}`
      + `&theme=${theme}`;

    if(formData.did) {
      openUrl += `&db=${encodeURIComponent(db_name)}`;
    } else {
      openUrl += `&db=${''}`;
    }

    const escapedTitle = _.escape(panelTitle);
    const open_new_tab = usePreferences.getState().getPreferencesForModule('browser').new_browser_tab_open;

    pgAdmin.Browser.Events.trigger(
      'pgadmin:tool:show',
      `${BROWSER_PANELS.PSQL_TOOL}_${transId}`,
      openUrl,
      {title: escapedTitle, db: db_name},
      {title: panelTitle, icon: 'pg-font-icon icon-terminal', manualClose: false, renamable: true},
      Boolean(open_new_tab?.includes('psql_tool'))
    );

    return true;
  };

  const onSaveClick = async (isNew, formData) => {
    try {
      let {data: respData} = await api({
        method: 'POST',
        url: url_for('workspace.adhoc_connect_server'),
        data: JSON.stringify(formData)
      });
      if (mode == WORKSPACES.QUERY_TOOL) {
        openQueryTool(respData, formData);
      } else if (mode == WORKSPACES.PSQL_TOOL && pgAdmin['enable_psql']) {
        openPSQLTool(respData, formData);
      }
    } catch (error) {
      if(!error.response) {
        pgAdmin.Browser.notifier.pgNotifier('error', error, 'Connection error', gettext('Connect to server.'));
      } else {
        formData['sid'] = error.response?.data?.result?.sid;
        modal.showModal(gettext('Connect to server'), (closeModal)=>{
          return (
            <ConnectServerContent
              closeModal={()=>{
                closeModal();
              }}
              data={error.response?.data?.result}
              onOK={(okFormData)=>{
                formData['password'] = okFormData.get('password');
                formData['tunnel_password'] = okFormData.get('tunnel_password');
                onSaveClick(isNew, formData);
              }}
              hideSavePassword={true}
            />
          );
        });
      }
    }
  };

  let saveBtnName = gettext('Connect & Open Query Tool');
  if (mode == WORKSPACES.PSQL_TOOL) {
    saveBtnName = gettext('Connect & Open PSQL');
  }

  let adHocConObj = useMemo(() => new AdHocConnectionSchema(connectExistingServer), []);

  useEffect(()=>{
    if(currentWorkspace == mode) adHocConObj.refreshServerList();
  }, [currentWorkspace]);

  return <SchemaView
    formType={'dialog'}
    getInitData={() => { /*This is intentional (SonarQube)*/ }}
    formClassName={'AdHocConnection-container'}
    schema={adHocConObj}
    viewHelperProps={{
      mode: 'create',
    }}
    loadingText={'Connecting...'}
    onSave={onSaveClick}
    customSaveBtnName= {saveBtnName}
    customCloseBtnName={''}
    customSaveBtnIconType={mode}
    hasSQL={false}
    disableSqlHelp={true}
    disableDialogHelp={true}
    isTabView={false}
  />;
}

AdHocConnection.propTypes = {
  mode: PropTypes.string
};
