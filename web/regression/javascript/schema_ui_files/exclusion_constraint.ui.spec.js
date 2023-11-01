/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import { SCHEMA_STATE_ACTIONS } from '../../../pgadmin/static/js/SchemaView';
import BaseUISchema from '../../../pgadmin/static/js/SchemaView/base_schema.ui';
import _ from 'lodash';
import { getNodeExclusionConstraintSchema } from '../../../pgadmin/browser/server_groups/servers/databases/schemas/tables/constraints/exclusion_constraint/static/js/exclusion_constraint.ui';
import * as nodeAjax from '../../../pgadmin/browser/static/js/node_ajax';
import TableSchema from '../../../pgadmin/browser/server_groups/servers/databases/schemas/tables/static/js/table.ui';
import {addNewDatagridRow, genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';
import pgAdmin from '../fake_pgadmin';

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
      columns : ['name', 'consrc'],
    }];
  }
}

function getFieldDepChange(schema, id) {
  return _.find(schema.fields, (f)=>f.id==id)?.depChange;
}

describe('ExclusionConstraintSchema', ()=>{

  let schemaObj;
  let getInitData = ()=>Promise.resolve({});

  beforeAll(()=>{
    jest.spyOn(nodeAjax, 'getNodeAjaxOptions').mockReturnValue(Promise.resolve([]));
    jest.spyOn(nodeAjax, 'getNodeListByName').mockReturnValue(Promise.resolve([]));
    schemaObj = getNodeExclusionConstraintSchema({}, {}, {Nodes: {table: {}}});
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

  it('changeColumnOptions', ()=>{
    jest.spyOn(schemaObj.exHeaderSchema, 'changeColumnOptions');
    let columns = [{label: 'label', value: 'value'}];
    schemaObj.changeColumnOptions(columns);
    expect(schemaObj.exHeaderSchema.changeColumnOptions).toHaveBeenCalledWith(columns);
  });

  describe('ExclusionColHeaderSchema', ()=>{
    it('getNewData', ()=>{
      schemaObj.exHeaderSchema.columnOptions = [
        {label: 'id', value: 'id', datatype: 'numeric'},
        {label: 'name', value: 'name', datatype: 'char'}
      ];
      jest.spyOn(schemaObj.exColumnSchema, 'getNewData').mockImplementation(() => {});
      schemaObj.exHeaderSchema.getNewData({
        is_exp: false,
        column: 'id',
        expression: null,
      });
      expect(schemaObj.exColumnSchema.getNewData).toHaveBeenCalledWith({
        is_exp: false,
        column: 'id',
        col_type: 'numeric',
      });

      schemaObj.exHeaderSchema.getNewData({
        is_exp: true,
        column: null,
        expression: 'abc',
      });
      expect(schemaObj.exColumnSchema.getNewData).toHaveBeenCalledWith({
        is_exp: true,
        column: 'abc',
        col_type: null,
      });
    });
  });

  describe('ExclusionColumnSchema', ()=>{
    it('isEditable', ()=>{
      schemaObj.exColumnSchema.isNewExCons = false;
      expect(schemaObj.exColumnSchema.isEditable()).toBe(false);

      schemaObj.exColumnSchema.isNewExCons = true;
      schemaObj.exColumnSchema.amname = 'gist';
      expect(schemaObj.exColumnSchema.isEditable()).toBe(false);

      schemaObj.exColumnSchema.amname = 'btree';
      expect(schemaObj.exColumnSchema.isEditable()).toBe(true);
    });
  });

  it('depChange', ()=>{
    let state = {columns: [{local_column: 'id'}]};

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
      columns: [{local_column: 'id123'}],
    });

    state = {};
    expect(getFieldDepChange(schemaObj, 'include')(state)).toEqual({});
    state.index = 'idx';
    expect(getFieldDepChange(schemaObj, 'include')(state)).toEqual({include: []});

    expect(getFieldDepChange(schemaObj, 'comment')(state)).toEqual({
      comment: '',
    });
  });

  it('columns formatter', ()=>{
    let formatter = _.find(schemaObj.fields, (f)=>f.id=='columns').cell().controlProps.formatter;
    expect(formatter.fromRaw([{
      column: 'lid',
    },{
      column: 'rid',
    }])).toBe('lid, rid');

    expect(formatter.fromRaw([])).toBe('');
  });

  describe('amname change', ()=>{
    let confirmSpy;
    let deferredDepChange;
    let operClassOptions = [
      {label: 'oper1', value: 'oper1'}
    ];

    beforeEach(()=>{
      jest.spyOn(schemaObj.exColumnSchema, 'setOperClassOptions');
      jest.spyOn(schemaObj.fieldOptions, 'getOperClass').mockReturnValue(operClassOptions);
      confirmSpy = jest.spyOn(pgAdmin.Browser.notifier, 'confirm');
      deferredDepChange = _.find(schemaObj.fields, (f)=>f.id=='amname')?.deferredDepChange;
    });

    it('btree', (done)=>{
      confirmSpy.mockClear();
      let state = {amname: 'btree'};
      let deferredPromise = deferredDepChange(state);
      deferredPromise.then((depChange)=>{
        expect(schemaObj.exColumnSchema.setOperClassOptions).toHaveBeenCalledWith(operClassOptions);
        expect(depChange()).toEqual({
          columns: [],
        });
        done();
      });
      /* Press OK */
      confirmSpy.mock.calls[0][2]();
    });

    it('not btree', (done)=>{
      confirmSpy.mockClear();
      let state = {amname: 'gist'};
      let deferredPromise = deferredDepChange(state);
      deferredPromise.then((depChange)=>{
        expect(schemaObj.exColumnSchema.setOperClassOptions).toHaveBeenCalledWith([]);
        expect(depChange()).toEqual({
          columns: [],
        });
        done();
      });
      /* Press OK */
      confirmSpy.mock.calls[0][2]();
    });

    it('press no', (done)=>{
      confirmSpy.mockClear();
      let state = {amname: 'gist'};
      let deferredPromise = deferredDepChange(state, null, null, {
        oldState: {
          amname: 'btree',
        },
      });
      /* Press Cancel */
      confirmSpy.mock.calls[0][3]();
      deferredPromise.then((depChange)=>{
        expect(depChange()).toEqual({
          amname: 'btree',
        });
        done();
      });
    });
  });

  it('validate', ()=>{
    let state = {};
    let setError = jest.fn();

    state.columns = ['id'];
    state.autoindex = true;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('coveringindex', 'Please specify covering index name.');

    state.coveringindex = 'asdas';
    expect(schemaObj.validate(state, setError)).toBe(false);
  });
});

