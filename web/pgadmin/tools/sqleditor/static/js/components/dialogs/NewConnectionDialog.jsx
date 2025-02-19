/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import React, { useState } from 'react';
import BaseUISchema from '../../../../../../static/js/SchemaView/base_schema.ui';
import gettext from 'sources/gettext';
import { QueryToolContext } from '../QueryToolComponent';
import url_for from 'sources/url_for';
import _ from 'lodash';
import { flattenSelectOptions } from '../../../../../../static/js/components/FormComponents';
import PropTypes from 'prop-types';
import ConnectServerContent from '../../../../../../static/js/Dialogs/ConnectServerContent';
import SchemaView from '../../../../../../static/js/SchemaView';
import { usePgAdmin } from '../../../../../../static/js/PgAdminProvider';

class NewConnectionSchema extends BaseUISchema {
  constructor(api, params, connectServer) {
    super({
      sid: null,
      did: null,
      user: null,
      role: null,
      server_name: null,
      database_name: null,
      connected: false,
    });
    // Regenerate the fields on every render.
    this._dynamicFields = true;
    this.flatServers = [];
    this.groupedServers = [];
    this.dbs = [];
    this.params = params;
    this.api = api;
    this.warningText = gettext('By changing the connection you will lose all your unsaved data for the current connection. <br> Do you want to continue?');
    this.connectServer = connectServer;
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
    let obj = this;
    if(this.groupedServers?.length != 0) {
      return Promise.resolve(this.groupedServers);
    }
    return new Promise((resolve, reject) => {
      this.api.get(url_for('sqleditor.get_new_connection_servers'))
        .then(({data: respData})=>{
          let groupedOptions = [];
          _.forIn(respData.data.result.server_list, (v, k)=>{
            if(v.length == 0) {
              return;
            }
            /* initial selection */
            let foundServer = _.find(v, (o) => o.value == obj.params.sid);
            foundServer && (foundServer.selected = true);
            groupedOptions.push({
              label: k,
              options: v,
            });
          });
          /* Will be re-used for changing icon when connected */
          this.groupedServers = groupedOptions.map((group) => {
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
        id: 'sid', label: gettext('Server'), deps: ['connected'],
        noEmpty: true,
        controlProps: { allowClear: false },
        type: () => ({
          type: 'select',
          options: () => self.getServerList(),
          optionsLoaded: (res) => self.flatServers = flattenSelectOptions(res),
          optionsReloadBasis: self.flatServers.map((s) => s.connected).join(''),
        }),
        depChange: (state) => {
          /* Once the option is selected get the name */
          /* Force sid to null, and set only if connected */
          let selectedServer = _.find(
            self.flatServers, (s) => s.value == state.sid
          );

          return {
            server_name: selectedServer?.label,
            did: null,
            user: null,
            role: null,
            sid: state.sid,
            fgcolor: selectedServer?.fgcolor,
            bgcolor: selectedServer?.bgcolor,
            connected: selectedServer?.connected,
          };
        },
        deferredDepChange: (state, source, topState, actionObj) => {
          return new Promise((resolve) => {
            let sid = actionObj.value;

            if(!_.find(self.flatServers, (s) => s.value == sid)?.connected) {
              this.connectServer(sid, state.user, null, (data) => {
                self.setServerConnected(sid, data.icon);
                resolve(() => ({ sid: sid, connected: true }));
              });
            } else {
              resolve(()=>({ sid: sid, connected: true }));
            }
          });
        },
      }, {
        id: 'did', label: gettext('Database'), deps: ['sid', 'connected'],
        noEmpty: true,
        controlProps: {
          allowClear: false,
        },
        type: (state) => {
          return {
            type: 'select',
            options: () => this.getOtherOptions(
              state.sid, 'get_new_connection_database'
            ),
            optionsReloadBasis: `${state.sid} ${this.isServerConnected(state.sid)}`,
          };
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
        noEmpty: true,
        type: (state) => ({
          type: 'select',
          controlProps: { allowClear: false },
          options: () => this.getOtherOptions(
            state.sid, 'get_new_connection_user'
          ),
          optionsReloadBasis: `${state.sid} ${this.isServerConnected(state.sid)}`,
        }),
      }, {
        id: 'role', label: gettext('Role'), deps: ['sid', 'connected'],
        type: (state) => ({
          type: 'select',
          controlProps: { allowClear: false },
          options: () => this.getOtherOptions(
            state.sid, 'get_new_connection_role'
          ),
          optionsReloadBasis: `${state.sid} ${this.isServerConnected(state.sid)}`,
        }),
      }, {
        id: 'server_name', label: '', type: 'text', visible: false,
      }, {
        id: 'database_name', label: '', type: 'text', visible: false,
      }, {
        id: 'bgcolor', label: '', type: 'text', visible: false,
      }, {
        id: 'fgcolor', label: '', type: 'text', visible: false,
      }, {
        id: 'connected', label: '', type: 'text', visible: false,
      }
    ];
  }
}


export default function NewConnectionDialog({onClose, onSave}) {

  const [connecting, setConnecting] = useState(false);
  const queryToolCtx = React.useContext(QueryToolContext);
  const pgAdmin = usePgAdmin();

  const connectServer = async (sid, user, formData, connectCallback) => {
    setConnecting(true);
    try {
      let {data: respData} = await queryToolCtx.api({
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
      setConnecting(false);
      connectCallback?.(respData.data);
    } catch (error) {
      if(!error.response) {
        pgAdmin.Browser.notifier.pgNotifier('error', error, 'Connection error', gettext('Connection to pgAdmin server has been lost.'));
      } else {
        queryToolCtx.modal.showModal(gettext('Connect to server'), (closeModal)=>{
          return (
            <ConnectServerContent
              closeModal={()=>{
                setConnecting(false);
                closeModal();
              }}
              data={error.response?.data?.result}
              onOK={(formData)=>{
                connectServer(sid, null, formData, connectCallback);
              }}
            />
          );
        });
      }
    }
  };
  const schema = React.useRef(null);

  if (!schema.current)
    schema.current = new NewConnectionSchema(queryToolCtx.api, {
      sid: queryToolCtx.params.sid, sgid: 0,
    }, connectServer);

  return <>
    {
      schema.current &&
        <SchemaView
          formType={'dialog'}
          getInitData={()=>Promise.resolve({})}
          schema={schema.current}
          viewHelperProps={{
            mode: 'create',
          }}
          loadingText={connecting ? 'Connecting...' : ''}
          onSave={onSave}
          onClose={onClose}
          hasSQL={false}
          disableSqlHelp={true}
          disableDialogHelp={true}
          isTabView={false}
          Notifier={queryToolCtx.modal}
        />
    }
  </>;
}

NewConnectionDialog.propTypes = {
  onClose: PropTypes.func,
  onSave: PropTypes.func,
};
