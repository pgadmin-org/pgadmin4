/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import { SCHEMA_STATE_ACTIONS } from '../../../pgadmin/static/js/SchemaView';
import BaseUISchema from '../../../pgadmin/static/js/SchemaView/base_schema.ui';
import _ from 'lodash';
import UniqueConstraintSchema from '../../../pgadmin/browser/server_groups/servers/databases/schemas/tables/constraints/index_constraint/static/js/unique_constraint.ui';
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

describe('UniqueConstraintSchema', ()=>{

  let schemaObj;
  let getInitData = ()=>Promise.resolve({});

  beforeAll(()=>{
    schemaObj = new UniqueConstraintSchema({
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

  it('columns cell formatter', ()=>{
    let cellFormatter = _.find(schemaObj.fields, (f)=>f.id=='columns').cell().controlProps.formatter;
    expect(cellFormatter.fromRaw([{
      column: 'user_id',
    },{
      column: 'client_order_id',
    }])).toBe('user_id,client_order_id');

    expect(cellFormatter.fromRaw([])).toBe('');
  });

  it('columns type formatter preserves constraint column order', ()=>{
    let typeFormatter = _.find(schemaObj.fields, (f)=>f.id=='columns').type().controlProps.formatter;

    /* allOptions are in table column position order (alphabetical here) */
    let allOptions = [
      {value: 'alpha', label: 'alpha'},
      {value: 'beta', label: 'beta'},
      {value: 'gamma', label: 'gamma'},
    ];

    /* backendVal comes from the constraint definition in a different order */
    let backendVal = [{column: 'gamma'}, {column: 'alpha'}];

    let result = typeFormatter.fromRaw(backendVal, allOptions);

    /* result must preserve backendVal order, not allOptions order */
    expect(result).toEqual([
      {value: 'gamma', label: 'gamma'},
      {value: 'alpha', label: 'alpha'},
    ]);

    /* empty and null values should be handled gracefully */
    expect(typeFormatter.fromRaw([], allOptions)).toEqual([]);
    expect(typeFormatter.fromRaw(null, allOptions)).toEqual([]);
  });

  it('columns type formatter toRaw', ()=>{
    let typeFormatter = _.find(schemaObj.fields, (f)=>f.id=='columns').type().controlProps.formatter;
    expect(typeFormatter.toRaw([{value: 'user_id'}, {value: 'client_order_id'}])).toEqual([
      {column: 'user_id'},
      {column: 'client_order_id'},
    ]);
    expect(typeFormatter.toRaw([])).toEqual([]);
    expect(typeFormatter.toRaw(null)).toEqual([]);
  });

  it('validate', ()=>{
    let state = {};
    let setError = jest.fn();
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('columns', 'Please specify columns for Unique constraint.');

    state.columns = [{columns: 'id'}];
    expect(schemaObj.validate(state, setError)).toBe(false);
  });
});

