/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import BaseUISchema from '../../../pgadmin/static/js/SchemaView/base_schema.ui';
import _ from 'lodash';
import * as nodeAjax from '../../../pgadmin/browser/static/js/node_ajax';
import { PartitionKeysSchema, PartitionsSchema } from '../../../pgadmin/browser/server_groups/servers/databases/schemas/tables/static/js/partition.utils.ui';
import {addNewDatagridRow, genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

function getFieldDepChange(schema, id) {
  return _.find(schema.fields, (f)=>f.id==id)?.depChange;
}

class SchemaInColl extends BaseUISchema {
  constructor(schemaObj, columns) {
    super();
    this.collSchema = schemaObj;
    this.columns = columns;
  }
  getCollations() {/*This is intentional (SonarQube)*/}
  getOperatorClass() {/*This is intentional (SonarQube)*/}

  get baseFields() {
    return [{
      id: 'collection', label: '', type: 'collection',
      schema: this.collSchema,
      editable: false,
      canAdd: true, canEdit: false, canDelete: true, hasRole: true,
      columns : this.columns,
    }];
  }
}

describe('PartitionKeysSchema', ()=>{

  let schemaObj;
  let getInitData = ()=>Promise.resolve({});

  beforeAll(()=>{
    jest.spyOn(nodeAjax, 'getNodeAjaxOptions').mockReturnValue(Promise.resolve([]));
    jest.spyOn(nodeAjax, 'getNodeListByName').mockReturnValue(Promise.resolve([]));
    let partitionObj =  new PartitionKeysSchema();
    schemaObj = new SchemaInColl(partitionObj);
  });



  beforeEach(()=>{
    genericBeforeEach();
  });

  it('create', async ()=>{
    const {ctrl, user} = await getCreateView(schemaObj);

    /* Make sure you hit every corner */

    await addNewDatagridRow(user, ctrl);

  });

  it('edit', async ()=>{
    await getEditView(schemaObj, getInitData);
  });

  it('properties', async ()=>{
    await getPropertiesView(schemaObj, getInitData);
  });

  it('depChange', ()=>{
    let state = {};

    state.key_type = 'expression';
    expect(getFieldDepChange(schemaObj.collSchema, 'pt_column')(state, [], null, {})).toEqual({
      pt_column: undefined,
    });

    state.key_type = 'column';
    expect(getFieldDepChange(schemaObj.collSchema, 'expression')(state, [], null, {})).toEqual({
      expression: undefined,
    });
  });

  it('validate', ()=>{
    let state = {};
    let setError = jest.fn();

    state.key_type = 'expression';
    schemaObj.collSchema.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('expression', '\'Partition key expression\' cannot be empty.');

    state.expression = 'abc';
    expect(schemaObj.collSchema.validate(state, setError)).toBe(false);
  });
});


describe('PartitionsSchema', ()=>{

  let schemaObj;
  let getInitData = ()=>Promise.resolve({});

  beforeAll(()=>{
    jest.spyOn(nodeAjax, 'getNodeAjaxOptions').mockReturnValue(Promise.resolve([]));
    jest.spyOn(nodeAjax, 'getNodeListByName').mockReturnValue(Promise.resolve([]));
    schemaObj = new PartitionsSchema();
    schemaObj.top = schemaObj;
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

  it('create collection', async ()=>{
    let schemaCollObj = new SchemaInColl(
      schemaObj,[ 'is_attach', 'partition_name', 'is_default', 'values_from', 'values_to', 'values_in', 'values_modulus', 'values_remainder']
    );
    const {ctrl, user} = await getCreateView(schemaCollObj);
    /* Make sure you hit every corner */

    await addNewDatagridRow(user, ctrl);
  });


  it('depChange', ()=>{
    let state = {};

    state.is_attach = true;
    expect(getFieldDepChange(schemaObj, 'is_sub_partitioned')(state)).toEqual({
      is_sub_partitioned: false,
    });
  });

  it('validate', ()=>{
    let state = {is_sub_partitioned: true};
    let setError = jest.fn();

    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('sub_partition_keys', 'Please specify at least one key for partitioned table.');

    state.is_sub_partitioned = false;
    state.is_default = false;
    schemaObj.top._sessData = {
      partition_type: 'range',
    };
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('values_from', 'For range partition From field cannot be empty.');

    state.values_from = 1;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('values_to', 'For range partition To field cannot be empty.');

    schemaObj.top._sessData.partition_type = 'list';
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('values_in', 'For list partition In field cannot be empty.');

    schemaObj.top._sessData.partition_type = 'hash';
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('values_modulus', 'For hash partition Modulus field cannot be empty.');

    state.values_modulus = 1;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('values_remainder', 'For hash partition Remainder field cannot be empty.');
  });
});

