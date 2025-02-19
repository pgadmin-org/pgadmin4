/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import SubscriptionSchema from '../../../pgadmin/browser/server_groups/servers/databases/subscriptions/static/js/subscription.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

describe('SubscriptionSchema', () => {

  let schemaObj;
  let getInitData = ()=>Promise.resolve({});

  beforeEach(() => {
    schemaObj = new SubscriptionSchema(
      {
        getPublication: ()=>[],
        role: ()=>[],
      },
      {
        node_info: {
          connected: true,
          user: {id: 10, name: 'postgres', is_superuser: true, can_create_role: true, can_create_db: true},
          user_id: 1,
          username: 'postgres',
          version: 130005,
          server: {host: '127.0.0.1', port: 5432},
        },
      },
      {
        subowner : 'postgres'
      }
    );
    genericBeforeEach();
  });

  it('create', async () => {
    await getCreateView(schemaObj);
  });

  it('edit', async () => {
    await getEditView(schemaObj, getInitData);
  });

  it('properties', async () => {
    await getPropertiesView(schemaObj, getInitData);
  });


  it('copy_data_after_refresh readonly', () => {
    let isReadonly = _.find(schemaObj.fields, (f)=>f.id=='copy_data_after_refresh').readonly;
    let status = isReadonly({host: '127.0.0.1', port : 5432});
    expect(status).toBe(true);
  });

  it('copy_data_after_refresh readonly', () => {
    let isReadonly = _.find(schemaObj.fields, (f)=>f.id=='copy_data_after_refresh').readonly;
    let status = isReadonly({refresh_pub : true});
    expect(status).toBe(false);
  });

  it('validate', () => {
    let state = {};
    let setError = jest.fn();

    state.host = null;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('host', 'Either Host name, Address must be specified.');

    state.host = '127.0.0.1';
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('username', 'Username must be specified.');

    state.username = 'postgres';
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('port', 'Port must be specified.');

    state.port = 5432;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('pub', 'Publication must be specified.');
  });
});
