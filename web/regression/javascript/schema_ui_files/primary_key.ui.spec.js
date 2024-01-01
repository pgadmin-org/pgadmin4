/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import { SCHEMA_STATE_ACTIONS } from '../../../pgadmin/static/js/SchemaView';
import BaseUISchema from '../../../pgadmin/static/js/SchemaView/base_schema.ui';
import _ from 'lodash';
import PrimaryKeySchema from '../../../pgadmin/browser/server_groups/servers/databases/schemas/tables/constraints/index_constraint/static/js/primary_key.ui';
import TableSchema from '../../../pgadmin/browser/server_groups/servers/databases/schemas/tables/static/js/table.ui';
import {addNewDatagridRow, genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

class SchemaInColl extends BaseUISchema {
  constructor(schemaObj) {
    super();
    this.schemaObj = schemaObj;
  }

  get baseFields() {
    return [{
      id: 'collection', label: '', type: 'collection',
      schema: this.schemaObj,
      editable: false,
      canAdd: true, canEdit: false, canDelete: true, hasRole: true,
      columns : ['name', 'columns'],
    }];
  }
}

function getFieldDepChange(schema, id) {
  return _.find(schema.fields, (f)=>f.id==id)?.depChange;
}

describe('PrimaryKeySchema', ()=>{

  let schemaObj;
  let getInitData = ()=>Promise.resolve({});

  beforeAll(()=>{
    schemaObj = new PrimaryKeySchema({
      spcname: ()=>Promise.resolve([]),
    }, {});
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
    let schemaCollObj = new SchemaInColl(schemaObj);
    const {ctrl, user} = await getCreateView(schemaCollObj);
    /* Make sure you hit every corner */

    await addNewDatagridRow(user, ctrl);
  });

  it('depChange', ()=>{
    let state = {columns: [{column: 'id'}]};

    state.name = '';
    expect(getFieldDepChange(schemaObj, 'comment')(state)).toEqual({
      comment: '',
    });

    state.index = 'someindex';
    expect(getFieldDepChange(schemaObj, 'spcname')(state)).toEqual({
      spcname: '',
    });
    expect(getFieldDepChange(schemaObj, 'include')(state)).toEqual({
      include: [],
    });
    expect(getFieldDepChange(schemaObj, 'fillfactor')(state)).toEqual({
      fillfactor: null,
    });
    expect(getFieldDepChange(schemaObj, 'condeferrable')(state)).toEqual({
      condeferrable: false,
    });
    expect(getFieldDepChange(schemaObj, 'condeferred')(state)).toEqual({
      condeferred: false,
    });

    state.index = undefined;
    state.condeferrable = true;
    expect(getFieldDepChange(schemaObj, 'spcname')(state)).toEqual({});
    expect(getFieldDepChange(schemaObj, 'include')(state)).toEqual({});
    expect(getFieldDepChange(schemaObj, 'fillfactor')(state)).toEqual({});
    expect(getFieldDepChange(schemaObj, 'condeferrable')(state)).toEqual({});
    expect(getFieldDepChange(schemaObj, 'condeferred')(state)).toEqual({});

    schemaObj.top = new TableSchema({}, null);
    expect(getFieldDepChange(schemaObj, 'columns')(state, ['columns', 0], null, {
      type: SCHEMA_STATE_ACTIONS.DELETE_ROW,
      oldState: {
        columns: [
          {name: 'id'}
        ],
      },
      path: ['columns'],
      value: 0,
    })).toEqual({
      columns: [],
    });

    expect(getFieldDepChange(schemaObj, 'columns')(state, ['columns', 0], {
      columns: [
        {name: 'id123'}
      ],
    }, {
      type: SCHEMA_STATE_ACTIONS.SET_VALUE,
      oldState: {
        columns: [
          {name: 'id'}
        ],
      },
      path: ['columns', 0, 'name'],
      value: 'id123',
    })).toEqual({
      columns: [{column: 'id123'}],
    });


  });

  it('validate', ()=>{
    let state = {};
    let setError = jest.fn();
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('columns', 'Please specify columns for Primary key.');

    state.columns = [{columns: 'id'}];
    expect(schemaObj.validate(state, setError)).toBe(false);
  });
});

