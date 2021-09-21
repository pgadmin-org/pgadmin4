/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import jasmineEnzyme from 'jasmine-enzyme';
import React from 'react';
import '../helper/enzyme.helper';
import { createMount } from '@material-ui/core/test-utils';
import pgAdmin from 'sources/pgadmin';
import {messages} from '../fake_messages';
import SchemaView from '../../../pgadmin/static/js/SchemaView';
import _ from 'lodash';
import * as nodeAjax from '../../../pgadmin/browser/static/js/node_ajax';
import { getNodePartitionTableSchema } from '../../../pgadmin/browser/server_groups/servers/databases/schemas/tables/partitions/static/js/partition.ui';

describe('PartitionTableSchema', ()=>{
  let mount;
  let schemaObj;
  let getInitData = ()=>Promise.resolve({});

  /* Use createMount so that material ui components gets the required context */
  /* https://material-ui.com/guides/testing/#api */
  beforeAll(()=>{
    mount = createMount();
    spyOn(nodeAjax, 'getNodeAjaxOptions').and.returnValue(Promise.resolve([]));
    spyOn(nodeAjax, 'getNodeListByName').and.returnValue(Promise.resolve([]));
    schemaObj = getNodePartitionTableSchema({
      server: {
        _id: 1,
      },
      schema: {
        _label: 'public',
      }
    }, {}, {
      Nodes: {table: {}},
      serverInfo: {
        1: {
          user: {
            name: 'Postgres',
          }
        }
      }
    });
  });

  afterAll(() => {
    mount.cleanUp();
  });

  beforeEach(()=>{
    jasmineEnzyme();
    /* messages used by validators */
    pgAdmin.Browser = pgAdmin.Browser || {};
    pgAdmin.Browser.messages = pgAdmin.Browser.messages || messages;
    pgAdmin.Browser.utils = pgAdmin.Browser.utils || {};
  });

  it('create', ()=>{
    mount(<SchemaView
      formType='dialog'
      schema={schemaObj}
      viewHelperProps={{
        mode: 'create',
      }}
      onSave={()=>{}}
      onClose={()=>{}}
      onHelp={()=>{}}
      onEdit={()=>{}}
      onDataChange={()=>{}}
      confirmOnCloseReset={false}
      hasSQL={false}
      disableSqlHelp={false}
      disableDialogHelp={false}
    />);
  });

  it('edit', ()=>{
    mount(<SchemaView
      formType='dialog'
      schema={schemaObj}
      getInitData={getInitData}
      viewHelperProps={{
        mode: 'edit',
      }}
      onSave={()=>{}}
      onClose={()=>{}}
      onHelp={()=>{}}
      onEdit={()=>{}}
      onDataChange={()=>{}}
      confirmOnCloseReset={false}
      hasSQL={false}
      disableSqlHelp={false}
      disableDialogHelp={false}
    />);
  });

  it('properties', ()=>{
    mount(<SchemaView
      formType='tab'
      schema={schemaObj}
      getInitData={getInitData}
      viewHelperProps={{
        mode: 'properties',
      }}
      onHelp={()=>{}}
      onEdit={()=>{}}
    />);
  });

  it('depChange', ()=>{
    let state = {typname: 'newtype'};
    let partKeyField = _.find(schemaObj.fields, (f)=>f.id=='partition_keys');
    expect(partKeyField.depChange(state, null, null, {
      oldState: {
        typname: 'oldtype',
      }
    })).toEqual({
      partition_keys: []
    });

    state = {
      partition_type: 'list',
      columns: [{name: 'id'}],
      partition_keys: [],
    };
    expect(partKeyField.canAddRow(state)).toBe(true);

    state = {is_partitioned: true};
    expect(partKeyField.canAdd(state)).toBe(true);

    expect(_.find(schemaObj.fields, (f)=>f.id=='partitions').depChange(state, ['is_partitioned']))
      .toEqual({
        partitions: []
      });
  });

  it('validate', ()=>{
    let state = {is_partitioned: true};
    let setError = jasmine.createSpy('setError');

    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('partition_keys', 'Please specify at least one key for partitioned table.');

    state.partition_keys = [{key: 'id'}];
    expect(schemaObj.validate(state, setError)).toBe(false);
  });
});

