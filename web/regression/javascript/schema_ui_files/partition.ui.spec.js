/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import _ from 'lodash';
import * as nodeAjax from '../../../pgadmin/browser/static/js/node_ajax';
import { getNodePartitionTableSchema } from '../../../pgadmin/browser/server_groups/servers/databases/schemas/tables/partitions/static/js/partition.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

describe('PartitionTableSchema', ()=>{

  let schemaObj;
  let getInitData = ()=>Promise.resolve({});

  beforeAll(()=>{
    jest.spyOn(nodeAjax, 'getNodeAjaxOptions').mockReturnValue(Promise.resolve([]));
    jest.spyOn(nodeAjax, 'getNodeListByName').mockReturnValue(Promise.resolve([]));
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



  beforeEach(()=>{
    genericBeforeEach();
  });

  it('create', async ()=>{
    await getCreateView(schemaObj);
  });

  it('edit', async ()=>{
    await getEditView(schemaObj, getInitData);
  });

  it('properties', async ()=>{
    await getPropertiesView(schemaObj, getInitData);
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
    let setError = jest.fn();

    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('partition_keys', 'Please specify at least one key for partitioned table.');

    state.partition_keys = [{key: 'id'}];
    expect(schemaObj.validate(state, setError)).toBe(false);
  });
});

