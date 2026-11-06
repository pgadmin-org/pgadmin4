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
import * as nodeAjax from '../../../pgadmin/browser/static/js/node_ajax';
import { getNodeForeignKeySchema } from '../../../pgadmin/browser/server_groups/servers/databases/schemas/tables/constraints/foreign_key/static/js/foreign_key.ui';
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
      columns : ['name', 'columns','references_table_name'],
    }];
  }
}

function getFieldDepChange(schema, id) {
  return _.find(schema.fields, (f)=>f.id==id)?.depChange;
}

describe('ForeignKeySchema', ()=>{

  let schemaObj;
  let getInitData = ()=>Promise.resolve({});

  beforeAll(()=>{
    jest.spyOn(nodeAjax, 'getNodeAjaxOptions').mockReturnValue(Promise.resolve([]));
    jest.spyOn(nodeAjax, 'getNodeListByName').mockReturnValue(Promise.resolve([]));
  });

  beforeEach(()=>{
    // A fresh schema per test, as each dialog gets in the product; the
    // properties view mutates its fields (helpMessage), which would otherwise
    // leak into the grid cells rendered by later tests.
    schemaObj = getNodeForeignKeySchema({}, {}, {Nodes: {table: {}}});
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
    jest.spyOn(schemaObj.fkHeaderSchema, 'changeColumnOptions');
    let columns = [{label: 'label', value: 'value'}];
    schemaObj.changeColumnOptions(columns);
    expect(schemaObj.fkHeaderSchema.changeColumnOptions).toHaveBeenCalledWith(columns);
  });

  describe('ForeignKeyHeaderSchema', ()=>{
    it('getNewData', ()=>{
      schemaObj.fkHeaderSchema.refTables = [
        {label: 'tab1', value: 140391},
        {label: 'tab2', value: 180191},
      ];

      expect(schemaObj.fkHeaderSchema.getNewData({
        local_column: 'lid',
        referenced: 'rid',
        references: 140391,
      })).toEqual({
        local_column: 'lid',
        referenced: 'rid',
        references: 140391,
        references_table_name: 'tab1',
      });
    });
  });

  it('depChange', ()=>{
    let state = {columns: [{local_column: 'id'}]};
    let actionObj = {
      path: ['name'],
      oldState: {
        name: 'fkname',
      }
    };

    state.autoindex = true;
    state.name = 'fkname';
    expect(getFieldDepChange(schemaObj, 'autoindex')(state, null, null, actionObj)).toEqual({
      coveringindex: 'fki_fkname'
    });

    state.name = 'fknamenew';
    state.coveringindex = 'fki_fkname';
    actionObj.oldState.name = 'fkname';
    expect(getFieldDepChange(schemaObj, 'autoindex')(state, null, null, actionObj)).toEqual({
      coveringindex: 'fki_fknamenew'
    });

    state.autoindex = false;
    expect(getFieldDepChange(schemaObj, 'autoindex')(state, null, null, actionObj)).toEqual({
      coveringindex: ''
    });

    state.hasindex = true;
    expect(getFieldDepChange(schemaObj, 'autoindex')(state, null, null, actionObj)).toEqual({});

    state.oid = 140391;
    expect(getFieldDepChange(schemaObj, 'autoindex')(state, null, null, actionObj)).toEqual({});

    state.oid = null;
    schemaObj.top = new TableSchema({}, null);
    expect(getFieldDepChange(schemaObj, 'autoindex')(state, null, null, actionObj)).toEqual({
      autoindex: false,
      coveringindex: '',
    });

    state.name = '';
    expect(getFieldDepChange(schemaObj, 'comment')(state)).toEqual({
      comment: '',
    });

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


  });

  it.each([false, true])('table column addition preserves mappings and header (initialized: %s)', (initialized)=>{
    schemaObj.top = new TableSchema({}, null);
    let state = {oid: 140391, columns: [
      {local_column: 'id', references: 180191, referenced: 'rid'},
      {local_column: 'other', references: 180191, referenced: 'other_id'},
    ]};
    let original = _.cloneDeep(state);
    if(initialized) {
      schemaObj.fkHeaderSchema.state = {
        initData: {references: 180191, _disable_references: false},
        data: {references: 190191},
      };
    }
    let headerState = _.cloneDeep(schemaObj.fkHeaderSchema.state);

    expect(getFieldDepChange(schemaObj, 'columns')(state, ['columns'], null, {
      type: SCHEMA_STATE_ACTIONS.ADD_ROW,
      path: ['columns'],
    })).toEqual({columns: original.columns});
    expect(state).toEqual(original);
    expect(schemaObj.fkHeaderSchema.state).toEqual(headerState);
  });

  it.each([false, true])('mapping addition captures the reference and locks the header (in table: %s)', (inTable)=>{
    if(inTable) {
      schemaObj.top = new TableSchema({}, null);
    }
    schemaObj.fkHeaderSchema.state = {
      initData: {references: null, _disable_references: false},
      data: {references: 180191},
    };
    let state = {columns: [{local_column: 'id', referenced: 'rid'}]};
    let path = inTable ? ['foreign_key', 0, 'columns'] : ['columns'];

    expect(getFieldDepChange(schemaObj, 'columns')(state, path, null, {
      type: SCHEMA_STATE_ACTIONS.ADD_ROW,
      path,
    })).toEqual({columns: state.columns});
    expect(schemaObj.fkHeaderSchema.origData).toEqual({
      references: 180191, _disable_references: true,
    });
  });

  it('table column addition is a no-op for a removed foreign key', ()=>{
    schemaObj.top = new TableSchema({}, null);
    expect(getFieldDepChange(schemaObj, 'columns')(undefined, ['columns'], null, {
      type: SCHEMA_STATE_ACTIONS.ADD_ROW,
      path: ['columns'],
    })).toBeUndefined();
    expect(schemaObj.fkHeaderSchema.state).toBeNull();
  });

  it('columns formatter', ()=>{
    let formatter = _.find(schemaObj.fields, (f)=>f.id=='columns').cell().controlProps.formatter;
    expect(formatter.fromRaw([{
      local_column: 'lid',
      referenced: 'rid',
    }])).toBe('(lid) -> (rid)');

    expect(formatter.fromRaw([])).toBe('');
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

