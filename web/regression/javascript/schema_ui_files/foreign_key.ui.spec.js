/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import '../helper/enzyme.helper';
import { createMount } from '@material-ui/core/test-utils';
import { SCHEMA_STATE_ACTIONS } from '../../../pgadmin/static/js/SchemaView';
import BaseUISchema from '../../../pgadmin/static/js/SchemaView/base_schema.ui';
import _ from 'lodash';
import * as nodeAjax from '../../../pgadmin/browser/static/js/node_ajax';
import { getNodeForeignKeySchema } from '../../../pgadmin/browser/server_groups/servers/databases/schemas/tables/constraints/foreign_key/static/js/foreign_key.ui';
import TableSchema from '../../../pgadmin/browser/server_groups/servers/databases/schemas/tables/static/js/table.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

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
  let mount;
  let schemaObj;
  let getInitData = ()=>Promise.resolve({});

  /* Use createMount so that material ui components gets the required context */
  /* https://material-ui.com/guides/testing/#api */
  beforeAll(()=>{
    mount = createMount();
    spyOn(nodeAjax, 'getNodeAjaxOptions').and.returnValue(Promise.resolve([]));
    spyOn(nodeAjax, 'getNodeListByName').and.returnValue(Promise.resolve([]));
    schemaObj = getNodeForeignKeySchema({}, {}, {Nodes: {table: {}}});
  });

  afterAll(() => {
    mount.cleanUp();
  });

  beforeEach(()=>{
    genericBeforeEach();
  });

  it('create', ()=>{
    mount(getCreateView(schemaObj));
  });

  it('edit', ()=>{
    mount(getEditView(schemaObj, getInitData));
  });

  it('properties', ()=>{
    mount(getPropertiesView(schemaObj, getInitData));
  });

  it('create collection', ()=>{
    let schemaCollObj = new SchemaInColl(schemaObj);
    let ctrl = mount(getCreateView(schemaCollObj));
    /* Make sure you hit every corner */
    ctrl.find('DataGridView').at(0).find('PgIconButton[data-test="add-row"]').find('button').simulate('click');
  });

  it('changeColumnOptions', ()=>{
    spyOn(schemaObj.fkHeaderSchema, 'changeColumnOptions').and.callThrough();
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
    let setError = jasmine.createSpy('setError');

    state.columns = ['id'];
    state.autoindex = true;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('coveringindex', 'Please specify covering index name.');

    state.coveringindex = 'asdas';
    expect(schemaObj.validate(state, setError)).toBe(false);
  });
});

