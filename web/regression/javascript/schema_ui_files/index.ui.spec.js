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
import * as nodeAjax from '../../../pgadmin/browser/static/js/node_ajax';
import IndexSchema, { getColumnSchema } from '../../../pgadmin/browser/server_groups/servers/databases/schemas/tables/indexes/static/js/index.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

describe('IndexSchema', ()=>{
  let mount;

  describe('column schema describe', () => {

    let columnSchemaObj = getColumnSchema({}, {server: {user: {name: 'postgres'}}}, {});

    it('column schema collection', ()=>{

      spyOn(nodeAjax, 'getNodeAjaxOptions').and.returnValue([]);
      spyOn(nodeAjax, 'getNodeListByName').and.returnValue([]);

      mount(getCreateView(columnSchemaObj));

      mount(getEditView(columnSchemaObj, getInitData));
    });

    it('column schema colname editable', ()=>{
      columnSchemaObj._top = {
        _sessData: { amname: 'btree' }
      };
      let cell = _.find(columnSchemaObj.fields, (f)=>f.id=='op_class').cell;
      cell();
    });

    it('column schema sort_order depChange', ()=>{
      let topState = { amname: 'btree' };
      let depChange = _.find(columnSchemaObj.fields, (f)=>f.id=='sort_order').depChange;

      let state = { sort_order: true };
      depChange(state, {}, topState, { oldState: { sort_order: false } });

      state.sort_order = false;
      topState.amname = 'abc';
      depChange(state, {}, topState, { oldState: { sort_order: false } });
      expect(state.is_sort_nulls_applicable).toBe(false);
    });

    it('column schema sort_order editable', ()=>{
      columnSchemaObj._top = {
        _sessData: { amname: 'btree' }
      };
      let state = {};
      spyOn(columnSchemaObj, 'inSchemaWithModelCheck').and.returnValue(true);
      let editable = _.find(columnSchemaObj.fields, (f)=>f.id=='sort_order').editable;
      let status = editable(state);
      expect(status).toBe(false);

      spyOn(columnSchemaObj, 'inSchemaWithModelCheck').and.returnValue(false);
      status = editable(state);
      expect(status).toBe(true);

      columnSchemaObj._top._sessData.amname = 'abc';
      status = editable(state);
      expect(status).toBe(false);
    });

    it('column schema nulls editable', ()=>{
      columnSchemaObj._top = {
        _sessData: { amname: 'btree' }
      };
      let state = {};
      spyOn(columnSchemaObj, 'inSchemaWithModelCheck').and.returnValue(true);
      let editable = _.find(columnSchemaObj.fields, (f)=>f.id=='nulls').editable;
      let status = editable(state);
      expect(status).toBe(false);

      spyOn(columnSchemaObj, 'inSchemaWithModelCheck').and.returnValue(false);
      status = editable(state);
      expect(status).toBe(true);

      columnSchemaObj._top._sessData.amname = 'abc';
      status = editable(state);
      expect(status).toBe(false);
    });

    it('column schema setOpClassTypes', ()=>{
      columnSchemaObj._top = {
        _sessData: { amname: 'btree' }
      };
      let options = [];
      columnSchemaObj.op_class_types = [];
      let status = columnSchemaObj.setOpClassTypes(options);
      expect(status).toEqual([]);

      columnSchemaObj.op_class_types = [];
      options.push({label: '', value: ''});
      columnSchemaObj.setOpClassTypes(options);
      expect(columnSchemaObj.op_class_types.length).toBe(1);
    });
  });

  let indexSchemaObj = new IndexSchema(
    ()=>getColumnSchema({}, {server: {user: {name: 'postgres'}}}, {}),
    {
      tablespaceList: ()=>[],
      amnameList : ()=>[{label:'abc', value:'abc'}],
      columnList: ()=>[{label:'abc', value:'abc'}],
    },
    {
      node_info: {'server': { 'version': 110000} }
    },
    {
      amname: 'btree'
    }
  );
  let getInitData = ()=>Promise.resolve({});

  /* Use createMount so that material ui components gets the required context */
  /* https://material-ui.com/guides/testing/#api */
  beforeAll(()=>{
    mount = createMount();
  });

  afterAll(() => {
    mount.cleanUp();
  });

  beforeEach(()=>{
    genericBeforeEach();
  });

  it('create', ()=>{
    mount(getCreateView(indexSchemaObj));
  });

  it('edit', ()=>{
    mount(getEditView(indexSchemaObj, getInitData));
  });

  it('properties', ()=>{
    mount(getPropertiesView(indexSchemaObj, getInitData));
  });

  it('validate', ()=>{
    let state = { columns: [] };
    let setError = jasmine.createSpy('setError');

    indexSchemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('columns', 'You must specify at least one column.');

    state.columns.push({});
    let status = indexSchemaObj.validate(state, setError);
    expect(status).toBe(null);
  });
});

